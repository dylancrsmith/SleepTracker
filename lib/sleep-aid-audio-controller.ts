import { Audio, type AVPlaybackSource, type AVPlaybackStatus } from "expo-av";

export type SleepAidAudioState = {
  isPlaying: boolean;
  isLoading: boolean;
  remainingSeconds: number;
  error: string;
};

type StartOptions = {
  source: AVPlaybackSource;
  durationSeconds: number;
  targetVolume: number;
};

const START_FADE_MS = 2800;
const STOP_FADE_MS = 2200;
const TIMER_FINAL_FADE_SECONDS = 8;

export class SleepAidAudioController {
  private activeSound: Audio.Sound | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private state: SleepAidAudioState = {
    isPlaying: false,
    isLoading: false,
    remainingSeconds: 0,
    error: "",
  };

  private disposed = false;
  private finalFadeStarted = false;
  private currentVolume = 0;
  private targetVolume = 0.7;
  private currentSource: AVPlaybackSource | null = null;

  constructor(private readonly onStateChange: (next: SleepAidAudioState) => void) {}

  private emit(patch: Partial<SleepAidAudioState>) {
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state);
  }

  private clearFadeTimer() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }

  private clearCountdownTimer() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private async buildSound(source: AVPlaybackSource, initialVolume: number): Promise<Audio.Sound> {
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: false,
      isLooping: true,
      volume: initialVolume,
      progressUpdateIntervalMillis: 200,
    });

    sound.setOnPlaybackStatusUpdate((status) => {
      this.handlePlaybackStatus(status).catch(() => undefined);
    });
    console.debug("[SleepAidAudio] Loop mode enabled (isLooping=true)");

    return sound;
  }

  private async handlePlaybackStatus(status: AVPlaybackStatus) {
    if (this.disposed || !status.isLoaded || !this.activeSound) {
      return;
    }

    // Fallback in case platform loop mode misses an edge event on some devices.
    if (status.didJustFinish) {
      await this.activeSound.setPositionAsync(0).catch(() => undefined);
      await this.activeSound.playAsync().catch(() => undefined);
    }
  }

  private fadeMasterTo(target: number, durationMs: number) {
    return new Promise<void>((resolve) => {
      if (!this.activeSound) {
        this.currentVolume = target;
        resolve();
        return;
      }

      this.clearFadeTimer();

      const steps = 22;
      const stepMs = Math.max(40, Math.floor(durationMs / steps));
      const from = this.currentVolume;
      let step = 0;

      // Centralized fade so timer-end and manual controls never fight each other.
      this.fadeTimer = setInterval(() => {
        step += 1;
        const next = from + (target - from) * (step / steps);
        this.activeSound?.setVolumeAsync(next).catch(() => undefined);
        this.currentVolume = next;

        if (step >= steps) {
          this.clearFadeTimer();
          resolve();
        }
      }, stepMs);
    });
  }

  private startCountdown(durationSeconds: number) {
    this.clearCountdownTimer();
    this.finalFadeStarted = false;
    this.emit({ remainingSeconds: durationSeconds });
    console.debug(`[SleepAidAudio] Timer start: ${durationSeconds}s`);

    // Keeps playback alive for full selected duration regardless of track length.
    this.countdownTimer = setInterval(() => {
      const next = this.state.remainingSeconds - 1;

      if (next <= 0) {
        this.emit({ remainingSeconds: 0 });
        console.debug("[SleepAidAudio] Timer end");
        this.stop(false).catch(() => undefined);
        return;
      }

      if (next <= TIMER_FINAL_FADE_SECONDS && !this.finalFadeStarted) {
        this.finalFadeStarted = true;
        this.fadeMasterTo(0, next * 1000).catch(() => undefined);
      }

      this.emit({ remainingSeconds: next });
    }, 1000);
  }

  private async ensureAudioMode() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
    });
  }

  async start({ source, durationSeconds, targetVolume }: StartOptions) {
    if (this.disposed) return;

    this.emit({ isLoading: true, error: "" });

    try {
      await this.ensureAudioMode();
      const sourceChanged = this.currentSource !== source;
      this.targetVolume = targetVolume;

      if (!this.activeSound) {
        this.activeSound = await this.buildSound(source, 0);
      } else if (sourceChanged) {
        await this.activeSound.stopAsync().catch(() => undefined);
        await this.activeSound.unloadAsync().catch(() => undefined);
        this.activeSound = await this.buildSound(source, 0);
      } else {
        await this.activeSound.stopAsync().catch(() => undefined);
        await this.activeSound.setPositionAsync(0).catch(() => undefined);
      }

      this.currentSource = source;
      this.currentVolume = 0;
      await this.activeSound.playAsync();
      await this.fadeMasterTo(this.targetVolume, START_FADE_MS);

      this.emit({ isPlaying: true, isLoading: false });
      this.startCountdown(durationSeconds);
    } catch {
      this.emit({
        isLoading: false,
        isPlaying: false,
        error: "Audio failed to load. Please try another sound.",
      });
    }
  }

  async resetTimer(durationSeconds: number) {
    if (!this.state.isPlaying && !this.activeSound) return;

    if (this.finalFadeStarted && this.targetVolume > 0) {
      await this.fadeMasterTo(this.targetVolume, 1200);
    }

    this.startCountdown(durationSeconds);
  }

  async setVolume(targetVolume: number) {
    this.targetVolume = targetVolume;
    if (!this.activeSound) {
      this.currentVolume = targetVolume;
      return;
    }

    this.currentVolume = targetVolume;
    await this.activeSound.setVolumeAsync(targetVolume).catch(() => undefined);
  }

  async pause() {
    if (!this.activeSound || !this.state.isPlaying) return;

    this.clearCountdownTimer();
    await this.fadeMasterTo(0, 900);
    await this.activeSound.pauseAsync().catch(() => undefined);
    this.emit({ isPlaying: false });
  }

  async resume() {
    if (!this.activeSound || this.state.isPlaying) return;

    await this.activeSound.playAsync().catch(() => undefined);
    await this.fadeMasterTo(this.targetVolume, 1200);
    this.emit({ isPlaying: true });

    if (this.state.remainingSeconds > 0) {
      this.startCountdown(this.state.remainingSeconds);
    }
  }

  async stop(withFade: boolean) {
    this.clearCountdownTimer();
    this.finalFadeStarted = false;

    if (!this.activeSound) {
      this.emit({ isPlaying: false, remainingSeconds: 0, isLoading: false });
      return;
    }

    if (withFade) {
      await this.fadeMasterTo(0, STOP_FADE_MS);
    }

    await this.activeSound.stopAsync().catch(() => undefined);
    await this.activeSound.unloadAsync().catch(() => undefined);
    this.activeSound = null;
    this.currentSource = null;
    this.clearFadeTimer();
    this.currentVolume = 0;
    this.emit({ isPlaying: false, remainingSeconds: 0, isLoading: false });
  }

  async dispose() {
    this.disposed = true;
    this.clearFadeTimer();
    this.clearCountdownTimer();

    if (this.activeSound) {
      await this.activeSound.unloadAsync().catch(() => undefined);
      this.activeSound = null;
    }
  }
}
