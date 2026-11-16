import Decimal from "decimal.js";
import { d, decToString, type DecimalLike } from "./decimal";
import type { BreakEvenResult, PricingMetrics } from "./types";
import { CostingError } from "./units";

export interface PricingInput {
  costPerUnit: DecimalLike;
  sellingPrice: DecimalLike;
}

/**
 * Definisi metrik PRD §4:
 * - Price-to-cost = harga jual / HPP
 * - Markup        = (harga jual - HPP) / HPP
 * - Gross margin  = (harga jual - HPP) / harga jual
 * - Food cost %   = HPP / harga jual
 */
export function computePricingMetrics({ costPerUnit, sellingPrice }: PricingInput): PricingMetrics {
  const cost = d(costPerUnit);
  const price = d(sellingPrice);
  const profit = price.minus(cost);

  return {
    costPerUnit: decToString(cost),
    sellingPrice: decToString(price),
    profitPerUnit: decToString(profit),
    marginPct: price.gt(0) ? decToString(profit.div(price).mul(100), 2) : "0",
    markupPct: cost.gt(0) ? decToString(profit.div(cost).mul(100), 2) : "0",
    foodCostPct: price.gt(0) ? decToString(cost.div(price).mul(100), 2) : "0",
    priceToCostPct: cost.gt(0) ? decToString(price.div(cost).mul(100), 2) : "0",
  };
}

export interface PriceSuggestionInput {
  costPerUnit: string | number;
  targetMarginPct?: string | number | null;
  targetFoodCostPct?: string | number | null;
  targetMarkupPct?: string | number | null;
  roundingTo?: string | number | null;
  roundingMode?: "nearest" | "up";
}

/** Harga jual minimum agar target margin / food cost / markup tercapai. */
export function suggestSellingPrice({
  costPerUnit,
  targetMarginPct,
  targetFoodCostPct,
  targetMarkupPct,
  roundingTo,
  roundingMode = "up",
}: PriceSuggestionInput): string {
  const cost = d(costPerUnit);
  let price: Decimal | null = null;

  if (targetMarginPct !== null && targetMarginPct !== undefined && String(targetMarginPct).trim() !== "") {
    const margin = d(targetMarginPct);
    if (margin.gte(100)) {
      throw new CostingError("INVALID_TARGET_MARGIN", "Target margin harus di bawah 100%.");
    }
    if (margin.lt(0)) {
      throw new CostingError("INVALID_TARGET_MARGIN", "Target margin tidak boleh negatif.");
    }
    price = cost.div(new Decimal(1).minus(margin.div(100)));
  } else if (
    targetFoodCostPct !== null &&
    targetFoodCostPct !== undefined &&
    String(targetFoodCostPct).trim() !== ""
  ) {
    const foodCost = d(targetFoodCostPct);
    if (foodCost.lte(0)) {
      throw new CostingError("INVALID_TARGET_FOOD_COST", "Target food cost harus lebih besar dari 0%.");
    }
    price = cost.div(foodCost.div(100));
  } else if (
    targetMarkupPct !== null &&
    targetMarkupPct !== undefined &&
    String(targetMarkupPct).trim() !== ""
  ) {
    const markup = d(targetMarkupPct);
    if (markup.lt(0)) {
      throw new CostingError("INVALID_TARGET_MARKUP", "Target markup tidak boleh negatif.");
    }
    price = cost.mul(new Decimal(1).plus(markup.div(100)));
  }

  if (!price) {
    throw new CostingError(
      "MISSING_TARGET",
      "Tentukan target margin, food cost, atau markup untuk menghitung harga jual.",
    );
  }

  if (roundingTo !== null && roundingTo !== undefined && String(roundingTo).trim() !== "") {
    return roundPrice(price, roundingTo, roundingMode);
  }
  return decToString(price, 0);
}

/** Bulatkan harga jual ke kelipatan tertentu (Rp500 / Rp1.000). */
export function roundPrice(
  price: DecimalLike,
  step: DecimalLike,
  mode: "nearest" | "up" = "nearest",
): string {
  const value = d(price);
  const increment = d(step);
  if (increment.lte(0)) return decToString(value, 0);
  const units = value.div(increment);
  const rounded = mode === "up" ? units.ceil() : units.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return decToString(rounded.mul(increment), 0);
}

export interface BreakEvenInput {
  overheadCost: string | number;
  rawCostPerUnit: string | number;
  sellingPrice: string | number;
}

/**
 * BEP = biaya tetap batch / laba kontribusi per unit
 * (harga jual - biaya bahan variabel per unit).
 */
export function computeBreakEven({
  overheadCost,
  rawCostPerUnit,
  sellingPrice,
}: BreakEvenInput): BreakEvenResult {
  const fixed = d(overheadCost);
  const variable = d(rawCostPerUnit);
  const price = d(sellingPrice);
  const contribution = price.minus(variable);

  if (fixed.lte(0)) {
    return {
      units: "0",
      revenue: "0",
      marginPerUnit: decToString(contribution),
      note: "Tidak ada overhead tetap pada batch ini.",
    };
  }

  if (contribution.lte(0)) {
    return {
      units: "0",
      revenue: "0",
      marginPerUnit: decToString(contribution),
      note: "Harga jual tidak menutup biaya bahan variabel per unit.",
    };
  }

  const units = fixed.div(contribution).ceil();
  return {
    units: units.toFixed(),
    revenue: decToString(units.mul(price), 0),
    marginPerUnit: decToString(contribution),
    note: `Butuh minimal ${units.toFixed()} unit terjual untuk menutup overhead batch.`,
  };
}

export function foodCostBand(pct: string | number): "low" | "healthy" | "watch" | "critical" {
  const value = d(pct);
  if (value.lt(20)) return "low";
  if (value.lte(30)) return "healthy";
  if (value.lte(35)) return "watch";
  return "critical";
}
