"use server";

import { revalidatePath } from "next/cache";
import { getDb, DEFAULT_OWNER_ID } from "@/server/db/client";
import { hasAnyData } from "@/server/queries";
import { seedDatabase } from "../../../scripts/seed-data";
import { fail, ok, type ActionState } from "./shared";

export async function seedDemoAction(force = false): Promise<ActionState> {
  try {
    const db = await getDb();
    if (!force && (await hasAnyData())) {
      return fail("Workspace sudah berisi data. Kosongkan terlebih dahulu untuk memuat ulang data contoh.");
    }
    const result = await seedDatabase(db as never, { ownerId: DEFAULT_OWNER_ID });
    revalidatePath("/", "layout");
    return ok(
      `Data contoh dimuat: ${result.ingredients} bahan, ${result.recipes} resep, ${result.snapshots} snapshot HPP.`,
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal memuat data contoh.");
  }
}
