import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSleep } from "@/lib/sleep-context";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function BarChart({ data, maxValue, color, theme, label }: {
  data: { day: string; value: number }[];
  maxValue: number;
  color: string;
  theme: any;
  label: string;
}) {
  const chartMax = maxValue > 0 ? maxValue : 1;
  return (
    <View style={[chartStyles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
      <Text style={[chartStyles.title, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>{label}</Text>
      <View style={chartStyles.chart}>
        {data.map((d, i) => {
          const heightPercent = Math.max((d.value / chartMax) * 100, 4);
          return (
            <View key={i} style={chartStyles.barCol}>
              <View style={chartStyles.barWrapper}>
                <View style={[chartStyles.bar, { height: `${heightPercent}%`, backgroundColor: d.value > 0 ? color : theme.border }]} />
              </View>
              <Text style={[chartStyles.dayLabel, { color: theme.textMuted, fontFamily: "Nunito_600SemiBold" }]}>{d.day}</Text>
              <Text style={[chartStyles.valLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
                {d.value > 0 ? (label.includes("Duration") ? `${Math.round(d.value / 60)}h` : `${d.value}%`) : "-"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { sleepLogs, gamification } = useSleep();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const weekData = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const days: { day: string; duration: number; consistency: number; date: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const log = sleepLogs.find((l) => l.date === dateStr);
      days.push({
        day: DAY_LABELS[i],
        duration: log ? log.durationMinutes : 0,
        consistency: log ? log.consistencyScore : 0,
        date: dateStr,
      });
    }
    return days;
  }, [sleepLogs]);

  const stats = useMemo(() => {
    if (sleepLogs.length === 0) {
      return { avgDuration: 0, bestNight: null as null | string, avgMood: 0, totalLogs: 0 };
    }

    const recentLogs = sleepLogs.slice(0, 30);
    const avgDuration = Math.round(recentLogs.reduce((s, l) => s + l.durationMinutes, 0) / recentLogs.length);
    const bestLog = recentLogs.reduce((best, l) => (l.consistencyScore > (best?.consistencyScore || 0) ? l : best), recentLogs[0]);
    const ratedLogs = recentLogs.filter((l) => l.rating > 0);
    const avgMood = ratedLogs.length > 0 ? Math.round((ratedLogs.reduce((s, l) => s + l.rating, 0) / ratedLogs.length) * 10) / 10 : 0;

    return {
      avgDuration,
      bestNight: bestLog ? bestLog.date : null,
      avgMood,
      totalLogs: sleepLogs.length,
    };
  }, [sleepLogs]);

  const durationData = weekData.map((d) => ({ day: d.day, value: d.duration }));
  const consistencyData = weekData.map((d) => ({ day: d.day, value: d.consistency }));
  const maxDuration = Math.max(...durationData.map((d) => d.value), 480);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
          Sleep Insights
        </Text>
        <Text style={[styles.pageSubtitle, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
          This week's overview
        </Text>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="time-outline" size={22} color={theme.sleepBlue} />
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
              {stats.avgDuration > 0 ? formatDuration(stats.avgDuration) : "--"}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Avg Duration</Text>
          </View>
          <View style={[styles.summaryTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="flame-outline" size={22} color={theme.accent} />
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
              {gamification.currentStreak}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Streak</Text>
          </View>
          <View style={[styles.summaryTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="star-outline" size={22} color={theme.starYellow} />
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
              {stats.avgMood > 0 ? stats.avgMood.toFixed(1) : "--"}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Avg Mood</Text>
          </View>
          <View style={[styles.summaryTile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="calendar-outline" size={22} color={theme.success} />
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>
              {stats.totalLogs}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Total Logs</Text>
          </View>
        </View>

        <BarChart data={durationData} maxValue={maxDuration} color={theme.sleepBlue} theme={theme} label="Weekly Sleep Duration" />
        <BarChart data={consistencyData} maxValue={100} color={theme.primary} theme={theme} label="Weekly Consistency Score" />

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="information-circle" size={18} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Consistency = how close your actual bedtime and wake time are to your target schedule. Higher is better!
          </Text>
        </View>

        {sleepLogs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>
              No sleep data yet
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>
              Start logging your sleep to see insights here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 16 },
  title: { fontSize: 16, marginBottom: 16 },
  chart: { flexDirection: "row", height: 160, gap: 6, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center" },
  barWrapper: { width: "100%", height: 120, justifyContent: "flex-end" },
  bar: { borderRadius: 6, minWidth: 12, alignSelf: "center", width: "70%" },
  dayLabel: { fontSize: 11, marginTop: 6 },
  valLabel: { fontSize: 10, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28 },
  pageSubtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  summaryTile: { width: "47%", borderRadius: 16, padding: 16, borderWidth: 1, gap: 6 },
  summaryValue: { fontSize: 24 },
  summaryLabel: { fontSize: 12 },
  infoCard: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16 },
  emptyDesc: { fontSize: 13 },
});
