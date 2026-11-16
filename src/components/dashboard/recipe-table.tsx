"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import { RecipeStatusBadge } from "@/components/recipe-bits";

export interface DashboardRow {
  id: string;
  code: string;
  name: string;
  category: string;
  status: "draft" | "published";
  versionNo: number;
  versionCount: number;
  yieldQty: string;
  yieldUnit: string;
  unitWeightG: string | null;
  hppBatch: string;
  hppUnit: string;
  sellingPrice: string;
  foodCostPct: string;
  marginPct: string;
  markupPct: string;
  error?: string;
}

export function DashboardRecipeTable({ rows }: { rows: DashboardRow[] }) {
  const categories = useMemo(() => {
    const unique = Array.from(new Set(rows.map((row) => row.category)));
    return ["Semua Kategori", ...unique];
  }, [rows]);
  const [active, setActive] = useState("Semua Kategori");
  const filtered = active === "Semua Kategori" ? rows : rows.filter((row) => row.category === active);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[17px] font-bold tracking-[-0.015em] text-ink">Resep Unggulan &amp; HPP Terkini</h2>
            <Badge tone="neutral">5 Resep Teratas</Badge>
          </div>
          <p className="mt-0.5 text-[11.5px] text-muted">Snapshot dihitung berbasis data pengadaan bahan termutakhir.</p>
        </div>
        <Link
          href="/resep"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-copper hover:text-amber"
        >
          Lihat semua resep <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-low/35 px-4 py-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={cn(
              "rounded px-2.5 py-1 text-[10.5px] font-semibold transition-colors",
              active === category
                ? "bg-surface text-ink shadow-sm ring-1 ring-line"
                : "text-muted hover:bg-surface/70 hover:text-ink",
            )}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line/80 bg-surface-low/55 font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              <th className="px-5 py-2.5 font-semibold">Resep &amp; Formulasi</th>
              <th className="px-3 py-2.5 font-semibold">Yield Batch</th>
              <th className="px-3 py-2.5 text-right font-semibold">HPP / Batch</th>
              <th className="px-3 py-2.5 text-right font-semibold">HPP / Unit</th>
              <th className="px-3 py-2.5 text-right font-semibold">Harga Jual</th>
              <th className="px-3 py-2.5 text-right font-semibold">FC %</th>
              <th className="px-3 py-2.5 text-right font-semibold">Margin %</th>
              <th className="px-3 py-2.5 text-center font-semibold">Status</th>
              <th className="px-5 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/80">
            {filtered.map((row) => (
              <tr key={row.id} className="group transition-colors hover:bg-amber-soft/35">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-bright/20 to-amber/10 font-mono text-[9px] font-bold text-copper ring-1 ring-amber-line/60">
                      {row.code.split("-").slice(-1)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/resep/${row.id}`} className="truncate text-[12.5px] font-bold text-ink hover:text-copper">
                          {row.name}
                        </Link>
                        <span className="rounded bg-surface-mid px-1.5 py-px font-mono text-[9px] font-semibold text-muted">
                          v{row.versionNo}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-muted">{row.category}</span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-ink-soft">
                  {formatNumber(row.yieldQty)} {row.yieldUnit}
                  {row.unitWeightG ? <span className="text-subtle"> @{formatNumber(row.unitWeightG)}g</span> : null}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] text-ink-soft">
                  {row.error ? <span className="text-[10px] text-rose">—</span> : formatCurrency(row.hppBatch)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11.5px] font-semibold text-ink">
                  {row.error ? <span className="text-[10px] text-rose">Cek bahan</span> : formatCurrency(row.hppUnit)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] font-medium text-copper">
                  {formatCurrency(row.sellingPrice)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] font-semibold">
                  <span
                    className={cn(
                      Number(row.foodCostPct) > 35
                        ? "text-rose"
                        : Number(row.foodCostPct) > 30
                          ? "text-copper"
                          : "text-emerald",
                    )}
                  >
                    {Number(row.foodCostPct).toFixed(1)}%
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] font-bold text-ink">
                  {Number(row.marginPct).toFixed(1)}%
                </td>
                <td className="px-3 py-3 text-center">
                  <RecipeStatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/resep/${row.id}/simulator`}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-semibold text-muted transition-colors hover:bg-surface-low hover:text-copper"
                    >
                      Simulasi <ArrowUpRight className="h-3 w-3" />
                    </Link>
                    <span className="rounded p-1 text-subtle opacity-0 transition-opacity group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-[12px] text-muted">
                  Tidak ada resep pada kategori ini.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-low/35 px-5 py-2.5 text-[10px] text-muted">
        <span>
          HPP mencakup bahan resep dan overhead yang diisi. Yield loss dihitung terpisah pada effective yield.
        </span>
        <span className="font-mono uppercase tracking-[0.08em]">Diperbarui dinamis · WIB</span>
      </div>
    </div>
  );
}
