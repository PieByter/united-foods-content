"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import {
  assertRecipeDag,
  computePricingMetrics,
  convertQuantity,
  CostingError,
  type RecipeItemType,
} from "@ufc/costing";
import { getDb, DEFAULT_OWNER_ID } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { recipePayloadSchema, recipeTutorialPayloadSchema, snapshotSchema } from "@/lib/schemas";
import { parseDecimalInput, slugify } from "@/lib/format";
import { detectVideoPlatform, youtubeThumbnail } from "@/lib/video";
import { calculateForRecipe } from "@/server/costing-service";
import { getIngredients, getRecipeById, getRecipes } from "@/server/queries";
import { fail, generateRecipeCode, logAudit, ok, parseDateInput, type ActionState } from "./shared";

interface PreparedItem {
  type: RecipeItemType;
  refId: string | null;
  label: string | null;
  qty: string;
  unit: string;
  discrete: boolean;
  rounding: "none" | "half" | "whole";
  nonLinearScaling: boolean;
  note: string | null;
  overheadKind: "fixed" | "percent" | null;
  overheadValue: string | null;
  sortOrder: number;
}

async function uniqueSlug(base: string, recipeId?: string): Promise<string> {
  const db = await getDb();
  const root = slugify(base) || "resep";
  let candidate = root;
  let counter = 1;
  // Cek hingga 50 variasi; jauh lebih dari cukup untuk workspace tunggal.
  while (counter < 50) {
    const rows = await db.select({ id: schema.recipe.id }).from(schema.recipe).where(eq(schema.recipe.slug, candidate)).limit(1);
    if (!rows[0] || rows[0].id === recipeId) return candidate;
    counter += 1;
    candidate = `${root}-${counter}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function saveRecipeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}")) as Record<string, unknown>;
  } catch {
    return fail("Payload resep tidak valid.");
  }

  raw.yieldQty = parseDecimalInput(raw.yieldQty as string | null);
  raw.unitWeightG =
    raw.unitWeightG === null || raw.unitWeightG === undefined || String(raw.unitWeightG).trim() === ""
      ? null
      : parseDecimalInput(raw.unitWeightG as string | null);
  raw.yieldLossPct =
    raw.yieldLossPct === null || raw.yieldLossPct === undefined || String(raw.yieldLossPct).trim() === ""
      ? "0"
      : parseDecimalInput(raw.yieldLossPct as string | null);
  if (Array.isArray(raw.items)) {
    raw.items = raw.items.map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        ...item,
        qty: parseDecimalInput(item.qty as string | null) || "0",
        overheadValue:
          item.overheadValue === null || item.overheadValue === undefined || String(item.overheadValue).trim() === ""
            ? null
            : parseDecimalInput(item.overheadValue as string | null),
      };
    });
  }

  const parsed = recipePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("Periksa kembali formula resep.", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const data = parsed.data;

  try {
    const [ingredients, existingRecipes] = await Promise.all([getIngredients(), getRecipes()]);
    const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
    const recipeMap = new Map(existingRecipes.map((recipe) => [recipe.id, recipe]));

    if (data.id && !recipeMap.has(data.id)) return fail("Resep tidak ditemukan.");
    if (!data.isSubrecipe && data.category === "Sub-resep") {
      return fail("Kategori Sub-resep hanya untuk resep dengan flag sub-resep.", {
        category: "Pilih kategori produksi.",
      });
    }

    const prepared: PreparedItem[] = [];
    for (const [index, item] of data.items.entries()) {
      const sortOrder = index;
      if (item.type === "overhead") {
        const label = item.label?.trim();
        if (!label) return fail(`Item overhead #${index + 1} membutuhkan label.`, { items: "Lengkapi label overhead." });
        const value = new Decimal(item.overheadValue || "0");
        if (value.lt(0)) return fail(`Nilai overhead "${label}" tidak boleh negatif.`);
        if (item.overheadKind === "percent" && value.gt(100)) {
          return fail(`Overhead persen "${label}" maksimal 100%.`);
        }
        prepared.push({
          type: "overhead",
          refId: null,
          label,
          qty: "0",
          unit: item.overheadKind === "percent" ? "%" : "batch",
          discrete: false,
          rounding: "none",
          nonLinearScaling: false,
          note: item.note || null,
          overheadKind: item.overheadKind ?? "fixed",
          overheadValue: value.toFixed(),
          sortOrder,
        });
        continue;
      }

      if (!item.refId) return fail(`Item #${index + 1} belum memilih ${item.type === "ingredient" ? "bahan" : "sub-resep"}.`);
      const qty = new Decimal(item.qty);
      if (qty.lte(0)) return fail(`Kuantitas item #${index + 1} harus lebih besar dari 0.`);

      if (item.type === "ingredient") {
        const ingredient = ingredientMap.get(item.refId);
        if (!ingredient) return fail(`Bahan item #${index + 1} tidak ditemukan.`);
        try {
          convertQuantity(
            qty.toFixed(),
            item.unit,
            ingredient.baseUnit,
            ingredient.conversions.map((conversion) => ({
              fromUnit: conversion.fromUnit,
              toUnit: conversion.toUnit,
              factor: conversion.factor,
            })),
          );
        } catch (error) {
          return fail(
            error instanceof CostingError
              ? `${ingredient.name}: ${error.message}`
              : `Konversi satuan ${ingredient.name} gagal.`,
          );
        }
        prepared.push({
          type: "ingredient",
          refId: ingredient.id,
          label: null,
          qty: qty.toFixed(),
          unit: item.unit,
          discrete: item.discrete,
          rounding: item.rounding,
          nonLinearScaling: item.nonLinearScaling,
          note: item.note || null,
          overheadKind: null,
          overheadValue: null,
          sortOrder,
        });
        continue;
      }

      // Sub-resep
      const subrecipe = recipeMap.get(item.refId);
      if (!subrecipe || !subrecipe.version) return fail(`Sub-resep item #${index + 1} tidak ditemukan atau belum punya versi.`);
      if (data.id && subrecipe.id === data.id) return fail("Resep tidak boleh merujuk dirinya sendiri sebagai sub-resep.");
      try {
        convertQuantity(qty.toFixed(), item.unit, subrecipe.version.yieldUnit);
      } catch {
        return fail(
          `Satuan ${item.unit} tidak kompatibel dengan yield sub-resep "${subrecipe.name}" (${subrecipe.version.yieldUnit}).`,
        );
      }
      prepared.push({
        type: "subrecipe",
        refId: subrecipe.id,
        label: null,
        qty: qty.toFixed(),
        unit: item.unit,
        discrete: item.discrete,
        rounding: item.rounding,
        nonLinearScaling: item.nonLinearScaling,
        note: item.note || null,
        overheadKind: null,
        overheadValue: null,
        sortOrder,
      });
    }

    const targetId = data.id ?? crypto.randomUUID();
    const dagMap = new Map(
      existingRecipes.map((recipe) => [
        recipe.id,
        {
          id: recipe.id,
          items: (recipe.version?.items ?? []).map((item) => ({ type: item.itemType, refId: item.refId })),
        },
      ]),
    );
    dagMap.set(targetId, {
      id: targetId,
      items: prepared.map((item) => ({ type: item.type, refId: item.refId })),
    });
    try {
      assertRecipeDag(targetId, dagMap);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Struktur sub-resep tidak valid.");
    }

    const db = await getDb();
    const existing = data.id ? recipeMap.get(data.id) : null;
    const slug = await uniqueSlug(data.name, data.id);

    const versionNo = existing
      ? (
          await db
            .select({ versionNo: schema.recipeVersion.versionNo })
            .from(schema.recipeVersion)
            .where(eq(schema.recipeVersion.recipeId, targetId))
            .orderBy(desc(schema.recipeVersion.versionNo))
            .limit(1)
        )[0]?.versionNo ?? 0
      : 0;

    const nextVersionNo = versionNo + 1;

    await db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(schema.recipe)
          .set({
            name: data.name,
            slug,
            description: data.description || null,
            category: data.category,
            status: data.status,
            isSubrecipe: data.isSubrecipe,
            updatedAt: new Date(),
          })
          .where(eq(schema.recipe.id, targetId));
      } else {
        await tx.insert(schema.recipe).values({
          id: targetId,
          ownerId: DEFAULT_OWNER_ID,
          name: data.name,
          slug,
          code: generateRecipeCode(),
          description: data.description || null,
          category: data.category,
          status: data.status,
          isSubrecipe: data.isSubrecipe,
          locale: "id-ID",
          authorId: DEFAULT_OWNER_ID,
        });
      }

      const versionInsert = await tx
        .insert(schema.recipeVersion)
        .values({
          ownerId: DEFAULT_OWNER_ID,
          recipeId: targetId,
          versionNo: nextVersionNo,
          yieldQty: new Decimal(data.yieldQty).toFixed(6),
          yieldUnit: data.yieldUnit,
          unitWeightG: data.unitWeightG ? new Decimal(data.unitWeightG).toFixed(6) : null,
          yieldLossPct: new Decimal(data.yieldLossPct ?? "0").toFixed(2),
          notes: data.notes || null,
          createdBy: "Chef Ayu",
        })
        .returning({ id: schema.recipeVersion.id });

      const versionId = versionInsert[0].id;
      await tx.insert(schema.recipeItem).values(
        prepared.map((item) => ({
          ownerId: DEFAULT_OWNER_ID,
          recipeVersionId: versionId,
          itemType: item.type,
          refId: item.refId,
          label: item.label,
          qty: item.qty,
          unit: item.unit,
          discrete: item.discrete,
          rounding: item.rounding,
          nonLinearScaling: item.nonLinearScaling,
          note: item.note,
          overheadKind: item.overheadKind,
          overheadValue: item.overheadValue,
          sortOrder: item.sortOrder,
        })),
      );

      // Tutorial steps belong to a recipe version. Carry the current tutorial
      // forward so improving the formula does not erase the production guide.
      const previousSteps = existing?.version?.steps ?? [];
      if (previousSteps.length > 0) {
        await tx.insert(schema.recipeStep).values(
          previousSteps.map((step) => ({
            ownerId: DEFAULT_OWNER_ID,
            recipeVersionId: versionId,
            stepNo: step.stepNo,
            instruction: step.instruction,
            durationSec: step.durationSec,
          })),
        );
      }

      await tx
        .update(schema.recipe)
        .set({ currentVersionId: versionId, updatedAt: new Date() })
        .where(eq(schema.recipe.id, targetId));

      await logAudit(tx, {
        action: existing ? "recipe.updated" : "recipe.created",
        entityType: "recipe",
        entityId: targetId,
        summary: `${existing ? "Versi baru" : "Resep baru"} "${data.name}" v${nextVersionNo} (${prepared.length} item formula).`,
        metadata: {
          versionNo: nextVersionNo,
          category: data.category,
          yieldQty: data.yieldQty,
          yieldUnit: data.yieldUnit,
          isSubrecipe: data.isSubrecipe,
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/resep");
    revalidatePath(`/resep/${targetId}`);
    revalidatePath(`/resep/${targetId}/simulator`);
    revalidatePath("/simulator");
    return ok(`Resep "${data.name}" v${nextVersionNo} berhasil disimpan.`, targetId);
  } catch (error) {
    if (error instanceof CostingError) return fail(error.message);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan resep.");
  }
}

export async function setRecipeStatusAction(id: string, status: "draft" | "published"): Promise<ActionState> {
  try {
    const db = await getDb();
    const rows = await db.select().from(schema.recipe).where(and(eq(schema.recipe.id, id), eq(schema.recipe.ownerId, DEFAULT_OWNER_ID))).limit(1);
    if (!rows[0]) return fail("Resep tidak ditemukan.");
    await db.transaction(async (tx) => {
      await tx
        .update(schema.recipe)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.recipe.id, id));
      await logAudit(tx, {
        action: "recipe.updated",
        entityType: "recipe",
        entityId: id,
        summary: `Status resep "${rows[0].name}" diubah menjadi ${status === "published" ? "Published" : "Draft"}.`,
        metadata: { status },
      });
    });
    revalidatePath("/dashboard");
    revalidatePath("/resep");
    revalidatePath(`/resep/${id}`);
    return ok(status === "published" ? "Resep dipublikasikan." : "Resep dikembalikan ke draft.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal mengubah status.");
  }
}

export async function archiveRecipeAction(id: string): Promise<ActionState> {
  try {
    const [recipes, db] = await Promise.all([getRecipes(), getDb()]);
    const recipe = recipes.find((entry) => entry.id === id);
    if (!recipe) return fail("Resep tidak ditemukan.");
    const usedAsSubrecipe = recipes.some(
      (entry) => entry.id !== id && entry.version?.items.some((item) => item.itemType === "subrecipe" && item.refId === id),
    );
    if (usedAsSubrecipe) return fail("Resep ini dipakai sebagai sub-resep. Lepaskan referensinya terlebih dahulu.");

    await db.transaction(async (tx) => {
      await tx
        .update(schema.recipe)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.recipe.id, id));
      await logAudit(tx, {
        action: "recipe.updated",
        entityType: "recipe",
        entityId: id,
        summary: `Resep "${recipe.name}" diarsipkan.`,
        metadata: { archived: true },
      });
    });
    revalidatePath("/dashboard");
    revalidatePath("/resep");
    revalidatePath("/simulator");
    return ok("Resep diarsipkan.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal mengarsipkan resep.");
  }
}

export async function saveSnapshotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = snapshotSchema.safeParse({
    recipeId: formData.get("recipeId"),
    scaleFactor: parseDecimalInput(formData.get("scaleFactor") as string | null),
    priceStrategy: formData.get("priceStrategy"),
    asOf: String(formData.get("asOf") ?? ""),
    sellingPrice: parseDecimalInput(formData.get("sellingPrice") as string | null),
    targetMarginPct: formData.get("targetMarginPct") ? parseDecimalInput(formData.get("targetMarginPct") as string | null) : null,
    roundingTo: formData.get("roundingTo") ? parseDecimalInput(formData.get("roundingTo") as string | null) : null,
    label: formData.get("label") || null,
  });
  if (!parsed.success) {
    return fail("Periksa kembali parameter snapshot.", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const data = parsed.data;

  try {
    const [recipe, ingredients, recipes] = await Promise.all([getRecipeById(data.recipeId), getIngredients(), getRecipes()]);
    if (!recipe || !recipe.version) return fail("Resep tidak ditemukan.");

    const asOf = data.asOf ? parseDateInput(data.asOf, true) : new Date();
    const result = calculateForRecipe(recipe, ingredients, recipes, {
      scaleFactor: data.scaleFactor,
      priceStrategy: data.priceStrategy,
      asOf: data.priceStrategy === "snapshot" ? asOf : data.priceStrategy === "average" ? asOf : undefined,
    });
    const metrics = computePricingMetrics({ costPerUnit: result.costPerUnit, sellingPrice: data.sellingPrice });

    const db = await getDb();
    const snapshotId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(schema.costingSnapshot)
        .values({
          ownerId: DEFAULT_OWNER_ID,
          recipeId: recipe.id,
          recipeVersionId: recipe.version!.id,
          label: data.label || `Snapshot v${recipe.version!.versionNo} — ${new Date().toLocaleDateString("id-ID")}`,
          scaleFactor: new Decimal(data.scaleFactor).toFixed(6),
          priceStrategy: data.priceStrategy,
          asOf,
          rawMaterialCost: result.rawMaterialCost,
          overheadCost: result.overheadCost,
          totalCost: result.totalCost,
          effectiveYieldQty: result.effectiveYieldQty,
          yieldUnit: result.yieldUnit,
          costPerUnit: result.costPerUnit,
          itemsBreakdown: {
            lines: result.lines,
            overheadLines: result.overheadLines,
            warnings: result.warnings,
            meta: {
              priceStrategy: result.priceStrategy,
              scaleFactor: result.scaleFactor,
              asOf: result.asOf,
              yieldLossPct: result.yieldLossPct,
              unitWeightG: result.unitWeightG,
            },
          },
          computedAt: new Date(),
          createdBy: "Chef Ayu",
        })
        .returning({ id: schema.costingSnapshot.id });

      await tx.insert(schema.pricingScenario).values({
        ownerId: DEFAULT_OWNER_ID,
        snapshotId: inserted[0].id,
        sellingPrice: new Decimal(data.sellingPrice).toFixed(6),
        marginPct: metrics.marginPct,
        markupPct: metrics.markupPct,
        foodCostPct: metrics.foodCostPct,
        targetMarginPct: data.targetMarginPct ? new Decimal(data.targetMarginPct).toFixed(2) : null,
        roundingTo: data.roundingTo ? new Decimal(data.roundingTo).toFixed(0) : null,
      });

      await logAudit(tx, {
        action: "snapshot.created",
        entityType: "costing_snapshot",
        entityId: inserted[0].id,
        summary: `Snapshot HPP "${recipe.name}" v${recipe.version!.versionNo} disimpan — HPP/unit Rp${result.costPerUnit}, harga jual Rp${data.sellingPrice}, margin ${metrics.marginPct}%.`,
        metadata: {
          recipeId: recipe.id,
          versionId: recipe.version!.id,
          scaleFactor: data.scaleFactor,
          priceStrategy: data.priceStrategy,
          totalCost: result.totalCost,
          costPerUnit: result.costPerUnit,
          sellingPrice: data.sellingPrice,
          marginPct: metrics.marginPct,
          foodCostPct: metrics.foodCostPct,
        },
      });
      return inserted[0].id;
    });

    revalidatePath("/dashboard");
    revalidatePath("/resep");
    revalidatePath(`/resep/${recipe.id}`);
    revalidatePath(`/resep/${recipe.id}/simulator`);
    revalidatePath("/simulator");
    return ok(`Snapshot HPP tersimpan (${snapshotId.slice(0, 8)}).`);
  } catch (error) {
    if (error instanceof CostingError) return fail(error.message);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan snapshot.");
  }
}

export async function saveRecipeTutorialAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const recipeId = String(formData.get("recipeId") ?? "").trim();
  if (!recipeId) return fail("Resep tidak ditemukan.");

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return fail("Payload tutorial tidak valid.");
  }

  const parsed = recipeTutorialPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      "Periksa kembali tutorial yang diisi.",
      parsed.error.flatten().fieldErrors as Record<string, string>,
    );
  }

  const { steps, videos } = parsed.data;

  try {
    const recipe = await getRecipeById(recipeId);
    if (!recipe || !recipe.version) {
      return fail("Resep atau versi formula aktif tidak ditemukan.");
    }

    const version = recipe.version;
    const versionId = version.id;
    const db = await getDb();

    await db.transaction(async (tx) => {
      await tx.delete(schema.recipeStep).where(eq(schema.recipeStep.recipeVersionId, versionId));

      if (steps.length > 0) {
        await tx.insert(schema.recipeStep).values(
          steps.map((step, index) => ({
            ownerId: DEFAULT_OWNER_ID,
            recipeVersionId: versionId,
            stepNo: index + 1,
            instruction: step.instruction,
            durationSec: step.durationSec ?? null,
          })),
        );
      }

      await tx.delete(schema.recipeVideo).where(eq(schema.recipeVideo.recipeId, recipe.id));

      if (videos.length > 0) {
        await tx.insert(schema.recipeVideo).values(
          videos.map((video, index) => {
            const platform = video.platform ?? detectVideoPlatform(video.url);
            return {
              ownerId: DEFAULT_OWNER_ID,
              recipeId: recipe.id,
              url: video.url,
              title: video.title || null,
              description: video.description || null,
              platform,
              thumbnailUrl: video.thumbnailUrl ?? youtubeThumbnail(video.url),
              durationSec: video.durationSec ?? null,
              authorName: video.authorName || null,
              source: video.source ?? "manual",
              sortOrder: index,
              updatedAt: new Date(),
            };
          }),
        );
      }

      await logAudit(tx, {
        action: "recipe.tutorial.updated",
        entityType: "recipe",
        entityId: recipe.id,
        summary: `Tutorial resep "${recipe.name}" v${version.versionNo} diperbarui — ${steps.length} langkah, ${videos.length} video.`,
        metadata: {
          recipeId: recipe.id,
          versionId,
          stepCount: steps.length,
          videoCount: videos.length,
          platforms: videos.map((video) => video.platform ?? detectVideoPlatform(video.url)),
        },
      });
    });

    revalidatePath("/resep");
    revalidatePath(`/resep/${recipe.id}`);
    revalidatePath(`/resep/${recipe.id}/tutorial`);
    revalidatePath("/audit");

    return ok(`Tutorial tersimpan: ${steps.length} langkah dan ${videos.length} video.`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal menyimpan tutorial.");
  }
}

export async function updateSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { settingsSchema } = await import("@/lib/schemas");
  const parsed = settingsSchema.safeParse({
    workspaceName: formData.get("workspaceName"),
    ownerName: formData.get("ownerName"),
    ownerRole: formData.get("ownerRole"),
    defaultPriceStrategy: formData.get("defaultPriceStrategy"),
    targetFoodCostPct: parseDecimalInput(formData.get("targetFoodCostPct") as string | null),
    targetMarginPct: parseDecimalInput(formData.get("targetMarginPct") as string | null),
  });
  if (!parsed.success) {
    return fail("Periksa kembali pengaturan.", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const data = parsed.data;
  const foodCost = new Decimal(data.targetFoodCostPct);
  const margin = new Decimal(data.targetMarginPct);
  if (foodCost.lte(0) || foodCost.gte(100)) return fail("Target food cost harus di antara 0% dan 100%.");
  if (margin.lt(0) || margin.gte(100)) return fail("Target margin harus di antara 0% dan 100%.");

  try {
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx
        .update(schema.appSettings)
        .set({
          workspaceName: data.workspaceName,
          ownerName: data.ownerName,
          ownerRole: data.ownerRole,
          defaultPriceStrategy: data.defaultPriceStrategy,
          targetFoodCostPct: foodCost.toFixed(2),
          targetMarginPct: margin.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(schema.appSettings.ownerId, DEFAULT_OWNER_ID));
      await logAudit(tx, {
        action: "settings.updated",
        entityType: "app_settings",
        summary: `Pengaturan workspace diperbarui (strategi harga: ${data.defaultPriceStrategy}, target FC ${data.targetFoodCostPct}%, target margin ${data.targetMarginPct}%).`,
        metadata: { ...data },
      });
    });
    revalidatePath("/pengaturan");
    revalidatePath("/dashboard");
    revalidatePath("/bahan-baku");
    revalidatePath("/resep");
    revalidatePath("/simulator");
    return ok("Pengaturan berhasil disimpan.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal menyimpan pengaturan.");
  }
}

export async function getRecipeUsageCount(refId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.recipeItem)
    .innerJoin(schema.recipeVersion, eq(schema.recipeItem.recipeVersionId, schema.recipeVersion.id))
    .innerJoin(schema.recipe, eq(schema.recipeVersion.recipeId, schema.recipe.id))
    .where(
      and(
        eq(schema.recipe.currentVersionId, schema.recipeVersion.id),
        isNull(schema.recipe.archivedAt),
        eq(schema.recipeItem.refId, refId),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}
