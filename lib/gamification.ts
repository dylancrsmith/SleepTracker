import type { GamificationData, SleepLog } from "./storage";

export const XP_VALUES = {
  LOG_SLEEP: 20,
  ON_TIME_BEDTIME: 15,
  ON_TIME_WAKE: 15,
  RITUAL_COMPLETE: 10,
  RATING_SUBMITTED: 5,
  HIGH_CONSISTENCY: 25,
};

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4500,
];

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[level];
}

export function getXPProgress(xp: number, level: number): number {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = getXPForNextLevel(level);
  if (nextThreshold === currentThreshold) return 1;
  return (xp - currentThreshold) / (nextThreshold - currentThreshold);
}

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons" | "Feather";
}

export const BADGES: BadgeDefinition[] = [
  { id: "streak_3", name: "3-Night Streak", description: "Log sleep 3 nights in a row", icon: "flame", iconFamily: "Ionicons" },
  { id: "streak_7", name: "7-Night Streak", description: "Log sleep 7 nights in a row", icon: "bonfire", iconFamily: "Ionicons" },
  { id: "on_time", name: "On-Time Sleeper", description: "Hit your bedtime target 5 times", icon: "alarm", iconFamily: "Ionicons" },
  { id: "weekend", name: "Weekend Warrior", description: "Log sleep on both Sat and Sun", icon: "calendar", iconFamily: "Ionicons" },
  { id: "early_wind", name: "Early Wind-Down", description: "Complete ritual 30+ min before bed", icon: "moon", iconFamily: "Ionicons" },
  { id: "mood_5", name: "Mood Tracker", description: "Rate your sleep quality 5 times", icon: "happy", iconFamily: "Ionicons" },
  { id: "streak_14", name: "2-Week Champion", description: "Log sleep 14 nights in a row", icon: "trophy", iconFamily: "Ionicons" },
  { id: "perfect_score", name: "Perfect Night", description: "Get a 100% consistency score", icon: "star", iconFamily: "Ionicons" },
];

export function computeConsistencyScore(
  startTime: number,
  endTime: number,
  targetBedHour: number,
  targetBedMinute: number,
  targetWakeHour: number,
  targetWakeMinute: number
): number {
  const bedDate = new Date(startTime);
  const wakeDate = new Date(endTime);

  const targetBedMinutes = targetBedHour * 60 + targetBedMinute;
  let actualBedMinutes = bedDate.getHours() * 60 + bedDate.getMinutes();
  if (actualBedMinutes < 12 * 60) actualBedMinutes += 24 * 60;
  let adjustedTarget = targetBedMinutes;
  if (adjustedTarget < 12 * 60) adjustedTarget += 24 * 60;

  const bedDiff = Math.abs(actualBedMinutes - adjustedTarget);

  const targetWakeMinutes = targetWakeHour * 60 + targetWakeMinute;
  const actualWakeMinutes = wakeDate.getHours() * 60 + wakeDate.getMinutes();
  const wakeDiff = Math.abs(actualWakeMinutes - targetWakeMinutes);

  const maxDiff = 120;
  const bedScore = Math.max(0, 1 - bedDiff / maxDiff);
  const wakeScore = Math.max(0, 1 - wakeDiff / maxDiff);

  return Math.round(((bedScore + wakeScore) / 2) * 100);
}

export function checkNewBadges(
  gamification: GamificationData,
  logs: SleepLog[]
): string[] {
  const newBadges: string[] = [];
  const earned = new Set(gamification.badges);

  if (!earned.has("streak_3") && gamification.currentStreak >= 3) {
    newBadges.push("streak_3");
  }
  if (!earned.has("streak_7") && gamification.currentStreak >= 7) {
    newBadges.push("streak_7");
  }
  if (!earned.has("streak_14") && gamification.currentStreak >= 14) {
    newBadges.push("streak_14");
  }

  const onTimeLogs = logs.filter((l) => l.consistencyScore >= 80);
  if (!earned.has("on_time") && onTimeLogs.length >= 5) {
    newBadges.push("on_time");
  }

  const ratedLogs = logs.filter((l) => l.rating > 0);
  if (!earned.has("mood_5") && ratedLogs.length >= 5) {
    newBadges.push("mood_5");
  }

  const perfectLogs = logs.filter((l) => l.consistencyScore === 100);
  if (!earned.has("perfect_score") && perfectLogs.length >= 1) {
    newBadges.push("perfect_score");
  }

  const weekendDays = new Set<string>();
  logs.forEach((l) => {
    const d = new Date(l.startTime);
    const day = d.getDay();
    if (day === 5 || day === 6) {
      const weekKey = `${d.getFullYear()}-W${Math.ceil((d.getDate() + 1) / 7)}`;
      weekendDays.add(`${weekKey}-${day}`);
    }
  });
  const weekKeys = new Set<string>();
  weekendDays.forEach((k) => {
    const parts = k.split("-");
    weekKeys.add(`${parts[0]}-${parts[1]}`);
  });
  for (const wk of weekKeys) {
    if (weekendDays.has(`${wk}-5`) && weekendDays.has(`${wk}-6`)) {
      if (!earned.has("weekend")) {
        newBadges.push("weekend");
        break;
      }
    }
  }

  const ritualLogs = logs.filter((l) => l.ritualCompleted);
  if (!earned.has("early_wind") && ritualLogs.length >= 1) {
    newBadges.push("early_wind");
  }

  return newBadges;
}

export function updateStreak(gamification: GamificationData, logDate: string): GamificationData {
  const updated = { ...gamification };

  if (updated.lastLogDate === logDate) return updated;

  const today = new Date(logDate);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (updated.lastLogDate === yesterdayStr || updated.lastLogDate === "") {
    updated.currentStreak += 1;
  } else {
    updated.currentStreak = 1;
  }

  if (updated.currentStreak > updated.longestStreak) {
    updated.longestStreak = updated.currentStreak;
  }

  updated.lastLogDate = logDate;
  updated.totalNightsLogged += 1;

  return updated;
}

export const COMPANION_STAGES = [
  { minLevel: 1, name: "Sleepy Seedling", mood: "drowsy" },
  { minLevel: 2, name: "Dreamy Sprout", mood: "content" },
  { minLevel: 3, name: "Starlit Sapling", mood: "happy" },
  { minLevel: 4, name: "Lunar Bloom", mood: "bright" },
  { minLevel: 5, name: "Cosmic Flower", mood: "radiant" },
  { minLevel: 6, name: "Nebula Guardian", mood: "powerful" },
  { minLevel: 7, name: "Dream Keeper", mood: "wise" },
  { minLevel: 8, name: "Star Weaver", mood: "mystical" },
  { minLevel: 9, name: "Moon Oracle", mood: "transcendent" },
  { minLevel: 10, name: "Dream Master", mood: "enlightened" },
];

export function getCompanionStage(level: number) {
  for (let i = COMPANION_STAGES.length - 1; i >= 0; i--) {
    if (level >= COMPANION_STAGES[i].minLevel) return COMPANION_STAGES[i];
  }
  return COMPANION_STAGES[0];
}
