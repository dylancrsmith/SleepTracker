import type { Express } from "express";
import { createServer, type Server } from "node:http";
import authRoutes from "./routes/auth.routes";
import sleepRoutes from "./routes/sleep.routes";
import wearablesRoutes from "./routes/wearables.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes: /api/auth/register, /api/auth/login, /api/auth/me
  app.use("/api/auth", authRoutes);

  // Sleep data routes: /api/sleep (GET, POST, DELETE /:id)
  app.use("/api/sleep", sleepRoutes);

  // Wearable ingestion routes: /api/wearables/sleep
  app.use("/api/wearables", wearablesRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
