import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";

const DURATION_OPTIONS: (2 | 5 | 10)[] = [2, 5, 10];

type Phase = "Inhale" | "Hold" | "Exhale";

export default function GuidedBreathingScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  const [minutes, setMinutes] = useState<2 | 5 | 10>(5);
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [phase, setPhase] = useState<Phase>("Inhale");

  const scale = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSleepAidState().then((state) => setMinutes(state.breathingMinutes));
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      scale.stopAnimation();
    };
  }, [scale]);

  const stopExercise = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setSecondsLeft(0);
    setPhase("Inhale");
    scale.stopAnimation();
    scale.setValue(1);
  };

  const startExercise = () => {
    const totalSeconds = minutes * 60;
    setSecondsLeft(totalSeconds);
    setIsRunning(true);

    // Breathing animation cycle: 4s inhale, 4s hold, 6s exhale.
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    let elapsed = 0;

    // Keep text instructions in sync with the 14-second breathing cycle.
    intervalRef.current = setInterval(() => {
      elapsed += 1;
      const remaining = totalSeconds - elapsed;

      const cycleSecond = elapsed % 14;
      if (cycleSecond < 4) setPhase("Inhale");
      else if (cycleSecond < 8) setPhase("Hold");
      else setPhase("Exhale");

      setSecondsLeft(Math.max(0, remaining));
      if (remaining <= 0) stopExercise();
    }, 1000);
  };

  const formatted = `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.title, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Guided Breathing</Text>
          <Text style={[styles.copy, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Follow the circle pace: inhale for 4 seconds, hold for 4, and exhale for 6.
          </Text>

          <Animated.View style={[styles.circle, { backgroundColor: theme.primary + "2A", borderColor: theme.primary, transform: [{ scale }] }]}>
            <Text style={[styles.phaseText, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>{phase}</Text>
            <Text style={[styles.timerText, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>{isRunning ? formatted : `${minutes}:00`}</Text>
          </Animated.View>

          <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Session Length</Text>
          <View style={styles.rowWrap}>
            {DURATION_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={async () => {
                  if (isRunning) return;
                  setMinutes(option);
                  await patchSleepAidState({ breathingMinutes: option });
                }}
                style={[styles.segmentBtn, { backgroundColor: minutes === option ? theme.primary : theme.surface }]}
              >
                <Text style={[styles.segmentText, { color: minutes === option ? "#fff" : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>{option} min</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => (isRunning ? stopExercise() : startExercise())}
            style={[styles.actionBtn, { backgroundColor: isRunning ? theme.accent : theme.primary }]}
          >
            <Text style={[styles.actionBtnText, { fontFamily: "Nunito_700Bold" }]}>{isRunning ? "Stop Session" : "Start Session"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  title: { fontSize: 18.5 },
  copy: { fontSize: 14.5, lineHeight: 21 },
  circle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignSelf: "center",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  phaseText: { fontSize: 25 },
  timerText: { fontSize: 16.5, marginTop: 4 },
  sectionLabel: { fontSize: 15.5 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  segmentText: { fontSize: 13 },
  actionBtn: { height: 50, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: 6 },
  actionBtnText: { color: "#fff", fontSize: 15 },
});
