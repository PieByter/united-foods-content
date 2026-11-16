import Decimal from "decimal.js";
import { d, type DecimalLike } from "./decimal";
import { convertQuantity, CostingError, sameUnit, unitDimension } from "./units";
import type { UnitConversion } from "./units";
import type { PracticalQuantity, RoundingMode } from "./types";

export type { PracticalQuantity, RoundingMode };

export interface PracticalOptions {
  discrete?: boolean;
  rounding?: RoundingMode;
  baseUnit?: string;
  conversions?: UnitConversion[];
}

/** Bulatkan kuantitas sesuai aturan operasional. */
export function roundQuantity(qty: DecimalLike, mode: RoundingMode = "none"): string {
  const value = d(qty);
  if (mode === "none") return value.toFixed();
  if (mode === "whole") return value.ceil().toFixed();
  if (mode === "half") return value.mul(2).ceil().div(2).toFixed();
  return value.toFixed();
}

/**
 * Nilai praktis dapur. 1.5 butir dengan konversi 1 butir = 55 gr
 * ditampilkan sebagai "1 butir + 27.5 gr" (bukan menebak 2 butir).
 */
export function practicalQuantity(
  qty: DecimalLike,
  unit: string,
  options: PracticalOptions,
): PracticalQuantity {
  const exact = d(qty);
  const mode = options.rounding ?? "none";
  const rounded = d(roundQuantity(exact, mode));
  let baseUnit = options.baseUnit ?? unit;

  // Untuk satuan count (butir), pecahan lebih berguna ditimbang dalam gram/ml
  // jika bahan memiliki konversi massa/volume eksplisit.
  const baseDimension = unitDimension(baseUnit);
  if (!baseDimension || baseDimension === "count" || sameUnit(baseUnit, unit)) {
    const massOrVolume = (options.conversions ?? []).find((conversion) => {
      const targetDimension = unitDimension(conversion.toUnit);
      return sameUnit(conversion.fromUnit, unit) && (targetDimension === "mass" || targetDimension === "volume");
    });
    if (massOrVolume) baseUnit = massOrVolume.toUnit;
  }

  if (!options.discrete || mode !== "none" || exact.isInteger()) {
    return { qty: rounded.toFixed(), unit };
  }

  const floor = exact.floor();
  const fraction = exact.minus(floor);

  // Coba konversi pecahan ke satuan base (umumnya gram) agar bisa ditimbang.
  if (fraction.gt(0) && baseUnit) {
    try {
      const extra = convertQuantity(fraction.toFixed(), unit, baseUnit, options.conversions ?? []);
      if (d(extra).gt(0)) {
        return {
          qty: floor.toFixed(),
          unit,
          extraQty: extra,
          extraUnit: baseUnit,
        };
      }
    } catch (error) {
      if (!(error instanceof CostingError)) throw error;
    }
  }

  return { qty: exact.toFixed(), unit };
}

export interface ScaleFactorInput {
  scaleFactor?: string | number | null;
  targetYield?: string | number | null;
  yieldQty: string | number;
}

/** Faktor skala dari input bebas atau target yield. */
export function resolveScaleFactor({ scaleFactor, targetYield, yieldQty }: ScaleFactorInput): string {
  const baseYield = new Decimal(yieldQty);
  if (baseYield.lte(0)) {
    throw new CostingError("INVALID_YIELD", "Yield resep harus lebih besar dari 0.");
  }

  if (targetYield !== null && targetYield !== undefined && String(targetYield).trim() !== "") {
    const target = new Decimal(targetYield);
    if (target.lte(0)) {
      throw new CostingError("INVALID_TARGET_YIELD", "Target yield harus lebih besar dari 0.");
    }
    return target.div(baseYield).toFixed();
  }

  const factor = new Decimal(scaleFactor ?? 1);
  if (!factor.isFinite() || factor.lte(0)) {
    throw new CostingError("INVALID_SCALE_FACTOR", "Faktor skala harus lebih besar dari 0.");
  }
  return factor.toFixed();
}

/** Rentang di mana scaling resep dianggap linear. */
export const NON_LINEAR_LOW = new Decimal("0.25");
export const NON_LINEAR_HIGH = new Decimal("4");

export function isNonLinearRange(factor: DecimalLike): boolean {
  const value = d(factor);
  return value.lt(NON_LINEAR_LOW) || value.gt(NON_LINEAR_HIGH);
}
