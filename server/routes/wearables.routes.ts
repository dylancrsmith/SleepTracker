import { Router } from "express";
import { db } from "../db";
import { sleepLogs } from "@shared/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { BadRequest } from "../middleware/errorHandler.middleware";

const router = Router();

router.use(requireAuth);

type WearableSleepBody = {
  start?: string;
  end?: string;
  source?: string;
  type?: string;
};

function toTimestamp(value: string | undefined, fieldName: "start" | "end"): number {
  if (!value) {
    throw BadRequest(`Missing required field: ${fieldName}`);
  }

  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw BadRequest(`Invalid ISO date for field: ${fieldName}`);
  }

  return ms;
}

function sanitize(value: string | undefined): string {
  if (!value) return "unknown";
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
}

router.post(
  "/sleep",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = req.body as WearableSleepBody;

    const startTime = toTimestamp(body.start, "start");
    const endTime = toTimestamp(body.end, "end");

    if (endTime <= startTime) {
      throw BadRequest("end must be later than start");
    }

    const durationMinutes = Math.max(1, Math.round((endTime - startTime) / 60000));
    const date = new Date(startTime).toISOString().split("T")[0];
    const source = (body.source || "HealthKit").trim();
    const type = (body.type || "ASLEEP").trim();

    const id = `hk-${sanitize(userId)}-${startTime}-${endTime}-${sanitize(type)}`;

    const [log] = await db
      .insert(sleepLogs)
      .values({
        id,
        userId,
        date,
        startTime,
        endTime,
        durationMinutes,
        rating: 0,
        tags: ["healthkit", source, type],
        note: `Imported from Apple Health (${source}${type ? `/${type}` : ""})`,
        consistencyScore: 0,
        ritualCompleted: false,
        ritualItemsDone: 0,
        ritualItemsTotal: 0,
        motionCount: 0,
      })
      .onConflictDoUpdate({
        target: sleepLogs.id,
        set: {
          date,
          startTime,
          endTime,
          durationMinutes,
          tags: ["healthkit", source, type],
          note: `Imported from Apple Health (${source}${type ? `/${type}` : ""})`,
        },
      })
      .returning();

    res.status(201).json({
      summary: {
        id: log.id,
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        durationMinutes: log.durationMinutes,
        source,
        type,
      },
    });
  })
);

export default router;
