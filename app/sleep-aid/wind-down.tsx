import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";
import { XP_VALUES } from "@/lib/gamification";
import {
  DEFAULT_WIND_DOWN_STEPS,
  getSleepAidState,
  patchSleepAidState,
} from "@/lib/sleep-aid-storage";
import { SleepAidScaffold } from "@/components/sleep-aid/SleepAidScaffold";
import { SleepAidCard } from "@/components/sleep-aid/SleepAidCard";
import { SleepAidBody, SleepAidHeading, SleepAidSubheading } from "@/components/sleep-aid/SleepAidText";

export default function WindDownScreen() {
  const { awardXp } = useSleep();
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    getSleepAidState().then((state) => setCheckedIds(state.windDownCheckedIds));
  }, []);

  const checkedSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const completeCount = checkedIds.length;
  const totalCount = DEFAULT_WIND_DOWN_STEPS.length;
  const isComplete = completeCount === totalCount;
  const progress = completeCount / totalCount;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const toggleStep = async (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = checkedSet.has(id)
      ? checkedIds.filter((itemId) => itemId !== id)
      : [...checkedIds, id];

    setCheckedIds(next);
    await patchSleepAidState({ windDownCheckedIds: next });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const handleComplete = async () => {
    if (!isComplete) {
      Alert.alert("Keep going", "Complete all steps to finish your wind-down routine.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const state = await getSleepAidState();

    if (state.windDownRewardDate !== today) {
      await awardXp(XP_VALUES.RITUAL_COMPLETE);
      await patchSleepAidState({ windDownRewardDate: today });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      Alert.alert("Routine complete", `Great work. You earned ${XP_VALUES.RITUAL_COMPLETE} XP.`);
      return;
    }

    Alert.alert("Routine complete", "Great consistency. Your reward for today is already claimed.");
  };

  return (
    <SleepAidScaffold>
      <SleepAidCard>
        <SleepAidHeading>Wind-down Routine</SleepAidHeading>
        <SleepAidBody>
          Repeating the same night sequence helps your brain associate this moment with sleep.
        </SleepAidBody>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <SleepAidSubheading style={styles.progressText}>{completeCount}/{totalCount} complete</SleepAidSubheading>
        </View>
      </SleepAidCard>

      {DEFAULT_WIND_DOWN_STEPS.map((step) => {
        const checked = checkedSet.has(step.id);
        return (
          <Pressable
            key={step.id}
            onPress={() => toggleStep(step.id)}
            style={[styles.stepRow, checked ? styles.stepRowDone : styles.stepRowIdle]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
          >
            <Animated.View
              style={[
                styles.checkbox,
                checked ? styles.checkboxChecked : styles.checkboxIdle,
                {
                  transform: [{ scale: checked ? 1 : 0.94 }],
                },
              ]}
            >
              {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
            </Animated.View>
            <SleepAidBody style={[styles.stepLabel, checked ? styles.stepLabelDone : undefined]}>{step.label}</SleepAidBody>
          </Pressable>
        );
      })}

      <Pressable
        onPress={handleComplete}
        style={[styles.completeBtn, { backgroundColor: isComplete ? Colors.dark.primary : Colors.dark.border }]}
        accessibilityRole="button"
        accessibilityLabel="Complete wind-down routine"
      >
        <SleepAidSubheading style={styles.completeBtnText}>Mark Routine Complete</SleepAidSubheading>
      </Pressable>
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  progressWrap: { gap: 10, marginTop: 4 },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary,
  },
  progressText: {
    color: Colors.dark.primaryLight,
    fontSize: 13,
  },
  stepRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepRowIdle: {
    borderColor: Colors.dark.cardBorder,
    backgroundColor: "rgba(26, 34, 64, 0.86)",
  },
  stepRowDone: {
    borderColor: Colors.dark.success,
    backgroundColor: "rgba(40, 78, 70, 0.35)",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxIdle: {
    borderColor: Colors.dark.border,
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    borderColor: Colors.dark.success,
    backgroundColor: Colors.dark.success,
  },
  stepLabel: {
    flex: 1,
    color: Colors.dark.text,
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
  },
  stepLabelDone: {
    color: Colors.dark.textSecondary,
    textDecorationLine: "line-through",
  },
  completeBtn: {
    marginTop: 6,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
  },
});
