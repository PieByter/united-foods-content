import Decimal from "decimal.js";

export type UnitDimension = "mass" | "volume" | "count";

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: string | number;
}

export interface UnitDefinition {
  code: string;
  label: string;
  dimension: UnitDimension;
  toBase: string;
  baseCode: string;
  aliases: string[];
}

/**
 * Referensi satuan. Massa dinormalisasi ke gram, volume ke mililiter,
 * dan count ke pcs. Konversi antar-dimensi (butir -> gram, sdm -> ml)
 * wajib dideklarasikan per bahan lewat `IngredientInput.conversions`.
 */
export const UNITS: UnitDefinition[] = [
  { code: "mg", label: "mg", dimension: "mass", toBase: "0.001", baseCode: "gr", aliases: ["miligram"] },
  { code: "gr", label: "gr", dimension: "mass", toBase: "1", baseCode: "gr", aliases: ["g", "gram", "gramme"] },
  { code: "kg", label: "kg", dimension: "mass", toBase: "1000", baseCode: "gr", aliases: ["kilogram", "kilo"] },
  { code: "ml", label: "ml", dimension: "volume", toBase: "1", baseCode: "ml", aliases: ["mililiter", "milliliter", "cc"] },
  { code: "l", label: "liter", dimension: "volume", toBase: "1000", baseCode: "ml", aliases: ["liter", "litre", "ltr"] },
  { code: "sdm", label: "sdm", dimension: "volume", toBase: "15", baseCode: "ml", aliases: ["tbsp", "sendok makan"] },
  { code: "sdt", label: "sdt", dimension: "volume", toBase: "5", baseCode: "ml", aliases: ["tsp", "sendok teh"] },
  { code: "cup", label: "cup", dimension: "volume", toBase: "240", baseCode: "ml", aliases: ["cangkir"] },
  { code: "pcs", label: "pcs", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["pc", "piece", "pieces"] },
  { code: "buah", label: "buah", dimension: "count", toBase: "1", baseCode: "pcs", aliases: [] },
  { code: "butir", label: "butir", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["btr", "biji"] },
  { code: "bungkus", label: "bungkus", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["bks", "packet"] },
  { code: "sachet", label: "sachet", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["sch"] },
  { code: "blok", label: "blok", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["block", "batang"] },
  { code: "sak", label: "sak", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["karung", "sack"] },
  { code: "pack", label: "pack", dimension: "count", toBase: "1", baseCode: "pcs", aliases: [] },
  { code: "tray", label: "tray", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["nampan"] },
  { code: "box", label: "box", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["kotak"] },
  { code: "porsi", label: "porsi", dimension: "count", toBase: "1", baseCode: "pcs", aliases: ["portion", "serving"] },
];

const UNIT_MAP = new Map<string, UnitDefinition>();
for (const unit of UNITS) {
  UNIT_MAP.set(unit.code.toLowerCase(), unit);
  for (const alias of unit.aliases) UNIT_MAP.set(alias.toLowerCase(), unit);
}

export class CostingError extends Error {
  code: string;
  detail?: Record<string, unknown>;

  constructor(code: string, message: string, detail?: Record<string, unknown>) {
    super(message);
    this.name = "CostingError";
    this.code = code;
    this.detail = detail;
  }
}

export function findUnit(unit: string): UnitDefinition | undefined {
  return UNIT_MAP.get(String(unit ?? "").trim().toLowerCase());
}

export function canonicalUnit(unit: string): string {
  return findUnit(unit)?.code ?? String(unit ?? "").trim().toLowerCase();
}

export function unitLabel(unit: string): string {
  return findUnit(unit)?.label ?? String(unit ?? "").trim();
}

export function unitDimension(unit: string): UnitDimension | undefined {
  return findUnit(unit)?.dimension;
}

export function sameUnit(a: string, b: string): boolean {
  return canonicalUnit(a) === canonicalUnit(b);
}

export function assertKnownUnit(unit: string): string {
  const found = findUnit(unit);
  if (!found) {
    throw new CostingError(
      "UNKNOWN_UNIT",
      `Satuan "${unit}" belum terdaftar. Gunakan satuan standar (gr, kg, ml, sdm, butir, bungkus, dll).`,
      { unit },
    );
  }
  return found.code;
}

interface Edge {
  to: string;
  factor: string;
}

function buildGraph(conversions: UnitConversion[] = []): Map<string, Edge[]> {
  const graph = new Map<string, Edge[]>();
  const add = (from: string, to: string, factor: string) => {
    const list = graph.get(from) ?? [];
    if (!list.some((edge) => edge.to === to)) list.push({ to, factor });
    graph.set(from, list);
  };

  for (const unit of UNITS) {
    if (unit.code !== unit.baseCode) {
      add(unit.code, unit.baseCode, unit.toBase);
      add(unit.baseCode, unit.code, new Decimal(1).div(unit.toBase).toFixed());
    }
  }

  for (const conversion of conversions) {
    const from = canonicalUnit(conversion.fromUnit);
    const to = canonicalUnit(conversion.toUnit);
    if (!findUnit(from) || !findUnit(to)) continue;
    const factor = new Decimal(conversion.factor);
    if (!factor.isFinite() || factor.lte(0)) continue;
    add(from, to, factor.toFixed());
    add(to, from, new Decimal(1).div(factor).toFixed());
  }

  return graph;
}

/**
 * Konversi kuantitas. Menggunakan BFS agar rantai seperti
 * butir -> gram -> kg atau blok -> gram dapat diselesaikan.
 */
export function convertQuantity(
  qty: string | number,
  fromUnit: string,
  toUnit: string,
  conversions: UnitConversion[] = [],
): string {
  const from = assertKnownUnit(fromUnit);
  const to = assertKnownUnit(toUnit);
  const quantity = new Decimal(qty);
  if (quantity.isZero()) return "0";
  if (from === to) return quantity.toFixed();

  const graph = buildGraph(conversions);
  const queue: Array<{ unit: string; factor: Decimal }> = [{ unit: from, factor: new Decimal(1) }];
  const visited = new Set<string>([from]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const edges = graph.get(current.unit) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      const factor = current.factor.mul(edge.factor);
      if (edge.to === to) return quantity.mul(factor).toFixed();
      visited.add(edge.to);
      queue.push({ unit: edge.to, factor });
    }
  }

  throw new CostingError(
    "MISSING_CONVERSION",
    `Konversi ${unitLabel(from)} → ${unitLabel(to)} belum didefinisikan untuk bahan ini. Tambahkan konversi khusus agar HPP tidak menebak.`,
    { fromUnit: from, toUnit: to },
  );
}

/** Faktor pengali 1 satuan asal ke satuan tujuan. */
export function conversionFactor(fromUnit: string, toUnit: string, conversions: UnitConversion[] = []): string {
  return convertQuantity(1, fromUnit, toUnit, conversions);
}

export function convertToBase(
  qty: string | number,
  unit: string,
  baseUnit: string,
  conversions: UnitConversion[] = [],
): string {
  return convertQuantity(qty, unit, baseUnit, conversions);
}

export function cheapestUnitPath(fromUnit: string, toUnit: string, conversions: UnitConversion[] = []): string[] {
  const from = assertKnownUnit(fromUnit);
  const to = assertKnownUnit(toUnit);
  if (from === to) return [from];
  const graph = buildGraph(conversions);
  const queue: Array<{ unit: string; path: string[] }> = [{ unit: from, path: [from] }];
  const visited = new Set<string>([from]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.get(current.unit) ?? []) {
      if (visited.has(edge.to)) continue;
      const path = [...current.path, edge.to];
      if (edge.to === to) return path;
      visited.add(edge.to);
      queue.push({ unit: edge.to, path });
    }
  }
  return [];
}
