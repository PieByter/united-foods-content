# @ufc/costing

Domain kalkulasi murni untuk UFC — United Foods Content. Package ini tidak bergantung pada Next.js, React, atau Drizzle sehingga dapat dipakai di server maupun client dengan hasil yang identik.

## Isi package

| File | Tanggung jawab |
| --- | --- |
| `units.ts` | Registry satuan, konversi BFS, error konversi keras |
| `scaling.ts` | Faktor/target yield, pembulatan, nilai praktis dapur, warning non-linear |
| `costing.ts` | Recursive recipe costing, price strategy, overhead, yield loss, DAG |
| `pricing.ts` | Margin, markup, food cost, reverse pricing, break-even |
| `decimal.ts` | Helper Decimal.js dan konversi ke string |
| `types.ts` | Tipe input/output publik |

## Contoh penggunaan

```ts
import { calculateRecipeCost, computePricingMetrics } from "@ufc/costing";

const result = calculateRecipeCost({
  recipe: {
    id: "roti-pemula",
    name: "Roti Pemula",
    yieldQty: 5,
    yieldUnit: "pcs",
    yieldLossPct: 0,
    items: [
      { type: "ingredient", refId: "flour", qty: 500, unit: "gr" },
      { type: "ingredient", refId: "egg", qty: 2, unit: "butir", discrete: true },
      { type: "ingredient", refId: "yeast", qty: 1, unit: "bungkus" },
    ],
  },
  ingredients: [
    { id: "flour", name: "Tepung", baseUnit: "gr" },
    { id: "egg", name: "Telur", baseUnit: "butir", discrete: true,
      conversions: [{ fromUnit: "butir", toUnit: "gr", factor: 55 }] },
    { id: "yeast", name: "Ragi", baseUnit: "gr",
      conversions: [{ fromUnit: "bungkus", toUnit: "gr", factor: 11 }] },
  ],
  prices: {
    flour: [{ pricePerBaseUnit: 12, purchaseQty: 1, purchaseUnit: "kg", price: 12000 }],
    egg: [{ pricePerBaseUnit: 2000, purchaseQty: 1, purchaseUnit: "butir", price: 2000 }],
    yeast: [{ pricePerBaseUnit: 272.727273, purchaseQty: 1, purchaseUnit: "bungkus", price: 3000 }],
  },
  priceStrategy: "latest",
});

// result.rawMaterialCost === "13000"
// result.costPerUnit === "2600"

const metrics = computePricingMetrics({
  costPerUnit: result.costPerUnit,
  sellingPrice: 10000,
});
// profit 7400, margin 74%, markup 284.62%, food cost 26%
```

## Prinsip penting

- **Decimal end-to-end.** Jangan memakai `Number()` untuk agregasi uang.
- **Konversi eksplisit.** Tidak ada tebakan butir → gram; deklarasikan konversi per bahan.
- **Biaya dari lot purchase.** Jika record harga memiliki `price`, `purchaseQty`, dan `purchaseUnit`, biaya dihitung dari harga lot agar tidak kehilangan presisi akibat pembulatan harga per base unit.
- **Snapshot append-only.** Package hanya menghitung; penyimpanan snapshot dilakukan service layer.
- **Deterministik.** Input yang sama menghasilkan output yang sama; `asOf` menentukan harga historis.

## Testing

Dari root repository:

```bash
npm test
```

Acceptance reference PRD §6 dan test satuan/resep berada di `tests/costing.test.ts`.
