"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CircleAlert,
  Clock,
  FlaskConical,
  Info,
  Lock,
  RotateCcw,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  computeBreakEven,
  computePricingMetrics,
  suggestSellingPrice,
  type PriceStrategy,
} from "@ufc/costing";
import type { IngredientView, RecipeView, SettingsView, SnapshotRowView } from "@/lib/types";
import { calculateForRecipe } from "@/server/costing-service";
import { saveSnapshotAction } from "@/server/actions/recipes";
import type { ActionState } from "@/server/actions/shared";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyPrecise, formatDate, formatNumber, formatPct, formatRelative, normalizeDecimalInput, parseDecimalInput, todayInputWIB } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { RecipeStatusBadge } from "@/components/recipe-bits";
import { ErrorNote } from "@/components/ui/feedback";

const initialState: ActionState = {};

type Overrides = Record<string, number>;

function todayInput(): string {
  return todayInputWIB();
}

export function MarginSimulator({
  recipe,
  ingredients,
  recipes,
  settings,
  initialSellingPrice,
  snapshots,
}: {
  recipe: RecipeView;
  ingredients: IngredientView[];
  recipes: RecipeView[];
  settings: SettingsView;
  initialSellingPrice: string;
  snapshots: SnapshotRowView[];
}) {
  const version = recipe.version!;
  const router = useRouter();
  const [strategy, setStrategy] = useState<PriceStrategy>(settings.defaultPriceStrategy);
  const [asOf, setAsOf] = useState(todayInput());
  const [factor, setFactor] = useState("1");
  const [sellingPrice, setSellingPrice] = useState(() => normalizeDecimalInput(initialSellingPrice, ""));
  const [targetMargin, setTargetMargin] = useState(() => normalizeDecimalInput(settings.targetMarginPct, "70"));
  const [roundingTo, setRoundingTo] = useState("500");
  const [overrides, setOverrides] = useState<Overrides>({});
  const [state, action, pending] = useActionState(saveSnapshotAction, initialState);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (state.ok === false && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const priceOverrides = useMemo(() => {
    const entries = Object.entries(overrides).filter(([, value]) => Math.abs(value) > 0.0001);
    if (entries.length === 0) return undefined;
    return Object.fromEntries(entries.map(([id, value]) => [id, { mode: "percent" as const, value }]));
  }, [overrides]);

  const normalizedFactor = useMemo(() => {
    try {
      const decimal = new Decimal(parseDecimalInput(factor) || "1");
      return decimal.gt(0) ? decimal.toFixed() : "1";
    } catch {
      return "1";
    }
  }, [factor]);

  const normalizedSellingPrice = useMemo(() => {
    try {
      const decimal = new Decimal(parseDecimalInput(sellingPrice) || "0");
      return decimal.gte(0) ? decimal.toFixed() : "0";
    } catch {
      return "0";
    }
  }, [sellingPrice]);

  const computation = useMemo(() => {
    try {
      const baseline = calculateForRecipe(recipe, ingredients, recipes, {
        priceStrategy: strategy,
        scaleFactor: normalizedFactor,
        asOf: strategy !== "latest" ? `${asOf}T23:59:59+07:00` : undefined,
      });
      const result =
        priceOverrides === undefined
          ? baseline
          : calculateForRecipe(recipe, ingredients, recipes, {
              priceStrategy: strategy,
              scaleFactor: normalizedFactor,
              asOf: strategy !== "latest" ? `${asOf}T23:59:59+07:00` : undefined,
              priceOverrides,
            });
      return { baseline, result, error: null as string | null };
    } catch (error) {
      return {
        baseline: null,
        result: null,
        error: error instanceof Error ? error.message : "Simulasi gagal dihitung.",
      };
    }
  }, [recipe, ingredients, recipes, strategy, asOf, normalizedFactor, priceOverrides]);

  const result = computation.result;
  const baseline = computation.baseline;
  const metrics = result
    ? computePricingMetrics({ costPerUnit: result.costPerUnit, sellingPrice: normalizedSellingPrice })
    : null;
  const recommended = result
    ? (() => {
        try {
          return suggestSellingPrice({
            costPerUnit: result.costPerUnit,
            targetMarginPct: targetMargin,
            roundingTo: roundingTo === "0" ? null : roundingTo,
            roundingMode: "up",
          });
        } catch {
          return null;
        }
      })()
    : null;
  const suggestedFoodCost = result
    ? (() => {
        try {
          return suggestSellingPrice({
            costPerUnit: result.costPerUnit,
            targetFoodCostPct: settings.targetFoodCostPct,
            roundingTo: roundingTo === "0" ? null : roundingTo,
            roundingMode: "up",
          });
        } catch {
          return null;
        }
      })()
    : null;
  const bep = result
    ? computeBreakEven({
        overheadCost: result.overheadCost,
        rawCostPerUnit: result.rawCostPerUnit,
        sellingPrice: normalizedSellingPrice,
      })
    : null;

  const contributors = useMemo(() => {
    if (!result) return [] as Array<{ id: string; name: string; cost: Decimal; pct: number; category: string }>;
    const map = new Map<string, { name: string; cost: Decimal; category: string }>();
    const add = (name: string, cost: string) => {
      const ingredient = ingredients.find((entry) => entry.name === name);
      if (!ingredient) return;
      const existing = map.get(ingredient.id);
      map.set(ingredient.id, {
        name: ingredient.name,
        category: ingredient.category,
        cost: (existing?.cost ?? new Decimal(0)).plus(cost),
      });
    };
    const walk = (lines: typeof result.lines) => {
      for (const line of lines) {
        if (line.type === "ingredient") add(line.name, line.cost);
        if (line.children) walk(line.children);
      }
    };
    walk(result.lines);
    const total = new Decimal(result.totalCost);
    return [...map.entries()]
      .map(([id, value]) => ({
        id,
        name: value.name,
        category: value.category,
        cost: value.cost,
        pct: total.gt(0) ? value.cost.div(total).mul(100).toNumber() : 0,
      }))
      .sort((a, b) => b.cost.comparedTo(a.cost))
      .slice(0, 4);
  }, [result, ingredients]);

  const impact = result && baseline ? new Decimal(result.costPerUnit).minus(baseline.costPerUnit) : new Decimal(0);
  const hasOverrides = Object.values(overrides).some((value) => Math.abs(value) > 0.0001);

  const setOverride = (id: string, value: number) => {
    setOverrides((current) => ({ ...current, [id]: value }));
  };

  const presetShock = (keyword: string, value: number) => {
    const ingredient = ingredients.find((entry) => entry.name.toLowerCase().includes(keyword));
    if (ingredient) setOverride(ingredient.id, value);
  };

  const applyRecommended = () => {
    if (recommended) setSellingPrice(recommended);
  };

  const activeFactorLabel = new Decimal(normalizedFactor).toDecimalPlaces(2).toString();
  const healthy = metrics ? Number(metrics.foodCostPct) <= Number(settings.targetFoodCostPct) : false;

  return (
    <div>
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
              HPP Engine · Balance Core F&amp;B Costing v5.4
            </span>
            <span className="text-line-strong">•</span>
            <RecipeStatusBadge status={recipe.status} />
            <Badge tone="outline">v{version.versionNo}</Badge>
          </div>
          <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-ink lg:text-[32px]">
            HPP Engine &amp; Margin Simulator
          </h1>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-muted">
            Simulasi harga pokok produksi per batch/unit, kalkulasi margin, markup, food cost ratio, break-even point, dan analisis sensitivitas harga bahan secara real-time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 shadow-card">
            <FlaskConical className="h-4 w-4 text-copper" />
            <div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-subtle">Resep aktif</p>
              <p className="max-w-[210px] truncate text-[11.5px] font-bold text-ink">{recipe.name}</p>
            </div>
          </div>
          <ButtonLink href={`/resep/${recipe.id}`} variant="soft" icon={<Scale className="h-3.5 w-3.5" />}>
            Studio &amp; Scaler
          </ButtonLink>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-line bg-surface p-3 shadow-card">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Strategi Valuasi Bahan</span>
            {[
              { key: "latest" as const, label: "Terakhir (Latest)", note: "Harga aktif" },
              { key: "average" as const, label: "Rata-rata", note: "Weighted avg" },
              { key: "snapshot" as const, label: "Snapshot Historis", note: "As-of date" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStrategy(option.key)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-left transition-colors",
                  strategy === option.key
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-surface-low",
                )}
              >
                <span className="block text-[10.5px] font-semibold">{option.label}</span>
                <span className={cn("block font-mono text-[8px] uppercase tracking-wider", strategy === option.key ? "text-slate-400" : "text-subtle")}>
                  {option.note}
                </span>
              </button>
            ))}
            {strategy === "snapshot" ? (
              <input
                type="date"
                value={asOf}
                onChange={(event) => setAsOf(event.target.value)}
                className="h-8 rounded-md border border-line bg-surface px-2 font-mono text-[10px] text-ink outline-none focus:border-amber"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
            <span className="rounded border border-line bg-surface-low px-2 py-1">Formula: Acceptance Ref §6</span>
            <span className="rounded border border-line bg-surface-low px-2 py-1">HPP deterministic · decimal</span>
            <span className="rounded border border-line bg-surface-low px-2 py-1">Batch x{activeFactorLabel}</span>
          </div>
        </div>
      </div>

      {computation.error ? (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-line bg-rose-soft p-3.5">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose" />
          <div>
            <p className="text-[12px] font-bold text-rose">Mesin HPP gagal menghitung</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-rose/90">{computation.error}</p>
          </div>
        </div>
      ) : null}
      {state.ok === false && state.message ? <ErrorNote className="mb-3">{state.message}</ErrorNote> : null}

      <div className="grid grid-cols-1 items-start gap-3 2xl:grid-cols-12">
        <div className="min-w-0 space-y-3 2xl:col-span-8">
          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                  <Calculator className="h-4 w-4 text-copper" /> Matriks Finansial &amp; Parameter Penjualan Utama
                </h2>
                <p className="mt-0.5 text-[10.5px] text-muted">Kalkulasi presisi berdasarkan harga bahan &amp; basis kalkulasi batch.</p>
              </div>
              <Badge tone={healthy ? "emerald" : Number(metrics?.foodCostPct ?? 0) > 35 ? "rose" : "amber"} dot>
                Food Cost {metrics?.foodCostPct ?? "—"}% (Target {settings.targetFoodCostPct}%)
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <MetricBox
                label="HPP / Unit"
                value={formatCurrency(result?.costPerUnit)}
                note={`Total batch ${formatCurrency(result?.totalCost)}`}
                icon={<Calculator className="h-3.5 w-3.5" />}
              />
              <div className="rounded-lg border border-amber-line bg-amber-soft/40 p-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted">Harga Jual / Unit</p>
                  <Badge tone="amber">Input aktif</Badge>
                </div>
                <input
                  value={sellingPrice}
                  onChange={(event) => setSellingPrice(event.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  placeholder="10000"
                  className="mt-1 w-full border-0 bg-transparent font-display text-[25px] font-extrabold tracking-[-0.03em] text-ink outline-none placeholder:text-subtle [font-variant-numeric:tabular-nums]"
                  aria-label="Harga jual per unit"
                />
                <p className="font-mono text-[8.5px] text-copper">Rp {formatNumber(normalizedSellingPrice)} / {version.yieldUnit}</p>
              </div>
              <MetricBox
                label="Laba / Unit"
                value={formatCurrency(metrics?.profitPerUnit)}
                note={`Total laba ${formatCurrency(new Decimal(metrics?.profitPerUnit ?? 0).mul(result?.effectiveYieldQty ?? 0).toFixed(0))}`}
                tone={Number(metrics?.profitPerUnit ?? 0) < 0 ? "rose" : "emerald"}
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <MetricBox
                label="Gross Margin"
                value={formatPct(metrics?.marginPct, 1)}
                note={healthy ? "Target food cost tercapai" : "Target food cost belum tercapai"}
                tone={healthy ? "emerald" : "amber"}
                icon={<Target className="h-3.5 w-3.5" />}
                footer={healthy ? "Super Healthy" : undefined}
              />
              <MetricBox label="Markup Basic" value={formatPct(metrics?.markupPct, 1)} note="Formula: (Harga - HPP) / HPP" />
              <MetricBox label="Food Cost Ratio" value={formatPct(metrics?.foodCostPct, 1)} note={`Ideal ${settings.targetFoodCostPct}% · target margin`} />
              <MetricBox label="Price-to-Cost Ratio" value={formatPct(metrics?.priceToCostPct, 1)} note="Harga jual / HPP" />
              <MetricBox
                label="Break-Even Point"
                value={`${formatNumber(bep?.units ?? "0")} unit`}
                note={bep?.note ?? "Butuh overhead tetap"}
                icon={<Zap className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-low/40 px-2.5 py-1.5">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">Faktor Batch</span>
              {["0.5", "1", "2", "5", "10"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFactor(preset)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-[9px] font-semibold",
                    new Decimal(normalizedFactor).eq(new Decimal(preset))
                      ? "border-amber bg-amber-soft text-copper"
                      : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  x{preset}
                </button>
              ))}
              <input
                value={factor}
                onChange={(event) => setFactor(event.target.value.replace(/[^\d.,]/g, ""))}
                className="h-6 w-14 rounded border border-line bg-surface px-1.5 text-right font-mono text-[9px] text-ink outline-none focus:border-amber"
                aria-label="Faktor batch"
              />
              <span className="ml-auto font-mono text-[8.5px] text-subtle">
                Yield efektif {formatNumber(result?.effectiveYieldQty)} {version.yieldUnit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                  <Target className="h-4 w-4 text-copper" /> Target Margin &amp; Reverse Pricing
                </h2>
                <Badge tone="neutral">Reverse calc</Badge>
              </div>
              <p className="mt-0.5 text-[10px] text-muted">Tentukan margin target, engine menghitung harga jual optimal.</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Target gross margin</span>
                <span className="font-mono text-[16px] font-bold text-copper">{formatNumber(targetMargin, 2)}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="90"
                step="1"
                value={targetMargin}
                onChange={(event) => setTargetMargin(event.target.value)}
                className="mt-1.5 w-full accent-amber"
              />
              <div className="mt-3 rounded-lg border border-line bg-surface-low/40 p-2.5">
                <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">Harga jual teoretis (tanpa pembulatan)</p>
                <p className="mt-0.5 font-display text-[20px] font-extrabold tracking-[-0.03em] text-ink">
                  {recommended ? formatCurrency(new Decimal(recommended).toNumber()) : "—"}
                </p>
                <p className="font-mono text-[8.5px] text-subtle">Formula: HPP / (1 - target margin)</p>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">Pembulatan</span>
                {["0", "500", "1000"].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setRoundingTo(step)}
                    className={cn(
                      "rounded border px-2 py-0.5 font-mono text-[9px] font-semibold",
                      roundingTo === step ? "border-amber bg-amber-soft text-copper" : "border-line bg-surface text-muted",
                    )}
                  >
                    {step === "0" ? "Tanpa" : `Rp${step}`}
                  </button>
                ))}
              </div>
              {recommended ? (
                <button
                  type="button"
                  onClick={applyRecommended}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-amber px-3 py-2 text-[10.5px] font-semibold text-white hover:bg-copper"
                >
                  Terapkan {formatCurrency(recommended)} ke harga aktif <ArrowRight className="h-3 w-3" />
                </button>
              ) : null}
              {suggestedFoodCost ? (
                <p className="mt-1.5 font-mono text-[8.5px] text-muted">
                  Saran food cost {settings.targetFoodCostPct}%: <span className="font-semibold text-ink">{formatCurrency(suggestedFoodCost)}</span>
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                  <Scale className="h-4 w-4 text-copper" /> Break-Even Point Batch
                </h2>
                <Badge tone="neutral">BEP</Badge>
              </div>
              <p className="mt-0.5 text-[10px] text-muted">Unit minimum untuk menutup overhead tetap batch.</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-display text-[34px] font-extrabold leading-none tracking-[-0.04em] text-ink">{formatNumber(bep?.units ?? "0")}</span>
                <span className="pb-1 text-[11px] font-semibold text-muted">Unit {version.yieldUnit}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-mid">
                <div
                  className="h-full rounded-full bg-amber"
                  style={{
                    width: `${Math.min(100, result ? (Number(bep?.units ?? 0) / Number(result.effectiveYieldQty || 1)) * 100 : 0)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-muted">{bep?.note}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded border border-line bg-surface-low/40 px-2 py-1.5">
                  <p className="font-mono text-[8px] uppercase text-subtle">Revenue BEP</p>
                  <p className="font-mono text-[11px] font-bold text-ink">{formatCurrency(bep?.revenue)}</p>
                </div>
                <div className="rounded border border-line bg-surface-low/40 px-2 py-1.5">
                  <p className="font-mono text-[8px] uppercase text-subtle">Kontribusi / unit</p>
                  <p className="font-mono text-[11px] font-bold text-ink">{formatCurrency(bep?.marginPerUnit)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                  <Sparkles className="h-4 w-4 text-copper" /> What-If Scenario &amp; Price Shock Simulator
                </h2>
                <p className="mt-0.5 text-[10px] text-muted">Simulasi sensitivitas fluktuasi harga bahan terhadap margin kartu unit. Tidak mengubah data master.</p>
              </div>
              <Badge tone="amber">Stress Testing</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
              <div className="space-y-2.5">
                {contributors.map((contributor) => (
                  <div key={contributor.id} className="rounded-lg border border-line bg-surface-low/40 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10.5px] font-semibold text-ink">{contributor.name}</p>
                        <p className="font-mono text-[8px] uppercase tracking-wider text-subtle">
                          {formatNumber(contributor.pct, 1)}% dari HPP · {formatCurrency(contributor.cost.toFixed(0))}
                        </p>
                      </div>
                      <span className={cn("font-mono text-[10px] font-bold", (overrides[contributor.id] ?? 0) > 0 ? "text-rose" : "text-emerald")}>
                        {overrides[contributor.id] ? `+${overrides[contributor.id]}%` : "0%"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="50"
                      step="1"
                      value={overrides[contributor.id] ?? 0}
                      onChange={(event) => setOverride(contributor.id, Number(event.target.value))}
                      className="mt-1.5 w-full accent-amber"
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => presetShock("tepung", 20)} className="rounded border border-line bg-surface px-2 py-1 font-mono text-[9px] text-ink-soft hover:bg-amber-soft">
                    Tepung +20%
                  </button>
                  <button type="button" onClick={() => presetShock("telur", 15)} className="rounded border border-line bg-surface px-2 py-1 font-mono text-[9px] text-ink-soft hover:bg-amber-soft">
                    Telur +15%
                  </button>
                  <button type="button" onClick={() => presetShock("butter", 25)} className="rounded border border-line bg-surface px-2 py-1 font-mono text-[9px] text-ink-soft hover:bg-amber-soft">
                    Butter +25%
                  </button>
                  <button type="button" onClick={() => setOverrides({})} className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 font-mono text-[9px] text-muted hover:bg-surface-low">
                    <RotateCcw className="h-2.5 w-2.5" /> Reset
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-line bg-surface-low/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Dampak terhadap HPP &amp; Margin</p>
                  <Badge tone={hasOverrides ? "rose" : "emerald"}>{hasOverrides ? "Simulasi aktif" : "Baseline"}</Badge>
                </div>
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">HPP / Unit</span>
                    <span className="font-mono text-[13px] font-bold text-ink">{formatCurrency(result?.costPerUnit)}</span>
                  </div>
                  {hasOverrides ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted">Delta vs baseline</span>
                      <span className={cn("font-mono text-[11px] font-bold", impact.gt(0) ? "text-rose" : "text-emerald")}>
                        {impact.gt(0) ? "+" : ""}
                        {formatCurrency(impact.toFixed(0))}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">Gross margin</span>
                    <span className="font-mono text-[13px] font-bold text-ink">{formatPct(metrics?.marginPct, 1)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted">Harga jual rekomendasi</span>
                    <span className="font-mono text-[13px] font-bold text-copper">{recommended ? formatCurrency(recommended) : "—"}</span>
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-amber-line bg-amber-soft/60 px-2.5 py-2 text-[9px] leading-relaxed text-copper">
                  <TriangleAlert className="mr-1 inline h-3 w-3" />
                  {healthy
                    ? "Food cost masih dalam target. Harga jual dapat dipertahankan atau dievaluasi setelah shock."
                    : "Food cost melewati target. Pertimbangkan kenaikan harga jual atau reformulasi komposisi."}
                </div>
                <div className="mt-2 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-subtle">
                  <CircleAlert className="h-2.5 w-2.5" /> Simulasi tidak disimpan sebagai snapshot resmi
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
              <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-ink">
                <FlaskConical className="h-4 w-4 text-copper" /> Rincian Komponen Biaya Bahan Baku
              </h2>
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                Total: {formatCurrency(result?.rawMaterialCost)}
              </span>
            </div>
            <div className="overflow-x-auto scrollbar-slim">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface-low/40 font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                    <th className="px-4 py-2 font-semibold">Bahan &amp; SKU</th>
                    <th className="px-3 py-2 text-right font-semibold">Kuantitas</th>
                    <th className="px-3 py-2 text-right font-semibold">Harga Satuan</th>
                    <th className="px-3 py-2 text-right font-semibold">Biaya Pemakaian</th>
                    <th className="px-3 py-2 text-right font-semibold">Proporsi HPP</th>
                    <th className="px-4 py-2 text-right font-semibold">Status Scaling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {(result?.lines ?? []).map((line) => {
                    return (
                      <tr key={line.key} className="align-top">
                        <td className="px-4 py-2.5">
                          <p className={cn("text-[11px] font-semibold text-ink", line.type === "subrecipe" ? "ml-3" : "")}>{line.name}</p>
                          <p className="font-mono text-[8px] uppercase tracking-wider text-subtle">{line.sku ?? line.category ?? "SUB-RESEP"}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10px] text-ink-soft">
                          {formatNumber(line.qty)} <span className="text-[8px] text-subtle">{line.unit}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10px] text-ink-soft">
                          {formatCurrencyPrecise(line.unitPrice)} <span className="text-[8px] text-subtle">/ {line.unit}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10.5px] font-semibold text-ink">{formatCurrency(line.cost)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10px] text-ink-soft">{formatPct(line.proportionPct, 1)}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <Badge tone={line.nonLinearScaling ? "amber" : "emerald"}>{line.nonLinearScaling ? "Non-linear" : "Linear 1.0x"}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-surface-low/55">
                    <td colSpan={3} className="px-4 py-2.5 text-right text-[10.5px] font-semibold text-ink-soft">
                      Subtotal biaya bahan (batch x{activeFactorLabel})
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] font-bold text-ink">{formatCurrency(result?.rawMaterialCost)}</td>
                    <td colSpan={2} className="px-4 py-2.5 text-right font-mono text-[9px] text-muted">
                      HPP/unit {formatCurrency(result?.costPerUnit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-3 2xl:sticky 2xl:top-[76px] 2xl:col-span-4">
          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-2.5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                <Lock className="h-4 w-4 text-copper" /> Simpan Snapshot Resmi
              </h2>
              <Badge tone="neutral">Append-only</Badge>
            </div>
            <div className="p-3.5">
              <p className="text-[10px] leading-relaxed text-muted">
                Snapshot membekukan versi resep, strategi harga, scale factor, dan harga jual. Data historis tidak berubah saat harga bahan naik.
              </p>
              <form action={action} className="mt-3 space-y-2.5">
                <input type="hidden" name="recipeId" value={recipe.id} />
                <input type="hidden" name="scaleFactor" value={normalizedFactor} />
                <input type="hidden" name="priceStrategy" value={strategy} />
                <input type="hidden" name="asOf" value={strategy === "snapshot" ? asOf : ""} />
                <input type="hidden" name="sellingPrice" value={normalizedSellingPrice} />
                <input type="hidden" name="targetMarginPct" value={targetMargin} />
                <input type="hidden" name="roundingTo" value={roundingTo} />
                <div>
                  <label htmlFor="snapshot-label" className="mb-1 block font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted">
                    Label snapshot
                  </label>
                  <input
                    id="snapshot-label"
                    name="label"
                    placeholder={`Rilis v${version.versionNo} — evaluasi margin`}
                    className="h-8 w-full rounded border border-line bg-surface px-2 text-[10.5px] text-ink outline-none focus:border-amber focus:ring-2 focus:ring-amber/15"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[8.5px]">
                  <div className="rounded border border-line bg-surface-low/40 px-2 py-1.5">
                    <p className="text-subtle">HPP/unit</p>
                    <p className="font-bold text-ink">{formatCurrency(result?.costPerUnit)}</p>
                  </div>
                  <div className="rounded border border-line bg-surface-low/40 px-2 py-1.5">
                    <p className="text-subtle">Margin</p>
                    <p className="font-bold text-ink">{formatPct(metrics?.marginPct, 1)}</p>
                  </div>
                  <div className="rounded border border-line bg-surface-low/40 px-2 py-1.5">
                    <p className="text-subtle">Harga jual</p>
                    <p className="font-bold text-ink">{formatCurrency(normalizedSellingPrice)}</p>
                  </div>
                  <div className="rounded border border-line bg-surface-low/40 px-2 py-1.5">
                    <p className="text-subtle">Strategi</p>
                    <p className="font-bold text-ink">{strategy}</p>
                  </div>
                </div>
                <Button type="submit" variant="dark" size="md" className="w-full" loading={pending} disabled={Boolean(computation.error)}>
                  Kunci &amp; Simpan Snapshot
                </Button>
                <p className="text-center font-mono text-[8px] uppercase tracking-[0.08em] text-subtle">
                  Auditor: {settings.ownerName} · {formatDate(new Date())}
                </p>
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-[13px] font-bold text-ink">
                <Clock className="h-3.5 w-3.5 text-copper" /> Snapshot Terakhir
              </h2>
              <Link href={`/audit?entity=costing_snapshot`} className="text-[9px] font-semibold text-copper hover:underline">
                Lihat
              </Link>
            </div>
            <div className="mt-2 space-y-2">
              {snapshots.slice(0, 4).map((snapshot) => (
                <div key={snapshot.id} className="rounded-md border border-line bg-surface-low/40 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-[9.5px] font-semibold text-ink">{snapshot.label ?? snapshot.id.slice(0, 8)}</p>
                    <span className="font-mono text-[8px] text-subtle">{formatRelative(snapshot.computedAt)}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-[8.5px] text-muted">
                    {formatCurrency(snapshot.costPerUnit)} / {snapshot.yieldUnit} · margin {formatPct(snapshot.marginPct, 1)}
                  </p>
                </div>
              ))}
              {snapshots.length === 0 ? <p className="py-3 text-center text-[10px] text-muted">Belum ada snapshot.</p> : null}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-copper" />
              <p className="text-[11px] font-bold text-ink">Definisi Metrik PRD §4</p>
            </div>
            <div className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-muted">
              <p><span className="font-semibold text-ink">Margin</span> = (harga jual − HPP) / harga jual</p>
              <p><span className="font-semibold text-ink">Markup</span> = (harga jual − HPP) / HPP</p>
              <p><span className="font-semibold text-ink">Food cost</span> = HPP / harga jual</p>
              <p><span className="font-semibold text-ink">Price-to-cost</span> = harga jual / HPP</p>
            </div>
            <p className="mt-2 rounded border border-line bg-surface-low/40 px-2 py-1.5 text-[8.5px] leading-relaxed text-subtle">
              Label “400%” tanpa nama metrik ambigu. UFC menampilkan margin dan markup sebagai metrik utama.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-[9.5px] leading-relaxed text-muted shadow-card">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald" />
            <span>
              Kalkulasi memakai Decimal dan lot purchase asli, sehingga acceptance reference PRD (Rp13.000 batch, Rp2.600/roti) tetap presisi.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  note,
  icon,
  tone = "neutral",
  footer,
}: {
  label: string;
  value: string;
  note?: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "emerald" | "amber" | "rose";
  footer?: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-low/40 p-2.5">
      <div className="flex items-center justify-between gap-1">
        <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded",
              tone === "emerald"
                ? "bg-emerald-soft text-emerald"
                : tone === "amber"
                  ? "bg-amber-soft text-copper"
                  : tone === "rose"
                    ? "bg-rose-soft text-rose"
                    : "bg-surface-mid text-muted",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-display text-[19px] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">{value}</p>
      {note ? <p className="mt-1 text-[8.5px] leading-tight text-muted">{note}</p> : null}
      {footer ? <p className="mt-1 w-fit rounded bg-emerald-soft px-1 py-0.5 font-mono text-[7.5px] font-semibold uppercase tracking-wider text-emerald">{footer}</p> : null}
    </div>
  );
}
