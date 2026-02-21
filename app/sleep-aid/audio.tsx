import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from "react-native";
import type { AVPlaybackSource } from "expo-av";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { SleepAidCard } from "@/components/sleep-aid/SleepAidCard";
import { SleepAidScaffold } from "@/components/sleep-aid/SleepAidScaffold";
import { SleepAidSlider } from "@/components/sleep-aid/SleepAidSlider";
import { SleepAidBody, SleepAidHeading, SleepAidSubheading } from "@/components/sleep-aid/SleepAidText";
import { SleepAidAudioController, type SleepAidAudioState } from "@/lib/sleep-aid-audio-controller";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";

type SoundOption = {
  id: string;
  name: string;
  source: AVPlaybackSource;
  category: string;
};

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "soft_rain",
    name: "Soft rain",
    source: require("../../assets/audio/eryliaa-gentle-rain-on-window-for-sleep-422420.mp3"),
    category: "Rain",
  },
  {
    id: "forest_night",
    name: "Forest night ambience",
    source: require("../../assets/audio/eryliaa-night-forest-with-frogs-and-crickets-for-sleep-451153.mp3"),
    category: "Nature",
  },
  {
    id: "soft_fan_hum",
    name: "Soft fan hum",
    source: require("../../assets/audio/h-beats-silent-drum-urban-effect-402704.mp3"),
    category: "Fan",
  },
  {
    id: "pink_noise",
    name: "Pink noise",
    source: require("../../assets/audio/parrot1710-calm-piano-melody-219889.mp3"),
    category: "Noise",
  },
  {
    id: "brown_noise",
    name: "Brown noise",
    source: require("../../assets/audio/restfuldreamingtunes-sounds-of-nature-the-gentle-murmur-of-the-brook-276298.mp3"),
    category: "Noise",
  },
  {
    id: "ocean_waves",
    name: "Ocean waves",
    source: require("../../assets/audio/universfield-tranquil-stream-387678.mp3"),
    category: "Water",
  },
];

const TIMER_OPTIONS: (15 | 30 | 45 | 60)[] = [15, 30, 45, 60];
const SAFE_MAX_VOLUME = 0.7;

const INITIAL_CONTROLLER_STATE: SleepAidAudioState = {
  isPlaying: false,
  isLoading: false,
  remainingSeconds: 0,
  error: "",
};

export default function SleepAidAudioScreen() {
  const [selectedSoundId, setSelectedSoundId] = useState<string>("soft_rain");
  const [timerMinutes, setTimerMinutes] = useState<15 | 30 | 45 | 60>(30);
  const [volume, setVolume] = useState(0.7);
  const [safeMaxEnabled, setSafeMaxEnabled] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [audioState, setAudioState] = useState<SleepAidAudioState>(INITIAL_CONTROLLER_STATE);

  const controllerRef = useRef<SleepAidAudioController | null>(null);

  useEffect(() => {
    controllerRef.current = new SleepAidAudioController((next) => {
      setAudioState(next);
      if (!next.isLoading && !next.isPlaying && next.remainingSeconds === 0) {
        setSessionActive(false);
      }
    });

    getSleepAidState().then((state) => {
      setSelectedSoundId(state.selectedSoundId);
      setTimerMinutes(state.soundTimerMinutes);
      setVolume(state.soundVolume);
      setSafeMaxEnabled(state.soundSafeMaxEnabled);
    });

    return () => {
      controllerRef.current?.dispose().catch(() => undefined);
      controllerRef.current = null;
    };
  }, []);

  const selectedSound = useMemo(
    () => SOUND_OPTIONS.find((item) => item.id === selectedSoundId) ?? SOUND_OPTIONS[0],
    [selectedSoundId],
  );

  const effectiveVolume = safeMaxEnabled ? Math.min(volume, SAFE_MAX_VOLUME) : volume;

  useEffect(() => {
    controllerRef.current?.setVolume(effectiveVolume).catch(() => undefined);
  }, [effectiveVolume]);

  const saveSettings = async (next: {
    selectedSoundId?: string;
    soundTimerMinutes?: 15 | 30 | 45 | 60;
    soundVolume?: number;
    soundSafeMaxEnabled?: boolean;
  }) => {
    await patchSleepAidState({
      selectedSoundId: next.selectedSoundId ?? selectedSoundId,
      soundTimerMinutes: next.soundTimerMinutes ?? timerMinutes,
      soundVolume: next.soundVolume ?? volume,
      soundSafeMaxEnabled: next.soundSafeMaxEnabled ?? safeMaxEnabled,
    });
  };

  const startPlayback = async () => {
    const controller = controllerRef.current;
    if (!controller) return;

    setSessionActive(true);
    await controller.start({
      source: selectedSound.source,
      durationSeconds: timerMinutes * 60,
      targetVolume: effectiveVolume,
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const pauseOrResume = async () => {
    const controller = controllerRef.current;
    if (!controller) return;

    if (audioState.isPlaying) {
      await controller.pause();
      return;
    }

    await controller.resume();
  };

  const stopPlayback = async () => {
    const controller = controllerRef.current;
    if (!controller) return;

    await controller.stop(true);
    setSessionActive(false);
  };

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const sec = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${sec}`;
  };

  return (
    <SleepAidScaffold>
      <SleepAidCard>
        <SleepAidHeading>Calming Sounds</SleepAidHeading>
        <SleepAidBody>
          Audio loops continuously for your full selected timer, then fades out gently at the end.
        </SleepAidBody>
      </SleepAidCard>

      <SleepAidCard>
        <SleepAidSubheading>Choose a Sound</SleepAidSubheading>
        {SOUND_OPTIONS.map((sound) => {
          const selected = sound.id === selectedSound.id;
          return (
            <Pressable
              key={sound.id}
              onPress={async () => {
                setSelectedSoundId(sound.id);
                await saveSettings({ selectedSoundId: sound.id });

                if (sessionActive) {
                  await controllerRef.current?.start({
                    source: sound.source,
                    durationSeconds: timerMinutes * 60,
                    targetVolume: effectiveVolume,
                  });
                }
              }}
              style={[
                styles.optionBtn,
                {
                  borderColor: selected ? Colors.dark.primary : Colors.dark.border,
                  backgroundColor: selected ? "rgba(123,140,222,0.18)" : "rgba(255,255,255,0.02)",
                },
              ]}
            >
              <SleepAidSubheading style={styles.optionName}>{sound.name}</SleepAidSubheading>
              <SleepAidBody style={styles.optionMeta}>{sound.category}</SleepAidBody>
            </Pressable>
          );
        })}
      </SleepAidCard>

      <SleepAidCard>
        <SleepAidSubheading>Sleep Timer</SleepAidSubheading>
        <View style={styles.rowWrap}>
          {TIMER_OPTIONS.map((minutes) => (
            <Pressable
              key={minutes}
              onPress={async () => {
                setTimerMinutes(minutes);
                await saveSettings({ soundTimerMinutes: minutes });

                if (sessionActive) {
                  // Duration changes reset countdown without glitching active playback.
                  await controllerRef.current?.resetTimer(minutes * 60);
                }
              }}
              style={[styles.segmentBtn, { backgroundColor: timerMinutes === minutes ? Colors.dark.primary : Colors.dark.surface }]}
            >
              <SleepAidBody style={[styles.segmentText, { color: timerMinutes === minutes ? "#FFFFFF" : Colors.dark.textSecondary }]}> 
                {minutes} min
              </SleepAidBody>
            </Pressable>
          ))}
        </View>

        <View style={styles.safeMaxRow}>
          <SleepAidSubheading>Safe max volume</SleepAidSubheading>
          <Switch
            value={safeMaxEnabled}
            thumbColor={safeMaxEnabled ? Colors.dark.primary : "#FFFFFF"}
            trackColor={{ false: Colors.dark.border, true: "rgba(123,140,222,0.45)" }}
            onValueChange={async (value) => {
              setSafeMaxEnabled(value);
              await saveSettings({ soundSafeMaxEnabled: value });
            }}
          />
        </View>

        <SleepAidSubheading>Volume</SleepAidSubheading>
        <SleepAidSlider
          value={volume}
          onChange={(next) => {
            const clamped = Math.max(0, Math.min(1, next));
            setVolume(clamped);
            saveSettings({ soundVolume: clamped }).catch(() => undefined);
          }}
        />
        <SleepAidBody style={styles.volumeLabel}>{Math.round(effectiveVolume * 100)}% output</SleepAidBody>
      </SleepAidCard>

      {audioState.error ? (
        <SleepAidCard style={styles.errorCard}>
          <SleepAidSubheading style={styles.errorText}>{audioState.error}</SleepAidSubheading>
        </SleepAidCard>
      ) : null}

      <SleepAidCard style={styles.playerCard}>
        <View style={styles.nowPlayingHeader}>
          <View>
            <SleepAidBody style={styles.nowPlayingLabel}>Now playing</SleepAidBody>
            <SleepAidSubheading>{selectedSound.name}</SleepAidSubheading>
          </View>
          <SleepAidBody>
            {audioState.remainingSeconds > 0 ? formatRemaining(audioState.remainingSeconds) : `${timerMinutes}:00`}
          </SleepAidBody>
        </View>

        <View style={styles.playerActions}>
          {audioState.isLoading ? (
            <ActivityIndicator color={Colors.dark.primary} />
          ) : (
            <Pressable
              onPress={() => {
                if (!sessionActive) {
                  startPlayback().catch(() => undefined);
                  return;
                }

                pauseOrResume().catch(() => undefined);
              }}
              style={[styles.roundButton, { backgroundColor: Colors.dark.primary }]}
            >
              <Ionicons name={!sessionActive || !audioState.isPlaying ? "play" : "pause"} size={20} color="#FFFFFF" />
            </Pressable>
          )}

          <Pressable
            onPress={() => stopPlayback().catch(() => undefined)}
            style={[styles.roundButton, { backgroundColor: Colors.dark.surfaceElevated }]}
          >
            <Ionicons name="stop" size={20} color={Colors.dark.text} />
          </Pressable>
        </View>
      </SleepAidCard>
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  optionBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 3,
  },
  optionName: {
    fontSize: 15,
  },
  optionMeta: {
    fontSize: 13,
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  segmentBtn: { borderRadius: 11, paddingVertical: 8, paddingHorizontal: 13 },
  segmentText: { fontFamily: "Nunito_700Bold", fontSize: 13 },
  safeMaxRow: {
    marginTop: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  volumeLabel: {
    marginTop: 4,
    fontFamily: "Nunito_700Bold",
  },
  errorCard: {
    backgroundColor: "rgba(232,93,117,0.12)",
    borderColor: Colors.dark.error,
  },
  errorText: {
    color: Colors.dark.error,
  },
  playerCard: {
    marginBottom: 6,
  },
  nowPlayingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nowPlayingLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: Colors.dark.primaryLight,
  },
  playerActions: {
    marginTop: 2,
    flexDirection: "row",
    gap: 10,
  },
  roundButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
