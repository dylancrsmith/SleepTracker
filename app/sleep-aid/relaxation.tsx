import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";
import { SleepAidCard } from "@/components/sleep-aid/SleepAidCard";
import { SleepAidScaffold } from "@/components/sleep-aid/SleepAidScaffold";
import { SleepAidBody, SleepAidHeading, SleepAidSubheading } from "@/components/sleep-aid/SleepAidText";

const GUIDE_LINES = [
  "Find a comfortable position and gently close your eyes.",
  "Take a slow breath in through your nose and exhale through your mouth.",
  "Notice your forehead, jaw, and shoulders. Soften each area.",
  "Scan down your arms, chest, and back. Let heavy muscles rest.",
  "Relax your hips, legs, and feet. Allow your breathing to stay easy.",
  "If thoughts appear, acknowledge them and return focus to your breath.",
  "Finish with three calm breaths and set the intention to sleep deeply.",
];

const STEP_DELAY_OPTIONS: (20 | 30 | 45)[] = [20, 30, 45];

export default function RelaxationScreen() {
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [stepDelaySeconds, setStepDelaySeconds] = useState<20 | 30 | 45>(30);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepSecondsLeft, setStepSecondsLeft] = useState(30);
  const [completed, setCompleted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getSleepAidState().then((state) => {
      setAutoAdvance(state.relaxationAutoAdvance);
      setStepDelaySeconds(state.relaxationStepDelaySeconds);
      setStepSecondsLeft(state.relaxationStepDelaySeconds);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const canGoNext = currentStep < GUIDE_LINES.length - 1;

  const stopTick = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const completeSession = useCallback(() => {
    stopTick();
    setSessionActive(false);
    setSessionPaused(false);
    setCompleted(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [stopTick]);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= GUIDE_LINES.length - 1) {
        completeSession();
        return prev;
      }

      const next = prev + 1;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      return next;
    });
    setStepSecondsLeft(stepDelaySeconds);
  }, [completeSession, stepDelaySeconds]);

  useEffect(() => {
    if (!sessionActive || sessionPaused || !autoAdvance) {
      stopTick();
      return;
    }

    stopTick();
    timerRef.current = setInterval(() => {
      setStepSecondsLeft((prev) => {
        if (prev <= 1) {
          goNext();
          return stepDelaySeconds;
        }

        return prev - 1;
      });
    }, 1000);

    return () => stopTick();
  }, [autoAdvance, sessionActive, sessionPaused, currentStep, stepDelaySeconds, goNext, stopTick]);

  const startSession = () => {
    setCompleted(false);
    setSessionActive(true);
    setSessionPaused(false);
    setCurrentStep(0);
    setStepSecondsLeft(stepDelaySeconds);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const pauseSession = () => {
    setSessionPaused((prev) => !prev);
    Haptics.selectionAsync().catch(() => undefined);
  };

  const endSession = () => {
    stopTick();
    setSessionActive(false);
    setSessionPaused(false);
    setCurrentStep(0);
    setStepSecondsLeft(stepDelaySeconds);
  };

  const title = useMemo(() => {
    if (completed) return "Session complete";
    if (!sessionActive) return "Body Scan";

    return `Step ${currentStep + 1} of ${GUIDE_LINES.length}`;
  }, [completed, sessionActive, currentStep]);

  return (
    <SleepAidScaffold>
      <SleepAidCard>
        <SleepAidHeading>5-Minute Relaxation</SleepAidHeading>
        <SleepAidBody>
          Start session mode for a guided body scan that steps through your whole body in a calm sequence.
        </SleepAidBody>

        <View style={styles.toggleRow}>
          <SleepAidSubheading>Auto-advance steps</SleepAidSubheading>
          <Switch
            value={autoAdvance}
            thumbColor={autoAdvance ? Colors.dark.primary : "#FFFFFF"}
            trackColor={{ false: Colors.dark.border, true: "rgba(123,140,222,0.45)" }}
            onValueChange={async (value) => {
              setAutoAdvance(value);
              await patchSleepAidState({ relaxationAutoAdvance: value });
            }}
          />
        </View>

        <View style={styles.delayRow}>
          {STEP_DELAY_OPTIONS.map((seconds) => (
            <Pressable
              key={seconds}
              onPress={async () => {
                setStepDelaySeconds(seconds);
                setStepSecondsLeft(seconds);
                await patchSleepAidState({ relaxationStepDelaySeconds: seconds });
              }}
              style={[styles.delayPill, { backgroundColor: stepDelaySeconds === seconds ? Colors.dark.primary : Colors.dark.surface }]}
            >
              <SleepAidBody style={[styles.delayText, { color: stepDelaySeconds === seconds ? "#FFFFFF" : Colors.dark.textSecondary }]}>
                {seconds}s
              </SleepAidBody>
            </Pressable>
          ))}
        </View>
      </SleepAidCard>

      <SleepAidCard style={styles.sessionCard}>
        <SleepAidSubheading style={styles.sessionTitle}>{title}</SleepAidSubheading>

        {completed ? (
          <SleepAidBody style={styles.completedCopy}>
            You completed the full scan. Keep your breath soft and let your body settle into sleep.
          </SleepAidBody>
        ) : (
          <SleepAidBody style={styles.activeCopy}>
            {GUIDE_LINES[currentStep]}
          </SleepAidBody>
        )}

        {sessionActive && autoAdvance ? (
          <SleepAidBody style={styles.counterText}>Next step in {stepSecondsLeft}s</SleepAidBody>
        ) : null}

        <View style={styles.controls}>
          {!sessionActive ? (
            <Pressable onPress={startSession} style={[styles.mainBtn, { backgroundColor: Colors.dark.primary }]}>
              <SleepAidSubheading style={styles.mainBtnText}>Start Session</SleepAidSubheading>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={pauseSession} style={[styles.halfBtn, { backgroundColor: Colors.dark.surfaceElevated }]}>
                <SleepAidSubheading style={styles.secondaryText}>{sessionPaused ? "Resume" : "Pause"}</SleepAidSubheading>
              </Pressable>
              <Pressable
                onPress={goNext}
                style={[styles.halfBtn, { backgroundColor: Colors.dark.primary }]}
              >
                <SleepAidSubheading style={styles.mainBtnText}>{canGoNext ? "Next" : "Finish"}</SleepAidSubheading>
              </Pressable>
              <Pressable onPress={endSession} style={[styles.ghostBtn, { borderColor: Colors.dark.border }]}> 
                <SleepAidBody style={styles.ghostBtnText}>End Session</SleepAidBody>
              </Pressable>
            </>
          )}
        </View>
      </SleepAidCard>

      <SleepAidCard>
        <SleepAidSubheading>Session Steps</SleepAidSubheading>
        {GUIDE_LINES.map((line, idx) => {
          const highlighted = idx === currentStep && sessionActive;
          return (
            <View
              key={line}
              style={[
                styles.stepLine,
                {
                  backgroundColor: highlighted ? "rgba(123,140,222,0.18)" : "transparent",
                  borderColor: highlighted ? Colors.dark.primary : "transparent",
                },
              ]}
            >
              <SleepAidBody style={{ color: highlighted ? Colors.dark.text : Colors.dark.textSecondary }}>
                {idx + 1}. {line}
              </SleepAidBody>
            </View>
          );
        })}
      </SleepAidCard>
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  delayRow: {
    flexDirection: "row",
    gap: 8,
  },
  delayPill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  delayText: {
    fontFamily: "Nunito_700Bold",
  },
  sessionCard: {
    gap: 12,
  },
  sessionTitle: {
    fontSize: 18,
  },
  completedCopy: {
    color: Colors.dark.success,
    fontFamily: "Nunito_600SemiBold",
  },
  activeCopy: {
    color: Colors.dark.text,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 24,
  },
  counterText: {
    color: Colors.dark.primaryLight,
    fontFamily: "Nunito_700Bold",
    fontSize: 13,
  },
  controls: {
    gap: 8,
  },
  mainBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  mainBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  halfBtn: {
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryText: {
    color: Colors.dark.text,
    fontSize: 15,
  },
  ghostBtn: {
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  ghostBtnText: {
    color: Colors.dark.textSecondary,
    fontFamily: "Nunito_700Bold",
  },
  stepLine: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
});
