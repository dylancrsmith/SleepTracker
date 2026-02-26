import AppleHealthKit, { type HealthInputOptions, type HealthKitPermissions } from "react-native-health";

export type SleepSession = {
  start: string;
  end: string;
  source?: string;
  type?: string;
};

type RawSleepSample = {
  startDate?: string;
  endDate?: string;
  sourceName?: string;
  sourceId?: string;
  value?: unknown;
};

const READ_SLEEP_PERMISSION = AppleHealthKit.Constants.Permissions.SleepAnalysis;

const ASLEEP_TYPES = new Set([
  "ASLEEP",
  "ASLEEP_CORE",
  "ASLEEP_DEEP",
  "ASLEEP_REM",
  "CORE",
  "DEEP",
  "REM",
]);

const IN_BED_TYPES = new Set(["INBED", "IN_BED"]);

function normalizeType(value: unknown): string {
  if (typeof value !== "string") return "UNKNOWN";
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function isValidDate(value: string | undefined): value is string {
  return !!value && !Number.isNaN(Date.parse(value));
}

function initHealthKitPermissions(): Promise<void> {
  const permissions: HealthKitPermissions = {
    permissions: {
      read: [READ_SLEEP_PERMISSION],
      write: [],
    },
  };

  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        reject(new Error(typeof error === "string" ? error : "Failed to initialize HealthKit"));
        return;
      }
      resolve();
    });
  });
}

function getSleepSamples(options: HealthInputOptions): Promise<RawSleepSample[]> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.getSleepSamples(options, (error, results) => {
      if (error) {
        reject(new Error(typeof error === "string" ? error : "Failed to fetch sleep samples"));
        return;
      }
      resolve((results as unknown as RawSleepSample[]) || []);
    });
  });
}

function isHealthKitAvailable(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    AppleHealthKit.isAvailable((error, available) => {
      if (error) {
        reject(new Error("Failed to check HealthKit availability"));
        return;
      }
      resolve(Boolean(available));
    });
  });
}

function normalizeSamples(rawSamples: RawSleepSample[]): SleepSession[] {
  const samplesWithType = rawSamples
    .filter((sample) => isValidDate(sample.startDate) && isValidDate(sample.endDate))
    .map((sample) => {
      const type = normalizeType(sample.value);
      return {
        sample,
        type,
      };
    })
    .filter(({ sample }) => Date.parse(sample.endDate!) > Date.parse(sample.startDate!));

  const hasAsleepStages = samplesWithType.some(({ type }) => ASLEEP_TYPES.has(type));

  const filtered = samplesWithType.filter(({ type }) => {
    if (ASLEEP_TYPES.has(type)) return true;
    if (!hasAsleepStages && IN_BED_TYPES.has(type)) return true;
    return false;
  });

  return filtered
    .map(({ sample, type }) => ({
      start: new Date(sample.startDate!).toISOString(),
      end: new Date(sample.endDate!).toISOString(),
      source: sample.sourceName || sample.sourceId,
      type,
    }))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export async function initHealthKit(): Promise<void> {
  const available = await isHealthKitAvailable();
  if (!available) {
    throw new Error("HealthKit is not available on this device.");
  }
  await initHealthKitPermissions();
}

export async function fetchSleepSessionsLast7Days(): Promise<SleepSession[]> {
  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const options: HealthInputOptions = {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    ascending: true,
  };

  const rawSamples = await getSleepSamples(options);
  return normalizeSamples(rawSamples);
}
