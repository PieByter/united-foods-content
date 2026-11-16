import Link from "next/link";
import { ArrowUpRight, Calculator, Clock, FlaskConical, Layers, SlidersHorizontal, Target, TrendingUp } from "lucide-react";
import { getRecipeCostRows } from "@/server/dashboard-data";
import { getRecentSnapshots } from "@/server/queries";
import { formatCurrency, formatDateTimeShort, formatPct } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "HPP Engine & Margin Simulator" };

export default async function SimulatorOverviewPage() {
  const [{ rows }, snapshots] = await Promise.all([getRecipeCostRows(), getRecentSnapshots(8)]);
  const valid = rows.filter((row) => !row.bundle.error);
  const avgFoodCost = valid.length
    ? valid.reduce((sum, row) => sum + Number(row.cost?.foodCostPct ?? 0), 0) / valid.length
    : 0;
  const avgMargin = valid.length
    ? valid.reduce((sum, row) => sum + Number(row.cost?.marginPct ?? 0), 0) / valid.length
    : 0;
  const best = [...valid].sort((a, b) => Number(b.cost?.marginPct ?? 0) - Number(a.cost?.marginPct ?? 0))[0];

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Modul HPP Engine · Margin &amp; Pricing v5.4
          </span>
        }
        title="HPP Engine & Margin Simulator"
        description="Pilih resep untuk mensimulasikan batch, strategi harga bahan, target margin, price shock, dan menyimpan snapshot HPP resmi yang append-only."
        actions={
          rows[0] ? (
            <ButtonLink href={`/resep/${rows[0].recipe.id}/simulator`} variant="amber" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
              Buka Simulator Resep
            </ButtonLink>
          ) : (
            <ButtonLink href="/resep/baru" variant="amber">
              Buat Resep
            </ButtonLink>
          )
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Food Cost Portofolio"
          value={`${avgFoodCost.toFixed(1)}%`}
          tone="emerald"
          icon={<Target className="h-4 w-4" />}
          footerLeft={<span>Target 25–30%</span>}
          footerRight={<Badge tone={avgFoodCost <= 30 ? "emerald" : "amber"}>{avgFoodCost <= 30 ? "Sehat" : "Cek"}</Badge>}
        />
        <MetricCard
          label="Rata-rata Gross Margin"
          value={`${avgMargin.toFixed(1)}%`}
          tone="amber"
          icon={<TrendingUp className="h-4 w-4" />}
          footerLeft={<span>{valid.length} resep terhitung</span>}
        />
        <MetricCard
          label="Margin Tertinggi"
          value={best ? `${Number(best.cost?.marginPct).toFixed(1)}%` : "—"}
          icon={<FlaskConical className="h-4 w-4" />}
          footerLeft={<span className="truncate">{best?.recipe.name ?? "—"}</span>}
        />
        <MetricCard
          label="Snapshot Tersimpan"
          value={snapshots.length}
          valueSuffix="Record"
          icon={<Layers className="h-4 w-4" />}
          footerLeft={<span>Append-only audit</span>}
          footerRight={<Link href="/audit?entity=costing_snapshot" className="text-[10px] font-semibold text-copper hover:underline">Audit</Link>}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Pilih Resep untuk Simulasi</h2>
                <p className="mt-0.5 text-[10.5px] text-muted">Semua perhitungan memakai harga bahan termutakhir dan snapshot append-only.</p>
              </div>
              <Badge tone="neutral">{rows.length} formula produksi</Badge>
            </div>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-low/45 font-mono text-[8.5px] uppercase tracking-[0.11em] text-muted">
                    <th className="px-4 py-2 font-semibold">Resep</th>
                    <th className="px-3 py-2 text-right font-semibold">HPP / Unit</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga Jual</th>
                    <th className="px-3 py-2 text-right font-semibold">FC %</th>
                    <th className="px-3 py-2 text-right font-semibold">Margin</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                    <th className="px-4 py-2 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {rows.map(({ recipe, cost, bundle }) => (
                    <tr key={recipe.id} className="transition-colors hover:bg-amber-soft/30">
                      <td className="px-4 py-2.5">
                        <p className="text-[11.5px] font-bold text-ink">{recipe.name}</p>
                        <p className="font-mono text-[8px] uppercase tracking-wider text-subtle">
                          {recipe.code} · {recipe.category}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10.5px] font-semibold text-ink">
                        {bundle.error ? <span className="text-rose">Error</span> : formatCurrency(cost?.costPerUnit)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10.5px] text-copper">{formatCurrency(cost?.sellingPrice)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10.5px] font-semibold">
                        <span className={Number(cost?.foodCostPct) > 35 ? "text-rose" : Number(cost?.foodCostPct) > 30 ? "text-copper" : "text-emerald"}>
                          {formatPct(cost?.foodCostPct, 1)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10.5px] font-bold text-ink">{formatPct(cost?.marginPct, 1)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge tone={bundle.error ? "rose" : "emerald"}>{bundle.error ? "Cek" : "Siap"}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/resep/${recipe.id}/simulator`}
                          className="inline-flex items-center gap-1 rounded bg-surface-low px-2 py-1 text-[10px] font-semibold text-ink-soft hover:bg-amber-soft hover:text-copper"
                        >
                          Simulasi <ArrowUpRight className="h-2.5 w-2.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <Clock className="h-4 w-4 text-copper" /> Snapshot HPP Terakhir
              </h2>
              <Link href="/audit?entity=costing_snapshot" className="text-[10px] font-semibold text-copper hover:underline">
                Lihat audit
              </Link>
            </div>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[780px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-low/35 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                    <th className="px-4 py-2 font-semibold">Snapshot</th>
                    <th className="px-3 py-2 font-semibold">Resep</th>
                    <th className="px-3 py-2 text-right font-semibold">HPP / Unit</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga Jual</th>
                    <th className="px-3 py-2 text-right font-semibold">Margin</th>
                    <th className="px-4 py-2 text-right font-semibold">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {snapshots.map((snapshot) => (
                    <tr key={snapshot.id}>
                      <td className="px-4 py-2.5 font-mono text-[9px] text-muted">{snapshot.label ?? snapshot.id.slice(0, 8)}</td>
                      <td className="px-3 py-2.5 text-[10.5px] font-semibold text-ink">{snapshot.recipeName}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-ink-soft">{formatCurrency(snapshot.costPerUnit)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] text-copper">{formatCurrency(snapshot.sellingPrice)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-[10px] font-semibold text-ink">{formatPct(snapshot.marginPct, 1)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[8.5px] text-subtle">{formatDateTimeShort(snapshot.computedAt)}</td>
                    </tr>
                  ))}
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[11px] text-muted">
                        Belum ada snapshot. Buka simulator resep untuk menyimpan snapshot resmi.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-3 xl:col-span-4">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
              <Calculator className="h-4 w-4 text-copper" /> Strategi Valuasi Harga
            </h2>
            <div className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-muted">
              <p><span className="font-semibold text-ink">Latest:</span> harga terakhir aktif. Default fase 1, paling sederhana.</p>
              <p><span className="font-semibold text-ink">Average:</span> rata-rata berbobot seluruh pembelian sampai tanggal kalkulasi.</p>
              <p><span className="font-semibold text-ink">Snapshot:</span> harga pada tanggal historis untuk laporan dan audit.</p>
            </div>
            <div className="mt-3 rounded-md border border-amber-line bg-amber-soft px-2.5 py-2 text-[9.5px] leading-relaxed text-copper">
              Setiap hasil kalkulasi yang disimpan membekukan versi resep, strategi harga, dan waktu komputasi.
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="font-display text-[14px] font-bold text-ink">Contoh Acceptance PRD</h2>
            <div className="mt-2 rounded-lg border border-line bg-surface-low/40 p-3">
              <p className="text-[10.5px] font-semibold text-ink">Roti Pemula — batch 5 roti</p>
              <dl className="mt-1.5 space-y-1 font-mono text-[9.5px]">
                <div className="flex justify-between"><dt className="text-muted">HPP batch</dt><dd className="font-bold text-ink">Rp13.000</dd></div>
                <div className="flex justify-between"><dt className="text-muted">HPP / roti</dt><dd className="font-bold text-ink">Rp2.600</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Harga jual</dt><dd className="font-bold text-ink">Rp10.000</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Margin</dt><dd className="font-bold text-emerald">74%</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Markup</dt><dd className="font-bold text-ink">284,6%</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Food cost</dt><dd className="font-bold text-ink">26%</dd></div>
              </dl>
            </div>
            <Link href="/panduan#acceptance" className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-copper hover:underline">
              Buka referensi perhitungan <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 text-[9.5px] leading-relaxed text-muted shadow-card">
            <p className="text-[11px] font-bold text-ink">Catatan implementasi</p>
            <p className="mt-1">
              HPP dihitung sebagai pure function di paket <span className="font-mono">@ufc/costing</span>. Server actions hanya memvalidasi input dan menyimpan snapshot; UI memakai fungsi yang sama untuk preview.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
