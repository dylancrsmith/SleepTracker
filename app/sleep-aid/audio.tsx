import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { AVPlaybackSource } from "expo-av";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { SleepAidScaffold } from "@/app/sleep-aid/components/SleepAidScaffold";
import { SleepAidCard } from "@/app/sleep-aid/components/SleepAidCard";
import { SleepAidFadeIn } from "@/app/sleep-aid/components/SleepAidFadeIn";
import { sleepAidTheme } from "@/app/sleep-aid/components/sleep-aid-theme";
import { SleepAidAudioController } from "@/lib/sleep-aid-audio-controller";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";

type SoundOption = {
  id: string;
  name: string;
  subtitle: string;
  source: AVPlaybackSource;
};

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "brown_noise",
    name: "Brown noise",
    subtitle: "Deep blanket-like texture",
    source: require("../../assets/audio/h-beats-silent-drum-urban-effect-402704.mp3"),
  },
  {
    id: "pink_noise",
    name: "Pink noise",
    subtitle: "Balanced soft static",
    source: require("../../assets/audio/parrot1710-calm-piano-melody-219889.mp3"),
  },
  {
    id: "soft_rain",
    name: "Soft rain",
    subtitle: "Gentle rain on glass",
    source: require("../../assets/audio/eryliaa-gentle-rain-on-window-for-sleep-422420.mp3"),
  },
  {
    id: "ocean_waves",
    name: "Ocean waves",
    subtitle: "Calming stream flow",
    source: require("../../assets/audio/universfield-tranquil-stream-387678.mp3"),
  },
  {
    id: "forest_night",
    name: "Forest night ambience",
    subtitle: "Frogs and crickets",
    source: require("../../assets/audio/eryliaa-night-forest-with-frogs-and-crickets-for-sleep-451153.mp3"),
  },
  {
    id: "soft_fan",
    name: "Soft fan hum",
    subtitle: "Steady nature murmur",
    source: require("../../assets/audio/restfuldreamingtunes-sounds-of-nature-the-gentle-murmur-of-the-brook-276298.mp3"),
  },
];

const QUICK_TIMER_OPTIONS = [15, 30, 60];
const VOLUME_LEVELS = Array.from({ length: 11 }, (_, index) => index / 10);

const LEGACY_SOUND_ID_MAP: Record<string, string> = {
  white_noise: "brown_noise",
  rain: "soft_rain",
  rainforest: "forest_night",
  fan: "soft_fan",
  spa: "ocean_waves",
  guided_relax: "pink_noise",
};

const DURATION_MINUTES_MIN = 1;
const DURATION_MINUTES_MAX = 180;

function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function SleepAidAudioScreen() {
  const controllerRef = useRef<SleepAidAudioController | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const [selectedSoundId, setSelectedSoundId] = useState<string>("brown_noise");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [volume, setVolume] = useState(0.6);
  const [safeVolumeCapEnabled, setSafeVolumeCapEnabled] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [error, setError] = useState("");

  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState("");

  const selectedSound = useMemo(
    () => SOUND_OPTIONS.find((item) => item.id === selectedSoundId) ?? SOUND_OPTIONS[0],
    [selectedSoundId],
  );

  const maxAllowedVolume = safeVolumeCapEnabled ? 0.8 : 1;
  const effectiveVolume = Math.min(volume, maxAllowedVolume);
  const isCustomDuration = !QUICK_TIMER_OPTIONS.includes(durationMinutes);

  const saveSettings = async (next: {
    selectedSoundId?: string;
    selectedSoundName?: string;
    soundTimerMinutes?: number;
    soundVolume?: number;
    safeVolumeCapEnabled?: boolean;
  }) => {
    await patchSleepAidState({
      selectedSoundId: next.selectedSoundId ?? selectedSoundId,
      selectedSoundName: next.selectedSoundName ?? selectedSound.name,
      soundTimerMinutes: next.soundTimerMinutes ?? durationMinutes,
      soundVolume: next.soundVolume ?? volume,
      safeVolumeCapEnabled: next.safeVolumeCapEnabled ?? safeVolumeCapEnabled,
    });
  };

  const restartPlayback = async (nextSoundId?: string) => {
    if (!controllerRef.current) return;

    const soundId = nextSoundId ?? selectedSoundId;
    const sound = SOUND_OPTIONS.find((item) => item.id === soundId) ?? SOUND_OPTIONS[0];

    setError("");
    setIsLoading(true);

    try {
      await controllerRef.current.start({
        source: sound.source,
        durationSeconds: durationMinutes * 60,
        targetVolume: effectiveVolume,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyDuration = async (nextMinutes: number) => {
    setDurationMinutes(nextMinutes);
    await saveSettings({ soundTimerMinutes: nextMinutes });

    if (controllerRef.current && isPlaying) {
      // Duration changes while active reset the countdown immediately without reloading audio.
      await controllerRef.current.setDurationSeconds(nextMinutes * 60);
    }
  };

  const openCustomDurationPicker = () => {
    setCustomMinutesInput(String(durationMinutes));
    setCustomModalVisible(true);
  };

  const applyCustomDuration = async () => {
    const trimmed = customMinutesInput.trim();
    if (!/^\d+$/.test(trimmed)) {
      Alert.alert("Invalid duration", "Enter a whole number between 1 and 180.");
      return;
    }

    const parsed = Number(trimmed);
    if (parsed < DURATION_MINUTES_MIN || parsed > DURATION_MINUTES_MAX) {
      Alert.alert("Invalid duration", "Duration must be between 1 and 180 minutes.");
      return;
    }

    await applyDuration(parsed);
    setCustomModalVisible(false);
    await Haptics.selectionAsync();
  };

  const startPlayback = async () => {
    if (!controllerRef.current) return;

    setError("");
    setIsLoading(true);

    try {
      await controllerRef.current.start({
        source: selectedSound.source,
        durationSeconds: durationMinutes * 60,
        targetVolume: effectiveVolume,
      });
      await Haptics.selectionAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const stopPlayback = async () => {
    if (!controllerRef.current) return;

    setIsLoading(true);
    try {
      await controllerRef.current.stopManual();
      await Haptics.selectionAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const pauseOrResumePlayback = async () => {
    if (!controllerRef.current) return;

    if (isPaused) {
      await controllerRef.current.resume();
    } else {
      await controllerRef.current.pause();
    }

    await Haptics.selectionAsync();
  };

  const changeVolume = async (nextVolume: number) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolume(clamped);
    await saveSettings({ soundVolume: clamped });

    if (controllerRef.current) {
      await controllerRef.current.setTargetVolume(Math.min(clamped, safeVolumeCapEnabled ? 0.8 : 1));
    }
  };

  useEffect(() => {
    controllerRef.current = new SleepAidAudioController({
      onRemainingSecondsChange: setRemainingSeconds,
      onPlaybackStateChange: ({ isPlaying: playing, isPaused: paused }) => {
        setIsPlaying(playing);
        setIsPaused(paused);
      },
      onError: setError,
    });

    getSleepAidState().then((state) => {
      const mappedId = LEGACY_SOUND_ID_MAP[state.selectedSoundId] ?? state.selectedSoundId;
      const validSoundId = SOUND_OPTIONS.some((item) => item.id === mappedId)
        ? mappedId
        : SOUND_OPTIONS[0].id;

      const nextMinutes =
        typeof state.soundTimerMinutes === "number" &&
        state.soundTimerMinutes >= DURATION_MINUTES_MIN &&
        state.soundTimerMinutes <= DURATION_MINUTES_MAX
          ? Math.floor(state.soundTimerMinutes)
          : 30;

      setSelectedSoundId(validSoundId);
      setDurationMinutes(nextMinutes);
      setVolume(state.soundVolume);
      setSafeVolumeCapEnabled(state.safeVolumeCapEnabled);
    });

    return () => {
      controllerRef.current?.dispose().catch(() => undefined);
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!controllerRef.current) return;
    controllerRef.current.setTargetVolume(effectiveVolume).catch(() => undefined);
  }, [effectiveVolume]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasActive = appStateRef.current === "active";
      appStateRef.current = nextState;

      if (wasActive && nextState !== "active" && controllerRef.current && isPlaying && !isPaused) {
        controllerRef.current.pause().catch(() => undefined);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isPaused, isPlaying]);

  return (
    <SleepAidScaffold>
      <SleepAidFadeIn>
        <SleepAidCard>
          <Text style={styles.heading}>Calming Soundscapes</Text>
          <Text style={styles.copy}>
            Select a sound and duration. Playback loops seamlessly for the full timer length.
          </Text>
        </SleepAidCard>
      </SleepAidFadeIn>

      <SleepAidFadeIn delay={60}>
        <SleepAidCard>
          <Text style={styles.sectionTitle}>Choose Sound</Text>
          {SOUND_OPTIONS.map((sound) => {
            const selected = sound.id === selectedSound.id;
            return (
              <Pressable
                key={sound.id}
                onPress={async () => {
                  setSelectedSoundId(sound.id);
                  await saveSettings({ selectedSoundId: sound.id, selectedSoundName: sound.name });
                  await Haptics.selectionAsync();

                  if (isPlaying) {
                    await restartPlayback(sound.id);
                  }
                }}
                style={[styles.optionBtn, selected ? styles.optionBtnActive : null]}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{sound.name}</Text>
                  <Text style={styles.optionSubtitle}>{sound.subtitle}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={19} color={sleepAidTheme.primaryLight} /> : null}
              </Pressable>
            );
          })}
        </SleepAidCard>
      </SleepAidFadeIn>

      <SleepAidFadeIn delay={100}>
        <SleepAidCard>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.rowWrap}>
            {QUICK_TIMER_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={async () => {
                  await applyDuration(minutes);
                  await Haptics.selectionAsync();
                }}
                style={[styles.segmentBtn, durationMinutes === minutes ? styles.segmentBtnActive : null]}
              >
                <Text style={[styles.segmentText, durationMinutes === minutes ? styles.segmentTextActive : null]}>{minutes} min</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={openCustomDurationPicker}
              style={[styles.segmentBtn, isCustomDuration ? styles.segmentBtnActive : null]}
            >
              <Text style={[styles.segmentText, isCustomDuration ? styles.segmentTextActive : null]}>
                Custom ({durationMinutes}m)
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Volume</Text>
          <View style={styles.volumeTrack}>
            {VOLUME_LEVELS.map((level) => {
              const active = level <= volume + 0.001;
              return (
                <Pressable
                  key={level}
                  onPress={() => {
                    changeVolume(level).catch(() => undefined);
                    Haptics.selectionAsync().catch(() => undefined);
                  }}
                  style={[styles.volumeBar, active ? styles.volumeBarActive : null]}
                  accessibilityRole="adjustable"
                  accessibilityLabel={`Volume ${Math.round(level * 100)} percent`}
                />
              );
            })}
          </View>
          <Text style={styles.metaText}>
            Current: {Math.round(volume * 100)}% {safeVolumeCapEnabled ? "(safe cap 80%)" : ""}
          </Text>

          <Pressable
            onPress={async () => {
              const next = !safeVolumeCapEnabled;
              setSafeVolumeCapEnabled(next);
              await saveSettings({ safeVolumeCapEnabled: next });
              await Haptics.selectionAsync();
            }}
            style={styles.capToggle}
          >
            <Text style={styles.capToggleText}>Safe max volume cap: {safeVolumeCapEnabled ? "On" : "Off"}</Text>
          </Pressable>
        </SleepAidCard>
      </SleepAidFadeIn>

      {error ? (
        <SleepAidFadeIn delay={120}>
          <SleepAidCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </SleepAidCard>
        </SleepAidFadeIn>
      ) : null}

      <SleepAidFadeIn delay={140}>
        <Pressable
          onPress={() => {
            if (isLoading) return;
            if (!isPlaying) {
              startPlayback().catch(() => undefined);
            } else {
              stopPlayback().catch(() => undefined);
            }
          }}
          style={[styles.playBtn, { backgroundColor: isPlaying ? sleepAidTheme.accent : sleepAidTheme.primary }]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={isPlaying ? "stop" : "play"} size={20} color="#fff" />
          )}
          <Text style={styles.playText}>{isPlaying ? "Stop with Fade" : "Start with Fade"}</Text>
        </Pressable>
      </SleepAidFadeIn>

      {isPlaying ? (
        <SleepAidFadeIn delay={180}>
          <View style={styles.nowPlayingBar}>
            <View>
              <Text style={styles.nowPlayingLabel}>Now Playing</Text>
              <Text style={styles.nowPlayingTitle}>{selectedSound.name}</Text>
              <Text style={styles.nowPlayingTime}>Remaining {formatSeconds(remainingSeconds)}</Text>
            </View>
            <Pressable onPress={() => pauseOrResumePlayback().catch(() => undefined)} style={styles.pauseBtn}>
              <Ionicons name={isPaused ? "play" : "pause"} size={18} color="#fff" />
            </Pressable>
          </View>
        </SleepAidFadeIn>
      ) : null}

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom Duration</Text>
            <Text style={styles.modalText}>Enter minutes between 1 and 180.</Text>
            <TextInput
              value={customMinutesInput}
              onChangeText={setCustomMinutesInput}
              keyboardType="number-pad"
              placeholder="Minutes"
              placeholderTextColor={sleepAidTheme.textMuted}
              style={styles.modalInput}
              maxLength={3}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCustomModalVisible(false)} style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => applyCustomDuration().catch(() => undefined)} style={styles.modalBtnPrimary}>
                <Text style={styles.modalBtnPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_700Bold",
    fontSize: 19,
  },
  copy: {
    color: sleepAidTheme.textSecondary,
    fontFamily: "Nunito_400Regular",
    fontSize: 14.5,
    lineHeight: 22,
  },
  sectionTitle: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_700Bold",
    fontSize: 15.5,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: sleepAidTheme.border,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  optionBtnActive: {
    borderColor: sleepAidTheme.primary,
    backgroundColor: `${sleepAidTheme.primary}20`,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14.5,
  },
  optionSubtitle: {
    color: sleepAidTheme.textMuted,
    fontFamily: "Nunito_400Regular",
    fontSize: 12.5,
    marginTop: 2,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  segmentBtn: {
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: sleepAidTheme.surface,
  },
  segmentBtnActive: {
    backgroundColor: sleepAidTheme.primary,
  },
  segmentText: {
    color: sleepAidTheme.textSecondary,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#fff",
  },
  volumeTrack: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  volumeBar: {
    flex: 1,
    borderRadius: 6,
    height: 12,
    backgroundColor: sleepAidTheme.surface,
  },
  volumeBarActive: {
    backgroundColor: sleepAidTheme.primary,
  },
  metaText: {
    color: sleepAidTheme.textMuted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12.5,
    marginTop: 6,
  },
  capToggle: {
    borderWidth: 1,
    borderColor: sleepAidTheme.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  capToggleText: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
  },
  errorCard: {
    borderColor: sleepAidTheme.error,
    backgroundColor: `${sleepAidTheme.error}25`,
  },
  errorText: {
    color: sleepAidTheme.error,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
  },
  playBtn: {
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  playText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 15,
  },
  nowPlayingBar: {
    borderWidth: 1,
    borderColor: sleepAidTheme.border,
    backgroundColor: sleepAidTheme.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nowPlayingLabel: {
    color: sleepAidTheme.textMuted,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
  },
  nowPlayingTitle: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_700Bold",
    fontSize: 14.5,
    marginTop: 1,
  },
  nowPlayingTime: {
    color: sleepAidTheme.primaryLight,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12.5,
    marginTop: 1,
  },
  pauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: sleepAidTheme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  modalCard: {
    backgroundColor: sleepAidTheme.card,
    borderColor: sleepAidTheme.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_700Bold",
    fontSize: 17,
  },
  modalText: {
    color: sleepAidTheme.textSecondary,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: sleepAidTheme.border,
    borderRadius: 10,
    color: sleepAidTheme.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: sleepAidTheme.surface,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalBtnSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: sleepAidTheme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalBtnSecondaryText: {
    color: sleepAidTheme.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
  },
  modalBtnPrimary: {
    borderRadius: 10,
    backgroundColor: sleepAidTheme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalBtnPrimaryText: {
    color: "#fff",
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
});
