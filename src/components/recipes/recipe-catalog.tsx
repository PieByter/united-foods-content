"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Calculator, FlaskConical, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyPrecise, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { RecipeStatusBadge, RecipeThumb } from "@/components/recipe-bits";

export interface CatalogRow {
  id: string;
  code: string;
  name: string;
  category: string;
  status: "draft" | "published";
  versionNo: number;
  versionCount: number;
  yieldQty: string;
  yieldUnit: string;
  hppBatch: string;
  hppUnit: string;
  sellingPrice: string;
  foodCostPct: string;
  marginPct: string;
  error?: string;
}

export function RecipeCatalog({ rows }: { rows: CatalogRow[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(rows.map((row) => row.category)))], [rows]);
  const filtered = rows.filter((row) => {
    if (category !== "Semua" && row.category !== category) return false;
    if (query.trim()) {
      const needle = query.toLowerCase();
      return `${row.name} ${row.code} ${row.category}`.toLowerCase().includes(needle);
    }
    return true;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama resep, kode formula, kategori..."
            className="h-9 w-full rounded-md border border-line bg-surface-low/60 pl-8 pr-3 text-[11.5px] outline-none placeholder:text-subtle focus:border-amber focus:bg-white focus:ring-2 focus:ring-amber/15"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                category === item
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface-low text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-slim">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface-low/45 font-mono text-[8.5px] uppercase tracking-[0.11em] text-muted">
              <th className="px-4 py-2.5 font-semibold">Formula Resep</th>
              <th className="px-3 py-2.5 font-semibold">Kategori</th>
              <th className="px-3 py-2.5 font-semibold">Yield</th>
              <th className="px-3 py-2.5 text-right font-semibold">HPP Batch</th>
              <th className="px-3 py-2.5 text-right font-semibold">HPP Unit</th>
              <th className="px-3 py-2.5 text-right font-semibold">Harga Jual</th>
              <th className="px-3 py-2.5 text-right font-semibold">FC %</th>
              <th className="px-3 py-2.5 text-right font-semibold">Margin</th>
              <th className="px-3 py-2.5 text-center font-semibold">Status</th>
              <th className="px-4 py-2.5 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {filtered.map((row) => (
              <tr key={row.id} className="group transition-colors hover:bg-amber-soft/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <RecipeThumb category={row.category} className="h-10 w-12 shrink-0" label="" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/resep/${row.id}`} className="truncate text-[12.5px] font-bold text-ink hover:text-copper">
                          {row.name}
                        </Link>
                        <span className="rounded bg-surface-mid px-1.5 py-px font-mono text-[8.5px] text-muted">v{row.versionNo}</span>
                      </div>
                      <p className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">
                        {row.code} · {row.versionCount} versi
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Badge tone="neutral">{row.category}</Badge>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-[10.5px] text-ink-soft">
                  {formatNumber(row.yieldQty)} {row.yieldUnit}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[10.5px] text-ink-soft">
                  {row.error ? <span className="text-rose">Error</span> : formatCurrency(row.hppBatch)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] font-semibold text-ink">
                  {row.error ? <span className="text-rose">Cek bahan</span> : formatCurrency(row.hppUnit)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[10.5px] font-medium text-copper">
                  {formatCurrency(row.sellingPrice)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-[10.5px] font-semibold">
                  <span className={Number(row.foodCostPct) > 35 ? "text-rose" : Number(row.foodCostPct) > 30 ? "text-copper" : "text-emerald"}>
                    {Number(row.foodCostPct).toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-[10.5px] font-bold text-ink">{Number(row.marginPct).toFixed(1)}%</td>
                <td className="px-3 py-3 text-center">
                  <RecipeStatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/resep/${row.id}`}
                      className="rounded-md px-2 py-1 text-[10px] font-semibold text-ink-soft hover:bg-surface-mid hover:text-copper"
                    >
                      Studio
                    </Link>
                    <Link
                      href={`/resep/${row.id}/simulator`}
                      className="inline-flex items-center gap-1 rounded-md bg-surface-low px-2 py-1 text-[10px] font-semibold text-ink-soft hover:bg-amber-soft hover:text-copper"
                    >
                      <Calculator className="h-2.5 w-2.5" /> HPP
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <FlaskConical className="mb-2 h-6 w-6 text-subtle" />
            <p className="text-[12px] font-semibold text-ink">Tidak ada resep yang cocok.</p>
            <p className="mt-0.5 text-[10.5px] text-muted">Coba kata kunci atau kategori lain.</p>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-surface-low/35 px-4 py-2 text-[9.5px] text-muted">
        <span>{filtered.length} formula ditampilkan</span>
        <Link href="/resep/baru" className="inline-flex items-center gap-1 font-semibold text-copper hover:underline">
          Buat formula baru <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export function SubrecipeGrid({
  items,
}: {
  items: Array<{ id: string; name: string; code: string; category: string; yieldQty: string; yieldUnit: string; cost: string; usedIn: number }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/resep/${item.id}`}
          className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 shadow-card transition-colors hover:border-amber-line"
        >
          <RecipeThumb category="Sub-resep" className="h-12 w-14 shrink-0" label="SUB" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-ink group-hover:text-copper">{item.name}</p>
            <p className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">{item.code}</p>
            <p className="mt-0.5 text-[10px] text-muted">
              Yield {formatNumber(item.yieldQty)} {item.yieldUnit} · {formatCurrencyPrecise(item.cost)} / {item.yieldUnit}
            </p>
          </div>
          <Badge tone="blue">{item.usedIn} resep</Badge>
        </Link>
      ))}
      {items.length === 0 ? (
        <div className="col-span-full rounded-xl border border-dashed border-line-strong bg-surface px-4 py-8 text-center text-[11px] text-muted">
          Belum ada sub-resep. Buat resep dengan flag “Sub-resep” untuk memakai formula bertingkat.
        </div>
      ) : null}
    </div>
  );
}
