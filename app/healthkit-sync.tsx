import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, useColorScheme, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { openHealthConnectSettings } from "react-native-health-connect";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useSleep } from "@/lib/sleep-context";
import * as Storage from "@/lib/storage";
import { wearablesApi, type WearableSleepSummary } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { SLEEP_LOGS_QUERY_KEY } from "@/lib/use-sleep-logs";
import {
  fetchSleepSessionsLast7Days,
  getHealthConnectNotice,
  initHealthKit,
  type SleepSession,
} from "@/app/lib/healthkit";

type ConnectionState = "Not connected" | "Connected";
type HelpAction = "openStore" | "openSettings" | null;

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
const HEALTH_CONNECT_PLAY_STORE_URI = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
const HEALTH_CONNECT_PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;
const HEALTH_CONNECT_PERMISSION_HELP =
  "Enable Sleep permissions in Health Connect, then return and press Connect again.";

function createMockSession(): SleepSession {
  const end = new Date();
  const start = new Date(end.getTime() - 8 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    source: "Mock",
    type: "ASLEEP",
  };
}

export default function HealthKitSyncScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const router = useRouter();

  const { token } = useAuth();
  const { refreshData } = useSleep();

  const [connectionState, setConnectionState] = useState<ConnectionState>("Not connected");
  const [fetchState, setFetchState] = useState("Idle");
  const [uploadState, setUploadState] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [helpText, setHelpText] = useState<string | null>(null);
  const [helpAction, setHelpAction] = useState<HelpAction>(null);
  const [summaries, setSummaries] = useState<WearableSleepSummary[]>([]);

  const statusColor = useMemo(() => {
    if (error) return theme.error;
    if (connectionState === "Connected") return theme.success;
    return theme.textSecondary;
  }, [connectionState, error, theme.error, theme.success, theme.textSecondary]);

  const connectLabel = Platform.OS === "android" ? "Connect Health" : "Connect HealthKit";

  const openHealthConnectStore = async () => {
    const canOpenMarketUri = await Linking.canOpenURL(HEALTH_CONNECT_PLAY_STORE_URI);
    await Linking.openURL(canOpenMarketUri ? HEALTH_CONNECT_PLAY_STORE_URI : HEALTH_CONNECT_PLAY_STORE_WEB_URL);
  };

  const handleAndroidHelp = (message: string) => {
    if (Platform.OS !== "android") return;

    const text = message.toLowerCase();
    if (text.includes("not available on this android device")) {
      setHelpText("Health Connect is not supported on this device/Android version.");
      setHelpAction(null);
      return;
    }

    if (text.includes("missing or out of date") || text.includes("install health connect")) {
      setHelpText("Health Connect is not installed or needs an update. Install/update it, then return and tap Connect Health.");
      setHelpAction("openStore");
      return;
    }

    if (text.includes("enable sleep permissions in health connect")) {
      setHelpText(HEALTH_CONNECT_PERMISSION_HELP);
      setHelpAction("openSettings");
      return;
    }

    if (text.includes("no compatible apps installed")) {
      setHelpText("Health Connect does not see DreamStreak yet. Return to DreamStreak and tap Connect Health to register permissions.");
      setHelpAction(null);
      return;
    }

    if (text.includes("flow was not ready yet") || text.includes("close and reopen the app")) {
      setHelpText("Health Connect permissions did not initialize yet. Fully close DreamStreak, reopen it, then tap Connect Health.");
      setHelpAction(null);
      return;
    }

    if (text.includes("permission")) {
      setHelpText(HEALTH_CONNECT_PERMISSION_HELP);
      setHelpAction("openSettings");
      return;
    }

    setHelpAction(null);
  };

  const ensureConnected = async () => {
    await initHealthKit();
    setConnectionState("Connected");
  };

  const uploadSessions = async (sessions: SleepSession[]) => {
    if (!token) {
      throw new Error("You must be logged in before uploading sleep sessions.");
    }

    const uploaded: WearableSleepSummary[] = [];

    for (const session of sessions) {
      const { summary } = await wearablesApi.uploadSleepSession(session, token);
      uploaded.push(summary);
    }

    setSummaries(uploaded);
    setUploadState(`Uploaded ${uploaded.length} sessions`);

    const existingLogs = await Storage.getSleepLogs();
    const existingIds = new Set(existingLogs.map((log) => log.id));
    const logsToStore: Storage.SleepLog[] = uploaded
      .filter((summary) => !existingIds.has(summary.id))
      .map((summary) => ({
        id: summary.id,
        startTime: summary.startTime,
        endTime: summary.endTime,
        durationMinutes: summary.durationMinutes,
        rating: 0,
        tags: [],
        note: "",
        consistencyScore: 0,
        ritualCompleted: false,
        ritualItemsDone: 0,
        ritualItemsTotal: 0,
        motionCount: 0,
        date: summary.date,
      }));

    for (const log of logsToStore) {
      await Storage.saveSleepLog(log);
    }

    await queryClient.invalidateQueries({ queryKey: [SLEEP_LOGS_QUERY_KEY] });
    await refreshData();
  };

  const handleConnect = async () => {
    setError(null);
    setHelpText(null);
    setHelpAction(null);

    try {
      await ensureConnected();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to connect to health provider";
      setError(message);
      handleAndroidHelp(message);
      setConnectionState("Not connected");
    }
  };

  const handleSync = async () => {
    setError(null);
    setHelpText(null);
    setHelpAction(null);
    setSummaries([]);
    setFetchState("Fetching...");
    setUploadState("Idle");

    try {
      await ensureConnected();

      const sessions = await fetchSleepSessionsLast7Days();
      setFetchState(`Found ${sessions.length} samples`);

      const healthConnectNotice = Platform.OS === "android" ? getHealthConnectNotice() : null;
      if (healthConnectNotice) {
        setHelpText(healthConnectNotice);
        setHelpAction("openSettings");
        setUploadState("Uploaded 0 sessions");
        return;
      }

      if (sessions.length === 0) {
        setHelpText("No sleep samples were found in the last 7 days. If you do not have health sleep data yet, use 'Send Mock Sleep Session' to test uploads.");
        setUploadState("Uploaded 0 sessions");
        return;
      }

      await uploadSessions(sessions);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      setError(message);
      handleAndroidHelp(message);
      setConnectionState("Not connected");
      setUploadState("Idle");
    }
  };

  const handleSendMock = async () => {
    setError(null);
    setHelpText(null);
    setHelpAction(null);
    setFetchState("Found 1 samples");

    try {
      await uploadSessions([createMockSession()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mock upload failed");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Ionicons name="chevron-back" size={22} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary, fontFamily: "Nunito_600SemiBold" }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>Health Sync</Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Connection</Text>
            <Text style={[styles.statusValue, { color: statusColor, fontFamily: "Nunito_700Bold" }]}>{connectionState}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Fetch</Text>
            <Text style={[styles.statusValue, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>{fetchState}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Upload</Text>
            <Text style={[styles.statusValue, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>{uploadState}</Text>
          </View>

          {error ? <Text style={[styles.message, { color: theme.error, fontFamily: "Nunito_600SemiBold" }]}>{error}</Text> : null}

          {helpText ? <Text style={[styles.message, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>{helpText}</Text> : null}

          {helpAction === "openStore" ? (
            <Pressable style={[styles.helpButton, { borderColor: theme.primary }]} onPress={openHealthConnectStore}>
              <Text style={[styles.helpButtonText, { color: theme.primary, fontFamily: "Nunito_700Bold" }]}>Open Health Connect in Play Store</Text>
            </Pressable>
          ) : null}

          {helpAction === "openSettings" ? (
            <Pressable style={[styles.helpButton, { borderColor: theme.primary }]} onPress={openHealthConnectSettings}>
              <Text style={[styles.helpButtonText, { color: theme.primary, fontFamily: "Nunito_700Bold" }]}>Open Health Connect Settings</Text>
            </Pressable>
          ) : null}

          <View style={styles.buttonCol}>
            <Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={handleConnect}>
              <Ionicons name="link" size={18} color="#fff" />
              <Text style={[styles.buttonText, { fontFamily: "Nunito_700Bold" }]}>{connectLabel}</Text>
            </Pressable>

            <Pressable style={[styles.button, { backgroundColor: theme.sleepBlue }]} onPress={handleSync}>
              <Ionicons name="sync" size={18} color="#fff" />
              <Text style={[styles.buttonText, { fontFamily: "Nunito_700Bold" }]}>Sync Last 7 Days</Text>
            </Pressable>

            <Pressable style={[styles.button, { backgroundColor: theme.accent }]} onPress={handleSendMock}>
              <Ionicons name="flask" size={18} color="#fff" />
              <Text style={[styles.buttonText, { fontFamily: "Nunito_700Bold" }]}>Send Mock Sleep Session</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.summaryTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Uploaded Summaries</Text>
          {summaries.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>No uploaded sessions yet.</Text>
          ) : (
            summaries.map((summary) => (
              <View key={summary.id} style={[styles.summaryRow, { borderColor: theme.border }]}>
                <Text style={[styles.summaryMain, { color: theme.text, fontFamily: "Nunito_600SemiBold" }]}>
                  {summary.date} ({summary.durationMinutes} min)
                </Text>
                <Text style={[styles.summaryMeta, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>
                  {summary.source} / {summary.type}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 28 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusLabel: { fontSize: 13, textTransform: "uppercase" },
  statusValue: { fontSize: 14 },
  message: { fontSize: 13, lineHeight: 19 },
  helpButton: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  helpButtonText: { fontSize: 13 },
  buttonCol: { gap: 10, marginTop: 6 },
  button: {
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { color: "#fff", fontSize: 15 },
  summaryTitle: { fontSize: 16 },
  emptyText: { fontSize: 14 },
  summaryRow: { borderTopWidth: 1, paddingTop: 10, gap: 3 },
  summaryMain: { fontSize: 14 },
  summaryMeta: { fontSize: 12 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 15 },
});

