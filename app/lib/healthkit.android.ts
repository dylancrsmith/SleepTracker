import {
  SdkAvailabilityStatus,
  getSdkStatus,
  getGrantedPermissions,
  initialize,
  readRecords,
  requestPermission,
  type Permission,
  type RecordResult,
} from "react-native-health-connect";
import { openHealthConnectSettings } from "react-native-health-connect";
import { Linking } from "react-native";

export type SleepSession = {
  start: string;
  end: string;
  source?: string;
  type?: string;
};

const SLEEP_PERMISSION: Permission = {
  accessType: "read",
  recordType: "SleepSession",
};

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
const HEALTH_CONNECT_PLAY_STORE_URI = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
const HEALTH_CONNECT_PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;
const HEALTH_CONNECT_PERMISSION_HELP =
  "Enable Sleep permissions in Health Connect, then return and press Connect again.";
const HEALTH_CONNECT_NOT_INSTALLED_HELP =
  "Health Connect is missing or out of date. Install/update it, then return and tap Connect Health.";
let healthConnectNotice: string | null = null;

function mapStageType(stages: { stage?: number }[] | undefined): string {
  if (!stages || stages.length === 0) return "ASLEEP";

  const stageValues = stages.map((s) => s.stage);
  if (stageValues.includes(6)) return "ASLEEP_REM";
  if (stageValues.includes(5)) return "ASLEEP_DEEP";
  if (stageValues.includes(4)) return "ASLEEP_CORE";
  if (stageValues.includes(2)) return "ASLEEP";

  return "ASLEEP";
}

function ensureValidRange(start: string, end: string): boolean {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  return !Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs;
}

function isSleepReadPermission(permission: unknown): boolean {
  if (!permission || typeof permission !== "object") return false;
  const maybePermission = permission as Partial<Permission>;
  return maybePermission.accessType === "read" && maybePermission.recordType === "SleepSession";
}

async function hasSleepReadPermission(): Promise<boolean> {
  const granted = await getGrantedPermissions();
  return granted.some((permission) => isSleepReadPermission(permission));
}

async function openHealthConnectPlayStorePage(): Promise<void> {
  const canOpenMarketUri = await Linking.canOpenURL(HEALTH_CONNECT_PLAY_STORE_URI);
  if (canOpenMarketUri) {
    await Linking.openURL(HEALTH_CONNECT_PLAY_STORE_URI);
    return;
  }

  await Linking.openURL(HEALTH_CONNECT_PLAY_STORE_WEB_URL);
}

function isMissingPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const text = error.message.toLowerCase();
  return text.includes("permission") || text.includes("securityexception");
}

function setHealthConnectNotice(message: string | null): void {
  healthConnectNotice = message;
}

export function getHealthConnectNotice(): string | null {
  return healthConnectNotice;
}

async function ensureHealthConnectAvailable(openStoreIfNeeded: boolean): Promise<void> {
  const sdkStatus = await getSdkStatus();

  if (sdkStatus === SdkAvailabilityStatus.SDK_AVAILABLE) {
    return;
  }

  if (sdkStatus === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
    if (openStoreIfNeeded) {
      await openHealthConnectPlayStorePage();
    }
    throw new Error(HEALTH_CONNECT_NOT_INSTALLED_HELP);
  }

  throw new Error("Health Connect is not available on this Android device.");
}

async function ensureInitialized(): Promise<void> {
  const initialized = await initialize();
  if (!initialized) {
    throw new Error("Failed to initialize Health Connect.");
  }
}

export async function initHealthKit(): Promise<void> {
  setHealthConnectNotice(null);
  await ensureHealthConnectAvailable(true);
  await ensureInitialized();

  if (await hasSleepReadPermission()) {
    return;
  }

  try {
    const grantedPermissions = await requestPermission([SLEEP_PERMISSION]);
    const sleepPermissionGranted = grantedPermissions.some((permission) => isSleepReadPermission(permission));
    if (!sleepPermissionGranted) {
      try {
        await openHealthConnectSettings();
      } catch {
        // Keep the app alive and rely on the UI message for manual retry.
      }
      setHealthConnectNotice(HEALTH_CONNECT_PERMISSION_HELP);
      throw new Error(HEALTH_CONNECT_PERMISSION_HELP);
    }
  } catch (error) {
    try {
      await openHealthConnectSettings();
    } catch {
      // Keep the app alive and rely on the UI message for manual retry.
    }
    setHealthConnectNotice(HEALTH_CONNECT_PERMISSION_HELP);
    const details = error instanceof Error ? error.message : "unknown error";
    throw new Error(`${HEALTH_CONNECT_PERMISSION_HELP} (${details})`);
  }

  if (!(await hasSleepReadPermission())) {
    try {
      await openHealthConnectSettings();
    } catch {
      // Keep the app alive and rely on the UI message for manual retry.
    }
    setHealthConnectNotice(HEALTH_CONNECT_PERMISSION_HELP);
    throw new Error(HEALTH_CONNECT_PERMISSION_HELP);
  }
}

export async function fetchSleepSessionsLast7Days(): Promise<SleepSession[]> {
  setHealthConnectNotice(null);
  await ensureHealthConnectAvailable(false);
  await ensureInitialized();

  if (!(await hasSleepReadPermission())) {
    setHealthConnectNotice(HEALTH_CONNECT_PERMISSION_HELP);
    return [];
  }

  const end = new Date();
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const result = await readRecords("SleepSession", {
      timeRangeFilter: {
        operator: "between",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
      ascendingOrder: true,
    });

    return result.records
      .filter((record: RecordResult<"SleepSession">) => ensureValidRange(record.startTime, record.endTime))
      .map((record: RecordResult<"SleepSession">) => ({
        start: new Date(record.startTime).toISOString(),
        end: new Date(record.endTime).toISOString(),
        source: record.metadata?.dataOrigin || "HealthConnect",
        type: mapStageType(record.stages as { stage?: number }[] | undefined),
      }))
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  } catch (error) {
    if (isMissingPermissionError(error)) {
      setHealthConnectNotice(HEALTH_CONNECT_PERMISSION_HELP);
      return [];
    }
    const details = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Failed to read sleep sessions from Health Connect (${details}).`);
  }
}
