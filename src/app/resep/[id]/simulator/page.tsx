import { notFound } from "next/navigation";
import { getIngredients, getLatestScenarios, getRecipeById, getRecipes, getSettings, getSnapshotsForRecipe } from "@/server/queries";
import { calculateForRecipe } from "@/server/costing-service";
import { suggestSellingPrice } from "@ufc/costing";
import { MarginSimulator } from "@/components/simulator/margin-simulator";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  return { title: recipe ? `Simulator ${recipe.name}` : "HPP Engine" };
}

export default async function SimulatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) notFound();

  const [ingredients, recipes, settings, snapshots, scenarios] = await Promise.all([
    getIngredients(),
    getRecipes(),
    getSettings(),
    getSnapshotsForRecipe(id, 8),
    getLatestScenarios([id]),
  ]);

  if (!recipe.version) {
    return (
      <EmptyState
        title="Resep belum punya formula"
        description="Lengkapi formula resep terlebih dahulu untuk membuka simulator margin."
        action={<ButtonLink href={`/resep/${recipe.id}/edit`}>Edit formula</ButtonLink>}
      />
    );
  }

  let sellingPrice = scenarios.get(id)?.scenario.sellingPrice ?? "0";
  if (sellingPrice === "0") {
    try {
      const result = calculateForRecipe(recipe, ingredients, recipes, {
        priceStrategy: settings.defaultPriceStrategy,
        scaleFactor: 1,
      });
      sellingPrice = suggestSellingPrice({
        costPerUnit: result.costPerUnit,
        targetMarginPct: settings.targetMarginPct,
        roundingTo: 500,
        roundingMode: "up",
      });
    } catch {
      sellingPrice = "0";
    }
  }

  return (
    <MarginSimulator
      key={recipe.id}
      recipe={recipe}
      ingredients={ingredients}
      recipes={recipes}
      settings={settings}
      initialSellingPrice={sellingPrice}
      snapshots={snapshots}
    />
  );
}
