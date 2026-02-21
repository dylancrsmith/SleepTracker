import React, { useEffect, useState } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";
import { scheduleSleepAidReminder, cancelSleepAidReminder } from "@/lib/sleep-aid-reminders";
import { SleepAidCard } from "@/components/sleep-aid/SleepAidCard";
import { SleepAidScaffold } from "@/components/sleep-aid/SleepAidScaffold";
import { SleepAidBody, SleepAidHeading, SleepAidSubheading } from "@/components/sleep-aid/SleepAidText";

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

const MENU_ITEMS = [
  {
    title: "Guided Wind-down Routine",
    description: "Checklist with progress and small daily XP reward.",
    route: "/sleep-aid/wind-down" as const,
    icon: "checkmark-done-circle-outline" as const,
  },
  {
    title: "Calming Audio Sounds",
    description: "Soft offline soundscapes with fades and sleep timer.",
    route: "/sleep-aid/audio" as const,
    icon: "musical-notes-outline" as const,
  },
  {
    title: "Guided Breathing",
    description: "Animated breathing rhythm to settle your nervous system.",
    route: "/sleep-aid/breathing" as const,
    icon: "ellipse-outline" as const,
  },
  {
    title: "Light Stretching & Relax",
    description: "Gentle sequence to release tension before bed.",
    route: "/sleep-aid/stretching" as const,
    icon: "body-outline" as const,
  },
  {
    title: "Relaxation / Body Scan",
    description: "Guided session mode with auto-advance or manual pacing.",
    route: "/sleep-aid/relaxation" as const,
    icon: "leaf-outline" as const,
  },
];

export default function SleepAidHubScreen() {
  const { settings } = useSleep();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    getSleepAidState().then((state) => setReminderEnabled(state.reminderEnabled));
  }, []);

  const handleReminderToggle = async () => {
    if (!settings) {
      Alert.alert("Setup needed", "Set your bedtime in Settings first.");
      return;
    }

    try {
      if (reminderEnabled) {
        await cancelSleepAidReminder();
        await patchSleepAidState({ reminderEnabled: false });
        setReminderEnabled(false);
      } else {
        await scheduleSleepAidReminder(settings);
        await patchSleepAidState({ reminderEnabled: true });
        setReminderEnabled(true);
      }

      Haptics.selectionAsync().catch(() => undefined);
    } catch (error) {
      Alert.alert(
        "Reminder unavailable",
        error instanceof Error
          ? error.message
          : "Could not update reminder settings.",
      );
    }
  };

  return (
    <SleepAidScaffold>
      <SleepAidCard>
        <SleepAidHeading>Sleep Aid</SleepAidHeading>
        <SleepAidBody>
          Gentle, non-medical tools to help your evenings feel quieter, smoother, and repeatable.
        </SleepAidBody>
      </SleepAidCard>

      {settings ? (
        <SleepAidCard>
          <SleepAidSubheading>Smart Bedtime Reminder</SleepAidSubheading>
          <SleepAidBody>
            Your bedtime is {formatTime(settings.bedtimeHour, settings.bedtimeMinute)}. Keep a gentle wind-down nudge on?
          </SleepAidBody>
          <Pressable
            onPress={handleReminderToggle}
            style={[styles.primaryBtn, { backgroundColor: reminderEnabled ? Colors.dark.accent : Colors.dark.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Toggle bedtime reminder"
          >
            <SleepAidSubheading style={styles.primaryBtnText}>
              {reminderEnabled ? "Disable Reminder" : "Enable Daily Reminder"}
            </SleepAidSubheading>
          </Pressable>
        </SleepAidCard>
      ) : null}

      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.route}
          onPress={() => router.push(item.route)}
          style={styles.menuItem}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={22} color={Colors.dark.primaryLight} />
          </View>
          <View style={styles.menuTextCol}>
            <SleepAidSubheading style={styles.menuTitle}>{item.title}</SleepAidSubheading>
            <SleepAidBody style={styles.menuDesc}>{item.description}</SleepAidBody>
          </View>
        </Pressable>
      ))}
    </SleepAidScaffold>
  );
}

const styles = StyleSheet.create({
  primaryBtn: { height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryBtnText: { color: "#fff", fontSize: 14.5 },
  menuItem: {
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    borderRadius: 16,
    backgroundColor: "rgba(26, 34, 64, 0.86)",
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(123, 140, 222, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(123, 140, 222, 0.36)",
  },
  menuTextCol: { flex: 1, gap: 3 },
  menuTitle: { fontSize: 15.5 },
  menuDesc: { fontSize: 13.5, lineHeight: 19 },
});
