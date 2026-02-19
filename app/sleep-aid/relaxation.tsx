import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";

const GUIDE_LINES = [
  "Find a comfortable position and gently close your eyes.",
  "Take a slow breath in through your nose and exhale through your mouth.",
  "Notice your forehead, jaw, and shoulders. Soften each area.",
  "Scan down your arms, chest, and back. Let heavy muscles rest.",
  "Relax your hips, legs, and feet. Allow your breathing to stay easy.",
  "If thoughts appear, acknowledge them and return focus to your breath.",
  "Finish with three calm breaths and set the intention to sleep deeply.",
];

export default function RelaxationScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  const [timerEnabled, setTimerEnabled] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSleepAidState().then((state) => setTimerEnabled(state.relaxTimerEnabled));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
    setSecondsLeft(5 * 60);
  };

  const startTimer = () => {
    setRunning(true);
    setSecondsLeft(5 * 60);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatted = `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60).toString().padStart(2, "0")}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.title, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>5-Minute Relaxation / Body Scan</Text>
          <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Follow this short, non-medical body-scan to settle your mind and prepare for sleep.
          </Text>

          <Pressable
            onPress={async () => {
              const next = !timerEnabled;
              setTimerEnabled(next);
              await patchSleepAidState({ relaxTimerEnabled: next });
              if (!next) stopTimer();
            }}
            style={[styles.timerToggle, { borderColor: theme.border }]}
          >
            <Text style={[styles.timerToggleText, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>Optional 5-minute timer: {timerEnabled ? "On" : "Off"}</Text>
          </Pressable>

          {timerEnabled ? (
            <Pressable
              onPress={() => (running ? stopTimer() : startTimer())}
              style={[styles.timerBtn, { backgroundColor: running ? theme.accent : theme.primary }]}
            >
              <Text style={[styles.timerBtnText, { fontFamily: "Nunito_700Bold" }]}>{running ? `Stop (${formatted})` : "Start Timer"}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          {GUIDE_LINES.map((line, idx) => (
            <Text key={line} style={[styles.line, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
              {idx + 1}. {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 11 },
  title: { fontSize: 18.5 },
  copy: { fontSize: 14.5, lineHeight: 21 },
  timerToggle: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  timerToggleText: { fontSize: 14.5 },
  timerBtn: { height: 46, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  timerBtnText: { color: "#fff", fontSize: 14.5 },
  line: { fontSize: 14.5, lineHeight: 22 },
});
