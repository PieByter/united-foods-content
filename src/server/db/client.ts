import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Dua mode koneksi:
 * - DATABASE_URL terisi (bukan placeholder) → Postgres/Supabase.
 * - Kosong → PGlite embedded di ./.data/pglite (mode lokal tanpa setup).
 * Service layer hanya bergantung pada tipe AppDb, bukan driver-nya.
 */
export type AppDb = PgDatabase<PgQueryResultHKT, typeof schema>;

const globalForDb = globalThis as unknown as { __ufcDb?: { db: AppDb; ready: Promise<void> } };

export const DEFAULT_OWNER_ID = process.env.UFC_OWNER_ID ?? "00000000-0000-0000-0000-000000000001";
export const DEFAULT_ACTOR = "Chef Ayu";

function resolveDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (url.includes("<") || url.includes(">")) {
    console.warn("[db] DATABASE_URL masih berisi placeholder. Memakai PGlite lokal.");
    return null;
  }
  return url;
}

function migrationsFolder(): string {
  return path.join(process.cwd(), "drizzle");
}

function createHandle(): { db: AppDb; ready: Promise<void> } {
  const url = resolveDatabaseUrl();
  if (url) {
    if (process.env.VERCEL && /db\..*\.supabase\.co/.test(url)) {
      console.warn(
        "[db] Host db.*.supabase.co bersifat IPv6-only di Vercel. Gunakan Supabase transaction pooler (port 6543).",
      );
    }
    const client = postgres(url, { max: 10, prepare: false });
    const db = drizzlePostgres(client, { schema }) as unknown as AppDb;
    const ready = migratePostgres(db as never, { migrationsFolder: migrationsFolder() });
    return { db, ready };
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "[db] DATABASE_URL belum diisi. PGlite tidak tersedia di serverless; isi connection string Supabase transaction pooler.",
    );
  }

  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client, { schema }) as unknown as AppDb;
  const ready = migratePglite(db as never, { migrationsFolder: migrationsFolder() });
  return { db, ready };
}

export function getDbHandle(): { db: AppDb; ready: Promise<void> } {
  if (!globalForDb.__ufcDb) {
    globalForDb.__ufcDb = createHandle();
  }
  return globalForDb.__ufcDb;
}

export async function getDb(): Promise<AppDb> {
  const handle = getDbHandle();
  await handle.ready;
  return handle.db;
}

export { schema };
