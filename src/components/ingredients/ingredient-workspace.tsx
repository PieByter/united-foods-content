"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ChevronRight,
  Circle,
  CircleCheck,
  Download,
  FileUp,
  History,
  Info,
  Pencil,
  PlusCircle,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wheat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditRowView, IngredientWithMeta } from "@/lib/types";
import {
  formatCurrency,
  formatCurrencyPrecise,
  formatDate,
  formatDateTimeShort,
  formatNumber,
  formatSignedPct,
} from "@/lib/format";
import { INGREDIENT_CATEGORIES, KITCHEN_CONVERSIONS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { AddIngredientModal, EditIngredientModal, ImportCsvModal, UpdatePriceModal } from "@/components/ingredients/ingredient-modals";

type Tab = "history" | "conversions" | "recipes";

const CATEGORY_ORDER = new Map<string, number>(INGREDIENT_CATEGORIES.map((category, index) => [category, index]));

function sortIngredients(list: IngredientWithMeta[]): IngredientWithMeta[] {
  return [...list].sort((a, b) => {
    const orderA = CATEGORY_ORDER.get(a.category) ?? 99;
    const orderB = CATEGORY_ORDER.get(b.category) ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

export function IngredientWorkspace({
  ingredients,
  lastAudit,
  initialQuery,
  openNew,
}: {
  ingredients: IngredientWithMeta[];
  lastAudit: AuditRowView | null;
  initialQuery: string;
  openNew: boolean;
}) {
  const orderedIngredients = useMemo(() => sortIngredients(ingredients), [ingredients]);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("Semua");
  const [flag, setFlag] = useState("all");
  const [purchaseUnit, setPurchaseUnit] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(() => sortIngredients(ingredients)[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>("history");
  const [addOpen, setAddOpen] = useState(openNew);
  const [importOpen, setImportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);

  const purchaseUnits = useMemo(
    () => Array.from(new Set(ingredients.map((ingredient) => ingredient.latestPrice?.purchaseUnit).filter(Boolean))) as string[],
    [ingredients],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orderedIngredients.filter((ingredient) => {
      if (needle) {
        const haystack = `${ingredient.name} ${ingredient.sku} ${ingredient.category}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (category !== "Semua" && ingredient.category !== category) return false;
      if (purchaseUnit !== "all" && ingredient.latestPrice?.purchaseUnit !== purchaseUnit) return false;
      if (flag === "conversion" && ingredient.conversions.length === 0) return false;
      if (flag === "discrete" && !ingredient.discrete) return false;
      if (flag === "rising" && !(ingredient.changePct && ingredient.changePct > 0)) return false;
      return true;
    });
  }, [orderedIngredients, query, category, purchaseUnit, flag]);

  const effectiveSelectedId =
    selectedId && filtered.some((ingredient) => ingredient.id === selectedId)
      ? selectedId
      : filtered[0]?.id ?? null;

  const selected = ingredients.find((ingredient) => ingredient.id === effectiveSelectedId) ?? null;
  const rising = ingredients.filter((ingredient) => (ingredient.changePct ?? 0) > 0);
  const avgIncrease = rising.length
    ? rising.reduce((sum, ingredient) => sum + (ingredient.changePct ?? 0), 0) / rising.length
    : 0;
  const conversionCount = ingredients.filter((ingredient) => ingredient.conversions.length > 0).length;
  const categories = ["Semua", ...Array.from(new Set(orderedIngredients.map((ingredient) => ingredient.category)))];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
              Modul Master Data · SKU-INV-MTRX v2.4
            </span>
          </>
        }
        title="Katalog Bahan Baku & Manajemen Harga Beli"
        description="Kelola harga pembelian multi-satuan, normalisasi harga base unit, konversi antar-dimensi, dan riwayat harga append-only."
        actions={
          <>
            <ButtonLink href="/audit?entity=ingredient" variant="soft" icon={<History className="h-3.5 w-3.5" />}>
              Audit Riwayat Harga
            </ButtonLink>
            <Button variant="outline" icon={<FileUp className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button variant="amber" icon={<PlusCircle className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
              Bahan Baru
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total SKU Terdaftar"
          value={ingredients.length}
          valueSuffix="Item"
          icon={<Wheat className="h-4 w-4" />}
          footerLeft={<Badge tone="emerald">100% Terpetakan</Badge>}
        />
        <MetricCard
          label="Volatilitas Harga (30 hari)"
          value={formatSignedPct(avgIncrease)}
          valueSuffix="rata-rata"
          tone="rose"
          icon={<TrendingUp className="h-4 w-4" />}
          footerLeft={<span>{rising.length} SKU harga naik</span>}
          footerRight={<Badge tone="rose">Pantau</Badge>}
        />
        <MetricCard
          label="SKU dengan Konversi Khusus"
          value={conversionCount}
          valueSuffix="SKU"
          icon={<SlidersHorizontal className="h-4 w-4" />}
          footerLeft={<span>Butir ↔ gr · sdm ↔ ml</span>}
          footerRight={<Badge tone="amber">Eksplisit</Badge>}
        />
        <MetricCard
          label="Log Audit Terakhir"
          value={lastAudit ? formatDateTimeShort(lastAudit.createdAt).split(",")[0] : "—"}
          valueSuffix={lastAudit ? formatDateTimeShort(lastAudit.createdAt).split(",")[1]?.trim() : ""}
          icon={<ShieldCheck className="h-4 w-4" />}
          footerLeft={<span className="truncate">{lastAudit?.actor ?? "Belum ada audit"}</span>}
          footerRight={<Link href="/audit" className="text-[10px] font-semibold text-copper hover:underline">Lihat</Link>}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 items-start gap-3 2xl:grid-cols-12">
        <div className="min-w-0 space-y-3 2xl:col-span-8">
          <div className="rounded-xl border border-line bg-surface p-3 shadow-card">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari bahan, kode SKU, atau kategori (mis: Tepung, Cakra, Fermipan)..."
                  className="h-9 w-full rounded-md border border-line bg-surface-low/60 pl-8 pr-3 text-[11.5px] text-ink outline-none placeholder:text-subtle focus:border-amber focus:bg-white focus:ring-2 focus:ring-amber/15"
                />
              </div>
              <select
                value={purchaseUnit}
                onChange={(event) => setPurchaseUnit(event.target.value)}
                className="h-9 rounded-md border border-line bg-white px-2.5 text-[11px] font-medium text-ink-soft outline-none focus:border-amber"
              >
                <option value="all">Satuan Pembelian: Semua</option>
                {purchaseUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    Satuan: {unit}
                  </option>
                ))}
              </select>
              <select
                value={flag}
                onChange={(event) => setFlag(event.target.value)}
                className="h-9 rounded-md border border-line bg-white px-2.5 text-[11px] font-medium text-ink-soft outline-none focus:border-amber"
              >
                <option value="all">Semua Atribut</option>
                <option value="conversion">Punya konversi</option>
                <option value="discrete">Satuan diskret</option>
                <option value="rising">Harga naik</option>
              </select>
              <ButtonLink href="/api/export/ingredients" variant="soft" size="md" icon={<Download className="h-3.5 w-3.5" />}>
                Ekspor
              </ButtonLink>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                  {item} {item === "Semua" ? `(${ingredients.length})` : `(${ingredients.filter((row) => row.category === item).length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[14px] font-bold text-ink">Tabel Normalisasi Harga Base Unit</h2>
                <Badge tone="neutral">{filtered.length} Item Terpilih</Badge>
              </div>
              <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Konversi non-linear
              </span>
            </div>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line/80 bg-surface-low/45 font-mono text-[8.5px] uppercase tracking-[0.11em] text-muted">
                    <th className="px-4 py-2 font-semibold">Bahan &amp; Kategori</th>
                    <th className="px-3 py-2 font-semibold">Satuan Beli</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga Pembelian</th>
                    <th className="px-3 py-2 font-semibold">Base Unit</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga per Base</th>
                    <th className="px-3 py-2 font-semibold">Aturan / Flag</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filtered.map((ingredient) => {
                    const active = ingredient.id === effectiveSelectedId;
                    return (
                      <tr
                        key={ingredient.id}
                        onClick={() => setSelectedId(ingredient.id)}
                        className={cn(
                          "cursor-pointer border-l-2 transition-colors",
                          active ? "border-l-amber bg-amber-soft/55" : "border-l-transparent hover:bg-surface-low/50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <span className={cn("mt-0.5 shrink-0", active ? "text-amber" : "text-subtle")}>
                              {active ? <CircleCheck className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold leading-snug text-ink">{ingredient.name}</p>
                              <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">{ingredient.sku}</p>
                              <span className="mt-1 inline-flex rounded bg-surface-mid px-1.5 py-0.5 text-[8.5px] font-semibold text-muted">
                                {ingredient.category}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {ingredient.latestPrice ? (
                            <>
                              <p className="font-mono text-[11px] font-semibold text-ink">
                                {formatNumber(ingredient.latestPrice.purchaseQty)} {ingredient.latestPrice.purchaseUnit}
                              </p>
                              <p className="font-mono text-[9px] text-subtle">Netto pembelian</p>
                            </>
                          ) : (
                            <span className="text-[10px] text-rose">Belum ada</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-mono text-[11px] text-ink-soft">{formatCurrency(ingredient.latestPrice?.price)}</p>
                          {ingredient.changePct !== null ? (
                            <p className={cn("font-mono text-[9px] font-semibold", ingredient.changePct > 0 ? "text-rose" : "text-emerald")}>
                              {formatSignedPct(ingredient.changePct)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-soft">
                            {ingredient.baseUnit}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-mono text-[11px] font-semibold text-ink">
                            {formatCurrencyPrecise(ingredient.latestPrice?.pricePerBaseUnit)}
                          </p>
                          <p className="font-mono text-[8.5px] text-subtle">/ {ingredient.baseUnit}</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ingredient.conversionSummary ? (
                              <span className="inline-flex items-center gap-1 rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[8.5px] text-ink-soft">
                                <ArrowLeftRight className="h-2.5 w-2.5 text-copper" />
                                {ingredient.conversionSummary}
                              </span>
                            ) : null}
                            {ingredient.discrete ? (
                              <span className="inline-flex items-center gap-1 rounded border border-amber-line bg-amber-soft px-1.5 py-0.5 font-mono text-[8.5px] text-copper">
                                <Scale className="h-2.5 w-2.5" /> Diskret
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded border border-line bg-surface-low px-1.5 py-0.5 font-mono text-[8.5px] text-muted">
                                Linear
                              </span>
                            )}
                            {ingredient.changePct && ingredient.changePct > 2 ? (
                              <span className="inline-flex items-center gap-1 rounded border border-rose-line bg-rose-soft px-1.5 py-0.5 font-mono text-[8.5px] text-rose">
                                <TrendingUp className="h-2.5 w-2.5" /> Naik
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ChevronRight className={cn("h-4 w-4", active ? "text-copper" : "text-subtle")} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-[12px] text-muted">
                  Tidak ada bahan yang cocok dengan filter.
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-low/35 px-4 py-2 text-[9.5px] text-muted">
              <span>
                Menampilkan {filtered.length} dari {ingredients.length} SKU Bahan Baku Terdaftar
              </span>
              <span className="font-mono uppercase tracking-[0.08em]">Presisi 6 digit · Decimal</span>
            </div>
          </div>
        </div>

        <aside className="2xl:sticky 2xl:top-[76px] 2xl:col-span-4">
          {selected ? (
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="bg-navy px-4 py-3 text-white">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-amber-bright">
                    SKU Inspector {selected.sku}
                  </span>
                  {selected.changePct !== null ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold",
                        selected.changePct > 0 ? "bg-rose/20 text-rose-line" : "bg-emerald/20 text-emerald-line",
                      )}
                    >
                      {selected.changePct > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {formatSignedPct(selected.changePct)}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 font-display text-[16px] font-bold leading-tight">{selected.name}</h2>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  {selected.category} · Base {selected.baseUnit} · {selected.baseDimension}
                </p>
              </div>

              <div className="flex border-b border-line bg-surface-low/40">
                {[
                  { key: "history" as const, label: "Riwayat Harga" },
                  { key: "conversions" as const, label: "Konversi" },
                  { key: "recipes" as const, label: `Resep (${selected.usedIn.length})` },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      "relative flex-1 px-2 py-2 text-[10.5px] font-semibold transition-colors",
                      tab === item.key ? "text-copper" : "text-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                    {tab === item.key ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-amber" /> : null}
                  </button>
                ))}
              </div>

              <div className="max-h-[440px] overflow-y-auto scrollbar-slim p-3.5">
                {tab === "history" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-muted">Audit Riwayat Harga</p>
                      <span className="font-mono text-[8px] uppercase tracking-wider text-subtle">Append-only</span>
                    </div>
                    {selected.prices.map((price, index) => (
                      <div
                        key={price.id}
                        className={cn(
                          "rounded-lg border px-2.5 py-2",
                          index === 0 ? "border-emerald-line bg-emerald-soft/60" : "border-line bg-surface-low/30",
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <p className="font-mono text-[11px] font-bold text-ink">
                            {formatCurrency(price.price)} <span className="text-[9px] font-normal text-muted">/ {formatNumber(price.purchaseQty)} {price.purchaseUnit}</span>
                          </p>
                          {index === 0 ? <Badge tone="emerald">Aktif Sekarang</Badge> : <Badge tone="neutral">Archived (v{selected.prices.length - index})</Badge>}
                        </div>
                        <p className="mt-0.5 font-mono text-[8.5px] text-muted">
                          Efektif {formatDate(price.effectiveFrom)} · {price.createdBy}
                        </p>
                        <p className="font-mono text-[8.5px] text-muted">
                          Base {formatCurrencyPrecise(price.pricePerBaseUnit)} / {selected.baseUnit}
                        </p>
                        {price.note ? <p className="mt-1 text-[9.5px] leading-relaxed text-ink-soft">{price.note}</p> : null}
                      </div>
                    ))}
                    <p className="flex items-start gap-1.5 rounded-md border border-line bg-surface-low/50 p-2 text-[9px] leading-relaxed text-muted">
                      <Info className="mt-0.5 h-3 w-3 shrink-0 text-copper" />
                      Setiap perubahan harga tersimpan secure append-only. HPP historis dipertahankan lewat snapshot.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" icon={<Pencil className="h-3 w-3" />} onClick={() => setEditOpen(true)}>
                        Edit SKU
                      </Button>
                      <Button variant="dark" size="sm" onClick={() => setPriceOpen(true)}>
                        Update Harga Beli
                      </Button>
                    </div>
                  </div>
                ) : null}

                {tab === "conversions" ? (
                  <div className="space-y-2">
                    {selected.conversions.length === 0 ? (
                      <div className="rounded-md border border-dashed border-line-strong px-3 py-6 text-center text-[10.5px] text-muted">
                        Belum ada konversi khusus. Resep hanya bisa memakai satuan {selected.baseUnit} atau dimensi yang sama.
                      </div>
                    ) : (
                      selected.conversions.map((conversion) => (
                        <div key={conversion.id} className="flex items-center justify-between rounded-md border border-line bg-surface-low/40 px-2.5 py-2">
                          <div className="flex items-center gap-2 font-mono text-[10.5px]">
                            <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-line">{conversion.fromUnit}</span>
                            <ArrowLeftRight className="h-3 w-3 text-copper" />
                            <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-line">{conversion.toUnit}</span>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-ink">{formatNumber(conversion.factor)}</span>
                        </div>
                      ))
                    )}
                    <p className="text-[9.5px] leading-relaxed text-muted">
                      Konversi dipakai saat resep menulis satuan berbeda dari base unit. Jika tidak ada jalur konversi, HPP akan gagal keras (tidak menebak).
                    </p>
                    <Button variant="outline" size="sm" className="w-full" icon={<Pencil className="h-3 w-3" />} onClick={() => setEditOpen(true)}>
                      Kelola Konversi
                    </Button>
                  </div>
                ) : null}

                {tab === "recipes" ? (
                  <div className="space-y-2">
                    {selected.usedIn.length === 0 ? (
                      <div className="rounded-md border border-dashed border-line-strong px-3 py-6 text-center text-[10.5px] text-muted">
                        Bahan ini belum dipakai pada formula resep aktif.
                      </div>
                    ) : (
                      selected.usedIn.map((recipe) => (
                        <Link
                          key={recipe.id}
                          href={`/resep/${recipe.id}`}
                          className="flex items-center justify-between rounded-md border border-line bg-surface-low/40 px-2.5 py-2 transition-colors hover:border-amber-line hover:bg-amber-soft/50"
                        >
                          <div>
                            <p className="text-[11px] font-semibold text-ink">{recipe.name}</p>
                            <p className="font-mono text-[8.5px] uppercase tracking-wider text-subtle">{recipe.code}</p>
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-subtle" />
                        </Link>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="border-t border-line bg-surface-low/40 px-3.5 py-2.5">
                <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Toleransi Baking Loss</p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
                  Catat penyusutan dusting, trimming, atau moisture evaporation lewat field Yield Loss pada versi resep. UFC tidak menebak nilai loss otomatis.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8 text-center text-[11px] text-muted">
              Pilih bahan pada tabel untuk melihat inspector.
            </div>
          )}
        </aside>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
            <Sparkles className="h-4 w-4 text-copper" />
            Standar Konversi Culinary &amp; Kitchen Scale
          </h2>
          <Badge tone="amber">Kitchen Rule 2024</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-6">
          {KITCHEN_CONVERSIONS.map((conversion) => (
            <div key={conversion.label} className="rounded-lg border border-line bg-surface-low/40 px-2.5 py-2">
              <p className="text-[9.5px] text-muted">{conversion.label}</p>
              <p className="mt-0.5 font-mono text-[13px] font-bold text-ink">{conversion.value}</p>
              <p className="mt-0.5 text-[8.5px] leading-tight text-subtle">{conversion.note}</p>
            </div>
          ))}
        </div>
      </div>

      <AddIngredientModal key={`add-${addOpen}`} open={addOpen} onClose={() => setAddOpen(false)} />
      {selected ? (
        <>
          <EditIngredientModal key={`edit-${selected.id}-${editOpen}`} open={editOpen} onClose={() => setEditOpen(false)} ingredient={selected} />
          <UpdatePriceModal key={`price-${selected.id}-${priceOpen}`} open={priceOpen} onClose={() => setPriceOpen(false)} ingredient={selected} />
        </>
      ) : null}
      <ImportCsvModal key={`import-${importOpen}`} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
