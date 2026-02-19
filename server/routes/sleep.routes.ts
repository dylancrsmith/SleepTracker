import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { sleepLogs } from "@shared/schema";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { NotFound } from "../middleware/errorHandler.middleware";

const router = Router();

// All sleep routes require authentication
router.use(requireAuth);

/**
 * GET /api/sleep
 * Returns all sleep logs for the logged-in user, newest first.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const logs = await db
      .select()
      .from(sleepLogs)
      .where(eq(sleepLogs.userId, req.user!.userId))
      .orderBy(desc(sleepLogs.startTime));

    res.json({ logs });
  })
);

/**
 * POST /api/sleep
 * Saves a new sleep log for the logged-in user.
 * The client sends the full log object (with client-generated ID).
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const body = req.body;

    // Insert the sleep log, attaching the authenticated user's ID
    const [log] = await db
      .insert(sleepLogs)
      .values({
        id: body.id,
        userId,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        durationMinutes: body.durationMinutes,
        rating: body.rating ?? 0,
        tags: body.tags ?? [],
        note: body.note ?? "",
        consistencyScore: body.consistencyScore ?? 0,
        ritualCompleted: body.ritualCompleted ?? false,
        ritualItemsDone: body.ritualItemsDone ?? 0,
        ritualItemsTotal: body.ritualItemsTotal ?? 0,
        motionCount: body.motionCount ?? 0,
      })
      .onConflictDoUpdate({
        target: sleepLogs.id,
        set: {
          date: body.date,
          startTime: body.startTime,
          endTime: body.endTime,
          durationMinutes: body.durationMinutes,
          rating: body.rating ?? 0,
          tags: body.tags ?? [],
          note: body.note ?? "",
          consistencyScore: body.consistencyScore ?? 0,
          ritualCompleted: body.ritualCompleted ?? false,
          ritualItemsDone: body.ritualItemsDone ?? 0,
          ritualItemsTotal: body.ritualItemsTotal ?? 0,
          motionCount: body.motionCount ?? 0,
        },
      })
      .returning();

    res.status(201).json({ log });
  })
);

/**
 * DELETE /api/sleep/:id
 * Deletes a specific sleep log (only if it belongs to the logged-in user).
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const logId = req.params.id;

    // First check it exists and belongs to this user
    const [existing] = await db
      .select()
      .from(sleepLogs)
      .where(eq(sleepLogs.id, logId))
      .limit(1);

    if (!existing || existing.userId !== userId) {
      throw NotFound("Sleep log not found");
    }

    await db.delete(sleepLogs).where(eq(sleepLogs.id, logId));

    res.json({ message: "Sleep log deleted" });
  })
);

export default router;
