import { getAuditLog, getIngredientsWithMeta } from "@/server/queries";
import { IngredientWorkspace } from "@/components/ingredients/ingredient-workspace";

export const metadata = { title: "Bahan Baku & Inventory" };

export default async function IngredientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string }>;
}) {
  const params = await searchParams;
  const [ingredients, audit] = await Promise.all([
    getIngredientsWithMeta(),
    getAuditLog({ limit: 1, entityType: "ingredient" }),
  ]);

  return (
    <IngredientWorkspace
      key={`${params.q ?? ""}-${params.new ?? ""}`}
      ingredients={ingredients}
      lastAudit={audit[0] ?? null}
      initialQuery={params.q ?? ""}
      openNew={params.new === "1"}
    />
  );
}
