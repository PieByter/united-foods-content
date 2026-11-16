import { z } from "zod";

const requiredText = (label: string, min = 1) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(min, `${label} minimal ${min} karakter.`);

const decimalString = (label: string) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine((value) => value.length > 0, `${label} wajib diisi.`)
    .refine((value) => !Number.isNaN(Number(value.replace(",", "."))), `${label} harus berupa angka.`);

export const conversionSchema = z.object({
  fromUnit: requiredText("Satuan asal"),
  toUnit: requiredText("Satuan tujuan"),
  factor: decimalString("Faktor konversi"),
  note: z.string().trim().max(200).optional().nullable(),
});

export const ingredientCreateSchema = z.object({
  name: requiredText("Nama bahan", 2),
  sku: requiredText("Kode SKU", 2),
  category: requiredText("Kategori"),
  baseUnit: requiredText("Base unit"),
  discrete: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
  purchaseQty: decimalString("Isi per pembelian"),
  purchaseUnit: requiredText("Satuan pembelian"),
  price: decimalString("Harga beli"),
  effectiveFrom: z.string().optional(),
  conversions: z.array(conversionSchema).max(12).default([]),
});

export const ingredientUpdateSchema = z.object({
  id: z.string().uuid(),
  name: requiredText("Nama bahan", 2),
  sku: requiredText("Kode SKU", 2),
  category: requiredText("Kategori"),
  discrete: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().nullable(),
  conversions: z.array(conversionSchema).max(12).default([]),
});

export const priceUpdateSchema = z.object({
  ingredientId: z.string().uuid(),
  purchaseQty: decimalString("Isi per pembelian"),
  purchaseUnit: requiredText("Satuan pembelian"),
  price: decimalString("Harga beli"),
  effectiveFrom: z.string().optional(),
  note: z.string().trim().max(300).optional().nullable(),
});

export const recipeItemSchema = z.object({
  type: z.enum(["ingredient", "subrecipe", "overhead"]),
  refId: z.string().uuid().nullish(),
  label: z.string().trim().max(120).nullish(),
  qty: decimalString("Kuantitas"),
  unit: z.string().trim().min(1, "Satuan wajib diisi."),
  discrete: z.boolean().default(false),
  rounding: z.enum(["none", "half", "whole"]).default("none"),
  nonLinearScaling: z.boolean().default(false),
  note: z.string().trim().max(300).nullish(),
  overheadKind: z.enum(["fixed", "percent"]).nullish(),
  overheadValue: decimalString("Nilai overhead").nullish(),
});

export const recipePayloadSchema = z.object({
  id: z.string().uuid().optional(),
  name: requiredText("Nama resep", 2),
  description: z.string().trim().max(800).optional().nullable(),
  category: requiredText("Kategori resep"),
  status: z.enum(["draft", "published"]).default("draft"),
  isSubrecipe: z.boolean().default(false),
  yieldQty: decimalString("Yield"),
  yieldUnit: requiredText("Satuan yield"),
  unitWeightG: decimalString("Berat per unit").nullish(),
  yieldLossPct: decimalString("Yield loss").nullish(),
  notes: z.string().trim().max(500).nullish(),
  items: z.array(recipeItemSchema).min(1, "Tambahkan minimal satu item formula."),
});

export const settingsSchema = z.object({
  workspaceName: requiredText("Nama workspace", 2),
  ownerName: requiredText("Nama owner", 2),
  ownerRole: requiredText("Role", 2),
  defaultPriceStrategy: z.enum(["latest", "average", "snapshot"]),
  targetFoodCostPct: decimalString("Target food cost"),
  targetMarginPct: decimalString("Target margin"),
});

export const snapshotSchema = z.object({
  recipeId: z.string().uuid(),
  scaleFactor: decimalString("Faktor skala"),
  priceStrategy: z.enum(["latest", "average", "snapshot"]),
  asOf: z.string().optional(),
  sellingPrice: decimalString("Harga jual"),
  targetMarginPct: decimalString("Target margin").nullish(),
  roundingTo: decimalString("Pembulatan").nullish(),
  label: z.string().trim().max(160).optional().nullable(),
});

export type RecipePayload = z.infer<typeof recipePayloadSchema>;
export type RecipeItemPayload = z.infer<typeof recipeItemSchema>;
export type IngredientCreatePayload = z.infer<typeof ingredientCreateSchema>;
export type IngredientUpdatePayload = z.infer<typeof ingredientUpdateSchema>;
