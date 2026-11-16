import type { UnitConversion } from "./units";

export type PriceStrategy = "latest" | "average" | "snapshot";
export type RoundingMode = "none" | "half" | "whole";
export type RecipeItemType = "ingredient" | "subrecipe" | "overhead";
export type OverheadKind = "fixed" | "percent";
export type RecipeStatus = "draft" | "published";

export interface IngredientInput {
  id: string;
  name: string;
  sku?: string | null;
  category?: string | null;
  baseUnit: string;
  baseDimension?: string | null;
  discrete?: boolean;
  conversions?: UnitConversion[];
}

export interface PriceRecordInput {
  id?: string;
  pricePerBaseUnit: string | number;
  purchaseQty?: string | number | null;
  purchaseUnit?: string | null;
  price?: string | number | null;
  effectiveFrom: string | Date;
}

export interface RecipeItemInput {
  id?: string;
  type: RecipeItemType;
  refId?: string | null;
  name?: string | null;
  qty: string | number;
  unit: string;
  discrete?: boolean;
  rounding?: RoundingMode;
  nonLinearScaling?: boolean;
  note?: string | null;
  overheadKind?: OverheadKind | null;
  overheadValue?: string | number | null;
  sortOrder?: number;
}

export interface RecipeInput {
  id: string;
  name: string;
  category?: string | null;
  status?: RecipeStatus | null;
  isSubrecipe?: boolean;
  yieldQty: string | number;
  yieldUnit: string;
  unitWeightG?: string | number | null;
  yieldLossPct?: string | number | null;
  items: RecipeItemInput[];
}

export interface PriceOverride {
  mode: "percent" | "absolute";
  value: string | number;
}

export interface CostingInput {
  recipe: RecipeInput;
  ingredients: IngredientInput[];
  prices: Record<string, PriceRecordInput[]>;
  recipes?: RecipeInput[];
  scaleFactor?: string | number;
  targetYield?: string | number;
  priceStrategy?: PriceStrategy;
  asOf?: string | Date;
  priceOverrides?: Record<string, PriceOverride>;
}

export interface PracticalQuantity {
  /** Kuantitas hasil pembulatan operasional, mis. "2" */
  qty: string;
  /** Satuan hasil pembulatan, mis. "butir" */
  unit: string;
  /** Sisa pecahan yang dikonversi ke satuan base, mis. "27.5" */
  extraQty?: string;
  /** Satuan base sisa, mis. "gr" */
  extraUnit?: string;
}

export interface CostedLine {
  key: string;
  itemId?: string;
  type: RecipeItemType;
  name: string;
  sku?: string | null;
  category?: string | null;
  note?: string | null;
  qty: string;
  unit: string;
  unitPrice: string;
  cost: string;
  proportionPct: string;
  baseQty?: string;
  baseUnit?: string;
  pricePerBaseUnit?: string;
  priceSource?: PriceStrategy;
  discrete?: boolean;
  rounding?: RoundingMode;
  nonLinearScaling?: boolean;
  practical?: PracticalQuantity;
  children?: CostedLine[];
}

export interface CostingWarning {
  code: string;
  message: string;
  itemId?: string;
  itemName?: string;
}

export interface CostingResult {
  recipeId: string;
  recipeName: string;
  scaleFactor: string;
  targetYield?: string;
  priceStrategy: PriceStrategy;
  asOf: string;
  rawMaterialCost: string;
  overheadCost: string;
  totalCost: string;
  yieldQty: string;
  yieldUnit: string;
  yieldLossPct: string;
  effectiveYieldQty: string;
  costPerUnit: string;
  rawCostPerUnit: string;
  costPerGram?: string;
  unitWeightG?: string;
  lines: CostedLine[];
  overheadLines: CostedLine[];
  warnings: CostingWarning[];
}

export interface PricingMetrics {
  costPerUnit: string;
  sellingPrice: string;
  profitPerUnit: string;
  marginPct: string;
  markupPct: string;
  foodCostPct: string;
  priceToCostPct: string;
}

export interface BreakEvenResult {
  units: string;
  revenue: string;
  marginPerUnit: string;
  note: string;
}
