import { describe, expect, it } from "vitest";
import {
  calculateRecipeCost,
  computeBreakEven,
  computePricingMetrics,
  convertQuantity,
  practicalQuantity,
  roundPrice,
  suggestSellingPrice,
  type CostingInput,
  type IngredientInput,
  type RecipeInput,
} from "@ufc/costing";

const ingredients: IngredientInput[] = [
  {
    id: "flour",
    name: "Tepung Terigu Protein Tinggi",
    baseUnit: "gr",
    conversions: [],
  },
  {
    id: "egg",
    name: "Telur Ayam Ras",
    baseUnit: "butir",
    discrete: true,
    conversions: [{ fromUnit: "butir", toUnit: "gr", factor: 55 }],
  },
  {
    id: "yeast",
    name: "Ragi Instan",
    baseUnit: "gr",
    conversions: [{ fromUnit: "bungkus", toUnit: "gr", factor: 11 }],
  },
];

const prices = {
  flour: [
    {
      pricePerBaseUnit: "11.4",
      purchaseQty: 1,
      purchaseUnit: "kg",
      price: 11400,
      effectiveFrom: "2026-01-01T00:00:00Z",
    },
    {
      pricePerBaseUnit: "12",
      purchaseQty: 1,
      purchaseUnit: "kg",
      price: 12000,
      effectiveFrom: "2026-02-01T00:00:00Z",
    },
  ],
  egg: [
    {
      pricePerBaseUnit: "2000",
      purchaseQty: 1,
      purchaseUnit: "butir",
      price: 2000,
      effectiveFrom: "2026-01-01T00:00:00Z",
    },
  ],
  yeast: [
    {
      pricePerBaseUnit: "272.727273",
      purchaseQty: 11,
      purchaseUnit: "gr",
      price: 3000,
      effectiveFrom: "2026-01-01T00:00:00Z",
    },
  ],
};

const recipe: RecipeInput = {
  id: "roti-pemula",
  name: "Roti Pemula",
  yieldQty: 5,
  yieldUnit: "pcs",
  unitWeightG: 100,
  yieldLossPct: 0,
  items: [
    { type: "ingredient", refId: "flour", qty: 500, unit: "gr" },
    { type: "ingredient", refId: "egg", qty: 2, unit: "butir", discrete: true },
    { type: "ingredient", refId: "yeast", qty: 1, unit: "bungkus" },
  ],
};

function input(overrides: Partial<CostingInput> = {}): CostingInput {
  return {
    recipe,
    ingredients,
    prices,
    recipes: [recipe],
    priceStrategy: "latest",
    asOf: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("PRD §6 acceptance reference", () => {
  it("menghitung HPP batch x1 persis Rp13.000 dan HPP/roti Rp2.600", () => {
    const result = calculateRecipeCost(input());

    expect(result.rawMaterialCost).toBe("13000");
    expect(result.totalCost).toBe("13000");
    expect(result.costPerUnit).toBe("2600");
    expect(result.lines.map((line) => line.cost)).toEqual(["6000", "4000", "3000"]);
  });

  it("menghasilkan margin, markup, food cost, dan price-to-cost sesuai PRD", () => {
    const result = calculateRecipeCost(input());
    const metrics = computePricingMetrics({ costPerUnit: result.costPerUnit, sellingPrice: 10000 });

    expect(metrics.profitPerUnit).toBe("7400");
    expect(metrics.marginPct).toBe("74");
    expect(metrics.markupPct).toBe("284.62");
    expect(metrics.foodCostPct).toBe("26");
    expect(metrics.priceToCostPct).toBe("384.62");
  });

  it("scaling x2 melipatgandakan batch dan menjaga HPP per unit", () => {
    const result = calculateRecipeCost(input({ scaleFactor: 2 }));

    expect(result.totalCost).toBe("26000");
    expect(result.costPerUnit).toBe("2600");
    expect(result.lines.map((line) => line.qty)).toEqual(["1000", "4", "2"]);
  });

  it("mendukung target yield sebagai pengganti faktor", () => {
    const result = calculateRecipeCost(input({ targetYield: 10 }));

    expect(result.scaleFactor).toBe("2");
    expect(result.targetYield).toBe("10");
    expect(result.totalCost).toBe("26000");
  });
});

describe("unit conversion", () => {
  it("mengonversi kg ke gr dan butir ke gr lewat konversi bahan", () => {
    expect(convertQuantity("1", "kg", "gr")).toBe("1000");
    expect(convertQuantity("2", "butir", "gr", ingredients[1].conversions)).toBe("110");
  });

  it("melempar error keras bila konversi tidak dideklarasikan", () => {
    expect(() => convertQuantity("1", "butir", "gr")).toThrowError(/Konversi/);
  });

  it("menolak satuan yang tidak dikenal", () => {
    expect(() => convertQuantity("1", "krat", "gr")).toThrowError(/belum terdaftar/);
  });
});

describe("scaling praktis & non-linear", () => {
  it("menampilkan 1.5 butir sebagai 1 butir + 27.5 gr", () => {
    const practical = practicalQuantity("1.5", "butir", {
      discrete: true,
      rounding: "none",
      baseUnit: "gr",
      conversions: ingredients[1].conversions,
    });

    expect(practical.qty).toBe("1");
    expect(practical.extraQty).toBe("27.5");
    expect(practical.extraUnit).toBe("gr");
  });

  it("menggunakan gram untuk pecahan butir meski base unit bahan adalah butir", () => {
    const recipeWithThreeEggs: RecipeInput = {
      ...recipe,
      items: [
        { type: "ingredient", refId: "flour", qty: 250, unit: "gr" },
        { type: "ingredient", refId: "egg", qty: 3, unit: "butir", discrete: true },
      ],
    };
    const result = calculateRecipeCost(
      input({ recipe: recipeWithThreeEggs, recipes: [recipeWithThreeEggs], scaleFactor: 0.5 }),
    );
    const eggLine = result.lines.find((line) => line.name.includes("Telur"));
    expect(eggLine?.practical?.qty).toBe("1");
    expect(eggLine?.practical?.extraQty).toBe("27.5");
    expect(eggLine?.practical?.extraUnit).toBe("gr");
  });

  it("membulatkan sesuai aturan whole dan half", () => {
    expect(practicalQuantity("1.5", "butir", { discrete: true, rounding: "whole" }).qty).toBe("2");
    expect(practicalQuantity("1.2", "butir", { discrete: true, rounding: "half" }).qty).toBe("1.5");
  });

  it("memberi warning non-linear pada faktor ekstrem", () => {
    const flagged: RecipeInput = {
      ...recipe,
      items: recipe.items.map((item) =>
        item.refId === "yeast" ? { ...item, nonLinearScaling: true } : item,
      ),
    };
    const result = calculateRecipeCost(input({ recipe: flagged, recipes: [flagged], scaleFactor: 5 }));
    expect(result.warnings.some((warning) => warning.code === "NON_LINEAR_SCALING")).toBe(true);

    const normal = calculateRecipeCost(input({ recipe: flagged, recipes: [flagged], scaleFactor: 2 }));
    expect(normal.warnings).toHaveLength(0);
  });
});

describe("strategi harga", () => {
  it("memakai harga rata-rata berbobot saat strategy average", () => {
    const result = calculateRecipeCost(
      input({
        priceStrategy: "average",
        recipe: { ...recipe, items: [{ type: "ingredient", refId: "flour", qty: 1000, unit: "gr" }] },
      }),
    );
    // 1 kg @11.4 + 1 kg @12 -> rata-rata 11.7/gr
    expect(result.rawMaterialCost).toBe("11700");
  });

  it("menghormati snapshot tanggal historis", () => {
    const result = calculateRecipeCost(
      input({
        priceStrategy: "snapshot",
        asOf: "2026-01-15T00:00:00Z",
        recipe: { ...recipe, items: [{ type: "ingredient", refId: "flour", qty: 1000, unit: "gr" }] },
      }),
    );
    expect(result.rawMaterialCost).toBe("11400");
  });

  it("menerapkan simulasi kenaikan harga tanpa mengubah data", () => {
    const result = calculateRecipeCost(
      input({ priceOverrides: { flour: { mode: "percent", value: 20 } } }),
    );
    // 500 gr x 14.4 = 7.200 + 4.000 + 3.000
    expect(result.rawMaterialCost).toBe("14200");
  });
});

describe("yield loss, overhead, dan sub-resep", () => {
  it("membagi HPP dengan yield efektif setelah susut", () => {
    const result = calculateRecipeCost(
      input({ recipe: { ...recipe, yieldLossPct: 10 } }),
    );
    expect(result.effectiveYieldQty).toBe("4.5");
    expect(result.costPerUnit).toBe("2888.888889");
  });

  it("menghitung overhead fixed (scaled) dan persen bahan", () => {
    const withOverhead: RecipeInput = {
      ...recipe,
      items: [
        ...recipe.items,
        { type: "overhead", name: "Kemasan", qty: 0, unit: "batch", overheadKind: "fixed", overheadValue: 1000 },
        { type: "overhead", name: "Gas", qty: 0, unit: "batch", overheadKind: "percent", overheadValue: 10 },
      ],
    };
    const result = calculateRecipeCost(input({ recipe: withOverhead, recipes: [withOverhead] }));
    // bahan 13.000 + kemasan 1.000 + gas 1.300
    expect(result.overheadCost).toBe("2300");
    expect(result.totalCost).toBe("15300");
  });

  it("menghitung sub-resep dan mendeteksi siklus", () => {
    const sub: RecipeInput = {
      id: "sub",
      name: "Adonan Dasar",
      yieldQty: 1000,
      yieldUnit: "gr",
      yieldLossPct: 0,
      items: [{ type: "ingredient", refId: "flour", qty: 1000, unit: "gr" }],
    };
    const parent: RecipeInput = {
      id: "parent",
      name: "Roti Isi",
      yieldQty: 10,
      yieldUnit: "pcs",
      yieldLossPct: 0,
      items: [{ type: "subrecipe", refId: "sub", qty: 500, unit: "gr" }],
    };
    const result = calculateRecipeCost(
      input({ recipe: parent, recipes: [parent, sub] }),
    );
    expect(result.rawMaterialCost).toBe("6000");

    const cyclic: RecipeInput = {
      id: "cyclic",
      name: "Siklus",
      yieldQty: 1,
      yieldUnit: "pcs",
      items: [{ type: "subrecipe", refId: "cyclic", qty: 1, unit: "pcs" }],
    };
    expect(() => calculateRecipeCost(input({ recipe: cyclic, recipes: [cyclic] }))).toThrowError(/Siklus/);
  });
});

describe("pricing helpers", () => {
  it("menyarankan harga dari target margin dan pembulatan Rp500", () => {
    expect(suggestSellingPrice({ costPerUnit: 2600, targetMarginPct: 74, roundingTo: 500 })).toBe("10000");
    expect(suggestSellingPrice({ costPerUnit: 2600, targetFoodCostPct: 26, roundingTo: 500 })).toBe("10000");
  });

  it("membulatkan harga ke kelipatan terdekat / ke atas", () => {
    expect(roundPrice(10300, 500, "nearest")).toBe("10500");
    expect(roundPrice(10100, 500, "up")).toBe("10500");
  });

  it("menghitung break-even terhadap overhead tetap", () => {
    const bep = computeBreakEven({ overheadCost: 10000, rawCostPerUnit: 2600, sellingPrice: 10000 });
    expect(bep.units).toBe("2");
    expect(bep.revenue).toBe("20000");
  });
});
