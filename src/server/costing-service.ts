import {
  calculateRecipeCost,
  computePricingMetrics,
  suggestSellingPrice,
  type CostingInput,
  type CostingResult,
  type PriceStrategy,
  type RecipeInput,
} from "@ufc/costing";
import type { IngredientView, RecipeCostSummary, RecipeView, ScenarioView, SettingsView } from "@/lib/types";
import { buildPriceBook, toDomainIngredient, toDomainRecipe } from "@/lib/costing-mappers";

export { buildPriceBook, toDomainIngredient, toDomainRecipe } from "@/lib/costing-mappers";


export interface CostingOptions {
  scaleFactor?: string | number;
  targetYield?: string | number;
  priceStrategy?: PriceStrategy;
  asOf?: string | Date;
  priceOverrides?: CostingInput["priceOverrides"];
}

export function calculateForRecipe(
  recipe: RecipeView,
  ingredients: IngredientView[],
  recipes: RecipeView[],
  options: CostingOptions = {},
): CostingResult {
  const domainRecipe = toDomainRecipe(recipe);
  if (!domainRecipe) throw new Error(`Resep "${recipe.name}" belum memiliki versi formula.`);

  const domainRecipes = recipes
    .map((entry) => toDomainRecipe(entry))
    .filter((entry): entry is RecipeInput => entry !== null);

  if (!domainRecipes.some((entry) => entry.id === domainRecipe.id)) domainRecipes.push(domainRecipe);

  return calculateRecipeCost({
    recipe: domainRecipe,
    recipes: domainRecipes,
    ingredients: ingredients.map(toDomainIngredient),
    prices: buildPriceBook(ingredients),
    priceStrategy: options.priceStrategy,
    scaleFactor: options.scaleFactor,
    targetYield: options.targetYield,
    asOf: options.asOf,
    priceOverrides: options.priceOverrides,
  });
}

export interface RecipeCostBundle {
  result: CostingResult | null;
  summary: RecipeCostSummary;
  error?: string;
}

export function summarizeRecipe(
  recipe: RecipeView,
  ingredients: IngredientView[],
  recipes: RecipeView[],
  settings: SettingsView,
  scenario?: ScenarioView | null,
): RecipeCostBundle {
  try {
    const result = calculateForRecipe(recipe, ingredients, recipes, {
      priceStrategy: settings.defaultPriceStrategy,
      scaleFactor: 1,
    });
    const sellingPrice = scenario
      ? scenario.sellingPrice
      : suggestSellingPrice({
          costPerUnit: result.costPerUnit,
          targetMarginPct: settings.targetMarginPct,
          roundingTo: 500,
          roundingMode: "up",
        });
    const metrics = computePricingMetrics({ costPerUnit: result.costPerUnit, sellingPrice });

    return {
      result,
      summary: {
        totalCost: result.totalCost,
        costPerUnit: result.costPerUnit,
        rawMaterialCost: result.rawMaterialCost,
        overheadCost: result.overheadCost,
        effectiveYieldQty: result.effectiveYieldQty,
        yieldUnit: result.yieldUnit,
        sellingPrice,
        suggestedPrice: sellingPrice,
        foodCostPct: metrics.foodCostPct,
        marginPct: metrics.marginPct,
        markupPct: metrics.markupPct,
        profitPerUnit: metrics.profitPerUnit,
        hasScenario: Boolean(scenario),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kalkulasi HPP gagal.";
    return {
      result: null,
      error: message,
      summary: {
        totalCost: "0",
        costPerUnit: "0",
        rawMaterialCost: "0",
        overheadCost: "0",
        effectiveYieldQty: "0",
        yieldUnit: recipe.version?.yieldUnit ?? "pcs",
        sellingPrice: scenario?.sellingPrice ?? "0",
        suggestedPrice: scenario?.sellingPrice ?? "0",
        foodCostPct: "0",
        marginPct: "0",
        markupPct: "0",
        profitPerUnit: "0",
        hasScenario: Boolean(scenario),
      },
    };
  }
}
