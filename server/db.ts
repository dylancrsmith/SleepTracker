import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import "dotenv/config";

// Use the standard pg Pool driver — compatible with Neon's PostgreSQL endpoint
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle({ client: pool, schema });
