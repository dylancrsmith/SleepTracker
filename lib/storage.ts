import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  SETTINGS: "dreamstreak_settings",
  SLEEP_LOGS: "dreamstreak_sleep_logs",
  ACTIVE_SESSION: "dreamstreak_active_session",
  GAMIFICATION: "dreamstreak_gamification",
  ONBOARDING_DONE: "dreamstreak_onboarding_done",
  CHECKLIST_ITEMS: "dreamstreak_checklist_items",
  MOTION_ENABLED: "dreamstreak_motion_enabled",
};

export interface UserSettings {
  bedtimeHour: number;
  bedtimeMinute: number;
  wakeHour: number;
  wakeMinute: number;
  reminderMinutes: number;
}

export interface SleepLog {
  id: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  rating: number;
  tags: string[];
  note: string;
  consistencyScore: number;
  ritualCompleted: boolean;
  ritualItemsDone: number;
  ritualItemsTotal: number;
  motionCount: number;
  date: string;
}

export interface ActiveSession {
  startTime: number;
  motionCount: number;
}

export interface GamificationData {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalNightsLogged: number;
  badges: string[];
  lastLogDate: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  enabled: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "phone", label: "Put phone away", enabled: true },
  { id: "teeth", label: "Brush teeth", enabled: true },
  { id: "water", label: "Drink water", enabled: true },
  { id: "read", label: "Read for 10 minutes", enabled: true },
  { id: "stretch", label: "Light stretching", enabled: true },
];

const DEFAULT_GAMIFICATION: GamificationData = {
  xp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  totalNightsLogged: 0,
  badges: [],
  lastLogDate: "",
};

export async function getSettings(): Promise<UserSettings | null> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  return raw ? JSON.parse(raw) : null;
}

export async function saveSettings(s: UserSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(s));
}

export async function getSleepLogs(): Promise<SleepLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.SLEEP_LOGS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveSleepLog(log: SleepLog): Promise<void> {
  const logs = await getSleepLogs();
  logs.unshift(log);
  await AsyncStorage.setItem(KEYS.SLEEP_LOGS, JSON.stringify(logs));
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const raw = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
  return raw ? JSON.parse(raw) : null;
}

export async function saveActiveSession(s: ActiveSession | null): Promise<void> {
  if (s === null) {
    await AsyncStorage.removeItem(KEYS.ACTIVE_SESSION);
  } else {
    await AsyncStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(s));
  }
}

export async function getGamification(): Promise<GamificationData> {
  const raw = await AsyncStorage.getItem(KEYS.GAMIFICATION);
  return raw ? JSON.parse(raw) : { ...DEFAULT_GAMIFICATION };
}

export async function saveGamification(g: GamificationData): Promise<void> {
  await AsyncStorage.setItem(KEYS.GAMIFICATION, JSON.stringify(g));
}

export async function isOnboardingDone(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
  return raw === "true";
}

export async function setOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_DONE, "true");
}

export async function getChecklistItems(): Promise<ChecklistItem[]> {
  const raw = await AsyncStorage.getItem(KEYS.CHECKLIST_ITEMS);
  return raw ? JSON.parse(raw) : [...DEFAULT_CHECKLIST];
}

export async function saveChecklistItems(items: ChecklistItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CHECKLIST_ITEMS, JSON.stringify(items));
}

export async function isMotionEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.MOTION_ENABLED);
  return raw === "true";
}

export async function setMotionEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.MOTION_ENABLED, enabled ? "true" : "false");
}

export async function deleteAllData(): Promise<void> {
  const keys = Object.values(KEYS);
  await AsyncStorage.multiRemove(keys);
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
