import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema";

// Re-platformed onto Supabase Postgres (project ClearEdgeProperties).
// Use the Supabase connection string in DATABASE_URL. Either form works:
//   Direct:  postgresql://postgres:[PASSWORD]@db.oqqmaipbieirijzlscls.supabase.co:5432/postgres
//   Pooler:  postgresql://postgres.oqqmaipbieirijzlscls:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set to the Supabase Postgres connection string.",
  );
}

// prepare:false keeps us compatible with Supabase's transaction-mode pooler (port 6543),
// which does not support prepared statements. ssl:'require' is needed for Supabase.
export const client = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });
