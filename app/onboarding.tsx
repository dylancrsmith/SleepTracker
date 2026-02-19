import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const REMINDER_OPTIONS = [15, 30, 45, 60, 90];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad(m)} ${ampm}`;
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { completeOnboarding } = useSleep();

  const [step, setStep] = useState(0);
  const [bedH, setBedH] = useState(22);
  const [bedM, setBedM] = useState(30);
  const [wakeH, setWakeH] = useState(7);
  const [wakeM, setWakeM] = useState(0);
  const [reminder, setReminder] = useState(30);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await completeOnboarding({
      bedtimeHour: bedH,
      bedtimeMinute: bedM,
      wakeHour: wakeH,
      wakeMinute: wakeM,
      reminderMinutes: reminder,
    });
    router.replace("/(tabs)");
  };

  const renderWelcome = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
        <Ionicons name="moon" size={48} color={theme.moonLavender} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
        Welcome to DreamStreak
      </Text>
      <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
        Build a consistent sleep routine through tracking, rituals, and gamification. Your sleep journey starts here.
      </Text>
      <View style={[styles.featureList, { backgroundColor: theme.surface }]}>
        {[
          { icon: "time", label: "Track your sleep schedule" },
          { icon: "flame", label: "Build streaks & earn XP" },
          { icon: "bar-chart", label: "View sleep analytics" },
          { icon: "shield-checkmark", label: "100% private & local" },
        ].map((item, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={item.icon as any} size={20} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderBedtime = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: theme.sleepBlue + "20" }]}>
        <Ionicons name="bed" size={44} color={theme.sleepBlue} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
        Target Bedtime
      </Text>
      <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
        When do you usually go to sleep?
      </Text>
      <View style={[styles.timeDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.timeText, { color: theme.primary, fontFamily: "Nunito_800ExtraBold" }]}>
          {formatTime(bedH, bedM)}
        </Text>
      </View>
      <View style={styles.pickerRow}>
        <View style={styles.pickerCol}>
          <Text style={[styles.pickerLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Hour</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {HOURS.map((h) => (
              <Pressable key={h} onPress={() => setBedH(h)} style={[styles.pickerItem, bedH === h && { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.pickerItemText, { color: bedH === h ? theme.primary : theme.textSecondary, fontFamily: bedH === h ? "Nunito_700Bold" : "Nunito_400Regular" }]}>
                  {pad(h)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerCol}>
          <Text style={[styles.pickerLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Min</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {MINUTES.map((m) => (
              <Pressable key={m} onPress={() => setBedM(m)} style={[styles.pickerItem, bedM === m && { backgroundColor: theme.primary + "20" }]}>
                <Text style={[styles.pickerItemText, { color: bedM === m ? theme.primary : theme.textSecondary, fontFamily: bedM === m ? "Nunito_700Bold" : "Nunito_400Regular" }]}>
                  {pad(m)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  const renderWakeTime = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: theme.accent + "20" }]}>
        <Ionicons name="sunny" size={44} color={theme.accent} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
        Target Wake Time
      </Text>
      <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
        When do you usually wake up?
      </Text>
      <View style={[styles.timeDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.timeText, { color: theme.accent, fontFamily: "Nunito_800ExtraBold" }]}>
          {formatTime(wakeH, wakeM)}
        </Text>
      </View>
      <View style={styles.pickerRow}>
        <View style={styles.pickerCol}>
          <Text style={[styles.pickerLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Hour</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {HOURS.map((h) => (
              <Pressable key={h} onPress={() => setWakeH(h)} style={[styles.pickerItem, wakeH === h && { backgroundColor: theme.accent + "20" }]}>
                <Text style={[styles.pickerItemText, { color: wakeH === h ? theme.accent : theme.textSecondary, fontFamily: wakeH === h ? "Nunito_700Bold" : "Nunito_400Regular" }]}>
                  {pad(h)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerCol}>
          <Text style={[styles.pickerLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Min</Text>
          <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
            {MINUTES.map((m) => (
              <Pressable key={m} onPress={() => setWakeM(m)} style={[styles.pickerItem, wakeM === m && { backgroundColor: theme.accent + "20" }]}>
                <Text style={[styles.pickerItemText, { color: wakeM === m ? theme.accent : theme.textSecondary, fontFamily: wakeM === m ? "Nunito_700Bold" : "Nunito_400Regular" }]}>
                  {pad(m)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  const renderReminder = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, { backgroundColor: theme.success + "20" }]}>
        <Ionicons name="notifications" size={44} color={theme.success} />
      </View>
      <Text style={[styles.stepTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
        Wind-Down Reminder
      </Text>
      <Text style={[styles.stepDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
        How long before bedtime should we remind you to start your ritual?
      </Text>
      <View style={styles.reminderGrid}>
        {REMINDER_OPTIONS.map((mins) => (
          <Pressable
            key={mins}
            onPress={() => { setReminder(mins); Haptics.selectionAsync(); }}
            style={[
              styles.reminderOption,
              { backgroundColor: reminder === mins ? theme.primary : theme.surface, borderColor: reminder === mins ? theme.primary : theme.border },
            ]}
          >
            <Text style={[styles.reminderText, { color: reminder === mins ? "#fff" : theme.text, fontFamily: "Nunito_700Bold" }]}>
              {mins} min
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.infoCard, { backgroundColor: theme.surface }]}>
        <Ionicons name="information-circle" size={20} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
          All data stays on your device. We never upload anything to the cloud. You can delete all data anytime from settings.
        </Text>
      </View>
    </View>
  );

  const steps = [renderWelcome, renderBedtime, renderWakeTime, renderReminder];

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + webTopInset, paddingBottom: insets.bottom + webBottomInset }]}>
      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? theme.primary : theme.border }]} />
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {steps[step]()}
      </ScrollView>
      <View style={styles.buttonRow}>
        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={[styles.backBtn, { borderColor: theme.border }]}>
            <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
          </Pressable>
        )}
        <Pressable onPress={handleNext} style={[styles.nextBtn, { backgroundColor: theme.primary }]}>
          <Text style={[styles.nextBtnText, { fontFamily: "Nunito_700Bold" }]}>
            {step === 3 ? "Get Started" : "Continue"}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressRow: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  stepContent: { alignItems: "center", gap: 16, paddingTop: 24 },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 26, textAlign: "center", lineHeight: 32 },
  stepDesc: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 12 },
  featureList: { width: "100%", borderRadius: 16, padding: 20, gap: 16, marginTop: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 15 },
  timeDisplay: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  timeText: { fontSize: 36 },
  pickerRow: { flexDirection: "row", gap: 24, marginTop: 8 },
  pickerCol: { alignItems: "center", width: 80 },
  pickerLabel: { fontSize: 13, marginBottom: 8 },
  pickerScroll: { height: 180 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  pickerItemText: { fontSize: 18 },
  reminderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 8 },
  reminderOption: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, borderWidth: 1.5 },
  reminderText: { fontSize: 15 },
  infoCard: { flexDirection: "row", gap: 10, padding: 16, borderRadius: 12, marginTop: 12 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  buttonRow: { flexDirection: "row", paddingHorizontal: 24, paddingBottom: 16, gap: 12, alignItems: "center" },
  backBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nextBtn: { flex: 1, flexDirection: "row", height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", gap: 6 },
  nextBtnText: { color: "#fff", fontSize: 16 },
});
