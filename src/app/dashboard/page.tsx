import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChefHat,
  Clock,
  FlaskConical,
  History,
  Layers,
  PlusCircle,
  Scale,
  SlidersHorizontal,
  TriangleAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getDashboardData } from "@/server/dashboard-data";
import { formatCurrency, formatUnitPrice, formatDate, formatDateTimeShort, formatNumber, formatRelative, formatSignedPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { RecipeThumb } from "@/components/recipe-bits";
import { DashboardRecipeTable, type DashboardRow } from "@/components/dashboard/recipe-table";
import { SeedDemoButton } from "@/components/seed-demo-button";
import { EmptyState } from "@/components/ui/feedback";

export const metadata = { title: "Dashboard & Overview" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 86_400_000);

  const rows: DashboardRow[] = data.topRows.map(({ recipe, cost, bundle }) => ({
    id: recipe.id,
    code: recipe.code,
    name: recipe.name,
    category: recipe.category,
    status: recipe.status,
    versionNo: recipe.version?.versionNo ?? 0,
    versionCount: recipe.versionCount,
    yieldQty: recipe.version?.yieldQty ?? "0",
    yieldUnit: recipe.version?.yieldUnit ?? "pcs",
    unitWeightG: recipe.version?.unitWeightG ?? null,
    hppBatch: cost?.totalCost ?? "0",
    hppUnit: cost?.costPerUnit ?? "0",
    sellingPrice: cost?.sellingPrice ?? "0",
    foodCostPct: cost?.foodCostPct ?? "0",
    marginPct: cost?.marginPct ?? "0",
    markupPct: cost?.markupPct ?? "0",
    error: bundle.error,
  }));

  const highlights = data.topRows.slice(0, 3);
  const totalBuckets = data.buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const hasData = data.rows.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
              F&amp;B Ops Costing Matrix
            </span>
            <span className="text-line-strong">•</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-mid/70 px-2 py-0.5 font-mono text-[9px] text-muted">
              <span className="h-1.5 w-1.5 animate-ufc-pulse rounded-full bg-emerald-bright" />
              Kalkulasi Presisi Aktif (Decimal.js / Numeric-18,6)
            </span>
          </>
        }
        title="Ringkasan Operasional & Efisiensi HPP"
        description="Pemantauan fluktuasi bahan baku komoditas, ambang food cost target F&B 25–30%, serta performa margin per batch produksi aktif."
        actions={
          <>
            <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface-low px-2.5 text-[11px] font-semibold text-ink shadow-card">
              <CalendarDays className="h-3.5 w-3.5 text-copper" />
              <span className="font-mono">{formatDate(start)} – {formatDate(now)}</span>
            </div>
            <ButtonLink href="/bahan-baku?new=1" variant="soft" icon={<PlusCircle className="h-3.5 w-3.5" />}>
              Bahan Baru
            </ButtonLink>
            <ButtonLink href="/resep/baru" variant="amber" icon={<BookOpen className="h-3.5 w-3.5" />}>
              Buat Resep Baru
            </ButtonLink>
            <ButtonLink href="/simulator" variant="primary" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
              Simulasi Harga
            </ButtonLink>
          </>
        }
      />

      {!hasData ? (
        <div className="mb-5">
          <EmptyState
            icon={<FlaskConical className="h-8 w-8" />}
            title="Workspace UFC masih kosong"
            description="Mulai dengan menambahkan bahan baku dan resep pertama, atau muat data contoh untuk melihat kalkulasi HPP lengkap sesuai acceptance reference PRD."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <ButtonLink href="/bahan-baku?new=1" icon={<PlusCircle className="h-3.5 w-3.5" />}>
                  Tambah bahan
                </ButtonLink>
                <SeedDemoButton />
              </div>
            }
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Food Cost Portofolio"
          value={`${data.kpi.portfolioFoodCost}%`}
          tone="emerald"
          icon={<TrendingDown className="h-4 w-4" />}
          footerLeft={
            <>
              <TrendingDown className="h-3 w-3 text-emerald" />
              <span className="font-semibold text-emerald">Target 25–30%</span>
              <span className="text-subtle">· portofolio aktif</span>
            </>
          }
          footerRight={
            <Badge tone={Number(data.kpi.portfolioFoodCost) <= 30 ? "emerald" : "amber"}>
              {Number(data.kpi.portfolioFoodCost) <= 30 ? "Sehat" : "Perlu cek"}
            </Badge>
          }
        />
        <MetricCard
          label="Rata-rata Gross Margin"
          value={`${data.kpi.averageMargin}%`}
          tone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
          footerLeft={
            <>
              <span>Markup average:</span>
              <span className="font-mono font-bold text-ink">{data.kpi.averageMarkup}%</span>
            </>
          }
          footerRight={<Badge tone="amber">Optimal (&gt;70%)</Badge>}
        />
        <MetricCard
          label="Total Formula Aktif"
          value={formatNumber(data.kpi.activeRecipes)}
          valueSuffix="Resep"
          icon={<ChefHat className="h-4 w-4" />}
          footerLeft={
            <>
              <span className="font-semibold text-ink">{data.kpi.published} Produksi</span>
              <span>•</span>
              <span>{data.kpi.drafts} Draft</span>
              <span>•</span>
              <span className="font-semibold text-rose">{data.kpi.needsUpdate} Butuh update</span>
            </>
          }
        />
        <MetricCard
          label="Volatilitas Komoditas"
          value={`${data.kpi.risingIngredients} Bahan`}
          valueSuffix="melonjak"
          tone="rose"
          icon={<TriangleAlert className="h-4 w-4" />}
          footerLeft={
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-rose" />
              <span>Rata-rata +{data.kpi.averagePriceIncrease}%</span>
            </>
          }
          footerRight={<Badge tone="rose">≥ 30 hari</Badge>}
        />
      </div>

      {highlights.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {highlights.map(({ recipe, cost }, index) => (
            <Link
              key={recipe.id}
              href={`/resep/${recipe.id}`}
              className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-card transition-colors hover:border-amber-line hover:bg-amber-soft/30"
            >
              <RecipeThumb category={recipe.category} className="h-[74px] w-[86px] shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.15em] text-copper">
                  {index === 0 ? "Margin Terkuat" : index === 1 ? "Efisiensi Formula" : "Highlight Produk"}
                </p>
                <h3 className="mt-0.5 truncate font-display text-[14px] font-bold text-ink group-hover:text-copper">
                  {recipe.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                  Margin {Number(cost?.marginPct).toFixed(1)}% · HPP {formatCurrency(cost?.costPerUnit)}/{recipe.version?.yieldUnit} · jual {formatCurrency(cost?.sellingPrice)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          {hasData ? (
            <DashboardRecipeTable rows={rows} />
          ) : (
            <div className="rounded-xl border border-line bg-surface p-8 text-center text-[12px] text-muted shadow-card">
              Tabel HPP akan muncul setelah resep pertama dibuat.
            </div>
          )}

          <div className="flex flex-col items-start justify-between gap-4 overflow-hidden rounded-xl bg-navy p-5 text-white shadow-card sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-amber-bright">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-[15px] font-bold">Simulasi Batch Cepat</p>
                <p className="mt-0.5 max-w-xl text-[11.5px] leading-relaxed text-slate-400">
                  Uji sensitivitas kenaikan biaya energi oven &amp; kemasan terhadap margin kotak unit. Hasil simulasi tidak mengubah snapshot resmi.
                </p>
              </div>
            </div>
            <ButtonLink href="/simulator" variant="amber" size="md" className="shrink-0" icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Buka Simulator
            </ButtonLink>
          </div>
        </div>

        <aside className="space-y-3 xl:col-span-4">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <TriangleAlert className="h-4 w-4 text-amber" />
                Dampak Fluktuasi Bahan
              </h2>
              <Badge tone="rose">{data.kpi.risingIngredients} Kenaikan</Badge>
            </div>
            <div className="space-y-2.5 p-3.5">
              {data.alerts.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-muted">Belum ada kenaikan harga terdeteksi.</p>
              ) : (
                data.alerts.slice(0, 3).map((alert) => (
                  <Link
                    key={alert.ingredientId}
                    href={`/bahan-baku?q=${encodeURIComponent(alert.name)}`}
                    className="block rounded-lg border border-line bg-surface-low/35 p-2.5 transition-colors hover:border-amber-line hover:bg-amber-soft/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-semibold text-ink">{alert.name}</p>
                        <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-subtle">
                          {alert.category} · {alert.sku}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-rose">{formatSignedPct(alert.changePct)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[9.5px] text-muted">
                      <span className="line-through">{formatUnitPrice(alert.previousPrice)}</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                      <span className="font-semibold text-ink">{formatUnitPrice(alert.latestPrice)}</span>
                      <span className="text-subtle">/ {alert.baseUnit}</span>
                    </div>
                  </Link>
                ))
              )}
              <Link
                href="/audit?entity=ingredient"
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-line bg-surface-low text-[10.5px] font-semibold text-ink-soft hover:bg-surface-mid"
              >
                <History className="h-3 w-3" /> Tinjau Riwayat Harga
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-[14px] font-bold text-ink">Distribusi Food Cost Portofolio</h2>
              <Layers className="h-4 w-4 text-muted" />
            </div>
            <div className="p-4">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-mid">
                {data.buckets.map((bucket) => (
                  <div
                    key={bucket.key}
                    className={
                      bucket.tone === "emerald"
                        ? "bg-emerald-bright"
                        : bucket.tone === "amber"
                          ? "bg-amber-bright"
                          : bucket.tone === "orange"
                            ? "bg-amber"
                            : "bg-rose"
                    }
                    style={{ width: `${(bucket.count / (totalBuckets || 1)) * 100}%` }}
                    title={`${bucket.label}: ${bucket.count}`}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">
                <span>Rendah &lt;20%</span>
                <span>Target 20–30%</span>
                <span>&gt;35% Bahaya</span>
              </div>
              <div className="mt-3 space-y-2">
                {data.buckets.map((bucket) => (
                  <div key={bucket.key} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="flex items-center gap-2 text-muted">
                      <span
                        className={
                          bucket.tone === "emerald"
                            ? "h-2 w-2 rounded-full bg-emerald-bright"
                            : bucket.tone === "amber"
                              ? "h-2 w-2 rounded-full bg-amber-bright"
                              : "h-2 w-2 rounded-full bg-rose"
                        }
                      />
                      {bucket.label} <span className="font-mono text-[9px] text-subtle">({bucket.range})</span>
                    </span>
                    <span className="font-mono text-[10.5px] font-semibold text-ink">
                      {bucket.count} Resep <span className="text-subtle">({bucket.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <FlaskConical className="h-4 w-4 text-copper" /> Snapshot Costing Terakhir
              </h2>
              <Link href="/audit" className="text-[10px] font-semibold text-copper hover:underline">
                Lihat Semua
              </Link>
            </div>
            <div className="divide-y divide-line/80">
              {data.snapshots.length === 0 ? (
                <p className="px-4 py-5 text-center text-[11px] text-muted">Belum ada snapshot HPP.</p>
              ) : (
                data.snapshots.slice(0, 3).map((snapshot, index) => (
                  <div key={snapshot.id} className="flex gap-2.5 px-4 py-3">
                    <span
                      className={
                        index === 0
                          ? "mt-1 h-2 w-2 shrink-0 rounded-full bg-amber"
                          : index === 1
                            ? "mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald"
                            : "mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400"
                      }
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-subtle">
                        {snapshot.id.slice(0, 8).toUpperCase()} · {formatRelative(snapshot.computedAt)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-ink">{snapshot.recipeName}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                        HPP {formatCurrency(snapshot.costPerUnit)}/{snapshot.yieldUnit} · {formatCurrency(snapshot.totalCost)} batch
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-line px-4 py-2 text-[9.5px] text-muted">
              <Clock className="mr-1 inline h-3 w-3" />
              Snapshot append-only menjaga audit historis tetap konsisten.
            </div>
          </div>
        </aside>
      </div>

      {data.lastAudit ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-[10.5px] text-muted shadow-card">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-bright" />
            Audit terakhir: <span className="font-medium text-ink">{data.lastAudit.summary}</span>
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em]">
            {data.lastAudit.actor} · {formatDateTimeShort(data.lastAudit.createdAt)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
