import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";
import { XP_VALUES } from "@/lib/gamification";
import {
  DEFAULT_WIND_DOWN_STEPS,
  getSleepAidState,
  patchSleepAidState,
} from "@/lib/sleep-aid-storage";

export default function WindDownScreen() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;
  const { awardXp } = useSleep();
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  useEffect(() => {
    getSleepAidState().then((state) => setCheckedIds(state.windDownCheckedIds));
  }, []);

  const checkedSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const completeCount = checkedIds.length;
  const totalCount = DEFAULT_WIND_DOWN_STEPS.length;
  const isComplete = completeCount === totalCount;

  const toggleStep = async (id: string) => {
    const next = checkedSet.has(id)
      ? checkedIds.filter((itemId) => itemId !== id)
      : [...checkedIds, id];
    setCheckedIds(next);
    await patchSleepAidState({ windDownCheckedIds: next });
  };

  const handleComplete = async () => {
    if (!isComplete) {
      Alert.alert("Keep going", "Complete all steps to finish your wind-down routine.");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const state = await getSleepAidState();

    // Reward only once per day to avoid accidental repeated XP grants.
    if (state.windDownRewardDate !== today) {
      await awardXp(XP_VALUES.RITUAL_COMPLETE);
      await patchSleepAidState({ windDownRewardDate: today });
      Alert.alert("Routine complete", `Great work. You earned ${XP_VALUES.RITUAL_COMPLETE} XP.`);
      return;
    }

    Alert.alert("Routine complete", "Great consistency. Your reward for today is already claimed.");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.infoTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Why this helps</Text>
          <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Repeating the same steps before bed builds a sleep association. Over time, your brain links this routine with rest.
          </Text>
          <Text style={[styles.progress, { color: theme.primary, fontFamily: "Nunito_700Bold" }]}>{completeCount}/{totalCount} completed</Text>
        </View>

        {DEFAULT_WIND_DOWN_STEPS.map((step) => {
          const checked = checkedSet.has(step.id);
          return (
            <Pressable
              key={step.id}
              onPress={() => toggleStep(step.id)}
              style={[styles.stepRow, { backgroundColor: theme.card, borderColor: checked ? theme.success : theme.cardBorder }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: checked ? theme.success : theme.border,
                    backgroundColor: checked ? theme.success : "transparent",
                  },
                ]}
              >
                {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: checked ? theme.textSecondary : theme.text,
                    fontFamily: "Nunito_600SemiBold",
                    textDecorationLine: checked ? "line-through" : "none",
                  },
                ]}
              >
                {step.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleComplete}
          style={[styles.completeBtn, { backgroundColor: isComplete ? theme.primary : theme.border }]}
          accessibilityRole="button"
          accessibilityLabel="Complete wind-down routine"
        >
          <Text style={[styles.completeBtnText, { fontFamily: "Nunito_700Bold" }]}>Mark Routine Complete</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 44 },
  infoCard: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  infoTitle: { fontSize: 17 },
  infoText: { fontSize: 14.5, lineHeight: 21 },
  progress: { fontSize: 14 },
  stepRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 15.5, lineHeight: 20, flex: 1 },
  completeBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  completeBtnText: { color: "#fff", fontSize: 15 },
});
