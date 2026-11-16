import { eq } from "drizzle-orm";
import type { AppDb } from "@/server/db/client";
import { DEFAULT_ACTOR, DEFAULT_OWNER_ID } from "@/server/db/client";
import * as schema from "@/server/db/schema";

export interface ActionState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  recipeId?: string;
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

export function ok(message: string, recipeId?: string): ActionState {
  return { ok: true, message, recipeId };
}

export async function logAudit(
  db: Pick<AppDb, "insert" | "select">,
  input: {
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
    actor?: string;
  },
): Promise<void> {
  let actor = input.actor ?? DEFAULT_ACTOR;
  if (!input.actor) {
    const rows = await db
      .select({ ownerName: schema.appSettings.ownerName })
      .from(schema.appSettings)
      .where(eq(schema.appSettings.ownerId, DEFAULT_OWNER_ID))
      .limit(1);
    actor = rows[0]?.ownerName ?? DEFAULT_ACTOR;
  }

  await db.insert(schema.auditLog).values({
    ownerId: DEFAULT_OWNER_ID,
    actor,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    summary: input.summary,
    metadata: input.metadata ?? null,
  });
}

export function parseDateInput(value: string | null | undefined, endOfDay = false): Date {
  if (!value) return new Date();
  const trimmed = value.trim();
  if (!trimmed) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T${endOfDay ? "23:59:59" : "00:00:00"}+07:00`);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function generateRecipeCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `REC-${y}${m}${d}-${suffix}`;
}
