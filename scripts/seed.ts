import path from "node:path";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadEnvFiles } from "./load-env";
import { seedDatabase } from "./seed-data";
import type { AppDb } from "../src/server/db/client";

loadEnvFiles();

async function main() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  const rawUrl = process.env.DATABASE_URL?.trim();
  const url = rawUrl && !rawUrl.includes("<") && !rawUrl.includes(">") ? rawUrl : null;
  const force = process.argv.includes("--force");

  if (url && !force) {
    console.error(
      "[seed] DATABASE_URL terdeteksi. Seed akan menghapus seluruh data workspace.\n" +
        "Jalankan ulang dengan --force jika ini memang database demo/development:\n" +
        "  npm run db:seed -- --force",
    );
    process.exit(1);
  }

  if (url) {
    const client = postgres(url, { max: 1, prepare: false });
    const db = drizzlePostgres(client) as unknown as AppDb;
    await migratePostgres(db as never, { migrationsFolder });
    const result = await seedDatabase(db, { ownerId: process.env.UFC_OWNER_ID });
    await client.end();
    console.log(`Seed selesai (Postgres): ${result.ingredients} bahan, ${result.recipes} resep, ${result.snapshots} snapshot.`);
    return;
  }

  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzlePglite(client) as unknown as AppDb;
  await migratePglite(db as never, { migrationsFolder });
  const result = await seedDatabase(db, { ownerId: process.env.UFC_OWNER_ID });
  await client.close();
  console.log(`Seed selesai (PGlite): ${result.ingredients} bahan, ${result.recipes} resep, ${result.snapshots} snapshot di ${dataDir}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
