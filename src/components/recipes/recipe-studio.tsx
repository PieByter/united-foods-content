"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Flame,
  History,
  Info,
  Package,
  Pencil,
  Percent,
  Printer,
  Scale,
  Sparkles,
  TriangleAlert,
  Users,
  Wheat,
} from "lucide-react";
import Decimal from "decimal.js";
import { convertQuantity, type CostedLine } from "@ufc/costing";
import { cn } from "@/lib/utils";
import type { IngredientView, RecipeView, RecipeVersionView, SettingsView } from "@/lib/types";
import { formatCurrency, formatCurrencyPrecise, formatDate, formatNumber, normalizeDecimalInput, parseDecimalInput, toDecimal } from "@/lib/format";
import { calculateForRecipe } from "@/server/costing-service";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { RecipeStatusBadge, RecipeThumb } from "@/components/recipe-bits";

function formatFactor(value: string): string {
  try {
    const decimal = new Decimal(parseDecimalInput(value) || "1");
    return decimal.toDecimalPlaces(2).toFixed().replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  } catch {
    return "1";
  }
}

function safePositiveFactor(value: string): string {
  try {
    const decimal = new Decimal(parseDecimalInput(value) || "1");
    return decimal.gt(0) ? decimal.toFixed() : "1";
  } catch {
    return "1";
  }
}

function practicalLabel(line: CostedLine): { main: string; extra: string | null } {
  if (line.practical?.extraQty) {
    return {
      main: `${formatNumber(line.practical.qty)} ${line.practical.unit}`,
      extra: `+ ${formatNumber(line.practical.extraQty)} ${line.practical.extraUnit}`,
    };
  }
  if (line.practical) return { main: `${formatNumber(line.practical.qty)} ${line.practical.unit}`, extra: null };
  return { main: `${formatNumber(line.qty)} ${line.unit}`, extra: null };
}

function OverheadIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("kemas") || lower.includes("box") || lower.includes("pack")) return <Package className="h-4 w-4" />;
  if (lower.includes("gas") || lower.includes("oven") || lower.includes("listrik")) return <Flame className="h-4 w-4" />;
  if (lower.includes("tenaga") || lower.includes("labor")) return <Users className="h-4 w-4" />;
  if (lower.includes("%")) return <Percent className="h-4 w-4" />;
  return <Scale className="h-4 w-4" />;
}

export function RecipeStudio({
  recipe,
  ingredients,
  recipes,
  settings,
  initialSellingPrice,
  versions,
}: {
  recipe: RecipeView;
  ingredients: IngredientView[];
  recipes: RecipeView[];
  settings: SettingsView;
  initialSellingPrice: string;
  versions: RecipeVersionView[];
}) {
  const version = recipe.version!;
  const baseYield = new Decimal(version.yieldQty);
  const [factor, setFactor] = useState("1");
  const [targetYield, setTargetYield] = useState(() => normalizeDecimalInput(version.yieldQty));
  const [showPractical, setShowPractical] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const normalizedFactor = useMemo(() => safePositiveFactor(factor), [factor]);
  const targetYieldDecimal = toDecimal(parseDecimalInput(targetYield) || "0");

  const applyFactor = (value: string) => {
    setFactor(value);
    try {
      const next = baseYield.mul(new Decimal(parseDecimalInput(value) || "1"));
      setTargetYield(next.toDecimalPlaces(2).toFixed());
    } catch {
      setTargetYield(normalizeDecimalInput(version.yieldQty));
    }
  };

  const applyTarget = (value: string) => {
    setTargetYield(value);
    try {
      const target = new Decimal(parseDecimalInput(value) || "0");
      if (target.gt(0)) {
        setFactor(target.div(baseYield).toDecimalPlaces(6).toString());
      }
    } catch {
      setFactor("1");
    }
  };

  const computed = useMemo(() => {
    try {
      return {
        result: calculateForRecipe(recipe, ingredients, recipes, {
          scaleFactor: normalizedFactor,
          priceStrategy: settings.defaultPriceStrategy,
        }),
        error: null as string | null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : "Kalkulasi HPP gagal.",
      };
    }
  }, [recipe, ingredients, recipes, normalizedFactor, settings.defaultPriceStrategy]);

  const result = computed.result;
  const itemMap = useMemo(() => new Map(version.items.map((item) => [item.id, item])), [version.items]);

  const totalDough = useMemo(() => {
    if (!result) return null;
    let total = new Decimal(0);
    for (const line of result.lines) {
      if (line.type === "subrecipe") {
        try {
          total = total.plus(convertQuantity(line.qty, line.unit, "gr"));
        } catch {
          // Sub-resep dengan satuan count dilewati dari total massa.
        }
        continue;
      }
      const item = line.itemId ? itemMap.get(line.itemId) : null;
      if (!item || line.type !== "ingredient") continue;
      const ingredient = ingredients.find((entry) => entry.id === item.refId);
      if (!ingredient) continue;
      try {
        const grams = convertQuantity(
          line.qty,
          line.unit,
          "gr",
          ingredient.conversions.map((conversion) => ({
            fromUnit: conversion.fromUnit,
            toUnit: conversion.toUnit,
            factor: conversion.factor,
          })),
        );
        total = total.plus(grams);
      } catch {
        // Satuan count tanpa konversi massa tidak dijumlahkan.
      }
    }
    return total.gt(0) ? total : null;
  }, [result, ingredients, itemMap]);

  const raw = result ? new Decimal(result.rawMaterialCost) : new Decimal(0);
  const overhead = result ? new Decimal(result.overheadCost) : new Decimal(0);
  const total = result ? new Decimal(result.totalCost) : new Decimal(0);
  const rawPct = total.gt(0) ? raw.div(total).mul(100).toNumber() : 0;
  const overheadPct = total.gt(0) ? overhead.div(total).mul(100).toNumber() : 0;
  const marginPct =
    result && new Decimal(initialSellingPrice).gt(0)
      ? new Decimal(initialSellingPrice)
          .minus(result.costPerUnit)
          .div(initialSellingPrice)
          .mul(100)
          .toFixed(1)
      : null;

  const warningCount = result?.warnings.length ?? 0;

  return (
    <div>
      <div className="mb-4 rounded-xl border border-line bg-surface p-4 shadow-card lg:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-navy px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-amber-bright">
                {recipe.category}
              </span>
              <RecipeStatusBadge status={recipe.status} />
              <Badge tone="outline">v{version.versionNo} {recipe.status === "published" ? "Active Production" : "Draft Formula"}</Badge>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-subtle">{recipe.code}</span>
            </div>
            <h1 className="mt-2 font-display text-[24px] font-extrabold leading-tight tracking-[-0.025em] text-ink lg:text-[30px]">
              {recipe.name}
            </h1>
            <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">{recipe.description}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface-low px-2 py-1 font-mono text-[9.5px] text-ink-soft">
                <Scale className="h-2.5 w-2.5 text-copper" /> Base Yield: {formatNumber(version.yieldQty)} {version.yieldUnit}
                {version.unitWeightG ? ` @${formatNumber(version.unitWeightG)} gr` : ""}
              </span>
              {totalDough ? (
                <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface-low px-2 py-1 font-mono text-[9.5px] text-ink-soft">
                  <Wheat className="h-2.5 w-2.5 text-copper" /> Massa Bahan: {formatNumber(totalDough.toFixed(2))} gr
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded border border-amber-line bg-amber-soft px-2 py-1 font-mono text-[9.5px] text-copper">
                <Flame className="h-2.5 w-2.5" /> Susut Panggang: {formatNumber(version.yieldLossPct)}%
              </span>
              <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface-low px-2 py-1 font-mono text-[9.5px] text-muted">
                <History className="h-2.5 w-2.5" /> {recipe.versionCount} versi tersimpan
              </span>
            </div>
          </div>

          <div className="no-print flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              icon={<Printer className="h-3.5 w-3.5" />}
              onClick={() => window.print()}
              className="no-print"
            >
              Ekspor Lembar Kerja
            </Button>
            <ButtonLink href={`/resep/${recipe.id}/edit`} variant="soft" icon={<Pencil className="h-3.5 w-3.5" />}>
              Edit Formula v{version.versionNo + 1}
            </ButtonLink>
            <ButtonLink href={`/resep/${recipe.id}/simulator`} variant="dark" icon={<ArrowRight className="h-3.5 w-3.5" />}>
              Kirim ke Simulator HPP
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-soft text-copper">
                <Scale className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Interactive Production Scaler</h2>
                <p className="text-[10.5px] text-muted">Sesuaikan pengali batch atau target output hasil kemasan.</p>
              </div>
            </div>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-surface-low p-1">
            <button
              type="button"
              onClick={() => setShowPractical(true)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                showPractical ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              Nilai Praktis Dapur
            </button>
            <button
              type="button"
              onClick={() => setShowPractical(false)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors",
                !showPractical ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              Nilai Eksak (Laboratorium)
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div>
            <p className="mb-1.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Faktor Pengali Batch</p>
            <div className="flex flex-wrap gap-1.5">
              {["0.5", "1", "2", "3", "5", "10"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyFactor(preset)}
                  className={cn(
                    "h-8 min-w-[48px] rounded-md border px-2.5 font-mono text-[11px] font-semibold transition-colors",
                    new Decimal(normalizedFactor).eq(new Decimal(preset))
                      ? "border-amber bg-amber-soft text-copper shadow-sm"
                      : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-low",
                  )}
                >
                  x{preset}
                  {preset === "1" ? <span className="ml-1 text-[8px] text-subtle">(Original)</span> : null}
                </button>
              ))}
              <label className="flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2">
                <span className="font-mono text-[10px] text-subtle">custom ×</span>
                <input
                  value={factor}
                  onChange={(event) => applyFactor(event.target.value.replace(/[^\d.,]/g, ""))}
                  className="w-14 border-0 bg-transparent text-right font-mono text-[11px] font-semibold text-ink outline-none"
                  aria-label="Faktor kustom"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Target Jumlah Hasil</p>
            <div className="flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center overflow-hidden rounded-md border border-line-strong bg-surface">
                <button
                  type="button"
                  onClick={() => applyTarget(targetYieldDecimal.minus(1).toString())}
                  className="h-full w-9 border-r border-line bg-surface-low text-[15px] font-bold text-ink-soft hover:bg-surface-mid"
                >
                  −
                </button>
                <input
                  value={targetYield}
                  onChange={(event) => applyTarget(event.target.value.replace(/[^\d.,]/g, ""))}
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-center font-mono text-[15px] font-bold text-ink outline-none"
                  aria-label="Target hasil"
                />
                <button
                  type="button"
                  onClick={() => applyTarget(targetYieldDecimal.plus(1).toString())}
                  className="h-full w-9 border-l border-line bg-surface-low text-[15px] font-bold text-ink-soft hover:bg-surface-mid"
                >
                  +
                </button>
              </div>
              <span className="rounded-md border border-line bg-surface-low px-3 py-2 font-mono text-[11px] font-semibold uppercase text-muted">
                {version.yieldUnit}
              </span>
              <span className="hidden font-mono text-[9px] text-subtle sm:block">= x{formatFactor(normalizedFactor)}</span>
            </div>
          </div>
        </div>
      </div>

      {computed.error ? (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-rose-line bg-rose-soft p-4">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose" />
          <div>
            <p className="text-[12px] font-bold text-rose">HPP tidak dapat dihitung</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-rose/90">{computed.error}</p>
            <Link href="/bahan-baku" className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose underline">
              Periksa konversi dan harga bahan <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}

      {result && warningCount > 0 ? (
        <div className="mb-3 rounded-xl border border-amber-line bg-amber-soft p-3.5">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[12px] font-bold text-copper">Peringatan Scaling Non-Linear</p>
                <Badge tone="amber">Aturan Fisika Roti</Badge>
              </div>
              <ul className="mt-1 space-y-0.5">
                {result.warnings.map((warning) => (
                  <li key={`${warning.code}-${warning.itemId}`} className="text-[10.5px] leading-relaxed text-copper/90">
                    {warning.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[10px] leading-relaxed text-copper/80">
                Pada scaling ekstrem, takaran ragi dan garam disarankan disesuaikan bertahap (turunkan 10–15%) dan waktu fermentasi perlu dimonitor.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-3 2xl:grid-cols-12">
        <div className="min-w-0 space-y-3 2xl:col-span-8">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[15px] font-bold text-ink">Komposisi Bahan Baku (Formula Matrix)</h2>
                <Badge tone="neutral">{result?.lines.length ?? version.items.filter((item) => item.itemType !== "overhead").length} Bahan Utama</Badge>
              </div>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                Basis perhitungan: batch x{formatFactor(normalizedFactor)}
              </span>
            </div>

            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-low/45 font-mono text-[8.5px] uppercase tracking-[0.11em] text-muted">
                    <th className="px-4 py-2 font-semibold">Tipe / Nama Bahan</th>
                    <th className="px-3 py-2 text-right font-semibold">Base (x1)</th>
                    <th className="px-3 py-2 text-right font-semibold">Scaling (x{formatFactor(normalizedFactor)} Eksak)</th>
                    <th className="px-3 py-2 font-semibold">Praktis Dapur</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga Satuan</th>
                    <th className="px-4 py-2 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {(result?.lines ?? []).map((line) => {
                    const item = line.itemId ? itemMap.get(line.itemId) : null;
                    const baseQty = item ? item.qty : new Decimal(line.qty).div(normalizedFactor || "1").toFixed();
                    const practical = practicalLabel(line);
                    const hasChildren = Boolean(line.children?.length);
                    return (
                      <tr key={line.key} className={cn("align-top", line.nonLinearScaling ? "border-l-2 border-l-amber bg-amber-soft/20" : "border-l-2 border-l-transparent")}>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => setExpanded((current) => ({ ...current, [line.key]: !current[line.key] }))}
                                className="mt-0.5 rounded p-0.5 text-subtle hover:bg-surface-mid hover:text-ink"
                                aria-label="Buka rincian sub-resep"
                              >
                                {expanded[line.key] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                            ) : (
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                            )}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[12px] font-bold text-ink">{line.name}</span>
                                {line.type === "subrecipe" ? <Badge tone="blue">Sub-resep</Badge> : null}
                                {line.nonLinearScaling ? <Badge tone="amber">Non-Linear</Badge> : null}
                              </div>
                              <p className="mt-0.5 font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">{line.category ?? line.sku}</p>
                              {line.note ? <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{line.note}</p> : null}
                            </div>
                          </div>
                          {hasChildren && expanded[line.key]
                            ? line.children?.map((child) => (
                                <div key={child.key} className="ml-6 mt-1.5 flex items-center justify-between gap-2 rounded border border-line bg-surface-low/40 px-2 py-1">
                                  <span className="text-[10px] text-muted">
                                    {child.name} <span className="font-mono text-[8.5px]">· {formatNumber(child.qty)} {child.unit}</span>
                                  </span>
                                  <span className="font-mono text-[9.5px] font-semibold text-ink-soft">{formatCurrency(child.cost)}</span>
                                </div>
                              ))
                            : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[10.5px] text-ink-soft">
                          {formatNumber(baseQty)} <span className="text-[9px] text-subtle">{line.unit}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[11px] font-semibold text-ink">
                          {formatNumber(line.qty)} <span className="text-[9px] font-normal text-subtle">{line.unit}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex flex-col rounded border border-line bg-surface-low px-2 py-1 font-mono text-[9.5px] text-ink-soft">
                            <span>{practical.main}</span>
                            {practical.extra ? <span className="text-[8.5px] text-copper">{practical.extra}</span> : null}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono text-[10.5px] text-ink-soft">
                          {formatCurrencyPrecise(line.unitPrice)} <span className="text-[8.5px] text-subtle">/ {line.unit}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-[11px] font-bold text-ink">{formatCurrency(line.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-surface-low/55">
                    <td colSpan={5} className="px-4 py-2.5 text-right text-[11px] font-semibold text-ink-soft">
                      Subtotal Biaya Bahan Baku (Raw Cost x{formatFactor(normalizedFactor)})
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[13px] font-bold text-ink">{formatCurrency(result?.rawMaterialCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-[15px] font-bold text-ink">Biaya Overhead &amp; Operasional Non-Bahan</h2>
                <p className="mt-0.5 text-[10.5px] text-muted">Alokasi kemasan primer, energi pembakaran, dan biaya langsung batch.</p>
              </div>
              <Link href={`/resep/${recipe.id}/edit`} className="text-[10px] font-semibold text-copper hover:underline">
                Kelola overhead
              </Link>
            </div>
            {result && result.overheadLines.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {result.overheadLines.map((line) => (
                  <div key={line.key} className="rounded-lg border border-line bg-surface-low/40 p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-surface text-copper ring-1 ring-line">
                        <OverheadIcon name={line.name} />
                      </span>
                      <Badge tone={line.unit === "%" ? "blue" : "neutral"}>{line.unit === "%" ? "Percent" : "Per Batch"}</Badge>
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold leading-tight text-ink">{line.name}</p>
                    <p className="mt-0.5 font-mono text-[8.5px] text-subtle">
                      {line.unit === "%" ? `${line.qty}% dari bahan` : `Model alokasi: scaled ×${formatFactor(normalizedFactor)}`}
                    </p>
                    <p className="mt-1 font-mono text-[13px] font-bold text-ink">{formatCurrency(line.cost)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-line bg-amber-soft/60 px-3 py-2 text-[10.5px] leading-relaxed text-copper">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Overhead belum diisi. Margin dapat terlihat lebih tinggi dari biaya produksi sebenarnya. Tambahkan kemasan, gas/listrik, atau tenaga kerja langsung.
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
              <span className="text-[11px] font-semibold text-ink-soft">Total Beban Overhead Tambahan</span>
              <span className="font-mono text-[13px] font-bold text-ink">{formatCurrency(result?.overheadCost)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <History className="h-4 w-4 text-copper" /> Riwayat Versi Formula
              </h2>
              <Badge tone="neutral">{versions.length} versi</Badge>
            </div>
            <div className="divide-y divide-line/70">
              {versions.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-6 w-8 items-center justify-center rounded font-mono text-[9px] font-bold",
                        entry.id === version.id ? "bg-navy text-amber-bright" : "bg-surface-low text-muted",
                      )}
                    >
                      v{entry.versionNo}
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold text-ink">
                        Yield {formatNumber(entry.yieldQty)} {entry.yieldUnit}
                        {entry.unitWeightG ? ` @${formatNumber(entry.unitWeightG)} gr` : ""}
                      </p>
                      <p className="text-[9px] text-muted">{entry.notes ?? "Perubahan formula."}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-subtle">{formatDate(entry.createdAt)}</span>
                    {entry.id === version.id ? <Badge tone="emerald">Aktif</Badge> : <Badge tone="neutral">Arsip</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-3 2xl:sticky 2xl:top-[76px] 2xl:col-span-4">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between bg-surface-low/50 px-4 py-2.5">
              <h2 className="font-display text-[13.5px] font-bold text-ink">Ringkasan Validasi HPP</h2>
              {computed.error ? (
                <Badge tone="rose" dot>Error</Badge>
              ) : warningCount > 0 ? (
                <Badge tone="amber" dot>Warning</Badge>
              ) : (
                <Badge tone="emerald" dot>Tervalidasi</Badge>
              )}
            </div>
            <div className="space-y-2 p-3.5">
              <div className="rounded-lg border border-line bg-surface-low/40 p-2.5">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">1. HPP Bahan Murni (Food Cost)</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">{formatCurrency(result?.rawMaterialCost)}</span>
                  <span className="font-mono text-[9.5px] text-muted">{formatCurrency(result?.rawCostPerUnit)} / {version.yieldUnit}</span>
                </div>
              </div>
              <div className="rounded-lg border border-line bg-surface-low/40 p-2.5">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">2. Total Biaya Overhead</p>
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-ink">{formatCurrency(result?.overheadCost)}</span>
                  <span className="font-mono text-[9.5px] text-muted">
                    {formatCurrency(overhead.gt(0) ? overhead.div(result?.effectiveYieldQty ?? 1).toFixed(0) : 0)} / {version.yieldUnit}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-navy bg-navy p-3 text-white">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-slate-400">Total HPP Komprehensif</p>
                  <Badge tone="dark">Full Overhead</Badge>
                </div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="font-display text-[28px] font-extrabold leading-none tracking-[-0.04em]">{formatCurrency(result?.totalCost)}</span>
                  <span className="font-mono text-[11px] text-amber-bright">
                    {formatCurrency(result?.costPerUnit)} <span className="text-[8px] text-slate-400">/ {version.yieldUnit}</span>
                  </span>
                </div>
                {marginPct ? (
                  <p className="mt-2 border-t border-white/10 pt-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-slate-400">
                    Margin aktual vs harga jual {formatCurrency(initialSellingPrice)}: <span className="text-emerald-bright">{marginPct}%</span>
                  </p>
                ) : null}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">
                  <span>Proporsi Biaya Produksi</span>
                  <span>
                    Bahan {rawPct.toFixed(0)}% · Overhead {overheadPct.toFixed(0)}%
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-surface-mid">
                  <div className="bg-emerald-bright" style={{ width: `${rawPct}%` }} />
                  <div className="bg-amber" style={{ width: `${overheadPct}%` }} />
                </div>
                <div className="mt-1 flex items-center gap-3 font-mono text-[8.5px] text-muted">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-bright" /> Bahan</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> Overhead</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Visual Spesifikasi Produk</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="relative overflow-hidden rounded-lg">
                <RecipeThumb category={recipe.category} className="h-24 w-full" label="" imageSrc="/media/bread-loaf.jpg" />
                <div className="absolute inset-x-1.5 bottom-1.5 z-20 rounded bg-navy/75 px-1.5 py-0.5 text-[8px] text-white">Golden Crust</div>
              </div>
              <div className="relative overflow-hidden rounded-lg">
                <RecipeThumb category={recipe.category} className="h-24 w-full" label="" imageSrc="/media/bread-crumb.jpg" iconClassName="h-2/5 w-2/5" />
                <div className="absolute inset-x-1.5 bottom-1.5 z-20 rounded bg-navy/75 px-1.5 py-0.5 text-[8px] text-white">Open Crumb</div>
              </div>
            </div>
            <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
              Foto referensi kualitas crumb dan crust untuk kontrol produksi batch. Media publik fase 2 disimpan di object storage.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald" />
              <p className="text-[11px] font-bold text-ink">Kepatuhan PRD</p>
            </div>
            <ul className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-muted">
              <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" /> Normalisasi satuan ke base unit, error keras bila konversi hilang.</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" /> Scaling eksak + praktis untuk satuan diskret.</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" /> HPP batch ⊆ yield efektif setelah yield loss.</li>
              <li className="flex items-start gap-1.5"><span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" /> Snapshot append-only menjaga audit historis.</li>
            </ul>
          </div>

          <ButtonLink href={`/resep/${recipe.id}/simulator`} variant="amber" size="md" className="w-full" icon={<Sparkles className="h-3.5 w-3.5" />}>
            Lanjut ke Margin &amp; Pricing Simulator
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
