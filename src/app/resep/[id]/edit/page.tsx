import { notFound } from "next/navigation";
import { getIngredients, getRecipeById, getRecipes } from "@/server/queries";
import { RecipeForm } from "@/components/recipes/recipe-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipeById(id);
  return { title: recipe ? `Edit ${recipe.name}` : "Edit Resep" };
}

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, ingredients, recipes] = await Promise.all([getRecipeById(id), getIngredients(), getRecipes()]);
  if (!recipe) notFound();
  return <RecipeForm key={recipe.id} recipe={recipe} ingredients={ingredients} recipes={recipes} />;
}
