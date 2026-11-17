import { z } from "zod";
import { normalizeVideoUrl, VIDEO_PLATFORMS } from "@/lib/video";

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

const requiredVideoUrl = z
  .string()
  .trim()
  .min(1, "URL video wajib diisi.")
  .max(1000, "URL video terlalu panjang.")
  .refine((value) => normalizeVideoUrl(value) !== null, "URL video harus berupa tautan http/https yang valid.")
  .transform((value) => normalizeVideoUrl(value) ?? value);

const optionalExternalUrl = z
  .string()
  .trim()
  .max(1000, "URL terlalu panjang.")
  .optional()
  .nullable()
  .refine(
    (value) => !value || normalizeVideoUrl(value) !== null,
    "URL harus berupa tautan http/https yang valid.",
  )
  .transform((value) => (value ? normalizeVideoUrl(value) : null));

export const tutorialStepSchema = z.object({
  instruction: z
    .string()
    .trim()
    .min(3, "Instruksi langkah minimal 3 karakter.")
    .max(2000, "Instruksi langkah maksimal 2000 karakter."),
  durationSec: z.number().int().min(0).max(86_400).nullish(),
});

export const tutorialVideoSchema = z.object({
  url: requiredVideoUrl,
  title: z.string().trim().max(180, "Judul video maksimal 180 karakter.").nullish(),
  description: z.string().trim().max(800, "Deskripsi video maksimal 800 karakter.").nullish(),
  platform: z.enum(VIDEO_PLATFORMS).optional(),
  thumbnailUrl: optionalExternalUrl,
  durationSec: z.number().int().min(0).max(86_400).nullish(),
  authorName: z.string().trim().max(120, "Nama channel maksimal 120 karakter.").nullish(),
  source: z.enum(["manual", "ai"]).default("manual"),
});

export const recipeTutorialPayloadSchema = z.object({
  steps: z.array(tutorialStepSchema).max(40, "Maksimal 40 langkah tutorial.").default([]),
  videos: z.array(tutorialVideoSchema).max(12, "Maksimal 12 video per resep.").default([]),
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
