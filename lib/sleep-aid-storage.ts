import AsyncStorage from "@react-native-async-storage/async-storage";

const SLEEP_AID_KEY = "dreamstreak_sleep_aid_state";

export type WindDownStep = {
  id: string;
  label: string;
};

export type SleepAidState = {
  windDownCheckedIds: string[];
  windDownRewardDate: string;
  selectedSoundId: string;
  selectedSoundName: string;
  soundTimerMinutes: number;
  soundVolume: number;
  safeVolumeCapEnabled: boolean;
  breathingMinutes: 2 | 5 | 10;
  relaxTimerEnabled: boolean;
  relaxStepDelaySeconds: 15 | 30 | 45;
  relaxAutoAdvance: boolean;
  reminderEnabled: boolean;
};

export const DEFAULT_WIND_DOWN_STEPS: WindDownStep[] = [
  { id: "hot_shower", label: "Hot shower" },
  { id: "brush_teeth", label: "Brush teeth" },
  { id: "dim_lights", label: "Dim lights" },
  { id: "light_stretching", label: "Light stretching" },
  { id: "quiet_activity", label: "Journal / Calming music / Reading" },
];

export const DEFAULT_SLEEP_AID_STATE: SleepAidState = {
  windDownCheckedIds: [],
  windDownRewardDate: "",
  selectedSoundId: "brown_noise",
  selectedSoundName: "Brown noise",
  soundTimerMinutes: 30,
  soundVolume: 0.6,
  safeVolumeCapEnabled: true,
  breathingMinutes: 5,
  relaxTimerEnabled: true,
  relaxStepDelaySeconds: 30,
  relaxAutoAdvance: true,
  reminderEnabled: false,
};

export async function getSleepAidState(): Promise<SleepAidState> {
  const raw = await AsyncStorage.getItem(SLEEP_AID_KEY);
  if (!raw) return { ...DEFAULT_SLEEP_AID_STATE };

  try {
    const parsed = JSON.parse(raw) as Partial<SleepAidState>;
    return {
      ...DEFAULT_SLEEP_AID_STATE,
      ...parsed,
      soundTimerMinutes:
        typeof parsed.soundTimerMinutes === "number" &&
        parsed.soundTimerMinutes >= 1 &&
        parsed.soundTimerMinutes <= 180
          ? Math.floor(parsed.soundTimerMinutes)
          : DEFAULT_SLEEP_AID_STATE.soundTimerMinutes,
      breathingMinutes:
        parsed.breathingMinutes === 2 ||
        parsed.breathingMinutes === 5 ||
        parsed.breathingMinutes === 10
          ? parsed.breathingMinutes
          : DEFAULT_SLEEP_AID_STATE.breathingMinutes,
      soundVolume:
        typeof parsed.soundVolume === "number"
          ? Math.max(0, Math.min(1, parsed.soundVolume))
          : DEFAULT_SLEEP_AID_STATE.soundVolume,
      safeVolumeCapEnabled:
        typeof parsed.safeVolumeCapEnabled === "boolean"
          ? parsed.safeVolumeCapEnabled
          : DEFAULT_SLEEP_AID_STATE.safeVolumeCapEnabled,
      relaxStepDelaySeconds:
        parsed.relaxStepDelaySeconds === 15 ||
        parsed.relaxStepDelaySeconds === 30 ||
        parsed.relaxStepDelaySeconds === 45
          ? parsed.relaxStepDelaySeconds
          : DEFAULT_SLEEP_AID_STATE.relaxStepDelaySeconds,
      relaxAutoAdvance:
        typeof parsed.relaxAutoAdvance === "boolean"
          ? parsed.relaxAutoAdvance
          : DEFAULT_SLEEP_AID_STATE.relaxAutoAdvance,
      windDownCheckedIds: Array.isArray(parsed.windDownCheckedIds)
        ? parsed.windDownCheckedIds
        : [],
    };
  } catch {
    return { ...DEFAULT_SLEEP_AID_STATE };
  }
}

export async function saveSleepAidState(state: SleepAidState): Promise<void> {
  await AsyncStorage.setItem(SLEEP_AID_KEY, JSON.stringify(state));
}

export async function patchSleepAidState(
  patch: Partial<SleepAidState>,
): Promise<SleepAidState> {
  const current = await getSleepAidState();
  const next = { ...current, ...patch };
  await saveSleepAidState(next);
  return next;
}
