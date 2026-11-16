import { notFound } from "next/navigation";
import { getIngredients, getLatestScenarios, getRecipeById, getRecipeVersions, getRecipes, getSettings } from "@/server/queries";
import { calculateForRecipe } from "@/server/costing-service";
import { suggestSellingPrice } from "@ufc/costing";
import { RecipeStudio } from "@/components/recipes/recipe-studio";
import { EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  return { title: recipe ? `${recipe.name} · Recipe Studio` : "Recipe Studio" };
}

export default async function RecipeStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  if (!recipe) notFound();

  const [ingredients, recipes, settings, versions, scenarios] = await Promise.all([
    getIngredients(),
    getRecipes(),
    getSettings(),
    getRecipeVersions(id),
    getLatestScenarios([id]),
  ]);

  if (!recipe.version) {
    return (
      <EmptyState
        title="Resep belum memiliki versi formula"
        description="Tambahkan bahan dan simpan formula pertama untuk mulai menghitung HPP."
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
      });
    } catch {
      sellingPrice = "0";
    }
  }

  return (
    <RecipeStudio
      key={recipe.id}
      recipe={recipe}
      ingredients={ingredients}
      recipes={recipes}
      settings={settings}
      initialSellingPrice={sellingPrice}
      versions={versions}
    />
  );
}
