export type SleepSession = {
  start: string;
  end: string;
  source?: string;
  type?: string;
};

export async function initHealthKit(): Promise<void> {
  throw new Error("Apple HealthKit is only available on iOS custom dev builds.");
}

export async function fetchSleepSessionsLast7Days(): Promise<SleepSession[]> {
  return [];
}
