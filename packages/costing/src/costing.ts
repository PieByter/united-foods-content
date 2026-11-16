import Decimal from "decimal.js";
import { d, decToString } from "./decimal";
import { isNonLinearRange, practicalQuantity, resolveScaleFactor } from "./scaling";
import type {
  CostedLine,
  CostingInput,
  CostingResult,
  CostingWarning,
  IngredientInput,
  PriceRecordInput,
  PriceStrategy,
  RecipeInput,
  RecipeItemInput,
} from "./types";
import { convertQuantity, CostingError } from "./units";

const MAX_DEPTH = 5;

function isoDate(value: string | Date | undefined): Date {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function effectiveTime(value: string | Date): number {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function selectBasePrice(
  ingredient: IngredientInput,
  records: PriceRecordInput[] | undefined,
  strategy: PriceStrategy,
  asOf: Date,
): { value: Decimal; source: PriceStrategy; record?: PriceRecordInput } {
  if (!records || records.length === 0) {
    throw new CostingError(
      "MISSING_PRICE",
      `Harga bahan "${ingredient.name}" belum tersedia. Tambahkan riwayat harga beli terlebih dahulu.`,
      { ingredientId: ingredient.id, ingredientName: ingredient.name },
    );
  }

  const cutoff = strategy === "latest" ? Date.now() : asOf.getTime();
  const eligible = records.filter((record) => effectiveTime(record.effectiveFrom) <= cutoff);

  if (eligible.length === 0) {
    throw new CostingError(
      "MISSING_PRICE",
      `Tidak ada harga "${ingredient.name}" yang berlaku pada ${asOf.toLocaleDateString("id-ID")}.`,
      { ingredientId: ingredient.id, ingredientName: ingredient.name },
    );
  }

  if (strategy === "average") {
    let weightedTotal = new Decimal(0);
    let totalWeight = new Decimal(0);

    for (let index = 0; index < eligible.length; index += 1) {
      const record = eligible[index];
      const price = d(record.pricePerBaseUnit);
      let weight = new Decimal(1);
      if (record.purchaseQty && record.purchaseUnit) {
        try {
          const baseQty = convertQuantity(
            record.purchaseQty,
            record.purchaseUnit,
            ingredient.baseUnit,
            ingredient.conversions ?? [],
          );
          const parsed = d(baseQty);
          if (parsed.gt(0)) weight = parsed;
        } catch (error) {
          if (!(error instanceof CostingError)) throw error;
        }
      }
      weightedTotal = weightedTotal.plus(price.mul(weight));
      totalWeight = totalWeight.plus(weight);
    }

    if (totalWeight.gt(0)) {
      return { value: weightedTotal.div(totalWeight), source: "average" };
    }
  }

  // latest dan snapshot sama-sama memilih record terbaru; snapshot dibatasi tanggal asOf.
  const ordered = eligible
    .map((record, index) => ({ record, index, time: effectiveTime(record.effectiveFrom) }))
    .sort((a, b) => (b.time === a.time ? b.index - a.index : b.time - a.time));

  return {
    value: d(ordered[0].record.pricePerBaseUnit),
    source: strategy,
    record: ordered[0].record,
  };
}

function applyOverride(
  ingredientId: string,
  value: Decimal,
  overrides: CostingInput["priceOverrides"],
): Decimal {
  const override = overrides?.[ingredientId];
  if (!override) return value;
  if (override.mode === "absolute") {
    const absolute = d(override.value);
    if (absolute.lt(0)) {
      throw new CostingError("INVALID_OVERRIDE", "Harga simulasi tidak boleh negatif.");
    }
    return absolute;
  }
  const pct = d(override.value);
  const result = value.mul(new Decimal(1).plus(pct.div(100)));
  if (result.lt(0)) {
    throw new CostingError("INVALID_OVERRIDE", "Perubahan harga simulasi menghasilkan nilai negatif.");
  }
  return result;
}

function validateRecipe(recipe: RecipeInput): Decimal {
  const yieldQty = d(recipe.yieldQty);
  if (yieldQty.lte(0)) {
    throw new CostingError("INVALID_YIELD", `Yield resep "${recipe.name}" harus lebih besar dari 0.`);
  }
  const loss = d(recipe.yieldLossPct ?? 0);
  if (loss.lt(0) || loss.gte(100)) {
    throw new CostingError(
      "INVALID_YIELD_LOSS",
      `Yield loss resep "${recipe.name}" harus di antara 0% dan di bawah 100%.`,
    );
  }
  return yieldQty;
}

function sortItems(items: RecipeItemInput[]): RecipeItemInput[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.sortOrder ?? a.index) - (b.item.sortOrder ?? b.index))
    .map(({ item }) => item);
}

interface InternalLine extends CostedLine {
  overheadKind?: "fixed" | "percent";
  overheadPct?: string;
  rawCost?: Decimal;
}

interface InternalResult {
  result: CostingResult;
  rawMaterial: Decimal;
  overhead: Decimal;
  total: Decimal;
}

export function calculateRecipeCost(input: CostingInput): CostingResult {
  const strategy: PriceStrategy = input.priceStrategy ?? "latest";
  const asOf = isoDate(input.asOf);
  const asOfIso = asOf.toISOString();
  const scaleFactor = resolveScaleFactor({
    scaleFactor: input.scaleFactor,
    targetYield: input.targetYield,
    yieldQty: input.recipe.yieldQty,
  });
  const factor = d(scaleFactor);
  const ingredientMap = new Map(input.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipeMap = new Map((input.recipes ?? [input.recipe]).map((recipe) => [recipe.id, recipe]));
  const priceBook = input.prices ?? {};
  const memo = new Map<string, InternalResult>();

  const compute = (recipe: RecipeInput, recipeFactor: Decimal, path: Set<string>, depth: number): InternalResult => {
    if (path.has(recipe.id)) {
      const cycle = [...path, recipe.id].join(" → ");
      throw new CostingError("CYCLE", `Siklus sub-resep terdeteksi: ${cycle}. Perbaiki referensi agar membentuk DAG.`, {
        recipeId: recipe.id,
        path: cycle,
      });
    }
    if (depth > MAX_DEPTH) {
      throw new CostingError("DEPTH_LIMIT", `Kedalaman sub-resep melebihi batas ${MAX_DEPTH} level.`);
    }
    if (!recipeMap.has(recipe.id)) recipeMap.set(recipe.id, recipe);

    const memoKey = `${recipe.id}|${recipeFactor.toFixed(12)}`;
    const cached = memo.get(memoKey);
    if (cached) return cached;

    const yieldQty = validateRecipe(recipe);
    const lossPct = d(recipe.yieldLossPct ?? 0);
    const nextPath = new Set(path);
    nextPath.add(recipe.id);

    let rawMaterial = new Decimal(0);
    let fixedOverhead = new Decimal(0);
    let percentOverheadPct = new Decimal(0);
    const ingredientLines: InternalLine[] = [];
    const overheadDrafts: InternalLine[] = [];
    const warnings: CostingWarning[] = [];

    for (const [index, item] of sortItems(recipe.items ?? []).entries()) {
      const itemKey = item.id ?? `${recipe.id}-${index}`;
      const scaledQty = d(item.qty).mul(recipeFactor);

      if (item.type === "overhead") {
        const kind = item.overheadKind ?? "fixed";
        const value = d(item.overheadValue ?? 0);
        if (kind === "percent") {
          percentOverheadPct = percentOverheadPct.plus(value);
        } else {
          fixedOverhead = fixedOverhead.plus(value.mul(recipeFactor));
        }
        overheadDrafts.push({
          key: itemKey,
          itemId: item.id,
          type: "overhead",
          name: item.name?.trim() || (kind === "percent" ? "Overhead persentase" : "Overhead batch"),
          note: item.note ?? null,
          qty: kind === "percent" ? decToString(value) : decToString(recipeFactor),
          unit: kind === "percent" ? "% bahan" : "batch",
          unitPrice: decToString(value),
          cost: "0",
          proportionPct: "0",
          overheadKind: kind,
          overheadPct: kind === "percent" ? decToString(value) : undefined,
        });
        continue;
      }

      if (!item.refId) {
        throw new CostingError("MISSING_REFERENCE", `Item "${item.name ?? item.type}" tidak memiliki referensi.`);
      }

      if (item.type === "ingredient") {
        const ingredient = ingredientMap.get(item.refId);
        if (!ingredient) {
          throw new CostingError("MISSING_INGREDIENT", `Bahan untuk item ini tidak ditemukan (${item.refId}).`);
        }

        const baseQty = convertQuantity(scaledQty.toFixed(), item.unit, ingredient.baseUnit, ingredient.conversions ?? []);
        const selected = selectBasePrice(ingredient, priceBook[ingredient.id], strategy, asOf);
        const override = input.priceOverrides?.[ingredient.id];
        const effectivePrice = applyOverride(ingredient.id, selected.value, input.priceOverrides);

        // Gunakan harga lot asli (mis. Rp3.000 / 1 bungkus = 11 gr) agar tidak
        // kehilangan presisi rupiah saat harga per base unit berulang.
        let cost: Decimal;
        if (override?.mode === "absolute") {
          cost = d(baseQty).mul(effectivePrice);
        } else {
          let lotCost: Decimal | null = null;
          const record = selected.record;
          if (record?.price && record.purchaseQty && record.purchaseUnit) {
            try {
              const lotBaseQty = d(
                convertQuantity(
                  record.purchaseQty,
                  record.purchaseUnit,
                  ingredient.baseUnit,
                  ingredient.conversions ?? [],
                ),
              );
              if (lotBaseQty.gt(0)) {
                lotCost = d(baseQty).mul(d(record.price)).div(lotBaseQty);
              }
            } catch (error) {
              if (!(error instanceof CostingError)) throw error;
            }
          }
          if (lotCost === null) lotCost = d(baseQty).mul(selected.value);
          cost =
            override?.mode === "percent"
              ? lotCost.mul(new Decimal(1).plus(d(override.value).div(100)))
              : lotCost;
        }

        let unitPrice = new Decimal(0);
        if (scaledQty.gt(0)) {
          unitPrice = cost.div(scaledQty);
        }

        let practical;
        try {
          practical = practicalQuantity(scaledQty.toFixed(), item.unit, {
            discrete: item.discrete ?? ingredient.discrete ?? false,
            rounding: item.rounding ?? "none",
            baseUnit: ingredient.baseUnit,
            conversions: ingredient.conversions ?? [],
          });
        } catch (error) {
          if (!(error instanceof CostingError)) throw error;
        }

        const nonLinear = Boolean(item.nonLinearScaling) && isNonLinearRange(recipeFactor);
        if (nonLinear) {
          warnings.push({
            code: "NON_LINEAR_SCALING",
            itemId: item.id,
            itemName: ingredient.name,
            message: `${ingredient.name} diskalakan x${decToString(recipeFactor)} — di luar rentang linear 0.25x–4x. Periksa takaran dan waktu prosesnya.`,
          });
        }

        ingredientLines.push({
          key: itemKey,
          itemId: item.id,
          type: "ingredient",
          name: ingredient.name,
          sku: ingredient.sku ?? null,
          category: ingredient.category ?? null,
          note: item.note ?? null,
          qty: decToString(scaledQty, 6),
          unit: item.unit,
          unitPrice: decToString(unitPrice, 6),
          cost: decToString(cost, 6),
          proportionPct: "0",
          baseQty: decToString(baseQty, 6),
          baseUnit: ingredient.baseUnit,
          pricePerBaseUnit: decToString(effectivePrice, 6),
          priceSource: selected.source,
          discrete: item.discrete ?? ingredient.discrete ?? false,
          rounding: item.rounding ?? "none",
          nonLinearScaling: Boolean(item.nonLinearScaling),
          practical,
          rawCost: cost,
        });
        rawMaterial = rawMaterial.plus(cost);
        continue;
      }

      // Sub-resep
      const subrecipe = recipeMap.get(item.refId);
      if (!subrecipe) {
        throw new CostingError("MISSING_SUBRECIPE", `Sub-resep untuk item "${item.name ?? item.refId}" tidak ditemukan.`);
      }

      const qtyInYieldUnit = convertQuantity(scaledQty.toFixed(), item.unit, subrecipe.yieldUnit);
      const ratio = d(qtyInYieldUnit).div(d(subrecipe.yieldQty));
      const subResult = compute(subrecipe, ratio, nextPath, depth + 1);
      const cost = subResult.total;

      let practical;
      try {
        practical = practicalQuantity(scaledQty.toFixed(), item.unit, {
          discrete: item.discrete ?? false,
          rounding: item.rounding ?? "none",
          baseUnit: subrecipe.yieldUnit,
        });
      } catch (error) {
        if (!(error instanceof CostingError)) throw error;
      }

      ingredientLines.push({
        key: itemKey,
        itemId: item.id,
        type: "subrecipe",
        name: subrecipe.name,
        category: subrecipe.category ?? "Sub-resep",
        note: item.note ?? null,
        qty: decToString(scaledQty, 6),
        unit: item.unit,
        unitPrice: scaledQty.gt(0) ? decToString(cost.div(scaledQty), 6) : "0",
        cost: decToString(cost, 6),
        proportionPct: "0",
        baseQty: decToString(scaledQty, 6),
        baseUnit: item.unit,
        pricePerBaseUnit: scaledQty.gt(0) ? decToString(cost.div(scaledQty), 6) : "0",
        priceSource: strategy,
        discrete: Boolean(item.discrete),
        rounding: item.rounding ?? "none",
        nonLinearScaling: Boolean(item.nonLinearScaling),
        practical,
        children: subResult.result.lines.map((child) => ({ ...child })),
        rawCost: cost,
      });

      for (const warning of subResult.result.warnings) {
        if (!warnings.some((entry) => entry.code === warning.code && entry.itemId === warning.itemId)) {
          warnings.push(warning);
        }
      }
      rawMaterial = rawMaterial.plus(cost);
    }

    const percentOverhead = rawMaterial.mul(percentOverheadPct.div(100));
    const overhead = fixedOverhead.plus(percentOverhead);
    const total = rawMaterial.plus(overhead);
    const effectiveYield = yieldQty.mul(recipeFactor).mul(new Decimal(1).minus(lossPct.div(100)));

    if (effectiveYield.lte(0)) {
      throw new CostingError("INVALID_EFFECTIVE_YIELD", "Yield efektif setelah susut harus lebih besar dari 0.");
    }

    const finalLines: CostedLine[] = ingredientLines.map(({ rawCost: _rawCost, overheadKind: _kind, ...line }) => ({
      ...line,
      proportionPct: total.gt(0) ? decToString(d(line.cost).div(total).mul(100), 2) : "0",
    }));

    const finalOverhead: CostedLine[] = overheadDrafts.map((line) => {
      const cost =
        line.overheadKind === "percent"
          ? rawMaterial.mul(d(line.overheadPct ?? 0).div(100))
          : d(line.unitPrice).mul(recipeFactor);
      return {
        key: line.key,
        itemId: line.itemId,
        type: "overhead",
        name: line.name,
        note: line.note ?? null,
        qty: line.qty,
        unit: line.unit,
        unitPrice: decToString(cost, 6),
        cost: decToString(cost, 6),
        proportionPct: total.gt(0) ? decToString(cost.div(total).mul(100), 2) : "0",
      };
    });

    const costPerUnit = total.div(effectiveYield);
    const rawCostPerUnit = rawMaterial.div(effectiveYield);
    const unitWeight = d(recipe.unitWeightG ?? 0);

    const result: CostingResult = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      scaleFactor: decToString(recipeFactor, 6),
      priceStrategy: strategy,
      asOf: asOfIso,
      rawMaterialCost: decToString(rawMaterial, 6),
      overheadCost: decToString(overhead, 6),
      totalCost: decToString(total, 6),
      yieldQty: decToString(yieldQty, 6),
      yieldUnit: recipe.yieldUnit,
      yieldLossPct: decToString(lossPct, 6),
      effectiveYieldQty: decToString(effectiveYield, 6),
      costPerUnit: decToString(costPerUnit, 6),
      rawCostPerUnit: decToString(rawCostPerUnit, 6),
      costPerGram: unitWeight.gt(0) ? decToString(costPerUnit.div(unitWeight), 6) : undefined,
      unitWeightG: unitWeight.gt(0) ? decToString(unitWeight) : undefined,
      lines: finalLines,
      overheadLines: finalOverhead,
      warnings,
    };

    const internal: InternalResult = {
      result,
      rawMaterial,
      overhead,
      total,
    };
    memo.set(memoKey, internal);
    return internal;
  };

  const computed = compute(input.recipe, factor, new Set(), 1).result;
  return {
    ...computed,
    targetYield:
      input.targetYield !== null && input.targetYield !== undefined && String(input.targetYield).trim() !== ""
        ? String(input.targetYield)
        : undefined,
  };
}

/** Pastikan seluruh sub-resep dapat dihitung tanpa siklus sebelum disimpan. */
export function assertRecipeDag(
  recipeId: string,
  recipeMap: Map<string, { id: string; items: Array<{ type: string; refId?: string | null }> }>,
): void {
  const visit = (id: string, path: Set<string>) => {
    if (path.has(id)) {
      throw new CostingError("CYCLE", `Siklus sub-resep terdeteksi: ${[...path, id].join(" → ")}.`);
    }
    if (path.size > MAX_DEPTH) {
      throw new CostingError("DEPTH_LIMIT", `Kedalaman sub-resep melebihi batas ${MAX_DEPTH} level.`);
    }
    const recipe = recipeMap.get(id);
    if (!recipe) return;
    const next = new Set(path);
    next.add(id);
    for (const item of recipe.items) {
      if (item.type === "subrecipe" && item.refId) visit(item.refId, next);
    }
  };
  visit(recipeId, new Set());
}

/** Total biaya bahan sebelum overhead, untuk kartu breakdown. */
export function flattenIngredientCosts(result: CostingResult): Array<{ name: string; cost: string }> {
  const map = new Map<string, Decimal>();
  const walk = (lines: CostedLine[]) => {
    for (const line of lines) {
      if (line.type === "ingredient") {
        map.set(line.name, (map.get(line.name) ?? new Decimal(0)).plus(d(line.cost)));
      }
      if (line.children) walk(line.children);
    }
  };
  walk(result.lines);
  return [...map.entries()].map(([name, cost]) => ({ name, cost: cost.toFixed() }));
}
