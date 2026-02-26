import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Platform, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";
import { useAuth } from "@/lib/auth-context";
import { router, type Href } from "expo-router";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatTime(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad(m)} ${ampm}`;
}

function TimePicker({ label, hour, minute, onChangeHour, onChangeMinute, color, theme }: {
  label: string; hour: number; minute: number;
  onChangeHour: (h: number) => void; onChangeMinute: (m: number) => void;
  color: string; theme: any;
}) {
  return (
    <View style={settingStyles.timePickerCard}>
      <Text style={[settingStyles.timePickerLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>{label}</Text>
      <Text style={[settingStyles.timePickerValue, { color, fontFamily: "Nunito_800ExtraBold" }]}>
        {formatTime(hour, minute)}
      </Text>
      <View style={settingStyles.adjustRow}>
        <Pressable onPress={() => onChangeHour((hour + 23) % 24)} style={[settingStyles.adjustBtn, { backgroundColor: theme.surface }]}>
          <Ionicons name="remove" size={18} color={theme.text} />
        </Pressable>
        <Text style={[settingStyles.adjustLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Hour</Text>
        <Pressable onPress={() => onChangeHour((hour + 1) % 24)} style={[settingStyles.adjustBtn, { backgroundColor: theme.surface }]}>
          <Ionicons name="add" size={18} color={theme.text} />
        </Pressable>
        <View style={{ width: 16 }} />
        <Pressable onPress={() => onChangeMinute((minute + 45) % 60)} style={[settingStyles.adjustBtn, { backgroundColor: theme.surface }]}>
          <Ionicons name="remove" size={18} color={theme.text} />
        </Pressable>
        <Text style={[settingStyles.adjustLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Min</Text>
        <Pressable onPress={() => onChangeMinute((minute + 15) % 60)} style={[settingStyles.adjustBtn, { backgroundColor: theme.surface }]}>
          <Ionicons name="add" size={18} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const {
    settings, updateSettings, motionEnabled, toggleMotion,
    checklistItems, updateChecklistItems, deleteAllData, sleepLogs,
  } = useSleep();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const [bedH, setBedH] = useState(settings?.bedtimeHour ?? 22);
  const [bedM, setBedM] = useState(settings?.bedtimeMinute ?? 30);
  const [wakeH, setWakeH] = useState(settings?.wakeHour ?? 7);
  const [wakeM, setWakeM] = useState(settings?.wakeMinute ?? 0);
  const [reminder, setReminder] = useState(settings?.reminderMinutes ?? 30);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const healthKitRoute = "/healthkit-sync" as Href;

  useEffect(() => {
    if (settings) {
      setBedH(settings.bedtimeHour);
      setBedM(settings.bedtimeMinute);
      setWakeH(settings.wakeHour);
      setWakeM(settings.wakeMinute);
      setReminder(settings.reminderMinutes);
    }
  }, [settings]);

  const handleSaveSchedule = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateSettings({
      bedtimeHour: bedH,
      bedtimeMinute: bedM,
      wakeHour: wakeH,
      wakeMinute: wakeM,
      reminderMinutes: reminder,
    });
    Alert.alert("Saved", "Your schedule has been updated.");
  };

  const handleDeleteAll = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently remove all your sleep logs, settings, badges, and progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            await deleteAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const toggleChecklistItem = async (id: string) => {
    const updated = checklistItems.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    await updateChecklistItems(updated);
  };

  const handleExportCSV = () => {
    if (sleepLogs.length === 0) {
      Alert.alert("No Data", "No sleep logs to export.");
      return;
    }
    const header = "Date,Start Time,End Time,Duration (min),Rating,Consistency,Tags,Note\n";
    const rows = sleepLogs.map((l) => {
      const start = new Date(l.startTime).toISOString();
      const end = new Date(l.endTime).toISOString();
      return `${l.date},${start},${end},${l.durationMinutes},${l.rating},${l.consistencyScore},"${l.tags.join(";")}","${l.note}"`;
    }).join("\n");
    const csv = header + rows;
    Alert.alert("CSV Export", `Your ${sleepLogs.length} sleep logs are ready.\n\n${csv.substring(0, 200)}...`);
  };

  if (showPrivacy) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => setShowPrivacy(false)} style={styles.backRow}>
            <Ionicons name="chevron-back" size={22} color={theme.primary} />
            <Text style={[styles.backText, { color: theme.primary, fontFamily: "Nunito_600SemiBold" }]}>Back</Text>
          </Pressable>
          <Text style={[styles.pageTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
            Privacy & Data
          </Text>
          <View style={[styles.privacyCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.privacyHeading, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
              What We Collect
            </Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
              {`\u2022 Sleep start and end timestamps\n\u2022 Your sleep quality rating (1-5)\n\u2022 Optional tags (caffeine, stress, etc.)\n\u2022 Night ritual checklist completion\n\u2022 Motion count during sleep (if enabled)\n\u2022 Gamification progress (XP, streaks, badges)`}
            </Text>
            <Text style={[styles.privacyHeading, { color: theme.text, fontFamily: "Nunito_700Bold", marginTop: 20 }]}>
              Where It's Stored
            </Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
              All data is stored locally on your device only. Nothing is ever uploaded to any server or cloud service. We follow data minimisation principles - we only collect what's needed for the app to function.
            </Text>
            <Text style={[styles.privacyHeading, { color: theme.text, fontFamily: "Nunito_700Bold", marginTop: 20 }]}>
              Your Rights
            </Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
              You can delete all your data at any time using the "Delete All Data" button in settings. This permanently removes all sleep logs, settings, and progress from your device.
            </Text>
            <Text style={[styles.privacyHeading, { color: theme.text, fontFamily: "Nunito_700Bold", marginTop: 20 }]}>
              Motion Tracking
            </Text>
            <Text style={[styles.privacyBody, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
              When enabled, the accelerometer samples movement every 5 seconds during sleep. Only a count of movements is stored - no raw sensor data is kept. This helps estimate sleep quality without requiring a wearable. You can disable this anytime.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
          Settings
        </Text>

        <Text style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
          Sleep Schedule
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <TimePicker label="Bedtime" hour={bedH} minute={bedM} onChangeHour={setBedH} onChangeMinute={setBedM} color={theme.sleepBlue} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TimePicker label="Wake Time" hour={wakeH} minute={wakeM} onChangeHour={setWakeH} onChangeMinute={setWakeM} color={theme.accent} theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={settingStyles.reminderRow}>
            <Text style={[settingStyles.reminderLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
              Reminder before bed
            </Text>
            <View style={settingStyles.reminderBtns}>
              {[15, 30, 45, 60, 90].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setReminder(m)}
                  style={[settingStyles.reminderBtn, { backgroundColor: reminder === m ? theme.primary : theme.surface }]}
                >
                  <Text style={[settingStyles.reminderBtnText, { color: reminder === m ? "#fff" : theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
                    {m}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Pressable onPress={handleSaveSchedule} style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
            <Text style={[styles.saveBtnText, { fontFamily: "Nunito_700Bold" }]}>Save Schedule</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
          Night Ritual Checklist
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          {checklistItems.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={[styles.checklistLabel, { color: theme.text, fontFamily: "Nunito_400Regular" }]}>
                {item.label}
              </Text>
              <Switch
                value={item.enabled}
                onValueChange={() => toggleChecklistItem(item.id)}
                trackColor={{ false: theme.border, true: theme.primary + "60" }}
                thumbColor={item.enabled ? theme.primary : theme.textMuted}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
          Advanced Tracking
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.motionRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.motionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
                Motion Detection
              </Text>
              <Text style={[styles.motionDesc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
                Uses accelerometer to estimate movement during sleep. Battery-safe sampling every 5 seconds.
              </Text>
            </View>
            <Switch
              value={motionEnabled}
              onValueChange={(val) => toggleMotion(val)}
              trackColor={{ false: theme.border, true: theme.primary + "60" }}
              thumbColor={motionEnabled ? theme.primary : theme.textMuted}
            />
          </View>
        </View>

        <Text style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
          Data
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Pressable onPress={() => router.push(healthKitRoute)} style={styles.menuRow}>
            <Ionicons name="heart-outline" size={20} color={theme.primary} />
            <Text style={[styles.menuLabel, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>HealthKit Sync</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable onPress={() => setShowPrivacy(true)} style={styles.menuRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
            <Text style={[styles.menuLabel, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>Privacy & Data</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable onPress={handleExportCSV} style={styles.menuRow}>
            <Ionicons name="download-outline" size={20} color={theme.primary} />
            <Text style={[styles.menuLabel, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>Export CSV</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable onPress={handleDeleteAll} style={styles.menuRow}>
            <Ionicons name="trash-outline" size={20} color={theme.error} />
            <Text style={[styles.menuLabel, { color: theme.error, fontFamily: "Nunito_600SemiBold" }]}>Delete All Data</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.sectionHeader, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
          Account
        </Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.menuRow}>
            <Ionicons name="person-outline" size={20} color={theme.primary} />
            <Text style={[styles.menuLabel, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>
              {user?.username ?? "Guest"}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Pressable onPress={handleLogout} style={styles.menuRow}>
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
            <Text style={[styles.menuLabel, { color: theme.error, fontFamily: "Nunito_600SemiBold" }]}>
              Log Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const settingStyles = StyleSheet.create({
  timePickerCard: { alignItems: "center", gap: 8, paddingVertical: 8 },
  timePickerLabel: { fontSize: 13 },
  timePickerValue: { fontSize: 28 },
  adjustRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  adjustBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  adjustLabel: { fontSize: 12, width: 32, textAlign: "center" },
  reminderRow: { paddingVertical: 12, gap: 10 },
  reminderLabel: { fontSize: 13 },
  reminderBtns: { flexDirection: "row", gap: 8 },
  reminderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  reminderBtnText: { fontSize: 13 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28, marginBottom: 24 },
  sectionHeader: { fontSize: 13, textTransform: "uppercase" as const, marginBottom: 8, marginTop: 8 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  divider: { height: 1, marginVertical: 8 },
  saveBtn: { height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontSize: 15 },
  checklistRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  checklistLabel: { fontSize: 15, flex: 1 },
  motionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  motionTitle: { fontSize: 15 },
  motionDesc: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  menuLabel: { flex: 1, fontSize: 15 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15 },
  privacyCard: { borderRadius: 16, padding: 20, borderWidth: 1, marginTop: 16 },
  privacyHeading: { fontSize: 16, marginBottom: 8 },
  privacyBody: { fontSize: 14, lineHeight: 21 },
});
