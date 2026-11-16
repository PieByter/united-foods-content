"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { convertQuantity, findUnit, unitDimension, type UnitConversion, CostingError } from "@ufc/costing";
import { getDb, DEFAULT_OWNER_ID } from "@/server/db/client";
import * as schema from "@/server/db/schema";
import { ingredientCreateSchema, ingredientUpdateSchema, priceUpdateSchema } from "@/lib/schemas";
import { parseDecimalInput } from "@/lib/format";
import { fail, logAudit, ok, parseDateInput, type ActionState } from "./shared";
import { parseConversionsCell, parseCsv } from "@/server/csv";

function toDomainConversions(conversions: Array<{ fromUnit: string; toUnit: string; factor: string }>): UnitConversion[] {
  return conversions.map((conversion) => ({
    fromUnit: conversion.fromUnit,
    toUnit: conversion.toUnit,
    factor: conversion.factor,
  }));
}

function validateConversions(
  conversions: Array<{ fromUnit: string; toUnit: string; factor: string }>,
): string | null {
  for (const conversion of conversions) {
    if (!findUnit(conversion.fromUnit)) return `Satuan "${conversion.fromUnit}" belum terdaftar.`;
    if (!findUnit(conversion.toUnit)) return `Satuan "${conversion.toUnit}" belum terdaftar.`;
    const factor = new Decimal(conversion.factor);
    if (!factor.isFinite() || factor.lte(0)) return `Faktor konversi ${conversion.fromUnit} → ${conversion.toUnit} harus > 0.`;
    if (conversion.fromUnit.trim().toLowerCase() === conversion.toUnit.trim().toLowerCase()) {
      return `Satuan asal dan tujuan konversi tidak boleh sama.`;
    }
  }
  return null;
}

function normalize(
  purchaseQty: string,
  purchaseUnit: string,
  price: string,
  baseUnit: string,
  conversions: UnitConversion[],
): { purchaseQty: string; price: string; baseQty: string; pricePerBaseUnit: string } {
  const qty = new Decimal(parseDecimalInput(purchaseQty));
  const amount = new Decimal(parseDecimalInput(price));
  if (!qty.isFinite() || qty.lte(0)) throw new Error("Isi per pembelian harus lebih besar dari 0.");
  if (!amount.isFinite() || amount.lt(0)) throw new Error("Harga beli tidak boleh negatif.");
  const baseQty = convertQuantity(qty.toFixed(), purchaseUnit, baseUnit, conversions);
  const base = new Decimal(baseQty);
  if (base.lte(0)) throw new Error("Normalisasi harga menghasilkan base unit 0.");
  return {
    purchaseQty: qty.toFixed(),
    price: amount.toFixed(),
    baseQty,
    pricePerBaseUnit: amount.div(base).toFixed(6),
  };
}

function parseConversionsField(value: FormDataEntryValue | null): Array<{ fromUnit: string; toUnit: string; factor: string; note?: string | null }> {
  if (!value) return [];
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && String(row.fromUnit ?? "").trim() && String(row.toUnit ?? "").trim())
      .map((row) => ({
        fromUnit: String(row.fromUnit).trim(),
        toUnit: String(row.toUnit).trim(),
        factor: parseDecimalInput(String(row.factor ?? "")),
        note: row.note ? String(row.note) : null,
      }));
  } catch {
    return [];
  }
}

export async function createIngredientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const conversions = parseConversionsField(formData.get("conversions"));
  const parsed = ingredientCreateSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    baseUnit: formData.get("baseUnit"),
    discrete: formData.get("discrete") === "on" || formData.get("discrete") === "true",
    notes: formData.get("notes") || null,
    purchaseQty: parseDecimalInput(formData.get("purchaseQty") as string | null),
    purchaseUnit: formData.get("purchaseUnit"),
    price: parseDecimalInput(formData.get("price") as string | null),
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    conversions,
  });
  if (!parsed.success) {
    return fail("Periksa kembali data bahan baku.", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const data = parsed.data;
  const dimension = unitDimension(data.baseUnit);
  if (!dimension) return fail(`Base unit "${data.baseUnit}" tidak dikenal.`, { baseUnit: "Pilih satuan standar." });
  const conversionError = validateConversions(data.conversions);
  if (conversionError) return fail(conversionError, { conversions: conversionError });

  const domainConversions = toDomainConversions(data.conversions);

  try {
    const normalized = normalize(data.purchaseQty, data.purchaseUnit, data.price, data.baseUnit, domainConversions);
    const db = await getDb();

    const duplicateName = await db
      .select({ id: schema.ingredient.id })
      .from(schema.ingredient)
      .where(
        and(
          eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID),
          isNull(schema.ingredient.archivedAt),
          sql`lower(${schema.ingredient.name}) = ${data.name.toLowerCase()}`,
        ),
      )
      .limit(1);
    if (duplicateName.length > 0) return fail("Nama bahan sudah dipakai.", { name: "Gunakan nama lain." });

    const duplicateSku = await db
      .select({ id: schema.ingredient.id })
      .from(schema.ingredient)
      .where(and(eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID), eq(schema.ingredient.sku, data.sku)))
      .limit(1);
    if (duplicateSku.length > 0) return fail("Kode SKU sudah dipakai.", { sku: "Gunakan SKU lain." });

    const ingredientId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(schema.ingredient)
        .values({
          ownerId: DEFAULT_OWNER_ID,
          name: data.name,
          sku: data.sku,
          category: data.category,
          baseUnit: data.baseUnit,
          baseDimension: dimension,
          discrete: data.discrete,
          notes: data.notes || null,
        })
        .returning({ id: schema.ingredient.id });

      const id = inserted[0].id;
      if (data.conversions.length > 0) {
        await tx.insert(schema.ingredientConversion).values(
          data.conversions.map((conversion) => ({
            ownerId: DEFAULT_OWNER_ID,
            ingredientId: id,
            fromUnit: conversion.fromUnit,
            toUnit: conversion.toUnit,
            factor: new Decimal(conversion.factor).toFixed(6),
            note: conversion.note || null,
          })),
        );
      }

      await tx.insert(schema.ingredientPrice).values({
        ownerId: DEFAULT_OWNER_ID,
        ingredientId: id,
        purchaseQty: normalized.purchaseQty,
        purchaseUnit: data.purchaseUnit,
        price: normalized.price,
        pricePerBaseUnit: normalized.pricePerBaseUnit,
        effectiveFrom: parseDateInput(data.effectiveFrom),
        note: "Harga awal saat bahan dibuat",
        createdBy: "Chef Ayu",
      });

      await logAudit(tx, {
        action: "ingredient.created",
        entityType: "ingredient",
        entityId: id,
        summary: `Bahan "${data.name}" ditambahkan (${data.purchaseQty} ${data.purchaseUnit} = Rp${normalized.price}).`,
        metadata: {
          sku: data.sku,
          category: data.category,
          baseUnit: data.baseUnit,
          pricePerBaseUnit: normalized.pricePerBaseUnit,
        },
      });

      return id;
    });

    revalidatePath("/bahan-baku");
    revalidatePath("/dashboard");
    revalidatePath("/resep");
    revalidatePath("/simulator");
    return ok(`Bahan "${data.name}" berhasil dibuat.`, ingredientId);
  } catch (error) {
    if (error instanceof CostingError) return fail(error.message);
    const message = error instanceof Error ? error.message : "Gagal menyimpan bahan.";
    return fail(message);
  }
}

export async function updateIngredientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const conversions = parseConversionsField(formData.get("conversions"));
  const parsed = ingredientUpdateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    discrete: formData.get("discrete") === "on" || formData.get("discrete") === "true",
    notes: formData.get("notes") || null,
    conversions,
  });
  if (!parsed.success) {
    return fail("Periksa kembali data bahan.", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const data = parsed.data;
  const conversionError = validateConversions(data.conversions);
  if (conversionError) return fail(conversionError, { conversions: conversionError });

  try {
    const db = await getDb();
    const existing = await db
      .select()
      .from(schema.ingredient)
      .where(and(eq(schema.ingredient.id, data.id), eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID)))
      .limit(1);
    if (!existing[0]) return fail("Bahan tidak ditemukan.");

    const duplicateName = await db
      .select({ id: schema.ingredient.id })
      .from(schema.ingredient)
      .where(
        and(
          eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID),
          isNull(schema.ingredient.archivedAt),
          sql`lower(${schema.ingredient.name}) = ${data.name.toLowerCase()}`,
        ),
      );
    if (duplicateName.some((row) => row.id !== data.id)) {
      return fail("Nama bahan sudah dipakai bahan lain.", { name: "Gunakan nama lain." });
    }

    const duplicateSku = await db
      .select({ id: schema.ingredient.id })
      .from(schema.ingredient)
      .where(
        and(
          eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID),
          eq(schema.ingredient.sku, data.sku),
          isNull(schema.ingredient.archivedAt),
        ),
      );
    if (duplicateSku.some((row) => row.id !== data.id)) return fail("Kode SKU sudah dipakai bahan lain.", { sku: "Gunakan SKU lain." });

    // Pastikan perubahan konversi tidak mematahkan resep yang memakai bahan ini.
    const usageRows = await db
      .select({ unit: schema.recipeItem.unit, recipeName: schema.recipe.name })
      .from(schema.recipeItem)
      .innerJoin(schema.recipeVersion, eq(schema.recipeItem.recipeVersionId, schema.recipeVersion.id))
      .innerJoin(schema.recipe, eq(schema.recipeVersion.recipeId, schema.recipe.id))
      .where(
        and(
          eq(schema.recipe.ownerId, DEFAULT_OWNER_ID),
          isNull(schema.recipe.archivedAt),
          eq(schema.recipe.currentVersionId, schema.recipeVersion.id),
          eq(schema.recipeItem.refId, data.id),
          eq(schema.recipeItem.itemType, "ingredient"),
        ),
      );

    for (const usage of usageRows) {
      try {
        convertQuantity(1, usage.unit, existing[0].baseUnit, toDomainConversions(data.conversions));
      } catch {
        return fail(
          `Konversi ${usage.unit} → ${existing[0].baseUnit} masih dipakai resep "${usage.recipeName}". Pertahankan konversi tersebut.`,
          { conversions: "Konversi ini dibutuhkan resep aktif." },
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(schema.ingredient)
        .set({
          name: data.name,
          sku: data.sku,
          category: data.category,
          discrete: data.discrete,
          notes: data.notes || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.ingredient.id, data.id));

      await tx.delete(schema.ingredientConversion).where(eq(schema.ingredientConversion.ingredientId, data.id));
      if (data.conversions.length > 0) {
        await tx.insert(schema.ingredientConversion).values(
          data.conversions.map((conversion) => ({
            ownerId: DEFAULT_OWNER_ID,
            ingredientId: data.id,
            fromUnit: conversion.fromUnit,
            toUnit: conversion.toUnit,
            factor: new Decimal(conversion.factor).toFixed(6),
            note: conversion.note || null,
          })),
        );
      }

      await logAudit(tx, {
        action: "ingredient.updated",
        entityType: "ingredient",
        entityId: data.id,
        summary: `Master bahan "${data.name}" diperbarui (${data.conversions.length} konversi aktif).`,
        metadata: { sku: data.sku, category: data.category, discrete: data.discrete },
      });
    });

    revalidatePath("/bahan-baku");
    revalidatePath("/dashboard");
    revalidatePath("/resep");
    return ok("Master bahan berhasil diperbarui.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal memperbarui bahan.");
  }
}

export async function updateIngredientPriceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = priceUpdateSchema.safeParse({
    ingredientId: formData.get("ingredientId"),
    purchaseQty: parseDecimalInput(formData.get("purchaseQty") as string | null),
    purchaseUnit: formData.get("purchaseUnit"),
    price: parseDecimalInput(formData.get("price") as string | null),
    effectiveFrom: String(formData.get("effectiveFrom") ?? ""),
    note: formData.get("note") || null,
  });
  if (!parsed.success) {
    return fail("Periksa kembali harga beli.", parsed.error.flatten().fieldErrors as Record<string, string>);
  }
  const data = parsed.data;

  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.ingredient)
      .where(and(eq(schema.ingredient.id, data.ingredientId), eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID)))
      .limit(1);
    const ingredient = rows[0];
    if (!ingredient) return fail("Bahan tidak ditemukan.");

    const conversions = await db
      .select()
      .from(schema.ingredientConversion)
      .where(eq(schema.ingredientConversion.ingredientId, ingredient.id));
    const domainConversions = conversions.map((conversion) => ({
      fromUnit: conversion.fromUnit,
      toUnit: conversion.toUnit,
      factor: conversion.factor,
    }));

    const normalized = normalize(data.purchaseQty, data.purchaseUnit, data.price, ingredient.baseUnit, domainConversions);

    await db.transaction(async (tx) => {
      await tx.insert(schema.ingredientPrice).values({
        ownerId: DEFAULT_OWNER_ID,
        ingredientId: ingredient.id,
        purchaseQty: normalized.purchaseQty,
        purchaseUnit: data.purchaseUnit,
        price: normalized.price,
        pricePerBaseUnit: normalized.pricePerBaseUnit,
        effectiveFrom: parseDateInput(data.effectiveFrom),
        note: data.note || null,
        createdBy: "Chef Ayu",
      });

      await tx
        .update(schema.ingredient)
        .set({ updatedAt: new Date() })
        .where(eq(schema.ingredient.id, ingredient.id));

      await logAudit(tx, {
        action: "ingredient.price.created",
        entityType: "ingredient",
        entityId: ingredient.id,
        summary: `Harga "${ingredient.name}" diperbarui: ${data.purchaseQty} ${data.purchaseUnit} = Rp${normalized.price}.`,
        metadata: {
          purchaseQty: normalized.purchaseQty,
          purchaseUnit: data.purchaseUnit,
          price: normalized.price,
          pricePerBaseUnit: normalized.pricePerBaseUnit,
          effectiveFrom: parseDateInput(data.effectiveFrom).toISOString(),
        },
      });
    });

    revalidatePath("/bahan-baku");
    revalidatePath("/dashboard");
    revalidatePath("/resep");
    revalidatePath("/simulator");
    return ok(`Harga ${ingredient.name} tersimpan. HPP terkait akan memakai harga terbaru.`);
  } catch (error) {
    if (error instanceof CostingError) return fail(error.message);
    return fail(error instanceof Error ? error.message : "Gagal menyimpan harga.");
  }
}

export async function archiveIngredientAction(id: string): Promise<ActionState> {
  try {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.ingredient)
      .where(and(eq(schema.ingredient.id, id), eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID)))
      .limit(1);
    if (!rows[0]) return fail("Bahan tidak ditemukan.");

    await db.transaction(async (tx) => {
      await tx
        .update(schema.ingredient)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.ingredient.id, id));
      await logAudit(tx, {
        action: "ingredient.archived",
        entityType: "ingredient",
        entityId: id,
        summary: `Bahan "${rows[0].name}" diarsipkan dari katalog aktif.`,
        metadata: { sku: rows[0].sku },
      });
    });

    revalidatePath("/bahan-baku");
    revalidatePath("/dashboard");
    return ok(`Bahan ${rows[0].name} diarsipkan.`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Gagal mengarsipkan bahan.");
  }
}

function csvValue(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const found = row[key];
    if (found !== undefined && found !== null && String(found).trim() !== "") return String(found).trim();
  }
  return "";
}

export async function importIngredientsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    let text = String(formData.get("csvText") ?? "").trim();
    const file = formData.get("file");
    if (file && typeof file === "object" && "text" in file && typeof file.text === "function") {
      const fileText = await file.text();
      if (fileText.trim()) text = fileText;
    }
    if (!text) return fail("Tempel isi CSV atau pilih file terlebih dahulu.");

    const rows = parseCsv(text);
    if (rows.length < 2) return fail("CSV harus memiliki header dan minimal satu baris data.");
    const header = rows[0].map((cell) => cell.trim().toLowerCase().replace(/\s+/g, "_"));
    const dataRows = rows.slice(1).map((values) => {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = values[index] ?? "";
      });
      return record;
    });

    const db = await getDb();
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const [index, row] of dataRows.entries()) {
      const line = index + 2;
      const name = csvValue(row, "name", "nama", "nama_bahan");
      const sku = csvValue(row, "sku", "kode_sku", "kode");
      const category = csvValue(row, "category", "kategori") || "Lainnya";
      const baseUnit = csvValue(row, "base_unit", "satuan_dasar", "baseunit");
      const purchaseQty = parseDecimalInput(csvValue(row, "purchase_qty", "isi_beli", "qty_beli"));
      const purchaseUnit = csvValue(row, "purchase_unit", "satuan_beli");
      const price = parseDecimalInput(csvValue(row, "price", "harga", "harga_beli"));
      const effectiveFrom = csvValue(row, "effective_from", "tanggal_efektif");
      const conversions = parseConversionsCell(csvValue(row, "conversions", "konversi"));

      if (!name || !sku || !baseUnit || !purchaseQty || !purchaseUnit || !price) {
        errors.push(`Baris ${line}: kolom wajib (name, sku, base_unit, purchase_qty, purchase_unit, price) belum lengkap.`);
        continue;
      }

      const dimension = unitDimension(baseUnit);
      if (!dimension) {
        errors.push(`Baris ${line}: base unit "${baseUnit}" tidak dikenal.`);
        continue;
      }
      const conversionError = validateConversions(conversions);
      if (conversionError) {
        errors.push(`Baris ${line}: ${conversionError}`);
        continue;
      }

      try {
        const domainConversions = toDomainConversions(conversions);
        const normalized = normalize(purchaseQty, purchaseUnit, price, baseUnit, domainConversions);
        const existing = await db
          .select()
          .from(schema.ingredient)
          .where(and(eq(schema.ingredient.ownerId, DEFAULT_OWNER_ID), eq(schema.ingredient.sku, sku)))
          .limit(1);

        if (existing[0]) {
          await db.transaction(async (tx) => {
            await tx
              .update(schema.ingredient)
              .set({ name, category, archivedAt: null, updatedAt: new Date() })
              .where(eq(schema.ingredient.id, existing[0].id));
            await tx.insert(schema.ingredientPrice).values({
              ownerId: DEFAULT_OWNER_ID,
              ingredientId: existing[0].id,
              purchaseQty: normalized.purchaseQty,
              purchaseUnit,
              price: normalized.price,
              pricePerBaseUnit: normalized.pricePerBaseUnit,
              effectiveFrom: parseDateInput(effectiveFrom),
              note: "Import CSV",
              createdBy: "Chef Ayu",
            });
          });
          updated += 1;
        } else {
          await db.transaction(async (tx) => {
            const inserted = await tx
              .insert(schema.ingredient)
              .values({
                ownerId: DEFAULT_OWNER_ID,
                name,
                sku,
                category,
                baseUnit,
                baseDimension: dimension,
                discrete: false,
                notes: csvValue(row, "notes", "catatan") || null,
              })
              .returning({ id: schema.ingredient.id });
            if (conversions.length > 0) {
              await tx.insert(schema.ingredientConversion).values(
                conversions.map((conversion) => ({
                  ownerId: DEFAULT_OWNER_ID,
                  ingredientId: inserted[0].id,
                  fromUnit: conversion.fromUnit,
                  toUnit: conversion.toUnit,
                  factor: new Decimal(conversion.factor).toFixed(6),
                })),
              );
            }
            await tx.insert(schema.ingredientPrice).values({
              ownerId: DEFAULT_OWNER_ID,
              ingredientId: inserted[0].id,
              purchaseQty: normalized.purchaseQty,
              purchaseUnit,
              price: normalized.price,
              pricePerBaseUnit: normalized.pricePerBaseUnit,
              effectiveFrom: parseDateInput(effectiveFrom),
              note: "Import CSV",
              createdBy: "Chef Ayu",
            });
          });
          created += 1;
        }
      } catch (error) {
        skipped += 1;
        errors.push(`Baris ${line}: ${error instanceof Error ? error.message : "gagal diproses"}`);
      }
    }

    await logAudit(db, {
      action: "ingredient.imported",
      entityType: "ingredient",
      summary: `Import CSV bahan: ${created} baru, ${updated} diperbarui, ${skipped} dilewati.`,
      metadata: { created, updated, skipped, errors: errors.slice(0, 10) },
    });

    revalidatePath("/bahan-baku");
    revalidatePath("/dashboard");
    revalidatePath("/resep");

    const detail = errors.length > 0 ? ` Catatan: ${errors.slice(0, 3).join(" ")}` : "";
    return ok(`Import selesai — ${created} bahan baru, ${updated} diperbarui, ${skipped} dilewati.${detail}`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Import CSV gagal.");
  }
}
