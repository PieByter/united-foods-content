import { getAuditLog, getIngredientsWithMeta, getLatestScenarios, getPriceAlerts, getRecentSnapshots, getRecipes, getSettings } from "@/server/queries";
import { summarizeRecipe, type RecipeCostBundle } from "@/server/costing-service";
import type { DashboardRecipeRow, IngredientWithMeta, PriceAlert, RecipeView, SettingsView, SnapshotRowView, AuditRowView } from "@/lib/types";
import { toDecimal } from "@/lib/format";

export interface RecipeCostRow extends DashboardRecipeRow {
  bundle: RecipeCostBundle;
}

export interface FoodCostBucket {
  key: "low" | "healthy" | "watch" | "critical";
  label: string;
  range: string;
  count: number;
  pct: number;
  tone: "emerald" | "amber" | "orange" | "rose";
}

export interface DashboardData {
  settings: SettingsView;
  ingredients: IngredientWithMeta[];
  recipes: RecipeView[];
  rows: RecipeCostRow[];
  topRows: RecipeCostRow[];
  alerts: PriceAlert[];
  snapshots: SnapshotRowView[];
  lastAudit: AuditRowView | null;
  kpi: {
    portfolioFoodCost: string;
    averageMargin: string;
    averageMarkup: string;
    activeRecipes: number;
    published: number;
    drafts: number;
    needsUpdate: number;
    risingIngredients: number;
    averagePriceIncrease: string;
    totalSkus: number;
  };
  buckets: FoodCostBucket[];
}

export async function getRecipeCostRows(): Promise<{
  settings: SettingsView;
  ingredients: IngredientWithMeta[];
  recipes: RecipeView[];
  rows: RecipeCostRow[];
}> {
  const [settings, ingredients, recipes] = await Promise.all([
    getSettings(),
    getIngredientsWithMeta(),
    getRecipes(),
  ]);

  const scenarioMap = await getLatestScenarios(recipes.map((recipe) => recipe.id));
  const rows: RecipeCostRow[] = recipes
    .filter((recipe) => !recipe.isSubrecipe && recipe.version)
    .map((recipe) => {
      const scenario = scenarioMap.get(recipe.id)?.scenario ?? null;
      const bundle = summarizeRecipe(recipe, ingredients, recipes, settings, scenario);
      return { recipe, cost: bundle.summary, bundle };
    });

  return { settings, ingredients, recipes, rows };
}

export async function getDashboardData(): Promise<DashboardData> {
  const [settings, ingredients, recipes, alerts, snapshots, audit] = await Promise.all([
    getSettings(),
    getIngredientsWithMeta(),
    getRecipes(),
    getPriceAlerts(4),
    getRecentSnapshots(4),
    getAuditLog({ limit: 1 }),
  ]);

  const scenarioMap = await getLatestScenarios(recipes.map((recipe) => recipe.id));
  const rows: RecipeCostRow[] = recipes
    .filter((recipe) => !recipe.isSubrecipe && recipe.version)
    .map((recipe) => {
      const scenario = scenarioMap.get(recipe.id)?.scenario ?? null;
      const bundle = summarizeRecipe(recipe, ingredients, recipes, settings, scenario);
      return { recipe, cost: bundle.summary, bundle };
    });

  const validRows = rows.filter((row) => !row.bundle.error);
  const avg = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const portfolioFoodCost = avg(validRows.map((row) => Number(row.cost?.foodCostPct ?? 0)));
  const averageMargin = avg(validRows.map((row) => Number(row.cost?.marginPct ?? 0)));
  const averageMarkup = avg(validRows.map((row) => Number(row.cost?.markupPct ?? 0)));

  const buckets: FoodCostBucket[] = [
    { key: "low", label: "Rendah", range: "< 20%", count: 0, pct: 0, tone: "emerald" },
    { key: "healthy", label: "Sehat & Optimal", range: "20–30%", count: 0, pct: 0, tone: "emerald" },
    { key: "watch", label: "Moderate / Perlu Cek", range: "30–35%", count: 0, pct: 0, tone: "amber" },
    { key: "critical", label: "Ambang Bahaya", range: "> 35%", count: 0, pct: 0, tone: "rose" },
  ];

  for (const row of validRows) {
    const value = Number(row.cost?.foodCostPct ?? 0);
    if (value < 20) buckets[0].count += 1;
    else if (value <= 30) buckets[1].count += 1;
    else if (value <= 35) buckets[2].count += 1;
    else buckets[3].count += 1;
  }
  const totalBuckets = buckets.reduce((sum, bucket) => sum + bucket.count, 0) || 1;
  for (const bucket of buckets) bucket.pct = Math.round((bucket.count / totalBuckets) * 100);

  const risingIngredients = ingredients.filter((ingredient) => (ingredient.changePct ?? 0) > 0);
  const averagePriceIncrease = avg(risingIngredients.map((ingredient) => ingredient.changePct ?? 0));

  const topRows = [...validRows]
    .sort((a, b) => toDecimal(b.cost?.marginPct).comparedTo(toDecimal(a.cost?.marginPct)))
    .slice(0, 5);

  return {
    settings,
    ingredients,
    recipes,
    rows,
    topRows,
    alerts,
    snapshots,
    lastAudit: audit[0] ?? null,
    kpi: {
      portfolioFoodCost: (Math.round(portfolioFoodCost * 10) / 10).toFixed(1),
      averageMargin: (Math.round(averageMargin * 10) / 10).toFixed(1),
      averageMarkup: (Math.round(averageMarkup * 10) / 10).toFixed(1),
      activeRecipes: rows.length,
      published: rows.filter((row) => row.recipe.status === "published").length,
      drafts: rows.filter((row) => row.recipe.status === "draft").length,
      needsUpdate: rows.filter((row) => Boolean(row.bundle.error)).length,
      risingIngredients: risingIngredients.length,
      averagePriceIncrease: (Math.round(averagePriceIncrease * 10) / 10).toFixed(1),
      totalSkus: ingredients.length,
    },
    buckets,
  };
}
