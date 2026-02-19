import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, useColorScheme, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";
import { getSleepAidState, patchSleepAidState } from "@/lib/sleep-aid-storage";
import { scheduleSleepAidReminder, cancelSleepAidReminder } from "@/lib/sleep-aid-reminders";

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

export default function SleepAidHubScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { settings } = useSleep();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + webTopInset + 16,
          paddingHorizontal: 20,
          paddingBottom: 100,
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>Sleep Aid</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
          Gentle, non-medical tools to make your pre-sleep routine easier to repeat each night.
        </Text>

        {settings ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Smart Bedtime Reminder</Text>
            <Text style={[styles.cardText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
              You usually sleep at {formatTime(settings.bedtimeHour, settings.bedtimeMinute)}. Would you like a daily wind-down nudge?
            </Text>
            <Pressable
              onPress={handleReminderToggle}
              style={[styles.primaryBtn, { backgroundColor: reminderEnabled ? theme.accent : theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Toggle bedtime reminder"
            >
              <Text style={[styles.primaryBtnText, { fontFamily: "Nunito_700Bold" }]}>
                {reminderEnabled ? "Disable Reminder" : "Enable Daily Reminder"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable onPress={() => router.push("/sleep-aid/wind-down")} style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="checkmark-done-circle-outline" size={22} color={theme.primary} />
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Guided Wind-down Routine</Text>
            <Text style={[styles.menuDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Checklist with progress and a small daily XP reward.</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/sleep-aid/audio")} style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="musical-notes-outline" size={22} color={theme.primary} />
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Calming Audio Sounds</Text>
            <Text style={[styles.menuDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Offline soundscapes with loop, timer, and volume control.</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/sleep-aid/breathing")} style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="ellipse-outline" size={22} color={theme.primary} />
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Guided Breathing</Text>
            <Text style={[styles.menuDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Animated breathing cycle: 4s inhale, 4s hold, 6s exhale.</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/sleep-aid/stretching")} style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="body-outline" size={22} color={theme.primary} />
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Light Stretching & Relax</Text>
            <Text style={[styles.menuDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Gentle step-by-step stretches before bed.</Text>
          </View>
        </Pressable>

        <Pressable onPress={() => router.push("/sleep-aid/relaxation")} style={[styles.menuItem, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="leaf-outline" size={22} color={theme.primary} />
          <View style={styles.menuTextCol}>
            <Text style={[styles.menuTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Relaxation / Meditation</Text>
            <Text style={[styles.menuDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Simple 5-minute body scan guide with timer.</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  cardTitle: { fontSize: 16 },
  cardText: { fontSize: 14, lineHeight: 20 },
  primaryBtn: { height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#fff", fontSize: 14 },
  menuItem: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  menuTextCol: { flex: 1, gap: 4 },
  menuTitle: { fontSize: 15.5 },
  menuDesc: { fontSize: 13.5, lineHeight: 18 },
});
