import Link from "next/link";
import { ArrowUpRight, Search, Wheat, ChefHat } from "lucide-react";
import { getIngredientsWithMeta, getRecipes } from "@/server/queries";
import { formatCurrencyPrecise } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Pencarian" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const [ingredients, recipes] = await Promise.all([getIngredientsWithMeta(), getRecipes()]);

  const matchedIngredients = query
    ? ingredients.filter((ingredient) =>
        `${ingredient.name} ${ingredient.sku} ${ingredient.category}`.toLowerCase().includes(query),
      )
    : [];
  const matchedRecipes = query
    ? recipes.filter((recipe) => `${recipe.name} ${recipe.code} ${recipe.category} ${recipe.slug}`.toLowerCase().includes(query))
    : [];

  const total = matchedIngredients.length + matchedRecipes.length;

  return (
    <div>
      <PageHeader
        eyebrow={<span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">Global Search · SKU &amp; Formula</span>}
        title={query ? `Hasil pencarian “${q}”` : "Pencarian Workspace"}
        description="Cari bahan baku berdasarkan nama/SKU atau formula resep berdasarkan nama/kode."
        actions={
          <form action="/cari" className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Cari bahan / resep..."
              className="h-9 w-64 rounded-lg border border-line bg-surface pl-8 pr-3 text-[11.5px] outline-none focus:border-amber focus:ring-2 focus:ring-amber/15"
            />
          </form>
        }
      />

      {!query ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title="Mulai mengetik kata kunci"
          description="Contoh: “tepung”, “FLR-001”, “croissant”, atau “REC-2026”."
        />
      ) : total === 0 ? (
        <EmptyState
          icon={<Search className="h-7 w-7" />}
          title="Tidak ada hasil"
          description={`Tidak ditemukan bahan atau resep yang cocok dengan “${q}”.`}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-2.5">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <Wheat className="h-4 w-4 text-copper" /> Bahan Baku
              </h2>
              <Badge tone="neutral">{matchedIngredients.length}</Badge>
            </div>
            <div className="divide-y divide-line/70">
              {matchedIngredients.map((ingredient) => (
                <Link
                  key={ingredient.id}
                  href={`/bahan-baku?q=${encodeURIComponent(ingredient.name)}`}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-amber-soft/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold text-ink">{ingredient.name}</p>
                    <p className="font-mono text-[8.5px] uppercase tracking-wider text-subtle">
                      {ingredient.sku} · {ingredient.category}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[10px] font-semibold text-ink">
                      {formatCurrencyPrecise(ingredient.latestPrice?.pricePerBaseUnit)} / {ingredient.baseUnit}
                    </p>
                    <p className="font-mono text-[8px] text-subtle">{ingredient.latestPrice?.purchaseUnit ?? "—"}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle" />
                </Link>
              ))}
              {matchedIngredients.length === 0 ? <p className="px-4 py-6 text-center text-[10.5px] text-muted">Tidak ada bahan yang cocok.</p> : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-2.5">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <ChefHat className="h-4 w-4 text-copper" /> Formula Resep
              </h2>
              <Badge tone="neutral">{matchedRecipes.length}</Badge>
            </div>
            <div className="divide-y divide-line/70">
              {matchedRecipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/resep/${recipe.id}`}
                  className="flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-amber-soft/30"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold text-ink">{recipe.name}</p>
                    <p className="font-mono text-[8.5px] uppercase tracking-wider text-subtle">
                      {recipe.code} · {recipe.category}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {recipe.isSubrecipe ? <Badge tone="blue">Sub-resep</Badge> : null}
                    <Badge tone={recipe.status === "published" ? "emerald" : "amber"}>{recipe.status}</Badge>
                    <span className="font-mono text-[8.5px] text-muted">v{recipe.version?.versionNo ?? 0}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-subtle" />
                </Link>
              ))}
              {matchedRecipes.length === 0 ? <p className="px-4 py-6 text-center text-[10.5px] text-muted">Tidak ada resep yang cocok.</p> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
