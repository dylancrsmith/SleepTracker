import React, { useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSleepLogs } from "@/lib/use-sleep-logs";
import {
  getAverageDurationLast7Days,
  getAverageMood,
  getCurrentStreak,
  getWeeklyConsistencyData,
  getWeeklyDurationData,
} from "@/lib/sleep-metrics";

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

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
  const { sleepLogs, isLoading, error } = useSleepLogs();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const durationData = useMemo(() => getWeeklyDurationData(sleepLogs).map((d) => ({ day: d.day, value: d.value })), [sleepLogs]);
  const consistencyData = useMemo(() => getWeeklyConsistencyData(sleepLogs).map((d) => ({ day: d.day, value: d.value })), [sleepLogs]);

  const stats = useMemo(() => ({
    avgDuration: getAverageDurationLast7Days(sleepLogs),
    avgMood: getAverageMood(sleepLogs),
    currentStreak: getCurrentStreak(sleepLogs),
    totalLogs: sleepLogs.length,
  }), [sleepLogs]);

  const maxDuration = Math.max(...durationData.map((d) => d.value), 480);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>Sleep Insights</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>This week&apos;s overview</Text>

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
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>{stats.currentStreak}</Text>
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
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>{stats.totalLogs}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Total Logs</Text>
          </View>
        </View>

        <BarChart data={durationData} maxValue={maxDuration} color={theme.sleepBlue} theme={theme} label="Weekly Sleep Duration" />
        <BarChart data={consistencyData} maxValue={100} color={theme.primary} theme={theme} label="Weekly Consistency Score" />

        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="information-circle" size={18} color={theme.primary} />
          <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
            Consistency uses saved consistencyScore where available. If missing, a proxy is computed from bedtime and wake-time variance in recent logs.
          </Text>
        </View>

        {isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="sync" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Loading sleep data...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.emptyState}>
            <Ionicons name="warning-outline" size={44} color={theme.error} />
            <Text style={[styles.emptyText, { color: theme.error, fontFamily: "Nunito_600SemiBold" }]}>Failed to load logs</Text>
          </View>
        )}

        {!isLoading && !error && sleepLogs.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>No sleep data yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>Sync from Health or send a mock session to populate insights</Text>
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
