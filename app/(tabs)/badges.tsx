import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Platform, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useSleepLogs } from "@/lib/use-sleep-logs";
import {
  BADGES,
  getCompanionStage,
  COMPANION_STAGES,
  getXPProgress,
  getXPForNextLevel,
} from "@/lib/gamification";
import {
  getBestStreak,
  getCurrentStreak,
  getDerivedBadgeIds,
  getDerivedLevel,
  getDerivedXp,
} from "@/lib/sleep-metrics";

function CompanionDisplay({ level, theme }: { level: number; theme: any }) {
  const stage = getCompanionStage(level);

  const iconName = level >= 9 ? "planet" : level >= 7 ? "sparkles" : level >= 5 ? "flower" : level >= 3 ? "leaf" : "water";
  const iconColor = level >= 7 ? theme.moonLavender : level >= 4 ? theme.primary : theme.success;
  const avatarSize = 60 + Math.min(level * 4, 36);

  return (
    <View style={[compStyles.container, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
      <Text style={[compStyles.sectionTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Sleep Companion</Text>
      <View style={[compStyles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2, backgroundColor: iconColor + "15" }]}> 
        <Ionicons name={iconName as any} size={avatarSize * 0.45} color={iconColor} />
      </View>
      <Text style={[compStyles.name, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>{stage.name}</Text>
      <Text style={[compStyles.mood, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Feeling {stage.mood}</Text>
      <View style={compStyles.stageRow}>
        {COMPANION_STAGES.map((s, i) => (
          <View key={i} style={[compStyles.stageDot, { backgroundColor: level >= s.minLevel ? theme.primary : theme.border }]} />
        ))}
      </View>
      <Text style={[compStyles.stageLabel, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>Level {level} of 10</Text>
    </View>
  );
}

function BadgeItem({ badge, earned, theme }: { badge: typeof BADGES[0]; earned: boolean; theme: any }) {
  return (
    <View style={[badgeStyles.item, { backgroundColor: theme.card, borderColor: earned ? theme.primary + "40" : theme.cardBorder, opacity: earned ? 1 : 0.5 }]}> 
      <View style={[badgeStyles.iconWrap, { backgroundColor: earned ? theme.primary + "15" : theme.border + "30" }]}> 
        <Ionicons name={badge.icon as any} size={24} color={earned ? theme.primary : theme.textMuted} />
      </View>
      <Text style={[badgeStyles.name, { color: earned ? theme.text : theme.textMuted, fontFamily: "Nunito_700Bold" }]}>{badge.name}</Text>
      <Text style={[badgeStyles.desc, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>{badge.description}</Text>
      {earned && (
        <View style={[badgeStyles.earnedTag, { backgroundColor: theme.success + "15" }]}> 
          <Ionicons name="checkmark-circle" size={12} color={theme.success} />
          <Text style={[badgeStyles.earnedText, { color: theme.success, fontFamily: "Nunito_600SemiBold" }]}>Earned</Text>
        </View>
      )}
    </View>
  );
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { sleepLogs, isLoading, error } = useSleepLogs();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const xp = getDerivedXp(sleepLogs);
  const level = getDerivedLevel(sleepLogs);
  const currentStreak = getCurrentStreak(sleepLogs);
  const bestStreak = getBestStreak(sleepLogs);
  const nights = sleepLogs.length;
  const earnedIds = getDerivedBadgeIds(sleepLogs);
  const earnedSet = new Set(earnedIds);
  const xpForNext = getXPForNextLevel(level);
  const xpProgress = getXPProgress(xp, level);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: theme.text, fontFamily: "Nunito_800ExtraBold" }]}>Your Journey</Text>
        <Text style={[styles.pageSubtitle, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>{earnedIds.length} of {BADGES.length} badges earned</Text>

        <CompanionDisplay level={level} theme={theme} />

        <View style={[styles.xpCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
          <Text style={[styles.xpTitle, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Progress</Text>
          <Text style={[styles.xpValue, { color: theme.xpGold, fontFamily: "Nunito_800ExtraBold" }]}>{xp} XP</Text>
          <View style={[styles.xpBarBg, { backgroundColor: theme.border }]}> 
            <View style={[styles.xpBarFill, { backgroundColor: theme.xpGold, width: `${Math.min(xpProgress * 100, 100)}%` }]} />
          </View>
          <Text style={[styles.xpNextLabel, { color: theme.textMuted, fontFamily: "Nunito_400Regular" }]}>
            {xpForNext - xp > 0 ? `${xpForNext - xp} XP to next level` : "Max level"}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
            <Text style={[styles.statValue, { color: theme.accent, fontFamily: "Nunito_800ExtraBold" }]}>{currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
            <Text style={[styles.statValue, { color: theme.accent, fontFamily: "Nunito_800ExtraBold" }]}>{bestStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Best Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}> 
            <Text style={[styles.statValue, { color: theme.success, fontFamily: "Nunito_800ExtraBold" }]}>{nights}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Nunito_400Regular" }]}>Nights</Text>
          </View>
        </View>

        <Text style={[styles.badgesHeader, { color: theme.text, fontFamily: "Nunito_700Bold" }]}>Badges</Text>
        <View style={styles.badgeGrid}>
          {BADGES.map((badge) => (
            <BadgeItem key={badge.id} badge={badge} earned={earnedSet.has(badge.id)} theme={theme} />
          ))}
        </View>

        {isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="sync" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Nunito_600SemiBold" }]}>Loading journey stats...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.emptyState}>
            <Ionicons name="warning-outline" size={44} color={theme.error} />
            <Text style={[styles.emptyText, { color: theme.error, fontFamily: "Nunito_600SemiBold" }]}>Failed to load journey data</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const compStyles = StyleSheet.create({
  container: { borderRadius: 20, padding: 20, borderWidth: 1, alignItems: "center", marginBottom: 20, gap: 8 },
  sectionTitle: { fontSize: 14, alignSelf: "flex-start", marginBottom: 8 },
  avatar: { alignItems: "center", justifyContent: "center", marginBottom: 4 },
  name: { fontSize: 22 },
  mood: { fontSize: 14 },
  stageRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  stageDot: { width: 10, height: 10, borderRadius: 5 },
  stageLabel: { fontSize: 12, marginTop: 4 },
});

const badgeStyles = StyleSheet.create({
  item: { width: "47%", borderRadius: 16, padding: 14, borderWidth: 1, gap: 4, alignItems: "center" },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  name: { fontSize: 13, textAlign: "center" },
  desc: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  earnedTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  earnedText: { fontSize: 11 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 28 },
  pageSubtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
  xpCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6, marginBottom: 14 },
  xpTitle: { fontSize: 14 },
  xpValue: { fontSize: 22 },
  xpBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3 },
  xpNextLabel: { fontSize: 11 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11 },
  badgesHeader: { fontSize: 18, marginBottom: 14 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 15 },
});
