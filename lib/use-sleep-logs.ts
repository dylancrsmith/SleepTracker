import { useQuery } from "@tanstack/react-query";
import { sleepApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getSleepLogs, type SleepLog } from "@/lib/storage";

export const SLEEP_LOGS_QUERY_KEY = "sleep-logs";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeLog(raw: any): SleepLog {
  const startTime = toNumber(raw?.startTime);
  const endTime = toNumber(raw?.endTime);
  const durationMinutes = toNumber(raw?.durationMinutes, Math.max(1, Math.round((endTime - startTime) / 60000)));

  return {
    id: String(raw?.id ?? `${startTime}-${endTime}`),
    startTime,
    endTime,
    durationMinutes,
    rating: toNumber(raw?.rating),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : [],
    note: typeof raw?.note === "string" ? raw.note : "",
    consistencyScore: toNumber(raw?.consistencyScore),
    ritualCompleted: Boolean(raw?.ritualCompleted),
    ritualItemsDone: toNumber(raw?.ritualItemsDone),
    ritualItemsTotal: toNumber(raw?.ritualItemsTotal),
    motionCount: toNumber(raw?.motionCount),
    date: typeof raw?.date === "string" ? raw.date : new Date(startTime).toISOString().split("T")[0],
  };
}

function mergeLogs(localLogs: SleepLog[], remoteLogs: SleepLog[]): SleepLog[] {
  const merged = new Map<string, SleepLog>();

  for (const log of localLogs) {
    const key = `${log.startTime}-${log.endTime}`;
    merged.set(key, log);
  }

  for (const log of remoteLogs) {
    const key = `${log.startTime}-${log.endTime}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, log);
      continue;
    }

    // Prefer the richer server payload when it has user-entered details.
    const hasServerDetails =
      log.rating > 0 ||
      log.consistencyScore > 0 ||
      log.tags.length > 0 ||
      log.note.length > 0 ||
      log.ritualCompleted;

    if (hasServerDetails) {
      merged.set(key, log);
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.startTime - a.startTime);
}

export function useSleepLogs() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: [SLEEP_LOGS_QUERY_KEY, token],
    queryFn: async () => {
      const localLogs = await getSleepLogs();
      if (!token) return localLogs;

      try {
        const res = await sleepApi.getLogs(token);
        const remoteLogs = (res.logs || []).map(normalizeLog);
        return mergeLogs(localLogs, remoteLogs);
      } catch {
        return localLogs;
      }
    },
  });

  return {
    ...query,
    sleepLogs: query.data ?? [],
  };
}
