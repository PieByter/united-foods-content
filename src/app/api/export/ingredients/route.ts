import { NextResponse } from "next/server";
import { getIngredientsWithMeta } from "@/server/queries";
import { toCsv } from "@/server/csv";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const template = url.searchParams.get("template") === "1";

  if (template) {
    const csv = toCsv(
      [
        {
          name: "Telur Ayam Ras Grade A",
          sku: "EGG-005",
          category: "Dairy & Telur",
          base_unit: "butir",
          purchase_qty: "1",
          purchase_unit: "butir",
          price: "2000",
          effective_from: "2026-11-16",
          conversions: "1 butir = 55 gr",
          notes: "Rata-rata 55 gr/butir",
        },
        {
          name: "Butter Unsalted",
          sku: "BTR-009",
          category: "Lemak & Minyak",
          base_unit: "gr",
          purchase_qty: "1",
          purchase_unit: "blok",
          price: "385000",
          effective_from: "2026-11-16",
          conversions: "1 blok = 2500 gr; 1 sdm = 14,2 gr",
          notes: "Blok 2.500 gr",
        },
      ],
      ["name", "sku", "category", "base_unit", "purchase_qty", "purchase_unit", "price", "effective_from", "conversions", "notes"],
    );
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ufc-template-bahan.csv"',
      },
    });
  }

  const ingredients = await getIngredientsWithMeta();
  const rows = ingredients.map((ingredient) => ({
    name: ingredient.name,
    sku: ingredient.sku,
    category: ingredient.category,
    base_unit: ingredient.baseUnit,
    purchase_qty: ingredient.latestPrice?.purchaseQty ?? "",
    purchase_unit: ingredient.latestPrice?.purchaseUnit ?? "",
    price: ingredient.latestPrice?.price ?? "",
    effective_from: ingredient.latestPrice?.effectiveFrom?.slice(0, 10) ?? "",
    conversions: ingredient.conversions.map((conversion) => `1 ${conversion.fromUnit} = ${conversion.factor} ${conversion.toUnit}`).join("; "),
    notes: ingredient.notes ?? "",
  }));

  return new NextResponse(`\uFEFF${toCsv(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="ufc-bahan-baku.csv"',
    },
  });
}
