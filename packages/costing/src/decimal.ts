import Decimal from "decimal.js";

export type DecimalLike = string | number | Decimal;

export function d(value: DecimalLike | null | undefined, fallback = "0"): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(fallback);
  if (value instanceof Decimal) return value;
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(fallback);
  }
}

export function decToString(value: DecimalLike, dp?: number): string {
  const decimal = d(value);
  const rounded = typeof dp === "number" ? decimal.toDecimalPlaces(dp, Decimal.ROUND_HALF_UP) : decimal;
  return rounded.isZero() ? "0" : rounded.toFixed();
}

export const ZERO = new Decimal(0);
export const HUNDRED = new Decimal(100);
