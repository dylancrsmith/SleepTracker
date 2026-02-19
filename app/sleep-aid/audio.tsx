import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, useColorScheme } from "react-native";
import { Audio, type AVPlaybackSource } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";

type SoundOption = {
  id: string;
  name: string;
  source: AVPlaybackSource;
};

const SOUND_OPTIONS: SoundOption[] = [
  { id: "white_noise", name: "White noise", source: require("../../assets/audio/white-noise.wav") },
  { id: "rain", name: "Rain", source: require("../../assets/audio/rain.wav") },
  { id: "rainforest", name: "Nature / rainforest", source: require("../../assets/audio/rainforest.wav") },
  { id: "fan", name: "Fan", source: require("../../assets/audio/fan.wav") },
  { id: "spa", name: "Soft spa music", source: require("../../assets/audio/spa.wav") },
  { id: "guided_relax", name: "Guided relaxation", source: require("../../assets/audio/guided-relaxation.wav") },
];

const TIMER_OPTIONS: (15 | 30 | 60)[] = [15, 30, 60];
const VOLUME_OPTIONS = [0.2, 0.4, 0.6, 0.8, 1];

export default function SleepAidAudioScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  const soundRef = useRef<Audio.Sound | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedSoundId, setSelectedSoundId] = useState<string>("white_noise");
  const [timerMinutes, setTimerMinutes] = useState<15 | 30 | 60>(30);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedSound = useMemo(
    () => SOUND_OPTIONS.find((item) => item.id === selectedSoundId) ?? SOUND_OPTIONS[0],
    [selectedSoundId],
  );

  useEffect(() => {
    getSleepAidState().then((state) => {
      setSelectedSoundId(state.selectedSoundId);
      setTimerMinutes(state.soundTimerMinutes);
      setVolume(state.soundVolume);
    });

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => undefined);
      }
    };
  }, []);

  const saveSettings = async (next: {
    selectedSoundId?: string;
    soundTimerMinutes?: 15 | 30 | 60;
    soundVolume?: number;
  }) => {
    await patchSleepAidState({
      selectedSoundId: next.selectedSoundId ?? selectedSoundId,
      soundTimerMinutes: next.soundTimerMinutes ?? timerMinutes,
      soundVolume: next.soundVolume ?? volume,
    });
  };

  const stopPlayback = async () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (soundRef.current) {
      await soundRef.current.stopAsync().catch(() => undefined);
      await soundRef.current.unloadAsync().catch(() => undefined);
      soundRef.current = null;
    }
    setIsPlaying(false);
  };

  const startPlayback = async () => {
    setError("");
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
      });

      await stopPlayback();

      const { sound } = await Audio.Sound.createAsync(
        selectedSound.source,
        {
          shouldPlay: true,
          isLooping: true,
          volume,
        },
      );

      soundRef.current = sound;
      setIsPlaying(true);

      // Stop playback after the selected timer window.
      stopTimerRef.current = setTimeout(() => {
        stopPlayback().catch(() => undefined);
      }, timerMinutes * 60 * 1000);
    } catch (e) {
      setError("Audio failed to start. Check bundled assets and try again.");
      setIsPlaying(false);
      Alert.alert("Playback error", e instanceof Error ? e.message : "Could not initialize audio.");
    }
  };

  const changeVolume = async (nextVolume: number) => {
    setVolume(nextVolume);
    await saveSettings({ soundVolume: nextVolume });
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(nextVolume).catch(() => undefined);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.heading, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Calming Audio (Offline)</Text>
          <Text style={[styles.text, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Bundled offline tracks for wind-down. No microphone recording and no user audio storage.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Choose Sound</Text>
          {SOUND_OPTIONS.map((sound) => {
            const selected = sound.id === selectedSound.id;
            return (
              <Pressable
                key={sound.id}
                onPress={async () => {
                  setSelectedSoundId(sound.id);
                  await saveSettings({ selectedSoundId: sound.id });
                }}
                style={[styles.optionBtn, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.primary + "20" : "transparent" }]}
              >
                <Text style={[styles.optionBtnText, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>{sound.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Sleep Timer</Text>
          <View style={styles.rowWrap}>
            {TIMER_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                onPress={async () => {
                  setTimerMinutes(minutes);
                  await saveSettings({ soundTimerMinutes: minutes });
                }}
                style={[styles.segmentBtn, { backgroundColor: timerMinutes === minutes ? theme.primary : theme.surface }]}
              >
                <Text style={[styles.segmentText, { color: timerMinutes === minutes ? "#fff" : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>{minutes} min</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold", marginTop: 16 }]}>Volume</Text>
          <View style={styles.rowWrap}>
            {VOLUME_OPTIONS.map((vol) => (
              <Pressable
                key={vol}
                onPress={() => {
                  changeVolume(vol).catch(() => undefined);
                }}
                style={[styles.segmentBtn, { backgroundColor: Math.abs(volume - vol) < 0.01 ? theme.primary : theme.surface }]}
              >
                <Text style={[styles.segmentText, { color: Math.abs(volume - vol) < 0.01 ? "#fff" : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>{Math.round(vol * 100)}%</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: theme.error + "20", borderColor: theme.error }]}> 
            <Text style={[styles.errorText, { color: theme.error, fontFamily: "Nunito_600SemiBold" }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => (isPlaying ? stopPlayback() : startPlayback())}
          style={[styles.playBtn, { backgroundColor: isPlaying ? theme.accent : theme.primary }]}
        >
          <Ionicons name={isPlaying ? "stop" : "play"} size={20} color="#fff" />
          <Text style={[styles.playText, { fontFamily: "Nunito_700Bold" }]}>{isPlaying ? "Stop Playback" : "Play Loop"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 9 },
  heading: { fontSize: 18.5 },
  text: { fontSize: 14.5, lineHeight: 21 },
  sectionTitle: { fontSize: 15.5 },
  optionBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, marginTop: 8 },
  optionBtnText: { fontSize: 14.5 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  segmentBtn: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  segmentText: { fontSize: 13.5 },
  errorCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13 },
  playBtn: {
    marginTop: 4,
    height: 50,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  playText: { color: "#fff", fontSize: 15 },
});
