import { getIngredients, getRecipes } from "@/server/queries";
import { RecipeForm } from "@/components/recipes/recipe-form";

export const metadata = { title: "Resep Baru" };

export default async function NewRecipePage() {
  const [ingredients, recipes] = await Promise.all([getIngredients(), getRecipes()]);
  return <RecipeForm ingredients={ingredients} recipes={recipes} />;
}
