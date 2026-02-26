import type { SleepLog } from "@/lib/storage";
import { BADGES, getLevelFromXP } from "@/lib/gamification";

const DAY_MS = 24 * 60 * 60 * 1000;

type DayValue = {
  day: string;
  date: string;
  value: number;
};

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00`);
}

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function circularMinutesDiff(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function getLast7DaysAnchoredToToday(): { date: string; day: string }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const days: { date: string; day: string }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    days.push({
      date: toDateKey(d),
      day: formatter.format(d),
    });
  }

  return days;
}

function calculateConsistencyProxy(logs: SleepLog[]): number {
  if (logs.length === 0) return 0;

  const bedTimes = logs.map((log) => {
    const d = new Date(log.startTime);
    return d.getHours() * 60 + d.getMinutes();
  });
  const wakeTimes = logs.map((log) => {
    const d = new Date(log.endTime);
    return d.getHours() * 60 + d.getMinutes();
  });

  const medianBed = median(bedTimes);
  const medianWake = median(wakeTimes);

  const perLogScores = logs.map((log) => {
    const bed = new Date(log.startTime);
    const wake = new Date(log.endTime);

    const bedMinutes = bed.getHours() * 60 + bed.getMinutes();
    const wakeMinutes = wake.getHours() * 60 + wake.getMinutes();

    const bedDiff = circularMinutesDiff(bedMinutes, medianBed);
    const wakeDiff = circularMinutesDiff(wakeMinutes, medianWake);
    const varianceMinutes = (bedDiff + wakeDiff) / 2;

    const normalized = Math.max(0, 1 - varianceMinutes / 180);
    return Math.round(normalized * 100);
  });

  return Math.round(perLogScores.reduce((sum, score) => sum + score, 0) / perLogScores.length);
}

export function getLatestLogForToday(logs: SleepLog[]): SleepLog | null {
  const todayKey = toDateKey(new Date());
  const todays = logs
    .filter((log) => log.date === todayKey)
    .sort((a, b) => b.startTime - a.startTime);

  return todays[0] ?? null;
}

export function getWeeklyDurationData(logs: SleepLog[]): DayValue[] {
  const byDate = new Map<string, number>();

  logs.forEach((log) => {
    byDate.set(log.date, (byDate.get(log.date) ?? 0) + log.durationMinutes);
  });

  return getLast7DaysAnchoredToToday().map(({ date, day }) => ({
    date,
    day,
    value: byDate.get(date) ?? 0,
  }));
}

export function getWeeklyConsistencyData(logs: SleepLog[]): DayValue[] {
  const byDate = new Map<string, SleepLog[]>();

  logs.forEach((log) => {
    const arr = byDate.get(log.date) ?? [];
    arr.push(log);
    byDate.set(log.date, arr);
  });

  return getLast7DaysAnchoredToToday().map(({ date, day }) => {
    const dayLogs = byDate.get(date) ?? [];
    if (dayLogs.length === 0) {
      return { date, day, value: 0 };
    }

    const scored = dayLogs.filter((log) => (log.consistencyScore ?? 0) > 0);
    if (scored.length > 0) {
      const avg = Math.round(scored.reduce((sum, log) => sum + log.consistencyScore, 0) / scored.length);
      return { date, day, value: avg };
    }

    return { date, day, value: calculateConsistencyProxy(dayLogs) };
  });
}

export function getAverageDurationLast7Days(logs: SleepLog[]): number {
  const last7 = new Set(getLast7DaysAnchoredToToday().map((d) => d.date));
  const inRange = logs.filter((log) => last7.has(log.date));
  if (inRange.length === 0) return 0;
  return Math.round(inRange.reduce((sum, log) => sum + log.durationMinutes, 0) / inRange.length);
}

export function getAverageMood(logs: SleepLog[]): number {
  const rated = logs.filter((log) => log.rating > 0);
  if (rated.length === 0) return 0;
  return Math.round((rated.reduce((sum, log) => sum + log.rating, 0) / rated.length) * 10) / 10;
}

function uniqueSortedDateKeys(logs: SleepLog[]): string[] {
  const unique = Array.from(new Set(logs.map((log) => log.date)));
  unique.sort((a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime());
  return unique;
}

export function getCurrentStreak(logs: SleepLog[]): number {
  const uniqueDates = uniqueSortedDateKeys(logs);
  if (uniqueDates.length === 0) return 0;

  let streak = 1;
  for (let i = uniqueDates.length - 1; i > 0; i--) {
    const curr = parseDateKey(uniqueDates[i]);
    const prev = parseDateKey(uniqueDates[i - 1]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / DAY_MS);
    if (diffDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function getBestStreak(logs: SleepLog[]): number {
  const uniqueDates = uniqueSortedDateKeys(logs);
  if (uniqueDates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = parseDateKey(uniqueDates[i - 1]);
    const curr = parseDateKey(uniqueDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / DAY_MS);

    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export function getDerivedXp(logs: SleepLog[]): number {
  return logs.reduce((sum, log) => sum + Math.max(1, Math.round(log.durationMinutes / 10)), 0);
}

export function getDerivedBadgeIds(logs: SleepLog[]): string[] {
  const earned = new Set<string>();
  const currentStreak = getCurrentStreak(logs);
  const bestStreak = getBestStreak(logs);

  if (currentStreak >= 3 || bestStreak >= 3) earned.add("streak_3");
  if (currentStreak >= 7 || bestStreak >= 7) earned.add("streak_7");
  if (currentStreak >= 14 || bestStreak >= 14) earned.add("streak_14");

  const onTimeCount = logs.filter((log) => log.consistencyScore >= 80).length;
  if (onTimeCount >= 5) earned.add("on_time");

  const ratedCount = logs.filter((log) => log.rating > 0).length;
  if (ratedCount >= 5) earned.add("mood_5");

  const perfect = logs.some((log) => log.consistencyScore === 100);
  if (perfect) earned.add("perfect_score");

  const ritual = logs.some((log) => log.ritualCompleted);
  if (ritual) earned.add("early_wind");

  const weekendByWeek = new Map<string, Set<number>>();
  logs.forEach((log) => {
    const d = parseDateKey(log.date);
    const day = d.getDay();
    if (day !== 0 && day !== 6) return;

    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d.getTime() - jan1.getTime()) / DAY_MS) + jan1.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-${week}`;
    const set = weekendByWeek.get(key) ?? new Set<number>();
    set.add(day);
    weekendByWeek.set(key, set);
  });

  const hasWeekendPair = Array.from(weekendByWeek.values()).some((set) => set.has(0) && set.has(6));
  if (hasWeekendPair) earned.add("weekend");

  return BADGES.filter((badge) => earned.has(badge.id)).map((badge) => badge.id);
}

export function getDerivedLevel(logs: SleepLog[]): number {
  return getLevelFromXP(getDerivedXp(logs));
}
