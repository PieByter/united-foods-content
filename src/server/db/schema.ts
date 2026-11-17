import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const UNIT_DIMENSIONS = ["mass", "volume", "count"] as const;
export const PRICE_STRATEGIES = ["latest", "average", "snapshot"] as const;
export const RECIPE_STATUSES = ["draft", "published"] as const;
export const RECIPE_ITEM_TYPES = ["ingredient", "subrecipe", "overhead"] as const;
export const ROUNDING_MODES = ["none", "half", "whole"] as const;
export const OVERHEAD_KINDS = ["fixed", "percent"] as const;
export const RECIPE_VIDEO_PLATFORMS = ["youtube", "vimeo", "instagram", "tiktok", "other"] as const;
export const RECIPE_VIDEO_SOURCES = ["manual", "ai"] as const;

export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];
export type PriceStrategy = (typeof PRICE_STRATEGIES)[number];
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];
export type RecipeItemType = (typeof RECIPE_ITEM_TYPES)[number];
export type RoundingMode = (typeof ROUNDING_MODES)[number];
export type OverheadKind = (typeof OVERHEAD_KINDS)[number];
export type RecipeVideoPlatform = (typeof RECIPE_VIDEO_PLATFORMS)[number];
export type RecipeVideoSource = (typeof RECIPE_VIDEO_SOURCES)[number];

const money = (name: string) => numeric(name, { precision: 18, scale: 6 });
const decimal = (name: string) => numeric(name, { precision: 18, scale: 6 });

export const appSettings = pgTable("app_settings", {
  ownerId: uuid("owner_id").primaryKey(),
  workspaceName: text("workspace_name").notNull().default("United Foods Content"),
  ownerName: text("owner_name").notNull().default("Chef Ayu"),
  ownerRole: text("owner_role").notNull().default("Head Baker & R&D"),
  currency: char("currency", { length: 3 }).notNull().default("IDR"),
  defaultPriceStrategy: text("default_price_strategy", { enum: PRICE_STRATEGIES })
    .notNull()
    .default("latest"),
  targetFoodCostPct: numeric("target_food_cost_pct", { precision: 6, scale: 2 }).notNull().default("30"),
  targetMarginPct: numeric("target_margin_pct", { precision: 6, scale: 2 }).notNull().default("70"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ingredient = pgTable(
  "ingredient",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    sku: text("sku").notNull(),
    category: text("category").notNull(),
    baseUnit: text("base_unit").notNull(),
    baseDimension: text("base_dimension", { enum: UNIT_DIMENSIONS }).notNull(),
    discrete: boolean("discrete").notNull().default(false),
    stockQty: decimal("stock_qty"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ingredient_owner_category_idx").on(t.ownerId, t.category),
    uniqueIndex("ingredient_owner_sku_uq").on(t.ownerId, t.sku),
    uniqueIndex("ingredient_owner_name_uq")
      .on(t.ownerId, sql`lower(${t.name})`)
      .where(sql`${t.archivedAt} is null`),
    check("ingredient_dimension_check", sql`${t.baseDimension} in ('mass','volume','count')`),
  ],
);

export const ingredientPrice = pgTable(
  "ingredient_price",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredient.id, { onDelete: "cascade" }),
    purchaseQty: decimal("purchase_qty").notNull(),
    purchaseUnit: text("purchase_unit").notNull(),
    price: money("price").notNull(),
    pricePerBaseUnit: decimal("price_per_base_unit").notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
    createdBy: text("created_by").notNull().default("Chef Ayu"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ingredient_price_ingredient_effective_idx").on(t.ingredientId, t.effectiveFrom.desc()),
    check("ingredient_price_qty_check", sql`${t.purchaseQty} > 0`),
    check("ingredient_price_price_check", sql`${t.price} >= 0`),
    check("ingredient_price_base_price_check", sql`${t.pricePerBaseUnit} >= 0`),
  ],
);

export const ingredientConversion = pgTable(
  "ingredient_conversion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredient.id, { onDelete: "cascade" }),
    fromUnit: text("from_unit").notNull(),
    toUnit: text("to_unit").notNull(),
    factor: decimal("factor").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("ingredient_conversion_uq").on(t.ingredientId, t.fromUnit, t.toUnit),
    check("ingredient_conversion_factor_check", sql`${t.factor} > 0`),
  ],
);

export const recipe = pgTable(
  "recipe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    code: text("code").notNull(),
    description: text("description"),
    category: text("category").notNull().default("Bakery & Roti"),
    status: text("status", { enum: RECIPE_STATUSES }).notNull().default("draft"),
    locale: text("locale").notNull().default("id-ID"),
    authorId: uuid("author_id"),
    isSubrecipe: boolean("is_subrecipe").notNull().default(false),
    currentVersionId: uuid("current_version_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recipe_owner_slug_uq").on(t.ownerId, t.slug),
    uniqueIndex("recipe_owner_code_uq").on(t.ownerId, t.code),
    index("recipe_owner_status_idx").on(t.ownerId, t.status),
    check("recipe_status_check", sql`${t.status} in ('draft','published')`),
  ],
);

export const recipeVersion = pgTable(
  "recipe_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    yieldQty: decimal("yield_qty").notNull(),
    yieldUnit: text("yield_unit").notNull(),
    unitWeightG: decimal("unit_weight_g"),
    yieldLossPct: numeric("yield_loss_pct", { precision: 6, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdBy: text("created_by").notNull().default("Chef Ayu"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("recipe_version_no_uq").on(t.recipeId, t.versionNo),
    index("recipe_version_recipe_idx").on(t.recipeId, t.versionNo.desc()),
    check("recipe_version_yield_check", sql`${t.yieldQty} > 0`),
    check(
      "recipe_version_loss_check",
      sql`${t.yieldLossPct} >= 0 and ${t.yieldLossPct} < 100`,
    ),
  ],
);

export const recipeItem = pgTable(
  "recipe_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    recipeVersionId: uuid("recipe_version_id")
      .notNull()
      .references(() => recipeVersion.id, { onDelete: "cascade" }),
    itemType: text("item_type", { enum: RECIPE_ITEM_TYPES }).notNull(),
    refId: uuid("ref_id"),
    label: text("label"),
    qty: decimal("qty").notNull().default("0"),
    unit: text("unit").notNull().default("gr"),
    discrete: boolean("discrete").notNull().default(false),
    rounding: text("rounding", { enum: ROUNDING_MODES }).notNull().default("none"),
    nonLinearScaling: boolean("non_linear_scaling").notNull().default(false),
    note: text("note"),
    overheadKind: text("overhead_kind", { enum: OVERHEAD_KINDS }),
    overheadValue: decimal("overhead_value"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recipe_item_version_idx").on(t.recipeVersionId, t.sortOrder),
    check("recipe_item_type_check", sql`${t.itemType} in ('ingredient','subrecipe','overhead')`),
    check("recipe_item_rounding_check", sql`${t.rounding} in ('none','half','whole')`),
    check("recipe_item_qty_check", sql`${t.qty} >= 0`),
    check(
      "recipe_item_overhead_check",
      sql`${t.overheadKind} is null or ${t.overheadKind} in ('fixed','percent')`,
    ),
    check(
      "recipe_item_overhead_value_check",
      sql`${t.overheadValue} is null or ${t.overheadValue} >= 0`,
    ),
  ],
);

export const costingSnapshot = pgTable(
  "costing_snapshot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    recipeVersionId: uuid("recipe_version_id")
      .notNull()
      .references(() => recipeVersion.id, { onDelete: "cascade" }),
    label: text("label"),
    scaleFactor: decimal("scale_factor").notNull().default("1"),
    priceStrategy: text("price_strategy", { enum: PRICE_STRATEGIES }).notNull().default("latest"),
    asOf: timestamp("as_of", { withTimezone: true }).notNull().defaultNow(),
    rawMaterialCost: money("raw_material_cost").notNull(),
    overheadCost: money("overhead_cost").notNull().default("0"),
    totalCost: money("total_cost").notNull(),
    effectiveYieldQty: decimal("effective_yield_qty").notNull(),
    yieldUnit: text("yield_unit").notNull(),
    costPerUnit: money("cost_per_unit").notNull(),
    itemsBreakdown: jsonb("items_breakdown").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by").notNull().default("Chef Ayu"),
  },
  (t) => [
    index("costing_snapshot_recipe_computed_idx").on(t.recipeId, t.computedAt.desc()),
    check("costing_snapshot_strategy_check", sql`${t.priceStrategy} in ('latest','average','snapshot')`),
    check("costing_snapshot_factor_check", sql`${t.scaleFactor} > 0`),
  ],
);

export const pricingScenario = pgTable(
  "pricing_scenario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => costingSnapshot.id, { onDelete: "cascade" }),
    sellingPrice: money("selling_price").notNull(),
    marginPct: numeric("margin_pct", { precision: 10, scale: 2 }).notNull(),
    markupPct: numeric("markup_pct", { precision: 10, scale: 2 }).notNull(),
    foodCostPct: numeric("food_cost_pct", { precision: 10, scale: 2 }).notNull(),
    targetMarginPct: numeric("target_margin_pct", { precision: 6, scale: 2 }),
    roundingTo: numeric("rounding_to", { precision: 18, scale: 0 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pricing_scenario_snapshot_idx").on(t.snapshotId, t.createdAt.desc()),
    check("pricing_scenario_price_check", sql`${t.sellingPrice} >= 0`),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    actor: text("actor").notNull().default("Chef Ayu"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id"),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_owner_created_idx").on(t.ownerId, t.createdAt.desc())],
);

// ── Kesiapan content system fase 2 (belum dipakai UI fase 1) ──────────────

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull(),
  bucket: text("bucket").notNull().default("recipe-media"),
  path: text("path").notNull(),
  mimeType: text("mime_type").notNull(),
  alt: text("alt"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipeStep = pgTable(
  "recipe_step",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    recipeVersionId: uuid("recipe_version_id")
      .notNull()
      .references(() => recipeVersion.id, { onDelete: "cascade" }),
    stepNo: integer("step_no").notNull(),
    instruction: text("instruction").notNull(),
    durationSec: integer("duration_sec"),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("recipe_step_no_uq").on(t.recipeVersionId, t.stepNo)],
);

export const recipeVideo = pgTable(
  "recipe_video",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    platform: text("platform", { enum: RECIPE_VIDEO_PLATFORMS }).notNull().default("other"),
    thumbnailUrl: text("thumbnail_url"),
    durationSec: integer("duration_sec"),
    authorName: text("author_name"),
    source: text("source", { enum: RECIPE_VIDEO_SOURCES }).notNull().default("manual"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recipe_video_recipe_idx").on(t.recipeId, t.sortOrder),
    check(
      "recipe_video_platform_check",
      sql`${t.platform} in ('youtube','vimeo','instagram','tiktok','other')`,
    ),
    check("recipe_video_source_check", sql`${t.source} in ('manual','ai')`),
    check("recipe_video_duration_check", sql`${t.durationSec} is null or ${t.durationSec} >= 0`),
    check("recipe_video_sort_check", sql`${t.sortOrder} >= 0`),
  ],
);

export const tag = pgTable(
  "tag",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("tag_owner_slug_uq").on(t.ownerId, t.slug)],
);

export const recipeTag = pgTable(
  "recipe_tag",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.tagId] })],
);

export type IngredientRow = typeof ingredient.$inferSelect;
export type IngredientPriceRow = typeof ingredientPrice.$inferSelect;
export type IngredientConversionRow = typeof ingredientConversion.$inferSelect;
export type RecipeRow = typeof recipe.$inferSelect;
export type RecipeVersionRow = typeof recipeVersion.$inferSelect;
export type RecipeItemRow = typeof recipeItem.$inferSelect;
export type RecipeStepRow = typeof recipeStep.$inferSelect;
export type RecipeVideoRow = typeof recipeVideo.$inferSelect;
export type CostingSnapshotRow = typeof costingSnapshot.$inferSelect;
export type PricingScenarioRow = typeof pricingScenario.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type AppSettingsRow = typeof appSettings.$inferSelect;
