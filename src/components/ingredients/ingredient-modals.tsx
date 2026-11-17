"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { ArrowRight, Plus, Trash2, Wand2 } from "lucide-react";
import { convertQuantity, CostingError } from "@ufc/costing";
import { createIngredientAction, updateIngredientAction, updateIngredientPriceAction, importIngredientsAction } from "@/server/actions/ingredients";
import type { ActionState } from "@/server/actions/shared";
import type { IngredientView } from "@/lib/types";
import { BASE_UNIT_OPTIONS, INGREDIENT_CATEGORIES, UNIT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatCurrencyPrecise, formatDate, normalizeDecimalInput, parseDecimalInput, todayInputWIB } from "@/lib/format";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, FormSection, Input, NumberInput, Select, Textarea, HelpText } from "@/components/ui/form";
import { ErrorNote } from "@/components/ui/feedback";

const initialState: ActionState = {};

type ConversionRow = { fromUnit: string; toUnit: string; factor: string };

function todayInput(): string {
  return todayInputWIB();
}

function toDomainConversions(rows: ConversionRow[]) {
  return rows
    .filter((row) => row.fromUnit.trim() && row.toUnit.trim() && row.factor.trim())
    .map((row) => ({ fromUnit: row.fromUnit, toUnit: row.toUnit, factor: row.factor.replace(",", ".") }));
}

function NormalizationPreview({
  baseUnit,
  purchaseQty,
  purchaseUnit,
  price,
  conversions,
}: {
  baseUnit: string;
  purchaseQty: string;
  purchaseUnit: string;
  price: string;
  conversions: ConversionRow[];
}) {
  const preview = useMemo(() => {
    try {
      const qty = new Decimal(parseDecimalInput(purchaseQty) || "0");
      const amount = new Decimal(parseDecimalInput(price) || "0");
      if (qty.lte(0)) return { error: "Isi pembelian belum diisi." };
      const baseQty = convertQuantity(qty.toFixed(), purchaseUnit, baseUnit, toDomainConversions(conversions));
      const perBase = amount.div(new Decimal(baseQty));
      return { baseQty, perBase: perBase.toFixed(6) };
    } catch (error) {
      return { error: error instanceof CostingError ? error.message : "Konversi belum lengkap." };
    }
  }, [baseUnit, purchaseQty, purchaseUnit, price, conversions]);

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5",
        preview.error ? "border-rose-line bg-rose-soft" : "border-emerald-line bg-emerald-soft",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-[8.5px] font-bold uppercase tracking-[0.14em]",
            preview.error ? "text-rose" : "text-emerald",
          )}
        >
          {preview.error ? "Normalisasi Belum Lengkap" : "Normalisasi Base Unit Terhitung"}
        </span>
        <span
          className={cn(
            "rounded-full bg-surface/70 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider",
            preview.error ? "text-rose" : "text-emerald",
          )}
        >
          Numeric 18,6
        </span>
      </div>
      {preview.error ? (
        <p className="mt-1 text-[11px] font-medium text-rose">{preview.error}</p>
      ) : (
        <>
          <p className="mt-0.5 font-mono text-[18px] font-bold tracking-tight text-ink">
            {formatCurrencyPrecise(preview.perBase)} <span className="text-[11px] font-medium text-muted">/ {baseUnit}</span>
          </p>
          <p className="mt-0.5 font-mono text-[9.5px] text-emerald">
            {purchaseQty || "0"} {purchaseUnit} = {new Decimal(preview.baseQty ?? "0").toFixed(4)} {baseUnit} → harga per {baseUnit}
          </p>
        </>
      )}
    </div>
  );
}

function ConversionEditor({ rows, setRows }: { rows: ConversionRow[]; setRows: (rows: ConversionRow[]) => void }) {
  const add = () => setRows([...rows, { fromUnit: "", toUnit: "", factor: "" }]);
  const update = (index: number, patch: Partial<ConversionRow>) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const remove = (index: number) => setRows(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto_1fr_1fr_auto] items-center gap-2">
          <Select value={row.fromUnit} onChange={(event) => update(index, { fromUnit: event.target.value })} aria-label="Satuan asal">
            <option value="">Satuan asal</option>
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit.code} value={unit.code}>
                {unit.label}
              </option>
            ))}
          </Select>
          <ArrowRight className="h-3.5 w-3.5 text-subtle" />
          <NumberInput
            value={row.factor}
            onChange={(event) => update(index, { factor: event.target.value })}
            placeholder="Faktor (mis. 55)"
            aria-label="Faktor konversi"
          />
          <Select value={row.toUnit} onChange={(event) => update(index, { toUnit: event.target.value })} aria-label="Satuan tujuan">
            <option value="">Satuan tujuan</option>
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit.code} value={unit.code}>
                {unit.label}
              </option>
            ))}
          </Select>
          <button
            type="button"
            onClick={() => remove(index)}
            className="rounded p-1.5 text-subtle hover:bg-rose-soft hover:text-rose"
            aria-label="Hapus konversi"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button type="button" variant="soft" size="xs" icon={<Plus className="h-3 w-3" />} onClick={add}>
        Tambah konversi antar-dimensi
      </Button>
      <HelpText>
        Wajib eksplisit. Contoh: 1 butir = 55 gr, 1 sdm = 14,2 gr, 1 bungkus = 11 gr. Sistem akan menolak HPP jika konversi tidak ada.
      </HelpText>
    </div>
  );
}

export function AddIngredientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(createIngredientAction, initialState);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [baseUnit, setBaseUnit] = useState("gr");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseUnit, setPurchaseUnit] = useState("kg");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onClose();
      router.refresh();
    } else if (state.ok === false && state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, onClose, router]);

  const baseDimension = BASE_UNIT_OPTIONS.find((unit) => unit.code === baseUnit)?.dimension;
  const errors = state.fieldErrors ?? {};

  const generateSku = () => {
    const prefix = baseDimension === "volume" ? "LIQ" : baseDimension === "count" ? "CNT" : "DRY";
    setSku(`${prefix}-${Math.floor(100 + Math.random() * 900)}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah Bahan Baku Baru"
      description="Normalisasi harga base unit otomatis, konversi antar-dimensi, dan parameter scaling resep."
      eyebrow="Modul Master Data · Numeric 18,6"
      size="xl"
      tone="dark"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Batal / Tutup
          </Button>
          <Button variant="dark" type="submit" form="add-ingredient-form" loading={pending}>
            Simpan Bahan &amp; Aktifkan Konversi
          </Button>
        </>
      }
    >
      <form id="add-ingredient-form" action={action} className="space-y-4">
        {state.ok === false && state.message && !Object.keys(errors).length ? <ErrorNote>{state.message}</ErrorNote> : null}

        <FormSection
          step="1"
          title="Identitas Bahan Baku"
          description="Data master untuk pencarian, audit, dan klasifikasi portofolio."
          badge={<span className="font-mono text-[8.5px] uppercase tracking-widest text-subtle">Master Item Record</span>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nama Bahan Baku" htmlFor="name" required error={errors.name}>
              <Input id="name" name="name" placeholder="Telur Ayam Ras Grade A (Omega)" autoComplete="off" />
            </Field>
            <Field
              label="Kode SKU"
              htmlFor="sku"
              required
              error={errors.sku}
              help={
                <button type="button" onClick={generateSku} className="inline-flex items-center gap-1 text-copper hover:underline">
                  <Wand2 className="h-2.5 w-2.5" /> Generate otomatis
                </button>
              }
            >
              <Input
                id="sku"
                name="sku"
                placeholder="SKU-RAW-EGG-001"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field label="Kategori" htmlFor="category" required error={errors.category}>
              <Select id="category" name="category" defaultValue="Tepung & Pati">
                {INGREDIENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Base Unit (Satuan Terkecil Resep)" htmlFor="baseUnit" required error={errors.baseUnit} help="Satuan ini dikunci setelah bahan dipakai resep.">
              <Select
                id="baseUnit"
                name="baseUnit"
                value={baseUnit}
                onChange={(event) => {
                  const nextBase = event.target.value;
                  setBaseUnit(nextBase);
                  setPurchaseUnit(nextBase === "ml" ? "l" : nextBase === "gr" ? "kg" : nextBase);
                }}
              >
                {BASE_UNIT_OPTIONS.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dimensi" help="Massa (gr/kg), volume (ml/l), atau count (butir/pcs).">
              <Input value={baseDimension === "mass" ? "Massa (Mass)" : baseDimension === "volume" ? "Volume" : "Count / Diskret"} readOnly className="bg-surface-low" />
            </Field>
            <label className="flex items-end gap-2 pb-1 text-[11.5px] font-medium text-ink-soft">
              <input type="checkbox" name="discrete" className="h-3.5 w-3.5 accent-amber" />
              Satuan diskret (butir, bungkus)
            </label>
          </div>
          <Field label="Catatan" htmlFor="notes" className="mt-3" error={errors.notes}>
            <Textarea id="notes" name="notes" rows={2} placeholder="Contoh: kemasan 1 kg, protein 13–14%, simpan di chiller." />
          </Field>
        </FormSection>

        <FormSection
          step="2"
          title="Pembelian & Normalisasi Harga Awal"
          description="Masukkan harga beli apa adanya. Sistem menormalkan ke base unit."
          badge={<span className="font-mono text-[8.5px] uppercase tracking-widest text-subtle">Purchase Contract</span>}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Isi per Pembelian (Netto)" htmlFor="purchaseQty" required error={errors.purchaseQty}>
              <NumberInput
                id="purchaseQty"
                name="purchaseQty"
                value={purchaseQty}
                onChange={(event) => setPurchaseQty(event.target.value)}
                placeholder="1"
              />
            </Field>
            <Field label="Satuan Pembelian" htmlFor="purchaseUnit" required error={errors.purchaseUnit}>
              <Select id="purchaseUnit" name="purchaseUnit" value={purchaseUnit} onChange={(event) => setPurchaseUnit(event.target.value)}>
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Harga Beli Faktur (Rp)" htmlFor="price" required error={errors.price}>
              <NumberInput
                id="price"
                name="price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="315000"
              />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Berlaku Sejak" htmlFor="effectiveFrom">
              <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={todayInput()} />
            </Field>
            <div className="flex items-end">
              <div className="w-full">
                <NormalizationPreview
                  baseUnit={baseUnit}
                  purchaseQty={purchaseQty}
                  purchaseUnit={purchaseUnit}
                  price={price}
                  conversions={conversions}
                />
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection
          step="3"
          title="Konfigurasi Konversi Satuan Kustom"
          description="Membuka penulisan takaran diskret (butir) atau volume dapur (sdm/cup) dengan translasi presisi ke base unit."
          badge={<span className="rounded-full bg-amber-soft px-2 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-wider text-copper">Konversi Khusus</span>}
        >
          <ConversionEditor rows={conversions} setRows={setConversions} />
          <input type="hidden" name="conversions" value={JSON.stringify(conversions)} />
          {errors.conversions ? <p className="mt-2 text-[10.5px] text-rose">{errors.conversions}</p> : null}
        </FormSection>

        <div className="flex items-center gap-2 rounded-md border border-line bg-surface-low/60 px-3 py-2 text-[10.5px] text-muted">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald">Append-only</span>
          Setiap perubahan harga berikutnya membuat record baru dengan effective_from, bukan menimpa harga lama.
        </div>
      </form>
    </Modal>
  );
}

export function EditIngredientModal({
  open,
  onClose,
  ingredient,
}: {
  open: boolean;
  onClose: () => void;
  ingredient: IngredientView;
}) {
  const [state, action, pending] = useActionState(updateIngredientAction, initialState);
  const [conversions, setConversions] = useState<ConversionRow[]>(
    ingredient.conversions.map((conversion) => ({
      fromUnit: conversion.fromUnit,
      toUnit: conversion.toUnit,
      factor: normalizeDecimalInput(conversion.factor),
    })),
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onClose();
      router.refresh();
    } else if (state.ok === false && state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, onClose, router]);

  const errors = state.fieldErrors ?? {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Master Bahan"
      description="Base unit dikunci untuk menjaga integritas harga dan audit HPP."
      eyebrow={`${ingredient.sku} · ${ingredient.category}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="dark" type="submit" form="edit-ingredient-form" loading={pending}>
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <form id="edit-ingredient-form" action={action} className="space-y-4">
        <input type="hidden" name="id" value={ingredient.id} />
        <input type="hidden" name="conversions" value={JSON.stringify(conversions)} />
        {state.ok === false && state.message && !Object.keys(errors).length ? <ErrorNote>{state.message}</ErrorNote> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama Bahan" htmlFor="edit-name" required error={errors.name}>
            <Input id="edit-name" name="name" defaultValue={ingredient.name} />
          </Field>
          <Field label="Kode SKU" htmlFor="edit-sku" required error={errors.sku}>
            <Input id="edit-sku" name="sku" defaultValue={ingredient.sku} />
          </Field>
          <Field label="Kategori" htmlFor="edit-category" required error={errors.category}>
            <Select id="edit-category" name="category" defaultValue={ingredient.category}>
              {Array.from(new Set([...INGREDIENT_CATEGORIES, ingredient.category])).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Base Unit (terkunci)" help="Perubahan base unit memerlukan migrasi harga dan resep.">
            <Input value={`${ingredient.baseUnit} · ${ingredient.baseDimension}`} readOnly className="bg-surface-low font-mono" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[11.5px] font-medium text-ink-soft">
          <input type="checkbox" name="discrete" defaultChecked={ingredient.discrete} className="h-3.5 w-3.5 accent-amber" />
          Satuan diskret (dibulatkan saat scaling)
        </label>
        <Field label="Catatan" htmlFor="edit-notes">
          <Textarea id="edit-notes" name="notes" defaultValue={ingredient.notes ?? ""} rows={2} />
        </Field>
        <div className="rounded-lg border border-line bg-surface-low/40 p-3">
          <p className="mb-2 text-[11.5px] font-semibold text-ink">Konversi Satuan</p>
          <ConversionEditor rows={conversions} setRows={setConversions} />
          {errors.conversions ? <p className="mt-2 text-[10.5px] text-rose">{errors.conversions}</p> : null}
        </div>
      </form>
    </Modal>
  );
}

export function UpdatePriceModal({
  open,
  onClose,
  ingredient,
}: {
  open: boolean;
  onClose: () => void;
  ingredient: IngredientView;
}) {
  const latest = ingredient.prices[0];
  const [state, action, pending] = useActionState(updateIngredientPriceAction, initialState);
  const [purchaseQty, setPurchaseQty] = useState(() => normalizeDecimalInput(latest?.purchaseQty, "1"));
  const [purchaseUnit, setPurchaseUnit] = useState(latest?.purchaseUnit ?? ingredient.baseUnit);
  const [price, setPrice] = useState(() => normalizeDecimalInput(latest?.price, ""));
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onClose();
      router.refresh();
    } else if (state.ok === false && state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, onClose, router]);

  const conversions = ingredient.conversions.map((conversion) => ({
    fromUnit: conversion.fromUnit,
    toUnit: conversion.toUnit,
    factor: conversion.factor,
  }));
  const errors = state.fieldErrors ?? {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update Harga Beli"
      description="Record harga baru akan append-only. Snapshot HPP lama tidak berubah."
      eyebrow={`${ingredient.sku} · Harga aktif ${latest ? `${formatCurrencyPrecise(latest.pricePerBaseUnit)} / ${ingredient.baseUnit}` : "belum ada"}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="amber" type="submit" form="update-price-form" loading={pending}>
            Simpan Harga Baru
          </Button>
        </>
      }
    >
      <form id="update-price-form" action={action} className="space-y-4">
        <input type="hidden" name="ingredientId" value={ingredient.id} />
        {state.ok === false && state.message && !Object.keys(errors).length ? <ErrorNote>{state.message}</ErrorNote> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Isi per Pembelian" htmlFor="price-qty" required error={errors.purchaseQty}>
            <NumberInput
              id="price-qty"
              name="purchaseQty"
              value={purchaseQty}
              onChange={(event) => setPurchaseQty(event.target.value)}
            />
          </Field>
          <Field label="Satuan" htmlFor="price-unit" required error={errors.purchaseUnit}>
            <Select id="price-unit" name="purchaseUnit" value={purchaseUnit} onChange={(event) => setPurchaseUnit(event.target.value)}>
              {UNIT_OPTIONS.map((unit) => (
                <option key={unit.code} value={unit.code}>
                  {unit.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Harga Faktur (Rp)" htmlFor="price-value" required error={errors.price}>
            <NumberInput id="price-value" name="price" value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
        </div>
        <NormalizationPreview
          baseUnit={ingredient.baseUnit}
          purchaseQty={purchaseQty}
          purchaseUnit={purchaseUnit}
          price={price}
          conversions={conversions.map((conversion) => ({ ...conversion, factor: String(conversion.factor) }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Berlaku Sejak" htmlFor="price-date">
            <Input id="price-date" name="effectiveFrom" type="date" defaultValue={todayInput()} />
          </Field>
          <Field label="Catatan" htmlFor="price-note">
            <Input id="price-note" name="note" placeholder="Contoh: penyesuaian supplier" />
          </Field>
        </div>
        {latest ? (
          <div className="rounded-md border border-line bg-surface-low/50 px-3 py-2 font-mono text-[10px] text-muted">
            Harga aktif saat ini: {formatCurrencyPrecise(latest.price)} / {latest.purchaseQty} {latest.purchaseUnit} · efektif {formatDate(latest.effectiveFrom)}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

export function ImportCsvModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action, pending] = useActionState(importIngredientsAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (state.ok === false && state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import CSV Bahan Baku"
      description="Bulk upsert berdasarkan SKU. Setiap baris membuat record harga baru (append-only)."
      eyebrow="Modul Master Data · Import"
      size="lg"
      footer={
        <>
          <a
            href="/api/export/ingredients?template=1"
            className="mr-auto text-[11px] font-semibold text-copper hover:underline"
          >
            Unduh template CSV
          </a>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button variant="dark" type="submit" form="import-csv-form" loading={pending}>
            Import Sekarang
          </Button>
        </>
      }
    >
      <form id="import-csv-form" action={action} className="space-y-3">
        {state.ok === false && state.message ? <ErrorNote>{state.message}</ErrorNote> : null}
        <Field label="File CSV" htmlFor="file" help="Maksimal beberapa ratus baris. Header wajib: name, sku, category, base_unit, purchase_qty, purchase_unit, price.">
          <Input id="file" name="file" type="file" accept=".csv,text/csv" className="h-auto py-1.5 file:mr-2 file:rounded file:border-0 file:bg-surface-mid file:px-2 file:py-1 file:text-[10px] file:font-semibold" />
        </Field>
        <Field label="Atau tempel isi CSV" htmlFor="csvText">
          <Textarea
            id="csvText"
            name="csvText"
            rows={9}
            className="font-mono text-[10.5px]"
            placeholder={`name,sku,category,base_unit,purchase_qty,purchase_unit,price,effective_from,conversions,notes
Telur Ayam Ras,TELUR-001,Dairy & Telur,butir,1,butir,2000,2026-11-16,1 butir = 55 gr,Kemasan tray`}
          />
        </Field>
      </form>
    </Modal>
  );
}
