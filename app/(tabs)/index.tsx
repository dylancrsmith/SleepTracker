import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, useColorScheme, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, Easing } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";
import { useAuth } from "@/lib/auth-context";
import { getCompanionStage, getXPProgress, getXPForNextLevel, LEVEL_THRESHOLDS } from "@/lib/gamification";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${pad(m)} ${ampm}`;
}

function RitualChecklist({ theme, onComplete }: { theme: any; onComplete: (done: number, total: number) => void }) {
  const { checklistItems } = useSleep();
  const enabledItems = checklistItems.filter((i) => i.enabled);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    onComplete(next.size, enabledItems.length);
  };

  if (enabledItems.length === 0) return null;

  return (
    <View style={[styles.ritualCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <View style={styles.ritualHeader}>
        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
        <Text style={[styles.ritualTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
          Night Ritual
        </Text>
        <Text style={[styles.ritualCount, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
          {checked.size}/{enabledItems.length}
        </Text>
      </View>
      {enabledItems.map((item) => (
        <Pressable key={item.id} onPress={() => toggle(item.id)} style={styles.ritualRow}>
          <View style={[styles.checkbox, { borderColor: checked.has(item.id) ? theme.success : theme.border, backgroundColor: checked.has(item.id) ? theme.success : "transparent" }]}>
            {checked.has(item.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={[styles.ritualLabel, { color: checked.has(item.id) ? theme.textMuted : theme.text, fontFamily: "Nunito_400Regular", textDecorationLine: checked.has(item.id) ? "line-through" : "none" }]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function SleepScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { settings, activeSession, gamification, sleepLogs, startSleep, onboardingDone, isLoading } = useSleep();
  const { user } = useAuth();

  const [ritualDone, setRitualDone] = useState(0);
  const [ritualTotal, setRitualTotal] = useState(0);
  const [elapsed, setElapsed] = useState("00:00:00");

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (!isLoading && !onboardingDone) {
      router.replace("/onboarding");
    }
  }, [isLoading, onboardingDone]);

  useEffect(() => {
    if (activeSession) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession) return;
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - activeSession.startTime) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(`${pad(h)}:${pad(m)}:${pad(s)}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleStartSleep = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await startSleep();
  };

  const handleEndSleep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/check-in",
      params: {
        ritualDone: ritualDone >= ritualTotal && ritualTotal > 0 ? "true" : "false",
        ritualItemsDone: ritualDone.toString(),
        ritualTotal: ritualTotal.toString(),
      },
    });
  };

  const companion = getCompanionStage(gamification.level);
  const xpProgress = getXPProgress(gamification.xp, gamification.level);
  const xpForNext = getXPForNextLevel(gamification.level);
  const currentThreshold = LEVEL_THRESHOLDS[gamification.level - 1] || 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = sleepLogs.find((l) => l.date === todayStr);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="moon" size={32} color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
              {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}{user?.username ? `, ${user.username}` : ""}
            </Text>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
              DreamStreak
            </Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: theme.accent + "15" }]}>
            <Ionicons name="flame" size={18} color={theme.accent} />
            <Text style={[styles.streakText, { color: theme.accent, fontFamily: "Nunito_800ExtraBold" }]}>
              {gamification.currentStreak}
            </Text>
          </View>
        </View>

        <View style={[styles.companionCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.companionRow}>
            <View style={[styles.companionAvatar, { backgroundColor: theme.primary + "15" }]}>
              <Ionicons
                name={gamification.level >= 7 ? "planet" : gamification.level >= 4 ? "sparkles" : "leaf"}
                size={32}
                color={theme.moonLavender}
              />
            </View>
            <View style={styles.companionInfo}>
              <Text style={[styles.companionName, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
                {companion.name}
              </Text>
              <Text style={[styles.companionMood, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
                Level {gamification.level} - {companion.mood}
              </Text>
            </View>
            <View style={styles.xpCol}>
              <Text style={[styles.xpLabel, { color: theme.xpGold, fontFamily: "Nunito_800ExtraBold" }]}>
                {gamification.xp} XP
              </Text>
            </View>
          </View>
          <View style={styles.xpBarContainer}>
            <View style={[styles.xpBarBg, { backgroundColor: theme.border }]}>
              <View style={[styles.xpBarFill, { backgroundColor: theme.xpGold, width: `${Math.min(xpProgress * 100, 100)}%` }]} />
            </View>
            <Text style={[styles.xpNextLabel, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>
              {xpForNext - gamification.xp > 0 ? `${xpForNext - gamification.xp} XP to Level ${gamification.level + 1}` : "Max level!"}
            </Text>
          </View>
        </View>

        {activeSession ? (
          <View style={styles.activeSessionArea}>
            <Animated.View style={[styles.glowRing, { borderColor: theme.sleepBlue }, glowStyle]} />
            <Animated.View style={[styles.sleepButton, { backgroundColor: theme.sleepBlue }, pulseStyle]}>
              <Ionicons name="moon" size={40} color="#fff" />
              <Text style={[styles.sleepingLabel, { fontFamily: "Nunito_700Bold" }]}>Sleeping...</Text>
              <Text style={[styles.timerText, { fontFamily: "Nunito_800ExtraBold" }]}>{elapsed}</Text>
              <Text style={[styles.startedAt, { fontFamily: "Nunito_400Regular" }]}>
                Started at {formatTime(activeSession.startTime)}
              </Text>
            </Animated.View>
            <Pressable onPress={handleEndSleep} style={[styles.endBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="sunny" size={22} color="#fff" />
              <Text style={[styles.endBtnText, { fontFamily: "Nunito_700Bold" }]}>Wake Up</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.sleepArea}>
            {todayLog ? (
              <View style={[styles.todaySummary, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <View style={styles.todaySummaryHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                  <Text style={[styles.todaySummaryTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
                    Last Night
                  </Text>
                </View>
                <View style={styles.todayStats}>
                  <View style={styles.todayStat}>
                    <Text style={[styles.todayStatValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
                      {formatDuration(todayLog.durationMinutes)}
                    </Text>
                    <Text style={[styles.todayStatLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Duration</Text>
                  </View>
                  <View style={[styles.todayStatDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.todayStat}>
                    <Text style={[styles.todayStatValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
                      {todayLog.consistencyScore}%
                    </Text>
                    <Text style={[styles.todayStatLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Score</Text>
                  </View>
                  <View style={[styles.todayStatDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.todayStat}>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons key={s} name="star" size={14} color={s <= todayLog.rating ? theme.starYellow : theme.border} />
                      ))}
                    </View>
                    <Text style={[styles.todayStatLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Rating</Text>
                  </View>
                </View>
              </View>
            ) : null}
            <RitualChecklist
              theme={theme}
              onComplete={(done, total) => { setRitualDone(done); setRitualTotal(total); }}
            />
            <Pressable onPress={handleStartSleep} style={[styles.startSleepBtn, { backgroundColor: theme.sleepBlue }]}>
              <Ionicons name="moon" size={28} color="#fff" />
              <Text style={[styles.startSleepText, { fontFamily: "Nunito_700Bold" }]}>Start Sleep</Text>
            </Pressable>
          </View>
        )}

        {settings && (
          <View style={[styles.scheduleCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.scheduleTitle, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Your Schedule</Text>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleItem}>
                <Ionicons name="moon-outline" size={18} color={theme.sleepBlue} />
                <Text style={[styles.scheduleTime, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
                  {formatTime(new Date().setHours(settings.bedtimeHour, settings.bedtimeMinute))}
                </Text>
                <Text style={[styles.scheduleLabel, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>Bedtime</Text>
              </View>
              <View style={[styles.scheduleDivider, { backgroundColor: theme.border }]} />
              <View style={styles.scheduleItem}>
                <Ionicons name="sunny-outline" size={18} color={theme.accent} />
                <Text style={[styles.scheduleTime, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>
                  {formatTime(new Date().setHours(settings.wakeHour, settings.wakeMinute))}
                </Text>
                <Text style={[styles.scheduleLabel, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>Wake up</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 14 },
  title: { fontSize: 28, marginTop: 2 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  streakText: { fontSize: 16 },
  companionCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 20 },
  companionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  companionAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  companionInfo: { flex: 1 },
  companionName: { fontSize: 16 },
  companionMood: { fontSize: 13, marginTop: 2 },
  xpCol: { alignItems: "flex-end" },
  xpLabel: { fontSize: 15 },
  xpBarContainer: { marginTop: 12 },
  xpBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3 },
  xpNextLabel: { fontSize: 11, marginTop: 4, textAlign: "right" },
  activeSessionArea: { alignItems: "center", paddingVertical: 30 },
  glowRing: { position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 3, top: 15 },
  sleepButton: { width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", gap: 4 },
  sleepingLabel: { color: "#fff", fontSize: 15, marginTop: 4 },
  timerText: { color: "#fff", fontSize: 28 },
  startedAt: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  endBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 28, marginTop: 24 },
  endBtnText: { color: "#fff", fontSize: 16 },
  sleepArea: { gap: 16, marginBottom: 20 },
  todaySummary: { borderRadius: 20, padding: 16, borderWidth: 1 },
  todaySummaryHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  todaySummaryTitle: { fontSize: 16 },
  todayStats: { flexDirection: "row", alignItems: "center" },
  todayStat: { flex: 1, alignItems: "center", gap: 4 },
  todayStatValue: { fontSize: 18 },
  todayStatLabel: { fontSize: 12 },
  todayStatDivider: { width: 1, height: 32 },
  startSleepBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 60, borderRadius: 30 },
  startSleepText: { color: "#fff", fontSize: 18 },
  ritualCard: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
  ritualHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  ritualTitle: { flex: 1, fontSize: 15 },
  ritualCount: { fontSize: 14 },
  ritualRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  ritualLabel: { fontSize: 15 },
  scheduleCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginTop: 4 },
  scheduleTitle: { fontSize: 13, textAlign: "center", marginBottom: 12 },
  scheduleRow: { flexDirection: "row", alignItems: "center" },
  scheduleItem: { flex: 1, alignItems: "center", gap: 4 },
  scheduleTime: { fontSize: 17 },
  scheduleLabel: { fontSize: 12 },
  scheduleDivider: { width: 1, height: 32 },
});
