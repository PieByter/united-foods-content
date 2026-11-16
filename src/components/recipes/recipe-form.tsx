"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BadgeCheck,
  Calculator,
  ChefHat,
  CircleAlert,
  Info,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { calculateRecipeCost, suggestSellingPrice, type RecipeInput } from "@ufc/costing";
import type { IngredientView, RecipeView } from "@/lib/types";
import { buildPriceBook, toDomainIngredient, toDomainRecipe } from "@/lib/costing-mappers";
import { saveRecipeAction } from "@/server/actions/recipes";
import type { ActionState } from "@/server/actions/shared";
import { RECIPE_CATEGORIES, UNIT_OPTIONS } from "@/lib/constants";
import { formatCurrency, formatNumber, normalizeDecimalInput, parseDecimalInput } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select, Textarea, FormSection } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { ErrorNote } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

interface FormItem {
  key: string;
  type: "ingredient" | "subrecipe" | "overhead";
  refId: string;
  label: string;
  qty: string;
  unit: string;
  discrete: boolean;
  rounding: "none" | "half" | "whole";
  nonLinearScaling: boolean;
  note: string;
  overheadKind: "fixed" | "percent";
  overheadValue: string;
}

const initialState: ActionState = {};

let uidCounter = 0;
function nextKey() {
  uidCounter += 1;
  return `row-${uidCounter}`;
}

function emptyItem(type: FormItem["type"], index: number): FormItem {
  return {
    key: `new-${type}-${index}`,
    type,
    refId: "",
    label: "",
    qty: "",
    unit: "gr",
    discrete: false,
    rounding: "none",
    nonLinearScaling: false,
    note: "",
    overheadKind: "fixed",
    overheadValue: "",
  };
}

function unitsForIngredient(ingredient: IngredientView | undefined): string[] {
  if (!ingredient) return ["gr"];
  const codes = new Set<string>([ingredient.baseUnit]);
  for (const conversion of ingredient.conversions) {
    codes.add(conversion.fromUnit);
    codes.add(conversion.toUnit);
  }
  for (const unit of UNIT_OPTIONS) {
    if (unit.dimension === ingredient.baseDimension) codes.add(unit.code);
  }
  return UNIT_OPTIONS.filter((unit) => codes.has(unit.code)).map((unit) => unit.code);
}

function unitLabelFor(code: string) {
  return UNIT_OPTIONS.find((unit) => unit.code === code)?.label ?? code;
}

function toPayloadItem(item: FormItem) {
  if (item.type === "overhead") {
    return {
      type: item.type,
      refId: null,
      label: item.label,
      qty: "0",
      unit: item.overheadKind === "percent" ? "%" : "batch",
      discrete: false,
      rounding: "none" as const,
      nonLinearScaling: false,
      note: item.note || null,
      overheadKind: item.overheadKind,
      overheadValue: parseDecimalInput(item.overheadValue) || "0",
    };
  }
  return {
    type: item.type,
    refId: item.refId || null,
    label: null,
    qty: parseDecimalInput(item.qty) || "0",
    unit: item.unit || "gr",
    discrete: item.discrete,
    rounding: item.rounding,
    nonLinearScaling: item.nonLinearScaling,
    note: item.note || null,
    overheadKind: null,
    overheadValue: null,
  };
}

export function RecipeForm({
  recipe,
  ingredients,
  recipes,
}: {
  recipe?: RecipeView;
  ingredients: IngredientView[];
  recipes: RecipeView[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveRecipeAction, initialState);
  const version = recipe?.version;

  const [name, setName] = useState(recipe?.name ?? "");
  const [description, setDescription] = useState(recipe?.description ?? "");
  const [category, setCategory] = useState(recipe?.category ?? "Bakery & Roti");
  const [status, setStatus] = useState<"draft" | "published">(recipe?.status ?? "draft");
  const [isSubrecipe, setIsSubrecipe] = useState(recipe?.isSubrecipe ?? false);
  const [yieldQty, setYieldQty] = useState(() => normalizeDecimalInput(version?.yieldQty, "1"));
  const [yieldUnit, setYieldUnit] = useState(version?.yieldUnit ?? "pcs");
  const [unitWeightG, setUnitWeightG] = useState(() =>
    version?.unitWeightG ? normalizeDecimalInput(version.unitWeightG, "") : "",
  );
  const [yieldLossPct, setYieldLossPct] = useState(() => normalizeDecimalInput(version?.yieldLossPct, "0"));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormItem[]>(() => {
    if (version && version.items.length > 0) {
      return version.items.map((item, index) => ({
        key: item.id || `row-${index}`,
        type: item.itemType,
        refId: item.refId ?? "",
        label: item.label ?? "",
        qty: normalizeDecimalInput(item.qty),
        unit: item.unit,
        discrete: item.discrete,
        rounding: item.rounding,
        nonLinearScaling: item.nonLinearScaling,
        note: item.note ?? "",
        overheadKind: item.overheadKind ?? "fixed",
        overheadValue: item.overheadValue ? normalizeDecimalInput(item.overheadValue) : "",
      }));
    }
    return [emptyItem("ingredient", 0)];
  });

  useEffect(() => {
    if (state.ok && state.recipeId) {
      toast.success(state.message);
      router.push(`/resep/${state.recipeId}`);
      router.refresh();
    } else if (state.ok === false && state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, router]);

  const updateItem = (key: string, patch: Partial<FormItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const addItem = (type: FormItem["type"]) => {
    setItems((current) => [...current, { ...emptyItem(type, current.length), key: nextKey() }]);
  };

  const removeItem = (key: string) => {
    setItems((current) => (current.length <= 1 ? current : current.filter((item) => item.key !== key)));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const subrecipeOptions = recipes.filter((entry) => entry.isSubrecipe && entry.version && entry.id !== recipe?.id);
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const subrecipeMap = new Map(recipes.map((entry) => [entry.id, entry]));

  const preview = useMemo(() => {
    try {
      const previewYield = new Decimal(parseDecimalInput(yieldQty) || "0");
      if (previewYield.lte(0)) return { error: "Yield harus lebih besar dari 0.", result: null };
      if (!name.trim()) return { error: null, result: null };

      const usableItems = items.filter((item) =>
        item.type === "overhead"
          ? Boolean(item.label.trim()) && Boolean(item.overheadValue)
          : Boolean(item.refId) && Number(parseDecimalInput(item.qty)) > 0,
      );
      if (usableItems.length === 0) return { error: null, result: null };

      const previewRecipe: RecipeInput = {
        id: recipe?.id ?? "preview-recipe",
        name,
        category,
        status,
        isSubrecipe,
        yieldQty: previewYield.toFixed(),
        yieldUnit,
        unitWeightG: unitWeightG ? parseDecimalInput(unitWeightG) : null,
        yieldLossPct: parseDecimalInput(yieldLossPct) || "0",
        items: usableItems.map((item, index) => ({
          id: `${item.key}-${index}`,
          ...toPayloadItem(item),
          sortOrder: index,
        })),
      };

      const domainRecipes = recipes
        .map((entry) => toDomainRecipe(entry))
        .filter((entry): entry is RecipeInput => entry !== null);
      if (!domainRecipes.some((entry) => entry.id === previewRecipe.id)) domainRecipes.push(previewRecipe);

      const result = calculateRecipeCost({
        recipe: previewRecipe,
        recipes: domainRecipes,
        ingredients: ingredients.map(toDomainIngredient),
        prices: buildPriceBook(ingredients),
        priceStrategy: "latest",
        scaleFactor: 1,
      });
      return { error: null, result };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Preview HPP gagal dihitung.", result: null };
    }
  }, [recipe, name, category, status, isSubrecipe, yieldQty, yieldUnit, unitWeightG, yieldLossPct, items, recipes, ingredients]);

  const payload = {
    id: recipe?.id,
    name,
    description: description || null,
    category,
    status,
    isSubrecipe,
    yieldQty,
    yieldUnit,
    unitWeightG: unitWeightG || null,
    yieldLossPct: yieldLossPct || "0",
    notes: notes || null,
    items: items.map(toPayloadItem),
  };

  const errors = state.fieldErrors ?? {};
  const effectiveYield = useMemo(() => {
    try {
      return new Decimal(parseDecimalInput(yieldQty) || "0").mul(
        new Decimal(1).minus(new Decimal(parseDecimalInput(yieldLossPct) || "0").div(100)),
      );
    } catch {
      return new Decimal(0);
    }
  }, [yieldQty, yieldLossPct]);

  const suggestedPrice = preview.result
    ? suggestSellingPrice({ costPerUnit: preview.result.costPerUnit, targetMarginPct: 70, roundingTo: 500 })
    : null;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Formula Builder · {recipe ? `Versi baru dari v${version?.versionNo ?? 0}` : "Resep Baru"}
          </span>
        }
        title={recipe ? `Edit Formula — ${recipe.name}` : "Susun Resep Baru"}
        description="Perubahan takaran disimpan sebagai versi baru. Snapshot HPP lama tetap utuh untuk audit."
        actions={
          <>
            <Link
              href={recipe ? `/resep/${recipe.id}` : "/resep"}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 text-[12px] font-semibold text-ink hover:bg-surface-low"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Batal
            </Link>
            <Button type="submit" form="recipe-form" variant="amber" loading={pending} icon={<Save className="h-3.5 w-3.5" />}>
              {pending ? "Menyimpan..." : recipe ? `Simpan sebagai v${(version?.versionNo ?? 0) + 1}` : "Simpan Resep"}
            </Button>
          </>
        }
      />

      <form id="recipe-form" action={action} className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />

        <div className="space-y-3 xl:col-span-8">
          {state.ok === false && state.message && !Object.keys(errors).length ? <ErrorNote>{state.message}</ErrorNote> : null}

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <FormSection
              step="1"
              title="Identitas Resep"
              description="Nama, kategori, status publikasi, dan deskripsi produksi."
              badge={<span className="font-mono text-[8.5px] uppercase tracking-widest text-subtle">Recipe Meta</span>}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama Resep" htmlFor="recipe-name" required error={errors.name}>
                  <Input id="recipe-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Roti Pemula (Classic Loaf)" />
                </Field>
                <Field label="Kategori" htmlFor="recipe-category" required error={errors.category}>
                  <Select
                    id="recipe-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    disabled={isSubrecipe}
                  >
                    {(isSubrecipe ? ["Sub-resep"] : RECIPE_CATEGORIES.filter((entry) => entry !== "Sub-resep")).map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status" htmlFor="recipe-status">
                  <Select id="recipe-status" value={status} onChange={(event) => setStatus(event.target.value as "draft" | "published")}>
                    <option value="draft">Draft — belum dipublikasikan</option>
                    <option value="published">Published — aktif produksi</option>
                  </Select>
                </Field>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-[11.5px] font-medium text-ink-soft">
                    <input
                      type="checkbox"
                      checked={isSubrecipe}
                      onChange={(event) => {
                        setIsSubrecipe(event.target.checked);
                        setCategory(event.target.checked ? "Sub-resep" : "Bakery & Roti");
                      }}
                      className="h-3.5 w-3.5 accent-amber"
                    />
                    Jadikan sub-resep (semi-finished)
                  </label>
                </div>
              </div>
              <Field label="Deskripsi" htmlFor="recipe-description" className="mt-3" error={errors.description}>
                <Textarea
                  id="recipe-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  placeholder="Profil rasa, teknik produksi, dan catatan operator."
                />
              </Field>
            </FormSection>

            <div className="mt-3">
              <FormSection
                step="2"
                title="Yield & Susut Produksi"
                description="Yield menentukan basis HPP per unit. Yield loss dihitung sebagai penyusutan berat/kuantitas."
                badge={<Badge tone="neutral">Numeric 18,6</Badge>}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Yield Batch" htmlFor="yield-qty" required error={errors.yieldQty}>
                    <NumberInput id="yield-qty" value={yieldQty} onChange={(event) => setYieldQty(event.target.value)} />
                  </Field>
                  <Field label="Satuan Yield" htmlFor="yield-unit" required error={errors.yieldUnit}>
                    <Select id="yield-unit" value={yieldUnit} onChange={(event) => setYieldUnit(event.target.value)}>
                      {UNIT_OPTIONS.map((unit) => (
                        <option key={unit.code} value={unit.code}>
                          {unit.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Berat per Unit (gr)" htmlFor="unit-weight" help="Opsional, untuk HPP per gram.">
                    <NumberInput id="unit-weight" value={unitWeightG ?? ""} onChange={(event) => setUnitWeightG(event.target.value)} placeholder="100" />
                  </Field>
                  <Field label="Yield Loss (%)" htmlFor="yield-loss" help="Susut pemanggangan / trimming.">
                    <NumberInput id="yield-loss" value={yieldLossPct} onChange={(event) => setYieldLossPct(event.target.value)} />
                  </Field>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface-low/50 px-3 py-2 font-mono text-[10px] text-muted">
                  <span>Yield efektif:</span>
                  <span className="font-bold text-ink">{formatNumber(effectiveYield.toFixed(2))}</span>
                  <span>{yieldUnit}</span>
                  <span className="text-subtle">·</span>
                  <span>susut {formatNumber(parseDecimalInput(yieldLossPct) || "0")}%</span>
                </div>
              </FormSection>
            </div>

            <div className="mt-3">
              <div className="rounded-lg border border-line bg-surface-low/35 p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-navy font-mono text-[10px] text-amber-bright">3</span>
                      Formula &amp; Komponen Biaya
                    </h3>
                    <p className="mt-1 text-[11px] text-muted">Bahan, sub-resep, atau overhead. Urutan item disimpan sebagai sort order.</p>
                  </div>
                  <Badge tone="neutral">{items.length} Item</Badge>
                </div>

                {errors.items ? <p className="mb-2 text-[10.5px] font-medium text-rose">{errors.items}</p> : null}

                <div className="space-y-2">
                  {items.map((item, index) => {
                    const ingredient = item.type === "ingredient" ? ingredientMap.get(item.refId) : undefined;
                    const subrecipe = item.type === "subrecipe" ? subrecipeMap.get(item.refId) : undefined;
                    const units = item.type === "ingredient" ? unitsForIngredient(ingredient) : unitLabelFor(item.unit) ? [item.unit] : ["gr"];
                    return (
                      <div key={item.key} className="rounded-lg border border-line bg-white p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.1em]",
                                item.type === "ingredient"
                                  ? "bg-amber-soft text-copper"
                                  : item.type === "subrecipe"
                                    ? "bg-blue-soft text-blue"
                                    : "bg-surface-mid text-ink-soft",
                              )}
                            >
                              {item.type === "ingredient" ? "Bahan" : item.type === "subrecipe" ? "Sub-resep" : "Overhead"}
                            </span>
                            <span className="font-mono text-[9px] text-subtle">#{index + 1}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <button type="button" onClick={() => moveItem(index, -1)} className="rounded p-1 text-subtle hover:bg-surface-low hover:text-ink" aria-label="Naikkan">
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => moveItem(index, 1)} className="rounded p-1 text-subtle hover:bg-surface-low hover:text-ink" aria-label="Turunkan">
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => removeItem(item.key)} className="rounded p-1 text-subtle hover:bg-rose-soft hover:text-rose" aria-label="Hapus item">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {item.type === "ingredient" ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_100px_130px]">
                            <Select
                              value={item.refId}
                              onChange={(event) => {
                                const next = ingredientMap.get(event.target.value);
                                const nonLinear = next ? /ragi|yeast|garam|salt|baking|soda/i.test(next.name) : false;
                                updateItem(item.key, {
                                  refId: event.target.value,
                                  unit: next?.baseUnit ?? "gr",
                                  discrete: next?.discrete ?? false,
                                  nonLinearScaling: nonLinear,
                                });
                              }}
                            >
                              <option value="">Pilih bahan baku...</option>
                              {ingredients.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.name} ({entry.baseUnit})
                                </option>
                              ))}
                            </Select>
                            <NumberInput value={item.qty} onChange={(event) => updateItem(item.key, { qty: event.target.value })} placeholder="Qty" />
                            <Select value={item.unit} onChange={(event) => updateItem(item.key, { unit: event.target.value })}>
                              {units.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unitLabelFor(unit)}
                                </option>
                              ))}
                            </Select>
                          </div>
                        ) : null}

                        {item.type === "subrecipe" ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_100px_130px]">
                            <Select
                              value={item.refId}
                              onChange={(event) => {
                                const next = subrecipeMap.get(event.target.value);
                                updateItem(item.key, { refId: event.target.value, unit: next?.version?.yieldUnit ?? "gr" });
                              }}
                            >
                              <option value="">Pilih sub-resep...</option>
                              {subrecipeOptions.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.name} (yield {formatNumber(entry.version!.yieldQty)} {entry.version!.yieldUnit})
                                </option>
                              ))}
                            </Select>
                            <NumberInput value={item.qty} onChange={(event) => updateItem(item.key, { qty: event.target.value })} placeholder="Qty" />
                            <Input value={subrecipe?.version?.yieldUnit ?? item.unit} readOnly className="bg-surface-low font-mono text-[11px]" />
                          </div>
                        ) : null}

                        {item.type === "overhead" ? (
                          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px_130px]">
                            <Input value={item.label} onChange={(event) => updateItem(item.key, { label: event.target.value })} placeholder="Nama overhead (mis. Kemasan Primer)" />
                            <Select value={item.overheadKind} onChange={(event) => updateItem(item.key, { overheadKind: event.target.value as "fixed" | "percent" })}>
                              <option value="fixed">Nominal per batch</option>
                              <option value="percent">Persen dari bahan</option>
                            </Select>
                            <NumberInput
                              value={item.overheadValue}
                              onChange={(event) => updateItem(item.key, { overheadValue: event.target.value })}
                              placeholder={item.overheadKind === "percent" ? "5" : "3000"}
                            />
                          </div>
                        ) : null}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line/70 pt-1.5">
                          {item.type !== "overhead" ? (
                            <>
                              <label className="flex items-center gap-1 text-[9.5px] text-muted">
                                <input
                                  type="checkbox"
                                  checked={item.discrete}
                                  onChange={(event) => updateItem(item.key, { discrete: event.target.checked })}
                                  className="h-3 w-3 accent-amber"
                                />
                                Diskret
                              </label>
                              <label className="flex items-center gap-1 text-[9.5px] text-muted">
                                Rounding
                                <select
                                  value={item.rounding}
                                  onChange={(event) => updateItem(item.key, { rounding: event.target.value as FormItem["rounding"] })}
                                  className="rounded border border-line bg-white px-1 py-0.5 font-mono text-[9px]"
                                >
                                  <option value="none">none</option>
                                  <option value="half">half</option>
                                  <option value="whole">whole</option>
                                </select>
                              </label>
                              <label className="flex items-center gap-1 text-[9.5px] text-muted">
                                <input
                                  type="checkbox"
                                  checked={item.nonLinearScaling}
                                  onChange={(event) => updateItem(item.key, { nonLinearScaling: event.target.checked })}
                                  className="h-3 w-3 accent-amber"
                                />
                                Non-linear scaling
                              </label>
                            </>
                          ) : null}
                          <input
                            value={item.note}
                            onChange={(event) => updateItem(item.key, { note: event.target.value })}
                            placeholder="Catatan (opsional)"
                            className="ml-auto h-6 max-w-[240px] flex-1 rounded border border-transparent bg-surface-low px-1.5 text-[9.5px] text-ink outline-none focus:border-amber focus:bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button type="button" variant="soft" size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => addItem("ingredient")}>
                    Bahan
                  </Button>
                  <Button type="button" variant="soft" size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => addItem("subrecipe")}>
                    Sub-resep
                  </Button>
                  <Button type="button" variant="soft" size="xs" icon={<Plus className="h-3 w-3" />} onClick={() => addItem("overhead")}>
                    Overhead
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <FormSection
                step="4"
                title="Catatan Versi"
                description="Alasan perubahan formula untuk audit log dan riwayat versi."
                badge={<Badge tone="neutral">Audit Note</Badge>}
              >
                <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Contoh: penyesuaian hidrasi dan yield loss setelah uji oven deck." />
              </FormSection>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <p className="flex items-center gap-1.5 text-[10px] text-muted">
              <Info className="h-3 w-3 text-copper" />
              Menyimpan akan membuat versi baru dan mengubah current version resep.
            </p>
            <div className="flex gap-2">
              <Link
                href={recipe ? `/resep/${recipe.id}` : "/resep"}
                className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-white px-3.5 text-[12px] font-semibold text-ink hover:bg-surface-low"
              >
                Batal
              </Link>
              <Button type="submit" variant="amber" loading={pending} icon={<Save className="h-3.5 w-3.5" />}>
                {recipe ? `Simpan v${(version?.versionNo ?? 0) + 1}` : "Simpan Resep"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-[76px] xl:col-span-4">
          <div className="rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-2.5">
              <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
                <Calculator className="h-4 w-4 text-copper" /> Live HPP Preview
              </h2>
              <Badge tone="neutral">sebelum simpan</Badge>
            </div>
            <div className="space-y-2 p-3.5">
              {preview.error ? (
                <div className="flex items-start gap-2 rounded-md border border-rose-line bg-rose-soft px-2.5 py-2 text-[10px] leading-relaxed text-rose">
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {preview.error}
                </div>
              ) : preview.result ? (
                <>
                  <MetricLine label="HPP Bahan Murni" value={formatCurrency(preview.result.rawMaterialCost)} />
                  <MetricLine label="Total Overhead" value={formatCurrency(preview.result.overheadCost)} />
                  <div className="rounded-lg border border-navy bg-navy p-2.5 text-white">
                    <p className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-slate-400">Total HPP Batch</p>
                    <p className="mt-0.5 font-display text-[24px] font-extrabold tracking-[-0.04em]">{formatCurrency(preview.result.totalCost)}</p>
                    <p className="mt-1 font-mono text-[9px] text-amber-bright">
                      {formatCurrency(preview.result.costPerUnit)} / {yieldUnit} · yield efektif {formatNumber(preview.result.effectiveYieldQty)}
                    </p>
                  </div>
                  <MetricLine label="Saran harga (margin 70%)" value={suggestedPrice ? formatCurrency(suggestedPrice) : "—"} accent />
                  {preview.result.warnings.length > 0 ? (
                    <div className="rounded-md border border-amber-line bg-amber-soft px-2.5 py-2 text-[9.5px] leading-relaxed text-copper">
                      <TriangleAlert className="mr-1 inline h-3 w-3" />
                      {preview.result.warnings.length} warning scaling non-linear pada komposisi ini.
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5 rounded-md border border-emerald-line bg-emerald-soft px-2.5 py-2 text-[9.5px] text-emerald">
                    <BadgeCheck className="h-3.5 w-3.5" /> Domain kalkulasi siap; error keras bila konversi/harga hilang.
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-[10.5px] text-muted">
                  Isi nama resep, yield, dan minimal satu bahan untuk melihat preview HPP.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-3.5 shadow-card">
            <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">Checklist Formula</p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed">
              <ChecklistItem ok={Boolean(name.trim())} label="Nama resep terisi" />
              <ChecklistItem ok={Number(parseDecimalInput(yieldQty)) > 0} label="Yield batch valid" />
              <ChecklistItem ok={items.some((item) => item.type !== "overhead" && item.refId)} label="Minimal satu bahan / sub-resep" />
              <ChecklistItem ok={new Decimal(parseDecimalInput(yieldLossPct) || "0").gte(0) && new Decimal(parseDecimalInput(yieldLossPct) || "0").lt(100)} label="Yield loss 0–99,99%" />
              <ChecklistItem ok={!preview.error} label="Preview HPP dapat dihitung" />
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-[9.5px] leading-relaxed text-muted shadow-card">
            <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
            <span>
              Komponen overhead bersifat opsional di fase 1, namun sangat disarankan agar margin tidak terlihat semu. Overhead fixed ikut terskala saat batch diperbesar.
            </span>
          </div>
        </aside>
      </form>
    </div>
  );
}

function MetricLine({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-surface-low/40 px-2.5 py-1.5">
      <span className="text-[10px] text-muted">{label}</span>
      <span className={cn("font-mono text-[11px] font-bold", accent ? "text-copper" : "text-ink")}>{value}</span>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white", ok ? "bg-emerald" : "bg-slate-300")}>
        {ok ? "✓" : "!"}
      </span>
      <span className={ok ? "text-ink-soft" : "text-muted"}>{label}</span>
    </li>
  );
}
