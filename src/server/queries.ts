import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, DEFAULT_OWNER_ID } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import type {
  AuditRowView,
  ConversionView,
  IngredientView,
  IngredientWithMeta,
  PriceAlert,
  PriceView,
  RecipeItemView,
  RecipeView,
  RecipeVersionView,
  ScenarioView,
  SettingsView,
  SnapshotRowView,
} from "@/lib/types";
import { DEFAULT_ACTOR } from "@/server/db/client";

const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

function mapSettings(row: typeof schema.appSettings.$inferSelect): SettingsView {
  return {
    ownerId: row.ownerId,
    workspaceName: row.workspaceName,
    ownerName: row.ownerName,
    ownerRole: row.ownerRole,
    currency: row.currency,
    defaultPriceStrategy: row.defaultPriceStrategy,
    targetFoodCostPct: row.targetFoodCostPct,
    targetMarginPct: row.targetMarginPct,
  };
}

const FALLBACK_SETTINGS: SettingsView = {
  ownerId: DEFAULT_OWNER_ID,
  workspaceName: "United Foods Content",
  ownerName: DEFAULT_ACTOR,
  ownerRole: "Head Baker & R&D",
  currency: "IDR",
  defaultPriceStrategy: "latest",
  targetFoodCostPct: "30",
  targetMarginPct: "70",
};

export async function getSettings(): Promise<SettingsView> {
  const db = await getDb();
  const rows = await db.select().from(schema.appSettings).where(eq(schema.appSettings.ownerId, DEFAULT_OWNER_ID)).limit(1);
  if (rows[0]) return mapSettings(rows[0]);

  await db
    .insert(schema.appSettings)
    .values({
      ownerId: DEFAULT_OWNER_ID,
      ownerName: FALLBACK_SETTINGS.ownerName,
      ownerRole: FALLBACK_SETTINGS.ownerRole,
    })
    .onConflictDoNothing();
  const created = await db.select().from(schema.appSettings).where(eq(schema.appSettings.ownerId, DEFAULT_OWNER_ID)).limit(1);
  return created[0] ? mapSettings(created[0]) : FALLBACK_SETTINGS;
}

function mapPrice(row: typeof schema.ingredientPrice.$inferSelect): PriceView {
  return {
    id: row.id,
    purchaseQty: row.purchaseQty,
    purchaseUnit: row.purchaseUnit,
    price: row.price,
    pricePerBaseUnit: row.pricePerBaseUnit,
    effectiveFrom: iso(row.effectiveFrom)!,
    note: row.note,
    createdBy: row.createdBy,
    createdAt: iso(row.createdAt)!,
  };
}

function mapConversion(row: typeof schema.ingredientConversion.$inferSelect): ConversionView {
  return {
    id: row.id,
    fromUnit: row.fromUnit,
    toUnit: row.toUnit,
    factor: row.factor,
    note: row.note,
  };
}

export async function getIngredients(options: { includeArchived?: boolean } = {}): Promise<IngredientView[]> {
  const db = await getDb();
  const where = options.includeArchived
    ? eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID)
    : and(eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID), isNull(schema.ingredient.archivedAt));

  const rows = await db.select().from(schema.ingredient).where(where).orderBy(schema.ingredient.category, schema.ingredient.name);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [priceRows, conversionRows] = await Promise.all([
    db
      .select()
      .from(schema.ingredientPrice)
      .where(inArray(schema.ingredientPrice.ingredientId, ids))
      .orderBy(desc(schema.ingredientPrice.effectiveFrom), desc(schema.ingredientPrice.createdAt)),
    db
      .select()
      .from(schema.ingredientConversion)
      .where(inArray(schema.ingredientConversion.ingredientId, ids))
      .orderBy(schema.ingredientConversion.fromUnit),
  ]);

  const priceMap = new Map<string, PriceView[]>();
  for (const row of priceRows) {
    const list = priceMap.get(row.ingredientId) ?? [];
    list.push(mapPrice(row));
    priceMap.set(row.ingredientId, list);
  }
  const conversionMap = new Map<string, ConversionView[]>();
  for (const row of conversionRows) {
    const list = conversionMap.get(row.ingredientId) ?? [];
    list.push(mapConversion(row));
    conversionMap.set(row.ingredientId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    baseUnit: row.baseUnit,
    baseDimension: row.baseDimension,
    discrete: row.discrete,
    stockQty: row.stockQty,
    notes: row.notes,
    archivedAt: iso(row.archivedAt),
    createdAt: iso(row.createdAt)!,
    updatedAt: iso(row.updatedAt)!,
    conversions: conversionMap.get(row.id) ?? [],
    prices: priceMap.get(row.id) ?? [],
  }));
}

function mapItem(row: typeof schema.recipeItem.$inferSelect): RecipeItemView {
  return {
    id: row.id,
    itemType: row.itemType,
    refId: row.refId,
    label: row.label,
    qty: row.qty,
    unit: row.unit,
    discrete: row.discrete,
    rounding: row.rounding,
    nonLinearScaling: row.nonLinearScaling,
    note: row.note,
    overheadKind: row.overheadKind,
    overheadValue: row.overheadValue,
    sortOrder: row.sortOrder,
  };
}

function mapVersion(row: typeof schema.recipeVersion.$inferSelect, items: RecipeItemView[]): RecipeVersionView {
  return {
    id: row.id,
    versionNo: row.versionNo,
    yieldQty: row.yieldQty,
    yieldUnit: row.yieldUnit,
    unitWeightG: row.unitWeightG,
    yieldLossPct: row.yieldLossPct,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: iso(row.createdAt)!,
    items,
  };
}

export async function getRecipes(options: { includeArchived?: boolean } = {}): Promise<RecipeView[]> {
  const db = await getDb();
  const where = options.includeArchived
    ? eq(schema.recipe.ownerId, DEFAULT_OWNER_ID)
    : and(eq(schema.recipe.ownerId, DEFAULT_OWNER_ID), isNull(schema.recipe.archivedAt));

  const recipeRows = await db.select().from(schema.recipe).where(where).orderBy(schema.recipe.name);
  if (recipeRows.length === 0) return [];

  const recipeIds = recipeRows.map((row) => row.id);
  const versionRows = await db
    .select()
    .from(schema.recipeVersion)
    .where(inArray(schema.recipeVersion.recipeId, recipeIds))
    .orderBy(desc(schema.recipeVersion.versionNo));

  const versionIds = versionRows.map((row) => row.id);
  const itemRows =
    versionIds.length > 0
      ? await db
          .select()
          .from(schema.recipeItem)
          .where(inArray(schema.recipeItem.recipeVersionId, versionIds))
          .orderBy(schema.recipeItem.sortOrder)
      : [];

  const itemMap = new Map<string, RecipeItemView[]>();
  for (const row of itemRows) {
    const list = itemMap.get(row.recipeVersionId) ?? [];
    list.push(mapItem(row));
    itemMap.set(row.recipeVersionId, list);
  }

  const versionMap = new Map<string, RecipeVersionView[]>();
  for (const row of versionRows) {
    const list = versionMap.get(row.recipeId) ?? [];
    list.push(mapVersion(row, itemMap.get(row.id) ?? []));
    versionMap.set(row.recipeId, list);
  }

  return recipeRows.map((row) => {
    const versions = versionMap.get(row.id) ?? [];
    const current = versions.find((version) => version.id === row.currentVersionId) ?? versions[0] ?? null;
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      code: row.code,
      description: row.description,
      category: row.category,
      status: row.status,
      locale: row.locale,
      isSubrecipe: row.isSubrecipe,
      currentVersionId: row.currentVersionId,
      archivedAt: iso(row.archivedAt),
      createdAt: iso(row.createdAt)!,
      updatedAt: iso(row.updatedAt)!,
      version: current,
      versionCount: versions.length,
    };
  });
}

export async function getRecipeById(id: string): Promise<RecipeView | null> {
  const recipes = await getRecipes({ includeArchived: true });
  return recipes.find((recipe) => recipe.id === id) ?? null;
}

export async function getRecipeVersions(recipeId: string): Promise<RecipeVersionView[]> {
  const db = await getDb();
  const versions = await db
    .select()
    .from(schema.recipeVersion)
    .where(eq(schema.recipeVersion.recipeId, recipeId))
    .orderBy(desc(schema.recipeVersion.versionNo));
  if (versions.length === 0) return [];
  const versionIds = versions.map((version) => version.id);
  const items = await db
    .select()
    .from(schema.recipeItem)
    .where(inArray(schema.recipeItem.recipeVersionId, versionIds))
    .orderBy(schema.recipeItem.sortOrder);
  const map = new Map<string, RecipeItemView[]>();
  for (const item of items) {
    const list = map.get(item.recipeVersionId) ?? [];
    list.push(mapItem(item));
    map.set(item.recipeVersionId, list);
  }
  return versions.map((version) => mapVersion(version, map.get(version.id) ?? []));
}

export interface UsageInfo {
  usageCount: number;
  usedIn: Array<{ id: string; name: string; code: string; isSubrecipe: boolean }>;
}

export async function getRecipeUsage(): Promise<Map<string, UsageInfo>> {
  const db = await getDb();
  const rows = await db
    .select({
      refId: schema.recipeItem.refId,
      itemType: schema.recipeItem.itemType,
      recipeId: schema.recipe.id,
      recipeName: schema.recipe.name,
      recipeCode: schema.recipe.code,
      isSubrecipe: schema.recipe.isSubrecipe,
    })
    .from(schema.recipeItem)
    .innerJoin(schema.recipeVersion, eq(schema.recipeItem.recipeVersionId, schema.recipeVersion.id))
    .innerJoin(schema.recipe, eq(schema.recipeVersion.recipeId, schema.recipe.id))
    .where(
      and(
        eq(schema.recipe.ownerId, DEFAULT_OWNER_ID),
        isNull(schema.recipe.archivedAt),
        eq(schema.recipe.currentVersionId, schema.recipeVersion.id),
        sql`${schema.recipeItem.itemType} in ('ingredient','subrecipe')`,
      ),
    );

  const map = new Map<string, UsageInfo>();
  for (const row of rows) {
    if (!row.refId) continue;
    const current = map.get(row.refId) ?? { usageCount: 0, usedIn: [] };
    current.usageCount += 1;
    if (!current.usedIn.some((entry) => entry.id === row.recipeId)) {
      current.usedIn.push({
        id: row.recipeId,
        name: row.recipeName,
        code: row.recipeCode,
        isSubrecipe: row.isSubrecipe,
      });
    }
    map.set(row.refId, current);
  }
  return map;
}

export async function getIngredientsWithMeta(options: { includeArchived?: boolean } = {}): Promise<IngredientWithMeta[]> {
  const [ingredients, usage] = await Promise.all([getIngredients(options), getRecipeUsage()]);
  return ingredients.map((ingredient) => {
    const latest = ingredient.prices[0] ?? null;
    const previous = ingredient.prices[1] ?? null;
    let changePct: number | null = null;
    if (latest && previous) {
      const prev = Number(previous.pricePerBaseUnit);
      if (prev > 0) changePct = ((Number(latest.pricePerBaseUnit) - prev) / prev) * 100;
    }
    const conversion = ingredient.conversions[0];
    return {
      ...ingredient,
      latestPrice: latest,
      previousPrice: previous,
      changePct,
      usageCount: usage.get(ingredient.id)?.usageCount ?? 0,
      usedIn: usage.get(ingredient.id)?.usedIn ?? [],
      conversionSummary: conversion ? `1 ${conversion.fromUnit} = ${conversion.factor} ${conversion.toUnit}` : null,
    };
  });
}

export async function getPriceAlerts(limit = 3): Promise<PriceAlert[]> {
  const ingredients = await getIngredientsWithMeta();
  return ingredients
    .filter((ingredient) => ingredient.changePct !== null && ingredient.latestPrice && ingredient.previousPrice)
    .map((ingredient) => ({
      ingredientId: ingredient.id,
      name: ingredient.name,
      sku: ingredient.sku,
      category: ingredient.category,
      latestPrice: ingredient.latestPrice!.pricePerBaseUnit,
      previousPrice: ingredient.previousPrice!.pricePerBaseUnit,
      changePct: ingredient.changePct!,
      baseUnit: ingredient.baseUnit,
    }))
    .filter((alert) => alert.changePct > 0)
    .sort((a, b) => b.changePct - a.changePct)
    .slice(0, limit);
}

export async function getLatestScenarios(
  recipeIds: string[],
): Promise<Map<string, { scenario: ScenarioView; snapshotId: string; computedAt: string }>> {
  if (recipeIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({
      recipeId: schema.costingSnapshot.recipeId,
      snapshotId: schema.costingSnapshot.id,
      computedAt: schema.costingSnapshot.computedAt,
      scenario: schema.pricingScenario,
    })
    .from(schema.pricingScenario)
    .innerJoin(schema.costingSnapshot, eq(schema.pricingScenario.snapshotId, schema.costingSnapshot.id))
    .where(inArray(schema.costingSnapshot.recipeId, recipeIds))
    .orderBy(desc(schema.pricingScenario.createdAt));

  const map = new Map<string, { scenario: ScenarioView; snapshotId: string; computedAt: string }>();
  for (const row of rows) {
    if (map.has(row.recipeId)) continue;
    map.set(row.recipeId, {
      snapshotId: row.snapshotId,
      computedAt: iso(row.computedAt)!,
      scenario: {
        id: row.scenario.id,
        sellingPrice: row.scenario.sellingPrice,
        marginPct: row.scenario.marginPct,
        markupPct: row.scenario.markupPct,
        foodCostPct: row.scenario.foodCostPct,
        targetMarginPct: row.scenario.targetMarginPct,
        createdAt: iso(row.scenario.createdAt)!,
      },
    });
  }
  return map;
}

export async function getSnapshotsForRecipe(recipeId: string, limit = 8): Promise<SnapshotRowView[]> {
  const db = await getDb();
  const rows = await db
    .select({
      snapshot: schema.costingSnapshot,
      recipeName: schema.recipe.name,
      recipeCode: schema.recipe.code,
      sellingPrice: schema.pricingScenario.sellingPrice,
      foodCostPct: schema.pricingScenario.foodCostPct,
      marginPct: schema.pricingScenario.marginPct,
    })
    .from(schema.costingSnapshot)
    .innerJoin(schema.recipe, eq(schema.costingSnapshot.recipeId, schema.recipe.id))
    .leftJoin(schema.pricingScenario, eq(schema.pricingScenario.snapshotId, schema.costingSnapshot.id))
    .where(eq(schema.costingSnapshot.recipeId, recipeId))
    .orderBy(desc(schema.costingSnapshot.computedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.snapshot.id,
    recipeId: row.snapshot.recipeId,
    recipeName: row.recipeName,
    recipeCode: row.recipeCode,
    label: row.snapshot.label,
    scaleFactor: row.snapshot.scaleFactor,
    priceStrategy: row.snapshot.priceStrategy,
    totalCost: row.snapshot.totalCost,
    costPerUnit: row.snapshot.costPerUnit,
    effectiveYieldQty: row.snapshot.effectiveYieldQty,
    yieldUnit: row.snapshot.yieldUnit,
    computedAt: iso(row.snapshot.computedAt)!,
    sellingPrice: row.sellingPrice,
    foodCostPct: row.foodCostPct,
    marginPct: row.marginPct,
  }));
}

export async function getRecentSnapshots(limit = 5): Promise<SnapshotRowView[]> {
  const db = await getDb();
  const rows = await db
    .select({
      snapshot: schema.costingSnapshot,
      recipeName: schema.recipe.name,
      recipeCode: schema.recipe.code,
      sellingPrice: schema.pricingScenario.sellingPrice,
      foodCostPct: schema.pricingScenario.foodCostPct,
      marginPct: schema.pricingScenario.marginPct,
    })
    .from(schema.costingSnapshot)
    .innerJoin(schema.recipe, eq(schema.costingSnapshot.recipeId, schema.recipe.id))
    .leftJoin(schema.pricingScenario, eq(schema.pricingScenario.snapshotId, schema.costingSnapshot.id))
    .orderBy(desc(schema.costingSnapshot.computedAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.snapshot.id,
    recipeId: row.snapshot.recipeId,
    recipeName: row.recipeName,
    recipeCode: row.recipeCode,
    label: row.snapshot.label,
    scaleFactor: row.snapshot.scaleFactor,
    priceStrategy: row.snapshot.priceStrategy,
    totalCost: row.snapshot.totalCost,
    costPerUnit: row.snapshot.costPerUnit,
    effectiveYieldQty: row.snapshot.effectiveYieldQty,
    yieldUnit: row.snapshot.yieldUnit,
    computedAt: iso(row.snapshot.computedAt)!,
    sellingPrice: row.sellingPrice,
    foodCostPct: row.foodCostPct,
    marginPct: row.marginPct,
  }));
}

export async function getAuditLog(options: { limit?: number; entityType?: string; action?: string } = {}): Promise<AuditRowView[]> {
  const db = await getDb();
  const conditions = [eq(schema.auditLog.ownerId, DEFAULT_OWNER_ID)];
  if (options.entityType) conditions.push(eq(schema.auditLog.entityType, options.entityType));
  if (options.action) conditions.push(eq(schema.auditLog.action, options.action));
  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(and(...conditions))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(options.limit ?? 50);

  return rows.map((row) => ({
    id: row.id,
    actor: row.actor,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: iso(row.createdAt)!,
  }));
}

export async function getAuditStats(): Promise<{ total: number; priceChanges: number; versions: number; snapshots: number }> {
  const db = await getDb();
  const rows = await db
    .select({ action: schema.auditLog.action, count: sql<number>`count(*)::int` })
    .from(schema.auditLog)
    .where(eq(schema.auditLog.ownerId, DEFAULT_OWNER_ID))
    .groupBy(schema.auditLog.action);
  const map = new Map(rows.map((row) => [row.action, Number(row.count)]));
  return {
    total: [...map.values()].reduce((sum, count) => sum + count, 0),
    priceChanges: map.get("ingredient.price.created") ?? 0,
    versions: map.get("recipe.updated") ?? 0,
    snapshots: map.get("snapshot.created") ?? 0,
  };
}

export async function hasAnyData(): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select({ id: schema.ingredient.id }).from(schema.ingredient).limit(1);
  return rows.length > 0;
}
