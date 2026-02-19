import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import * as Storage from "./storage";
import * as Gamification from "./gamification";
import { sleepApi } from "./api";
import { useAuth } from "./auth-context";

interface SleepContextValue {
  settings: Storage.UserSettings | null;
  sleepLogs: Storage.SleepLog[];
  activeSession: Storage.ActiveSession | null;
  gamification: Storage.GamificationData;
  checklistItems: Storage.ChecklistItem[];
  motionEnabled: boolean;
  onboardingDone: boolean;
  isLoading: boolean;
  updateSettings: (s: Storage.UserSettings) => Promise<void>;
  startSleep: () => Promise<void>;
  endSleep: (rating: number, tags: string[], note: string, ritualDone: boolean, ritualItemsDone: number, ritualTotal: number) => Promise<string[]>;
  updateMotionCount: (count: number) => Promise<void>;
  toggleMotion: (enabled: boolean) => Promise<void>;
  completeOnboarding: (s: Storage.UserSettings) => Promise<void>;
  updateChecklistItems: (items: Storage.ChecklistItem[]) => Promise<void>;
  awardXp: (amount: number) => Promise<void>;
  deleteAllData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const SleepContext = createContext<SleepContextValue | null>(null);

export function SleepProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [settings, setSettings] = useState<Storage.UserSettings | null>(null);
  const [sleepLogs, setSleepLogs] = useState<Storage.SleepLog[]>([]);
  const [activeSession, setActiveSession] = useState<Storage.ActiveSession | null>(null);
  const [gamification, setGamification] = useState<Storage.GamificationData>({
    xp: 0, level: 1, currentStreak: 0, longestStreak: 0, totalNightsLogged: 0, badges: [], lastLogDate: "",
  });
  const [checklistItems, setChecklistItems] = useState<Storage.ChecklistItem[]>([]);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [s, logs, session, gam, done, items, motion] = await Promise.all([
        Storage.getSettings(),
        Storage.getSleepLogs(),
        Storage.getActiveSession(),
        Storage.getGamification(),
        Storage.isOnboardingDone(),
        Storage.getChecklistItems(),
        Storage.isMotionEnabled(),
      ]);
      setSettings(s);
      setSleepLogs(logs);
      setActiveSession(session);
      setGamification(gam);
      setOnboardingDone(done);
      setChecklistItems(items);
      setMotionEnabled(motion);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettings = useCallback(async (s: Storage.UserSettings) => {
    await Storage.saveSettings(s);
    setSettings(s);
  }, []);

  const startSleep = useCallback(async () => {
    const session: Storage.ActiveSession = { startTime: Date.now(), motionCount: 0 };
    await Storage.saveActiveSession(session);
    setActiveSession(session);
  }, []);

  const endSleep = useCallback(async (
    rating: number, tags: string[], note: string,
    ritualDone: boolean, ritualItemsDone: number, ritualTotal: number
  ): Promise<string[]> => {
    if (!activeSession || !settings) return [];

    const endTime = Date.now();
    const durationMinutes = Math.round((endTime - activeSession.startTime) / 60000);
    const consistencyScore = Gamification.computeConsistencyScore(
      activeSession.startTime, endTime,
      settings.bedtimeHour, settings.bedtimeMinute,
      settings.wakeHour, settings.wakeMinute
    );

    const dateStr = new Date(activeSession.startTime).toISOString().split("T")[0];

    const log: Storage.SleepLog = {
      id: Storage.generateId(),
      startTime: activeSession.startTime,
      endTime,
      durationMinutes,
      rating,
      tags,
      note,
      consistencyScore,
      ritualCompleted: ritualDone,
      ritualItemsDone,
      ritualItemsTotal: ritualTotal,
      motionCount: activeSession.motionCount,
      date: dateStr,
    };

    await Storage.saveSleepLog(log);
    await Storage.saveActiveSession(null);

    // Also save to the server database (best effort — won't crash the app if offline)
    if (token) {
      sleepApi.saveLog(log, token).catch((e) =>
        console.warn("Failed to sync sleep log to server:", e)
      );
    }

    let xpEarned = Gamification.XP_VALUES.LOG_SLEEP;
    if (consistencyScore >= 80) xpEarned += Gamification.XP_VALUES.ON_TIME_BEDTIME + Gamification.XP_VALUES.ON_TIME_WAKE;
    if (consistencyScore >= 95) xpEarned += Gamification.XP_VALUES.HIGH_CONSISTENCY;
    if (ritualDone) xpEarned += Gamification.XP_VALUES.RITUAL_COMPLETE;
    if (rating > 0) xpEarned += Gamification.XP_VALUES.RATING_SUBMITTED;

    let updatedGam = { ...gamification };
    updatedGam = Gamification.updateStreak(updatedGam, dateStr);
    updatedGam.xp += xpEarned;
    updatedGam.level = Gamification.getLevelFromXP(updatedGam.xp);

    const updatedLogs = [log, ...sleepLogs];
    const newBadges = Gamification.checkNewBadges(updatedGam, updatedLogs);
    updatedGam.badges = [...updatedGam.badges, ...newBadges];

    await Storage.saveGamification(updatedGam);

    setActiveSession(null);
    setSleepLogs(updatedLogs);
    setGamification(updatedGam);

    return newBadges;
  }, [activeSession, settings, gamification, sleepLogs]);

  const updateMotionCount = useCallback(async (count: number) => {
    if (!activeSession) return;
    const updated = { ...activeSession, motionCount: count };
    await Storage.saveActiveSession(updated);
    setActiveSession(updated);
  }, [activeSession]);

  const toggleMotion = useCallback(async (enabled: boolean) => {
    await Storage.setMotionEnabled(enabled);
    setMotionEnabled(enabled);
  }, []);

  const completeOnboarding = useCallback(async (s: Storage.UserSettings) => {
    await Storage.saveSettings(s);
    await Storage.setOnboardingDone();
    setSettings(s);
    setOnboardingDone(true);
  }, []);

  const updateChecklistItems = useCallback(async (items: Storage.ChecklistItem[]) => {
    await Storage.saveChecklistItems(items);
    setChecklistItems(items);
  }, []);

  const awardXp = useCallback(async (amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Generic XP hook for new modules (like Sleep Aid) without touching log logic.
    const updatedGam = { ...gamification };
    updatedGam.xp += Math.round(amount);
    updatedGam.level = Gamification.getLevelFromXP(updatedGam.xp);
    await Storage.saveGamification(updatedGam);
    setGamification(updatedGam);
  }, [gamification]);

  const deleteAllData = useCallback(async () => {
    await Storage.deleteAllData();
    setSettings(null);
    setSleepLogs([]);
    setActiveSession(null);
    setGamification({ xp: 0, level: 1, currentStreak: 0, longestStreak: 0, totalNightsLogged: 0, badges: [], lastLogDate: "" });
    setChecklistItems([]);
    setMotionEnabled(false);
    setOnboardingDone(false);
  }, []);

  const value = useMemo(() => ({
    settings, sleepLogs, activeSession, gamification, checklistItems,
    motionEnabled, onboardingDone, isLoading,
    updateSettings, startSleep, endSleep, updateMotionCount,
    toggleMotion, completeOnboarding, updateChecklistItems, awardXp,
    deleteAllData, refreshData: loadData,
  }), [settings, sleepLogs, activeSession, gamification, checklistItems,
    motionEnabled, onboardingDone, isLoading, updateSettings, startSleep,
    endSleep, updateMotionCount, toggleMotion, completeOnboarding,
    updateChecklistItems, awardXp, deleteAllData, loadData]);

  return <SleepContext.Provider value={value}>{children}</SleepContext.Provider>;
}

export function useSleep() {
  const ctx = useContext(SleepContext);
  if (!ctx) throw new Error("useSleep must be used within SleepProvider");
  return ctx;
}
