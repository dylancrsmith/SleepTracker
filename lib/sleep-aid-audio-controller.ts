import { Audio, type AVPlaybackSource, type AVPlaybackStatus } from "expo-av";

type PlaybackState = {
  isPlaying: boolean;
  isPaused: boolean;
};

type SleepAidAudioControllerCallbacks = {
  onRemainingSecondsChange: (seconds: number) => void;
  onPlaybackStateChange: (state: PlaybackState) => void;
  onError: (message: string) => void;
};

type StartPlaybackInput = {
  source: AVPlaybackSource;
  durationSeconds: number;
  targetVolume: number;
};

const LOOP_RESTART_THRESHOLD_MS = 120;
const MANUAL_STOP_FADE_MS = 5000;
const TIMER_END_FADE_MS = 8000;
const START_FADE_MS = 3000;
const DEBUG_AUDIO = true;

export class SleepAidAudioController {
  private readonly callbacks: SleepAidAudioControllerCallbacks;

  private sound: Audio.Sound | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private loopSeekInProgress = false;

  private isPlaying = false;
  private isPaused = false;
  private remainingSeconds = 0;
  private targetVolume = 0.6;

  constructor(callbacks: SleepAidAudioControllerCallbacks) {
    this.callbacks = callbacks;
  }

  async start(input: StartPlaybackInput): Promise<void> {
    await this.stop({ withFade: false, resetTimer: false });

    this.remainingSeconds = input.durationSeconds;
    this.targetVolume = input.targetVolume;
    this.callbacks.onRemainingSecondsChange(this.remainingSeconds);

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(input.source, {
        shouldPlay: false,
        // Primary loop strategy for single-track ambience.
        isLooping: true,
        volume: 0,
        progressUpdateIntervalMillis: 80,
      });

      this.sound = sound;
      sound.setOnPlaybackStatusUpdate(this.handleStatusUpdate);

      await sound.playAsync();
      if (DEBUG_AUDIO) console.debug("[SleepAidAudio] loop mode enabled: LoopMode.one equivalent");
      this.isPlaying = true;
      this.isPaused = false;
      this.emitPlaybackState();

      this.startCountdown();
      if (DEBUG_AUDIO) {
        console.debug(
          `[SleepAidAudio] timer start: ${Math.floor(input.durationSeconds / 60)}m (${input.durationSeconds}s)`,
        );
      }
      await this.fadeTo(this.targetVolume, START_FADE_MS);
    } catch {
      this.callbacks.onError("Audio failed to load. Please choose another sound and try again.");
      await this.stop({ withFade: false, resetTimer: true });
    }
  }

  async stopManual(): Promise<void> {
    await this.stop({ withFade: true, fadeDurationMs: MANUAL_STOP_FADE_MS, resetTimer: true });
  }

  async pause(): Promise<void> {
    if (!this.sound || !this.isPlaying || this.isPaused) return;

    await this.sound.pauseAsync().catch(() => undefined);
    this.clearCountdown();
    this.isPaused = true;
    this.emitPlaybackState();
  }

  async resume(): Promise<void> {
    if (!this.sound || !this.isPlaying || !this.isPaused) return;

    await this.sound.playAsync().catch(() => undefined);
    this.isPaused = false;
    this.emitPlaybackState();
    this.startCountdown();
  }

  async setDurationSeconds(durationSeconds: number): Promise<void> {
    this.remainingSeconds = durationSeconds;
    this.callbacks.onRemainingSecondsChange(this.remainingSeconds);

    // Duration changes while playing should reset countdown without interrupting audio.
    if (this.isPlaying && !this.isPaused) {
      this.startCountdown();
    }
  }

  async setTargetVolume(volume: number): Promise<void> {
    this.targetVolume = volume;
    if (this.sound && this.isPlaying && !this.isPaused) {
      await this.sound.setVolumeAsync(this.targetVolume).catch(() => undefined);
    }
  }

  async dispose(): Promise<void> {
    await this.stop({ withFade: false, resetTimer: true });
  }

  private emitPlaybackState() {
    this.callbacks.onPlaybackStateChange({
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
    });
  }

  private clearCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private clearFade() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private startCountdown() {
    this.clearCountdown();

    // Countdown controls the full session length independently from file length.
    this.countdownTimer = setInterval(() => {
      if (this.isPaused) return;

      this.remainingSeconds = Math.max(0, this.remainingSeconds - 1);
      this.callbacks.onRemainingSecondsChange(this.remainingSeconds);

      if (this.remainingSeconds <= 0) {
        if (DEBUG_AUDIO) console.debug("[SleepAidAudio] timer end reached");
        this.stop({ withFade: true, fadeDurationMs: TIMER_END_FADE_MS, resetTimer: true }).catch(
          () => undefined,
        );
      }
    }, 1000);
  }

  private readonly handleStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    if (!this.sound || !this.isPlaying || this.isPaused || this.loopSeekInProgress) return;

    // Fallback loop path for platforms where built-in looping can intermittently fail.
    if (status.didJustFinish) {
      this.loopSeekInProgress = true;
      this.sound
        .setPositionAsync(0)
        .then(() => this.sound?.playAsync())
        .catch(() => {
          this.callbacks.onError("Audio loop restart failed. Please restart playback.");
        })
        .finally(() => {
          this.loopSeekInProgress = false;
        });
      return;
    }

    const duration = status.durationMillis ?? 0;
    if (duration <= 0) return;

    const msLeft = duration - status.positionMillis;

    // Manual near-end seek removes end/start gaps that can happen with default loop mode.
    if (msLeft <= LOOP_RESTART_THRESHOLD_MS) {
      this.loopSeekInProgress = true;
      this.sound
        .setPositionAsync(0)
        .then(() => this.sound?.playAsync())
        .catch(() => {
          this.callbacks.onError("Audio loop restart failed. Please restart playback.");
        })
        .finally(() => {
          setTimeout(() => {
            this.loopSeekInProgress = false;
          }, 40);
        });
    }
  };

  private async fadeTo(targetVolume: number, durationMs: number): Promise<void> {
    if (!this.sound) return;

    this.clearFade();

    const status = await this.sound.getStatusAsync();
    const startVolume =
      status.isLoaded && typeof status.volume === "number" ? status.volume : 0;

    const steps = Math.max(1, Math.round(durationMs / 100));
    let currentStep = 0;

    // Fade logic uses small volume steps to avoid abrupt transitions.
    await new Promise<void>((resolve) => {
      this.fadeTimer = setInterval(() => {
        if (!this.sound) {
          this.clearFade();
          resolve();
          return;
        }

        currentStep += 1;
        const progress = currentStep / steps;
        const nextVolume = startVolume + (targetVolume - startVolume) * progress;

        this.sound.setVolumeAsync(Math.max(0, Math.min(1, nextVolume))).catch(() => undefined);

        if (currentStep >= steps) {
          this.clearFade();
          resolve();
        }
      }, 100);
    });
  }

  private async stop(options: {
    withFade: boolean;
    fadeDurationMs?: number;
    resetTimer: boolean;
  }): Promise<void> {
    this.clearCountdown();

    if (this.sound && options.withFade) {
      await this.fadeTo(0, options.fadeDurationMs ?? MANUAL_STOP_FADE_MS);
    }

    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate(null);
      await this.sound.setPositionAsync(0).catch(() => undefined);
      await this.sound.stopAsync().catch(() => undefined);
      await this.sound.unloadAsync().catch(() => undefined);
      this.sound = null;
    }

    this.clearFade();
    this.loopSeekInProgress = false;
    this.isPlaying = false;
    this.isPaused = false;

    if (options.resetTimer) {
      this.remainingSeconds = 0;
      this.callbacks.onRemainingSecondsChange(0);
    }

    this.emitPlaybackState();
  }
}
