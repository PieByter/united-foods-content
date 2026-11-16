export interface PriceView {
  id: string;
  purchaseQty: string;
  purchaseUnit: string;
  price: string;
  pricePerBaseUnit: string;
  effectiveFrom: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ConversionView {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: string;
  note: string | null;
}

export interface IngredientView {
  id: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: string;
  baseDimension: "mass" | "volume" | "count";
  discrete: boolean;
  stockQty: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  conversions: ConversionView[];
  prices: PriceView[];
}

export interface RecipeItemView {
  id: string;
  itemType: "ingredient" | "subrecipe" | "overhead";
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

export interface RecipeVersionView {
  id: string;
  versionNo: number;
  yieldQty: string;
  yieldUnit: string;
  unitWeightG: string | null;
  yieldLossPct: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  items: RecipeItemView[];
}

export interface RecipeView {
  id: string;
  name: string;
  slug: string;
  code: string;
  description: string | null;
  category: string;
  status: "draft" | "published";
  locale: string;
  isSubrecipe: boolean;
  currentVersionId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: RecipeVersionView | null;
  versionCount: number;
}

export interface SettingsView {
  ownerId: string;
  workspaceName: string;
  ownerName: string;
  ownerRole: string;
  currency: string;
  defaultPriceStrategy: "latest" | "average" | "snapshot";
  targetFoodCostPct: string;
  targetMarginPct: string;
}

export interface IngredientWithMeta extends IngredientView {
  latestPrice: PriceView | null;
  previousPrice: PriceView | null;
  changePct: number | null;
  usageCount: number;
  usedIn: Array<{ id: string; name: string; code: string; isSubrecipe: boolean }>;
  conversionSummary: string | null;
}

export interface RecipeCostSummary {
  totalCost: string;
  costPerUnit: string;
  rawMaterialCost: string;
  overheadCost: string;
  effectiveYieldQty: string;
  yieldUnit: string;
  sellingPrice: string;
  suggestedPrice: string;
  foodCostPct: string;
  marginPct: string;
  markupPct: string;
  profitPerUnit: string;
  hasScenario: boolean;
  error?: string;
}

export interface DashboardRecipeRow {
  recipe: RecipeView;
  cost: RecipeCostSummary | null;
}

export interface PriceAlert {
  ingredientId: string;
  name: string;
  sku: string;
  category: string;
  latestPrice: string;
  previousPrice: string;
  changePct: number;
  baseUnit: string;
}

export interface AuditRowView {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SnapshotRowView {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeCode: string;
  label: string | null;
  scaleFactor: string;
  priceStrategy: "latest" | "average" | "snapshot";
  totalCost: string;
  costPerUnit: string;
  effectiveYieldQty: string;
  yieldUnit: string;
  computedAt: string;
  sellingPrice: string | null;
  foodCostPct: string | null;
  marginPct: string | null;
}

export interface ScenarioView {
  id: string;
  sellingPrice: string;
  marginPct: string;
  markupPct: string;
  foodCostPct: string;
  targetMarginPct: string | null;
  createdAt: string;
}
