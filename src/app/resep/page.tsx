import { BookOpen, Calculator, FlaskConical, Layers, PlusCircle, TrendingUp } from "lucide-react";
import { getRecipeCostRows } from "@/server/dashboard-data";
import { getRecipeUsage } from "@/server/queries";
import { calculateForRecipe } from "@/server/costing-service";
import { toDecimal } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { RecipeCatalog, SubrecipeGrid, type CatalogRow } from "@/components/recipes/recipe-catalog";
import { SeedDemoButton } from "@/components/seed-demo-button";
import { EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Recipe Studio & Scaler" };

export default async function RecipesPage() {
  const { settings, ingredients, recipes, rows } = await getRecipeCostRows();
  const usage = await getRecipeUsage();

  const catalogRows: CatalogRow[] = rows.map(({ recipe, cost, bundle }) => ({
    id: recipe.id,
    code: recipe.code,
    name: recipe.name,
    category: recipe.category,
    status: recipe.status,
    versionNo: recipe.version?.versionNo ?? 0,
    versionCount: recipe.versionCount,
    yieldQty: recipe.version?.yieldQty ?? "0",
    yieldUnit: recipe.version?.yieldUnit ?? "pcs",
    hppBatch: cost?.totalCost ?? "0",
    hppUnit: cost?.costPerUnit ?? "0",
    sellingPrice: cost?.sellingPrice ?? "0",
    foodCostPct: cost?.foodCostPct ?? "0",
    marginPct: cost?.marginPct ?? "0",
    error: bundle.error,
  }));

  const averageFoodCost =
    rows.length > 0
      ? rows.reduce((sum, row) => sum + Number(row.cost?.foodCostPct ?? 0), 0) / rows.length
      : 0;
  const best = [...rows]
    .filter((row) => !row.bundle.error)
    .sort((a, b) => toDecimal(b.cost?.marginPct).comparedTo(toDecimal(a.cost?.marginPct)))[0];

  const subrecipes = recipes
    .filter((recipe) => recipe.isSubrecipe && recipe.version)
    .map((recipe) => {
      try {
        const result = calculateForRecipe(recipe, ingredients, recipes, { priceStrategy: settings.defaultPriceStrategy });
        return {
          id: recipe.id,
          name: recipe.name,
          code: recipe.code,
          category: recipe.category,
          yieldQty: recipe.version!.yieldQty,
          yieldUnit: recipe.version!.yieldUnit,
          cost: result.costPerUnit,
          usedIn: usage.get(recipe.id)?.usageCount ?? 0,
        };
      } catch {
        return {
          id: recipe.id,
          name: recipe.name,
          code: recipe.code,
          category: recipe.category,
          yieldQty: recipe.version!.yieldQty,
          yieldUnit: recipe.version!.yieldUnit,
          cost: "0",
          usedIn: usage.get(recipe.id)?.usageCount ?? 0,
        };
      }
    });

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Modul Recipe Studio · Formula &amp; Scaling v3.1
          </span>
        }
        title="Recipe Studio & Interactive Scaler"
        description="Kelola formula resep versioned, sub-resep bertingkat, yield, dan scaling produksi. HPP dihitung dari harga bahan termutakhir atau snapshot historis."
        actions={
          <>
            <ButtonLink href="/panduan#formula" variant="soft" icon={<BookOpen className="h-3.5 w-3.5" />}>
              Standar Formula
            </ButtonLink>
            <ButtonLink href="/resep/baru" variant="amber" icon={<PlusCircle className="h-3.5 w-3.5" />}>
              Resep Baru
            </ButtonLink>
          </>
        }
      />

      {rows.length === 0 ? (
        <div className="mb-3">
          <EmptyState
            icon={<FlaskConical className="h-8 w-8" />}
            title="Belum ada formula resep"
            description="Buat resep pertama dengan bahan yang sudah terdaftar, tentukan yield dan harga jual, lalu lihat HPP batch dan per unit."
            action={
              <div className="flex gap-2">
                <ButtonLink href="/resep/baru" icon={<PlusCircle className="h-3.5 w-3.5" />}>
                  Buat resep
                </ButtonLink>
                <SeedDemoButton />
              </div>
            }
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Resep Produksi"
          value={rows.length}
          valueSuffix="Formula"
          icon={<BookOpen className="h-4 w-4" />}
          footerLeft={<span>{rows.filter((row) => row.recipe.status === "published").length} published</span>}
          footerRight={<span>{rows.filter((row) => row.recipe.status === "draft").length} draft</span>}
        />
        <MetricCard
          label="Rata-rata Food Cost"
          value={`${averageFoodCost.toFixed(1)}%`}
          tone="emerald"
          icon={<Calculator className="h-4 w-4" />}
          footerLeft={<span>Target portofolio 25–30%</span>}
          footerRight={<span className="font-mono text-[9px]">latest prices</span>}
        />
        <MetricCard
          label="Margin Tertinggi"
          value={best ? `${Number(best.cost?.marginPct).toFixed(1)}%` : "—"}
          tone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
          footerLeft={<span className="truncate">{best?.recipe.name ?? "Belum ada data"}</span>}
        />
        <MetricCard
          label="Sub-resep Aktif"
          value={subrecipes.length}
          valueSuffix="Formula"
          icon={<Layers className="h-4 w-4" />}
          footerLeft={<span>DAG depth maks. 5</span>}
          footerRight={<span className="font-mono text-[9px]">cycle-safe</span>}
        />
      </div>

      <div className="mt-3">
        <RecipeCatalog rows={catalogRows} />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Sub-resep &amp; Semi-finished</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Sub-resep dapat dipakai lintas formula. Biaya sub-resep dihitung rekursif dengan memoization dan deteksi siklus.
            </p>
          </div>
          <span className="rounded-full border border-blue-line bg-blue-soft px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-blue">
            {subrecipes.reduce((sum, item) => sum + item.usedIn, 0)} referensi aktif
          </span>
        </div>
        <SubrecipeGrid items={subrecipes} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[10px] text-muted shadow-card">
        <span className="flex items-center gap-1.5">
          <FlaskConical className="h-3 w-3 text-copper" />
          Formula disimpan append-only: setiap perubahan takaran membuat versi baru dan menjaga snapshot lama.
        </span>
        <span className="font-mono uppercase tracking-[0.08em]">HPP deterministic · Pure function</span>
      </div>
    </div>
  );
}
