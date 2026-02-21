import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";
import { SleepAidCard } from "@/components/sleep-aid/SleepAidCard";
import { SleepAidScaffold } from "@/components/sleep-aid/SleepAidScaffold";
import { SleepAidBody, SleepAidHeading, SleepAidSubheading } from "@/components/sleep-aid/SleepAidText";

const DURATION_OPTIONS: (2 | 5 | 10)[] = [2, 5, 10];

type Phase = "Inhale" | "Hold" | "Exhale";

export default function GuidedBreathingScreen() {
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.28,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.28,
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const formatted = `${Math.floor(secondsLeft / 60)}:${(secondsLeft % 60)
    .toString()
    .padStart(2, "0")}`;

  return (
    <SleepAidScaffold>
      <SleepAidCard>
        <SleepAidHeading>Guided Breathing</SleepAidHeading>
        <SleepAidBody>
          Follow a calm rhythm: 4 seconds inhale, 4 hold, 6 exhale.
        </SleepAidBody>

        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: "rgba(123, 140, 222, 0.16)",
              borderColor: Colors.dark.primary,
              transform: [{ scale }],
            },
          ]}
        >
          <SleepAidHeading style={styles.phaseText}>{phase}</SleepAidHeading>
          <SleepAidBody style={styles.timerText}>{isRunning ? formatted : `${minutes}:00`}</SleepAidBody>
        </Animated.View>

        <SleepAidSubheading>Session Length</SleepAidSubheading>
        <View style={styles.rowWrap}>
          {DURATION_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={async () => {
                if (isRunning) return;
                setMinutes(option);
                await patchSleepAidState({ breathingMinutes: option });
              }}
              style={[
                styles.segmentBtn,
                { backgroundColor: minutes === option ? Colors.dark.primary : Colors.dark.surface },
              ]}
            >
              <SleepAidBody style={[styles.segmentText, { color: minutes === option ? "#FFFFFF" : Colors.dark.textSecondary }]}> 
                {option} min
              </SleepAidBody>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => (isRunning ? stopExercise() : startExercise())}
          style={[styles.actionBtn, { backgroundColor: isRunning ? Colors.dark.accent : Colors.dark.primary }]}
        >
          <SleepAidSubheading style={styles.actionBtnText}>{isRunning ? "Stop Session" : "Start Session"}</SleepAidSubheading>
        </Pressable>
      </SleepAidCard>
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 196,
    height: 196,
    borderRadius: 98,
    alignSelf: "center",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
  },
  phaseText: {
    fontSize: 26,
  },
  timerText: {
    marginTop: 3,
    fontFamily: "Nunito_700Bold",
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  segmentBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  segmentText: { fontFamily: "Nunito_700Bold", fontSize: 13.5 },
  actionBtn: { height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 6 },
  actionBtnText: { color: "#FFFFFF", fontSize: 15 },
});
