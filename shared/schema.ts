import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, bigint, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Sleep Logs ───────────────────────────────────────────────────────────────

export const sleepLogs = pgTable("sleep_logs", {
  id: varchar("id").primaryKey(),                         // client-generated UUID
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  date: text("date").notNull(),                           // "YYYY-MM-DD"
  startTime: bigint("start_time", { mode: "number" }).notNull(),  // unix ms
  endTime: bigint("end_time", { mode: "number" }).notNull(),      // unix ms
  durationMinutes: integer("duration_minutes").notNull(),
  rating: integer("rating").notNull().default(0),         // 0-5 stars
  tags: jsonb("tags").notNull().default([]),              // string[]
  note: text("note").notNull().default(""),
  consistencyScore: integer("consistency_score").notNull().default(0), // 0-100
  ritualCompleted: boolean("ritual_completed").notNull().default(false),
  ritualItemsDone: integer("ritual_items_done").notNull().default(0),
  ritualItemsTotal: integer("ritual_items_total").notNull().default(0),
  motionCount: integer("motion_count").notNull().default(0),
});

export const insertSleepLogSchema = createInsertSchema(sleepLogs).omit({
  userId: true, // added server-side from the JWT token
});

export type InsertSleepLog = z.infer<typeof insertSleepLogSchema>;
export type SleepLog = typeof sleepLogs.$inferSelect;
