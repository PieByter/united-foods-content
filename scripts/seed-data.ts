import { sql } from "drizzle-orm";
import Decimal from "decimal.js";
import {
  calculateRecipeCost,
  computePricingMetrics,
  convertQuantity,
  type IngredientInput,
  type RecipeInput,
} from "@ufc/costing";
import * as schema from "../src/server/db/schema";
import type { AppDb } from "../src/server/db/client";
import { detectVideoPlatform, normalizeVideoUrl, youtubeThumbnail } from "../src/lib/video";

const SEED_OWNER_ID = "00000000-0000-0000-0000-000000000001";
const ACTOR = "Chef Ayu";

interface SeedPrice {
  purchaseQty: string;
  purchaseUnit: string;
  price: string;
  daysAgo: number;
  note?: string;
}

interface SeedIngredient {
  key: string;
  name: string;
  sku: string;
  category: string;
  baseUnit: string;
  baseDimension: "mass" | "volume" | "count";
  discrete?: boolean;
  notes?: string;
  conversions?: Array<{ fromUnit: string; toUnit: string; factor: string }>;
  prices: SeedPrice[];
}

const INGREDIENTS: SeedIngredient[] = [
  {
    key: "flour-strong",
    name: "Tepung Terigu Protein Tinggi (Cakra Kembar)",
    sku: "FLR-001",
    category: "Tepung & Pati",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Kemasan 1 kg. Protein 13–14%, cocok untuk roti dan viennoiserie.",
    prices: [
      { purchaseQty: "1", purchaseUnit: "kg", price: "11400", daysAgo: 60, note: "Harga kontrak supplier Q3" },
      { purchaseQty: "1", purchaseUnit: "kg", price: "12000", daysAgo: 2, note: "Penyesuaian gandum impor" },
    ],
  },
  {
    key: "flour-ap",
    name: "Tepung Terigu Serbaguna (Segitiga Biru)",
    sku: "FLR-002",
    category: "Tepung & Pati",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Kemasan 1 kg untuk kue kering dan bolu.",
    prices: [
      { purchaseQty: "1", purchaseUnit: "kg", price: "10500", daysAgo: 30 },
      { purchaseQty: "1", purchaseUnit: "kg", price: "11000", daysAgo: 5 },
    ],
  },
  {
    key: "egg",
    name: "Telur Ayam Ras Grade A (Omega)",
    sku: "EGG-004",
    category: "Dairy & Telur",
    baseUnit: "butir",
    baseDimension: "count",
    discrete: true,
    notes: "Rata-rata 55 gr/butir. Putih 35 gr, kuning 20 gr.",
    conversions: [{ fromUnit: "butir", toUnit: "gr", factor: "55" }],
    prices: [
      { purchaseQty: "1", purchaseUnit: "butir", price: "1919", daysAgo: 35 },
      { purchaseQty: "1", purchaseUnit: "butir", price: "2000", daysAgo: 3, note: "Kenaikan peternak lokal" },
    ],
  },
  {
    key: "yeast",
    name: "Ragi Instan (Fermipan)",
    sku: "YST-001",
    category: "Ragi & Pengembang",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Sachet 11 gr. Simpan vacuum, aktifkan dengan air hangat 35°C.",
    conversions: [{ fromUnit: "bungkus", toUnit: "gr", factor: "11" }],
    prices: [
      { purchaseQty: "11", purchaseUnit: "gr", price: "2777", daysAgo: 45 },
      { purchaseQty: "1", purchaseUnit: "bungkus", price: "3000", daysAgo: 4, note: "Kemasan sachet retail" },
    ],
  },
  {
    key: "sugar",
    name: "Gula Pasir Kristal Putih",
    sku: "SGR-001",
    category: "Gula & Pemanis",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Kemasan 1 kg.",
    prices: [{ purchaseQty: "1", purchaseUnit: "kg", price: "18000", daysAgo: 20 }],
  },
  {
    key: "salt",
    name: "Garam Halus Beryodium",
    sku: "SLT-001",
    category: "Bumbu & Garam",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Kemasan 500 gr.",
    prices: [{ purchaseQty: "500", purchaseUnit: "gr", price: "5000", daysAgo: 60 }],
  },
  {
    key: "butter",
    name: "Butter Unsalted (Elle & Vire)",
    sku: "BTR-008",
    category: "Lemak & Minyak",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Blok 2.500 gr, 82% fat. Simpan chiller 2–4°C.",
    conversions: [
      { fromUnit: "blok", toUnit: "gr", factor: "2500" },
      { fromUnit: "sdm", toUnit: "gr", factor: "14.2" },
    ],
    prices: [
      { purchaseQty: "1", purchaseUnit: "blok", price: "375000", daysAgo: 50 },
      { purchaseQty: "1", purchaseUnit: "blok", price: "385000", daysAgo: 7, note: "Kenaikan harga dairy Eropa" },
    ],
  },
  {
    key: "milk",
    name: "Susu UHT Full Cream",
    sku: "MLK-001",
    category: "Dairy & Telur",
    baseUnit: "ml",
    baseDimension: "volume",
    notes: "Kemasan 1 liter.",
    prices: [{ purchaseQty: "1", purchaseUnit: "l", price: "22000", daysAgo: 25 }],
  },
  {
    key: "milk-powder",
    name: "Susu Bubuk Full Cream",
    sku: "MLK-002",
    category: "Dairy & Telur",
    baseUnit: "gr",
    baseDimension: "mass",
    prices: [{ purchaseQty: "1", purchaseUnit: "kg", price: "95000", daysAgo: 40 }],
  },
  {
    key: "chocolate",
    name: "Cokelat Compound Dark 55%",
    sku: "CHO-001",
    category: "Cokelat & Isian",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Kemasan 1 kg, coating dan glaze.",
    prices: [{ purchaseQty: "1", purchaseUnit: "kg", price: "65000", daysAgo: 30 }],
  },
  {
    key: "cheese",
    name: "Keju Cheddar Parut",
    sku: "CHS-001",
    category: "Keju & Olahan",
    baseUnit: "gr",
    baseDimension: "mass",
    prices: [{ purchaseQty: "1", purchaseUnit: "kg", price: "120000", daysAgo: 15 }],
  },
  {
    key: "potato",
    name: "Kentang Granola",
    sku: "POT-001",
    category: "Buah & Sayur",
    baseUnit: "gr",
    baseDimension: "mass",
    notes: "Kukus dan haluskan untuk donat kentang.",
    prices: [{ purchaseQty: "1", purchaseUnit: "kg", price: "17000", daysAgo: 10 }],
  },
  {
    key: "oil",
    name: "Minyak Goreng Kelapa Sawit",
    sku: "OIL-003",
    category: "Lemak & Minyak",
    baseUnit: "ml",
    baseDimension: "volume",
    conversions: [{ fromUnit: "sdm", toUnit: "ml", factor: "15" }],
    prices: [{ purchaseQty: "2", purchaseUnit: "l", price: "38000", daysAgo: 12 }],
  },
  {
    key: "baking-powder",
    name: "Baking Powder Double Acting",
    sku: "BKP-001",
    category: "Ragi & Pengembang",
    baseUnit: "gr",
    baseDimension: "mass",
    conversions: [{ fromUnit: "bungkus", toUnit: "gr", factor: "11" }],
    prices: [{ purchaseQty: "1", purchaseUnit: "bungkus", price: "4500", daysAgo: 55 }],
  },
  {
    key: "vanilla",
    name: "Vanili Ekstrak",
    sku: "VAN-001",
    category: "Bumbu & Garam",
    baseUnit: "ml",
    baseDimension: "volume",
    prices: [{ purchaseQty: "30", purchaseUnit: "ml", price: "12000", daysAgo: 60 }],
  },
  {
    key: "water",
    name: "Air Filtrasi",
    sku: "WTR-001",
    category: "Lainnya",
    baseUnit: "ml",
    baseDimension: "volume",
    notes: "Air minum terfilter, suhu adonan 18–22°C.",
    prices: [{ purchaseQty: "1", purchaseUnit: "l", price: "3000", daysAgo: 90 }],
  },
  {
    key: "cream",
    name: "Whipping Cream 35%",
    sku: "CRM-001",
    category: "Dairy & Telur",
    baseUnit: "ml",
    baseDimension: "volume",
    prices: [{ purchaseQty: "1", purchaseUnit: "l", price: "38000", daysAgo: 20 }],
  },
];

interface SeedItem {
  type: "ingredient" | "subrecipe" | "overhead";
  ref?: string;
  label?: string;
  qty?: string;
  unit?: string;
  discrete?: boolean;
  rounding?: "none" | "half" | "whole";
  nonLinearScaling?: boolean;
  note?: string;
  overheadKind?: "fixed" | "percent";
  overheadValue?: string;
}

interface SeedStep {
  instruction: string;
  durationMin?: number;
}

interface SeedVideo {
  url: string;
  title: string;
  description?: string;
  authorName?: string;
}

interface SeedRecipe {
  key: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  category: string;
  status: "draft" | "published";
  isSubrecipe?: boolean;
  yieldQty: string;
  yieldUnit: string;
  unitWeightG?: string;
  yieldLossPct: string;
  sellingPrice?: string;
  previousVersions?: number;
  steps?: SeedStep[];
  videos?: SeedVideo[];
  items: SeedItem[];
}

const RECIPES: SeedRecipe[] = [
  {
    key: "roti-pemula",
    name: "Roti Pemula (Classic Loaf)",
    code: "REC-2026-ROT-001",
    slug: "roti-pemula-classic-loaf",
    description:
      "Resep roti putih lembuh standar untuk uji coba kalkulasi HPP dan scaling fase 1. Parameter formula divalidasi berdasarkan toleransi oven deck komersial.",
    category: "Bakery & Roti",
    status: "published",
    yieldQty: "5",
    yieldUnit: "pcs",
    unitWeightG: "100",
    yieldLossPct: "0",
    sellingPrice: "10000",
    previousVersions: 2,
    items: [
      { type: "ingredient", ref: "flour-strong", qty: "500", unit: "gr", note: "Cakra Kembar, ayak sebelum dimix" },
      { type: "ingredient", ref: "egg", qty: "2", unit: "butir", discrete: true, note: "Gunakan suhu ruang" },
      {
        type: "ingredient",
        ref: "yeast",
        qty: "1",
        unit: "bungkus",
        nonLinearScaling: true,
        note: "Larutkan dengan air hangat 35°C",
      },
    ],
    steps: [
      { instruction: "Campur tepung protein tinggi, gula, dan ragi. Aduk rata di mangkuk mixer.", durationMin: 5 },
      { instruction: "Masukkan telur dan air bertahap, mix kecepatan rendah sampai adonan menyatu.", durationMin: 8 },
      { instruction: "Tambahkan garam dan butter, lanjutkan kneading sampai adonan lolos windowpane test.", durationMin: 12 },
      { instruction: "Bulk fermentation di suhu 28°C selama 60 menit sampai mengembang dua kali lipat.", durationMin: 60 },
      { instruction: "Punch down, bagi adonan 100 gr, rounding, lalu rest 15 menit sebelum shaping.", durationMin: 15 },
      { instruction: "Shape loaf, proofing 45 menit, lalu bake di 180°C selama 25–30 menit.", durationMin: 30 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=roti+pemula+classic+loaf+tutorial",
        title: "Referensi teknik dasar roti pemula",
        description: "Contoh tautan demo: kneading, proofing, dan shaping loaf. Ganti dengan video internal produksi.",
        authorName: "YouTube · demo",
      },
      {
        url: "https://www.youtube.com/results?search_query=windowpane+test+dough",
        title: "Cara membaca windowpane test",
        description: "Contoh referensi untuk memastikan gluten sudah cukup berkembang sebelum fermentasi.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "croissant-butter",
    name: "Croissant Butter AOP",
    code: "REC-2026-VIE-002",
    slug: "croissant-butter-aop",
    description:
      "Laminated viennoiserie dengan butter AOP 82%. Formula 3-fold lamination, proofing 26°C selama 90 menit, baking loss 8%.",
    category: "Viennoiserie",
    status: "published",
    yieldQty: "12",
    yieldUnit: "pcs",
    unitWeightG: "65",
    yieldLossPct: "8",
    sellingPrice: "28000",
    previousVersions: 3,
    items: [
      { type: "ingredient", ref: "flour-strong", qty: "500", unit: "gr" },
      { type: "ingredient", ref: "egg", qty: "1", unit: "butir", discrete: true },
      { type: "ingredient", ref: "butter", qty: "250", unit: "gr", note: "Butter block untuk lamination" },
      { type: "ingredient", ref: "milk", qty: "150", unit: "ml" },
      { type: "ingredient", ref: "sugar", qty: "50", unit: "gr" },
      { type: "ingredient", ref: "yeast", qty: "1", unit: "bungkus", nonLinearScaling: true },
      { type: "ingredient", ref: "salt", qty: "8", unit: "gr" },
      { type: "overhead", label: "Kemasan Primer & Food Grade Box", overheadKind: "fixed", overheadValue: "3000", qty: "0", unit: "batch" },
      { type: "overhead", label: "Utilitas & Gas Deck Oven", overheadKind: "fixed", overheadValue: "2000", qty: "0", unit: "batch" },
    ],
    steps: [
      { instruction: "Campur tepung, gula, ragi, susu, dan telur hingga adonan kalis.", durationMin: 10 },
      { instruction: "Bungkus adonan dan resting di chiller selama 30 menit.", durationMin: 30 },
      { instruction: "Pipihkan butter AOP menjadi block 20x20 cm, lalu bungkus dengan adonan.", durationMin: 15 },
      { instruction: "Lakukan 3-fold lamination dengan resting 30 menit di antara lipatan.", durationMin: 90 },
      { instruction: "Rolling, potong segitiga, shape croissant, lalu proofing 26°C selama 90 menit.", durationMin: 90 },
      { instruction: "Egg wash dan bake di 190°C selama 18–20 menit sampai golden brown.", durationMin: 20 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=croissant+laminasi+butter+tutorial",
        title: "Teknik laminasi croissant",
        description: "Contoh referensi demo untuk butter block, folding, dan resting adonan.",
        authorName: "YouTube · demo",
      },
      {
        url: "https://www.youtube.com/results?search_query=croissant+shaping+technique",
        title: "Shaping croissant yang konsisten",
        description: "Contoh referensi demo untuk memotong segitiga dan membentuk croissant.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "donat-kentang",
    name: "Donat Kentang Glaze",
    code: "REC-2026-DON-003",
    slug: "donat-kentang-glaze",
    description:
      "Donat kentang lembut dengan glaze cokelat compound. Menggunakan sub-resep adonan dasar untuk menjaga konsistensi yield antar batch.",
    category: "Pastry & Donat",
    status: "published",
    yieldQty: "20",
    yieldUnit: "pcs",
    unitWeightG: "50",
    yieldLossPct: "6",
    sellingPrice: "9000",
    previousVersions: 1,
    items: [
      { type: "subrecipe", ref: "adonan-donat", qty: "900", unit: "gr", note: "Adonan dasar dari chiller" },
      { type: "ingredient", ref: "chocolate", qty: "150", unit: "gr", note: "Glaze cokelat dark" },
      { type: "ingredient", ref: "butter", qty: "30", unit: "gr" },
      { type: "ingredient", ref: "milk", qty: "50", unit: "ml" },
      { type: "ingredient", ref: "sugar", qty: "30", unit: "gr" },
      { type: "overhead", label: "Kemasan Bio Box", overheadKind: "fixed", overheadValue: "4000", qty: "0", unit: "batch" },
    ],
    steps: [
      { instruction: "Siapkan adonan dasar donat dari chiller, timbang 900 gr untuk satu batch.", durationMin: 5 },
      { instruction: "Rolling adonan setebal 1,5 cm, cetak ring, lalu proofing 30 menit.", durationMin: 30 },
      { instruction: "Goreng di suhu 170°C selama 1 menit per sisi sampai golden.", durationMin: 6 },
      { instruction: "Glaze dengan cokelat compound, resting 10 menit sebelum packing.", durationMin: 10 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=donat+kentang+glaze+tutorial",
        title: "Donat kentang lembut dan glaze",
        description: "Contoh referensi demo untuk proofing, frying, dan finishing glaze.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "baguette-artisan",
    name: "Baguette Artisan",
    code: "REC-2026-BAG-004",
    slug: "baguette-artisan",
    description:
      "Lean sourdough baguette dengan hidrasi 70%, cold retard 18 jam, dan baking loss 12%. Dibuat dengan autolyse 30 menit.",
    category: "Bakery & Roti",
    status: "published",
    yieldQty: "8",
    yieldUnit: "pcs",
    unitWeightG: "250",
    yieldLossPct: "12",
    sellingPrice: "18000",
    previousVersions: 2,
    items: [
      { type: "ingredient", ref: "flour-strong", qty: "1000", unit: "gr" },
      { type: "ingredient", ref: "water", qty: "700", unit: "ml", note: "Suhu air 18°C" },
      { type: "ingredient", ref: "salt", qty: "20", unit: "gr" },
      { type: "ingredient", ref: "yeast", qty: "1", unit: "bungkus", nonLinearScaling: true },
      { type: "overhead", label: "Utilitas Deck Oven & Steam", overheadKind: "fixed", overheadValue: "2500", qty: "0", unit: "batch" },
      { type: "overhead", label: "Kemasan Paper Bag", overheadKind: "fixed", overheadValue: "1500", qty: "0", unit: "batch" },
    ],
    steps: [
      { instruction: "Autolyse tepung dan air selama 30 menit sampai hidrasi merata.", durationMin: 30 },
      { instruction: "Tambahkan ragi dan salt, mix sampai adonan kalis dan windowpane.", durationMin: 12 },
      { instruction: "Bulk fermentation 2 jam dengan 3 kali fold setiap 30 menit.", durationMin: 120 },
      { instruction: "Divide 250 gr, pre-shape, lalu rest 20 menit.", durationMin: 20 },
      { instruction: "Final shape baguette dan cold retard 18 jam di chiller.", durationMin: 1080 },
      { instruction: "Score, masukkan ke oven 250°C dengan steam, bake 20 menit.", durationMin: 20 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=baguette+artisan+scoring+tutorial",
        title: "Scoring dan open crumb baguette",
        description: "Contoh referensi demo untuk sudut scoring, steam, dan kontrol crust.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "brioche-bun",
    name: "Brioche Burger Bun",
    code: "REC-2026-BRI-005",
    slug: "brioche-burger-bun",
    description:
      "Enriched butter bread untuk burger premium. Tangzhong 10% untuk tekstur lembut, egg wash double coat, yield 24 pcs @80 gr.",
    category: "Bakery & Roti",
    status: "published",
    yieldQty: "24",
    yieldUnit: "pcs",
    unitWeightG: "80",
    yieldLossPct: "5",
    sellingPrice: "12000",
    previousVersions: 1,
    items: [
      { type: "ingredient", ref: "flour-strong", qty: "1000", unit: "gr" },
      { type: "ingredient", ref: "egg", qty: "4", unit: "butir", discrete: true },
      { type: "ingredient", ref: "butter", qty: "300", unit: "gr" },
      { type: "ingredient", ref: "milk", qty: "300", unit: "ml" },
      { type: "ingredient", ref: "sugar", qty: "120", unit: "gr" },
      { type: "ingredient", ref: "yeast", qty: "2", unit: "bungkus", nonLinearScaling: true },
      { type: "ingredient", ref: "salt", qty: "12", unit: "gr" },
      { type: "overhead", label: "Kemasan Burger Box", overheadKind: "fixed", overheadValue: "6000", qty: "0", unit: "batch" },
    ],
    steps: [
      { instruction: "Buat tangzhong dari tepung dan susu, masak sampai membentuk pasta.", durationMin: 10 },
      { instruction: "Mix tepung, ragi, telur, gula, dan tangzhong sampai adonan menyatu.", durationMin: 10 },
      { instruction: "Masukkan butter bertahap, lanjutkan kneading sampai elastis.", durationMin: 15 },
      { instruction: "Bulk fermentation 60 menit hingga mengembang dua kali lipat.", durationMin: 60 },
      { instruction: "Bagi adonan 80 gr, rounding, lalu proofing 45 menit.", durationMin: 45 },
      { instruction: "Egg wash dua lapis dan bake di 180°C selama 15 menit.", durationMin: 15 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=brioche+burger+bun+tutorial",
        title: "Brioche bun lembut untuk burger",
        description: "Contoh referensi demo untuk tangzhong, proofing, dan egg wash.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "nastar-keju",
    name: "Nastar Keju",
    code: "REC-2026-NAS-006",
    slug: "nastar-keju",
    description:
      "Kue kering nastar dengan selai nanas dan topping keju cheddar. Yield 40 pcs @12 gr, baking loss 5%, overhead oven dialokasikan 5% dari bahan.",
    category: "Kue Kering",
    status: "published",
    yieldQty: "40",
    yieldUnit: "pcs",
    unitWeightG: "12",
    yieldLossPct: "5",
    sellingPrice: "6500",
    items: [
      { type: "ingredient", ref: "flour-ap", qty: "300", unit: "gr" },
      { type: "ingredient", ref: "butter", qty: "200", unit: "gr" },
      { type: "ingredient", ref: "egg", qty: "2", unit: "butir", discrete: true },
      { type: "ingredient", ref: "sugar", qty: "50", unit: "gr" },
      { type: "ingredient", ref: "cheese", qty: "100", unit: "gr" },
      { type: "ingredient", ref: "milk-powder", qty: "20", unit: "gr" },
      { type: "overhead", label: "Kemasan Toples & Food Grade", overheadKind: "fixed", overheadValue: "5000", qty: "0", unit: "batch" },
      { type: "overhead", label: "Alokasi Gas Oven", overheadKind: "percent", overheadValue: "5", qty: "0", unit: "%" },
    ],
    steps: [
      { instruction: "Kocok butter dan gula sampai creamy dan mengembang.", durationMin: 8 },
      { instruction: "Masukkan kuning telur satu per satu, aduk rata.", durationMin: 5 },
      { instruction: "Tambahkan tepung dan susu bubuk, aduk sampai adonan bisa dibentuk.", durationMin: 10 },
      { instruction: "Bentuk bulat, isi selai nanas, dan beri topping keju.", durationMin: 25 },
      { instruction: "Bake di 160°C selama 20 menit, dinginkan sebelum packing.", durationMin: 20 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=nastar+keju+tutorial",
        title: "Nastar keju lumer dan renyah",
        description: "Contoh referensi demo untuk adonan, filling nanas, dan topping keju.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "bolu-pandan",
    name: "Bolu Pandan Pandaan",
    code: "REC-2026-BOL-007",
    slug: "bolu-pandan-pandaan",
    description:
      "Bolu pandan lembut dengan butter dan susu full cream. Produk uji margin rendah: food cost berada di atas ambang 35%.",
    category: "Cake & Bolu",
    status: "published",
    yieldQty: "10",
    yieldUnit: "pcs",
    unitWeightG: "80",
    yieldLossPct: "8",
    sellingPrice: "15000",
    items: [
      { type: "ingredient", ref: "flour-ap", qty: "250", unit: "gr" },
      { type: "ingredient", ref: "egg", qty: "6", unit: "butir", discrete: true },
      { type: "ingredient", ref: "sugar", qty: "200", unit: "gr" },
      { type: "ingredient", ref: "butter", qty: "150", unit: "gr" },
      { type: "ingredient", ref: "milk", qty: "100", unit: "ml" },
      { type: "ingredient", ref: "baking-powder", qty: "1", unit: "bungkus" },
      { type: "ingredient", ref: "vanilla", qty: "5", unit: "ml" },
      { type: "overhead", label: "Kemasan Slice Box", overheadKind: "fixed", overheadValue: "2500", qty: "0", unit: "batch" },
    ],
    steps: [
      { instruction: "Kocok telur dan gula sampai mengembang dan pucat.", durationMin: 10 },
      { instruction: "Masukkan tepung, baking powder, dan vanili secara bertahap.", durationMin: 8 },
      { instruction: "Lelehkan butter, campur dengan susu, lalu fold ke adonan.", durationMin: 8 },
      { instruction: "Tuang ke loyang dan bake di 170°C selama 30 menit.", durationMin: 30 },
      { instruction: "Dinginkan, potong, dan packing setelah suhu ruang.", durationMin: 15 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=bolu+pandan+panggang+tutorial",
        title: "Bolu pandan panggang lembut",
        description: "Contoh referensi demo untuk teknik fold dan kontrol suhu oven.",
        authorName: "YouTube · demo",
      },
    ],
  },
  {
    key: "adonan-donat",
    name: "Adonan Dasar Donat",
    code: "REC-2026-SUB-008",
    slug: "adonan-dasar-donat",
    description:
      "Sub-resep adonan donat kentang. Yield 1 kg adonan, susut proofing dan frying 5%, dipakai oleh Donat Kentang Glaze.",
    category: "Sub-resep",
    status: "published",
    isSubrecipe: true,
    yieldQty: "1000",
    yieldUnit: "gr",
    yieldLossPct: "5",
    items: [
      { type: "ingredient", ref: "flour-strong", qty: "500", unit: "gr" },
      { type: "ingredient", ref: "potato", qty: "200", unit: "gr", note: "Kukus, haluskan" },
      { type: "ingredient", ref: "egg", qty: "1", unit: "butir", discrete: true },
      { type: "ingredient", ref: "sugar", qty: "80", unit: "gr" },
      { type: "ingredient", ref: "butter", qty: "60", unit: "gr" },
      { type: "ingredient", ref: "milk", qty: "150", unit: "ml" },
      { type: "ingredient", ref: "yeast", qty: "1", unit: "bungkus", nonLinearScaling: true },
      { type: "ingredient", ref: "salt", qty: "5", unit: "gr" },
    ],
    steps: [
      { instruction: "Kukus kentang, haluskan, lalu dinginkan sebelum dipakai.", durationMin: 20 },
      { instruction: "Mix tepung, gula, ragi, telur, kentang, dan susu sampai kalis.", durationMin: 12 },
      { instruction: "Masukkan butter dan garam, lanjutkan kneading sampai elastis.", durationMin: 10 },
      { instruction: "Bulk fermentation 60 menit, lalu simpan di chiller untuk batch berikutnya.", durationMin: 60 },
    ],
    videos: [
      {
        url: "https://www.youtube.com/results?search_query=adonan+dasar+donat+kentang",
        title: "Adonan dasar donat kentang",
        description: "Contoh referensi demo untuk tekstur adonan dan fermentasi.",
        authorName: "YouTube · demo",
      },
    ],
  },
];

function daysAgo(days: number, hours = 0): Date {
  return new Date(Date.now() - days * 86_400_000 - hours * 3_600_000);
}

async function clearAll(db: AppDb): Promise<void> {
  await db.delete(schema.recipeTag);
  await db.delete(schema.recipeVideo);
  await db.delete(schema.recipeStep);
  await db.delete(schema.media);
  await db.delete(schema.pricingScenario);
  await db.delete(schema.costingSnapshot);
  await db.delete(schema.recipeItem);
  await db.delete(schema.recipeVersion);
  await db.delete(schema.recipe);
  await db.delete(schema.ingredientPrice);
  await db.delete(schema.ingredientConversion);
  await db.delete(schema.ingredient);
  await db.delete(schema.auditLog);
  await db.delete(schema.tag);
  await db.delete(schema.appSettings);
}

export async function seedDatabase(
  db: AppDb,
  options: { ownerId?: string } = {},
): Promise<{ ingredients: number; recipes: number; snapshots: number }> {
  const OWNER_ID = options.ownerId?.trim() || SEED_OWNER_ID;
  await clearAll(db);

  await db.insert(schema.appSettings).values({
    ownerId: OWNER_ID,
    workspaceName: "United Foods Content",
    ownerName: ACTOR,
    ownerRole: "Head Baker & R&D",
    defaultPriceStrategy: "latest",
    targetFoodCostPct: "30",
    targetMarginPct: "70",
  });

  const ingredientId = new Map<string, string>();
  const domainIngredients: IngredientInput[] = [];

  for (const entry of INGREDIENTS) {
    const id = crypto.randomUUID();
    ingredientId.set(entry.key, id);
    const conversions = entry.conversions ?? [];
    const domainConversions = conversions.map((conversion) => ({
      fromUnit: conversion.fromUnit,
      toUnit: conversion.toUnit,
      factor: conversion.factor,
    }));
    domainIngredients.push({
      id,
      name: entry.name,
      sku: entry.sku,
      category: entry.category,
      baseUnit: entry.baseUnit,
      baseDimension: entry.baseDimension,
      discrete: entry.discrete,
      conversions: domainConversions,
    });

    await db.insert(schema.ingredient).values({
      id,
      ownerId: OWNER_ID,
      name: entry.name,
      sku: entry.sku,
      category: entry.category,
      baseUnit: entry.baseUnit,
      baseDimension: entry.baseDimension,
      discrete: entry.discrete ?? false,
      notes: entry.notes ?? null,
    });

    if (conversions.length > 0) {
      await db.insert(schema.ingredientConversion).values(
        conversions.map((conversion) => ({
          ownerId: OWNER_ID,
          ingredientId: id,
          fromUnit: conversion.fromUnit,
          toUnit: conversion.toUnit,
          factor: new Decimal(conversion.factor).toFixed(6),
          note: "Konversi kitchen scale",
        })),
      );
    }

    for (const price of entry.prices) {
      const baseQty = convertQuantity(price.purchaseQty, price.purchaseUnit, entry.baseUnit, domainConversions);
      const pricePerBase = new Decimal(price.price).div(new Decimal(baseQty)).toFixed(6);
      await db.insert(schema.ingredientPrice).values({
        ownerId: OWNER_ID,
        ingredientId: id,
        purchaseQty: new Decimal(price.purchaseQty).toFixed(6),
        purchaseUnit: price.purchaseUnit,
        price: new Decimal(price.price).toFixed(6),
        pricePerBaseUnit: pricePerBase,
        effectiveFrom: daysAgo(price.daysAgo),
        note: price.note ?? null,
        createdBy: ACTOR,
      });
    }
  }

  const recipeId = new Map<string, string>();
  const currentVersionIdMap = new Map<string, string>();
  const domainRecipes: RecipeInput[] = [];

  for (const entry of RECIPES) {
    recipeId.set(entry.key, crypto.randomUUID());
  }

  for (const entry of RECIPES) {
    const id = recipeId.get(entry.key)!;
    const previous = entry.previousVersions ?? 0;

    await db.insert(schema.recipe).values({
      id,
      ownerId: OWNER_ID,
      name: entry.name,
      slug: entry.slug,
      code: entry.code,
      description: entry.description,
      category: entry.category,
      status: entry.status,
      locale: "id-ID",
      authorId: OWNER_ID,
      isSubrecipe: entry.isSubrecipe ?? false,
    });

    let currentVersionId: string | null = null;
    for (let versionNo = 1; versionNo <= previous + 1; versionNo += 1) {
      const version = await db
        .insert(schema.recipeVersion)
        .values({
          ownerId: OWNER_ID,
          recipeId: id,
          versionNo,
          yieldQty: new Decimal(entry.yieldQty).toFixed(6),
          yieldUnit: entry.yieldUnit,
          unitWeightG: entry.unitWeightG ? new Decimal(entry.unitWeightG).toFixed(6) : null,
          yieldLossPct: entry.yieldLossPct,
          notes:
            versionNo === previous + 1
              ? "Versi aktif — validasi HPP dan formula produksi."
              : `Arsip versi ${versionNo} untuk audit HPP historis.`,
          createdBy: ACTOR,
          createdAt:
            versionNo === previous + 1
              ? daysAgo(3)
              : daysAgo(35 + (previous + 1 - versionNo) * 40),
        })
        .returning({ id: schema.recipeVersion.id });
      currentVersionId = version[0].id;

      await db.insert(schema.recipeItem).values(
        entry.items.map((item, index) => {
          const refId =
            item.type === "overhead" ? null : item.type === "subrecipe" ? recipeId.get(item.ref ?? "") : ingredientId.get(item.ref ?? "");
          if (item.type !== "overhead" && !refId) {
            throw new Error(`Seed error: referensi ${item.ref} pada ${entry.key} tidak ditemukan.`);
          }
          return {
            ownerId: OWNER_ID,
            recipeVersionId: version[0].id,
            itemType: item.type,
            refId: refId ?? null,
            label: item.label ?? null,
            qty: new Decimal(item.qty ?? "0").toFixed(6),
            unit: item.unit ?? "gr",
            discrete: item.discrete ?? false,
            rounding: item.rounding ?? "none",
            nonLinearScaling: item.nonLinearScaling ?? false,
            note: item.note ?? null,
            overheadKind: item.overheadKind ?? null,
            overheadValue: item.overheadValue ? new Decimal(item.overheadValue).toFixed(6) : null,
            sortOrder: index,
          };
        }),
      );

      if (versionNo === previous + 1 && entry.steps?.length) {
        await db.insert(schema.recipeStep).values(
          entry.steps.map((step, index) => ({
            ownerId: OWNER_ID,
            recipeVersionId: version[0].id,
            stepNo: index + 1,
            instruction: step.instruction,
            durationSec: step.durationMin ? Math.round(step.durationMin * 60) : null,
          })),
        );
      }
    }

    if (entry.videos?.length) {
      await db.insert(schema.recipeVideo).values(
        entry.videos.map((video, index) => {
          const url = normalizeVideoUrl(video.url);
          if (!url) throw new Error(`Seed error: URL video tidak valid pada ${entry.key}.`);
          const platform = detectVideoPlatform(url);
          return {
            ownerId: OWNER_ID,
            recipeId: id,
            url,
            title: video.title,
            description: video.description ?? null,
            platform,
            thumbnailUrl: youtubeThumbnail(url),
            authorName: video.authorName ?? null,
            source: "manual" as const,
            sortOrder: index,
          };
        }),
      );
    }

    await db.update(schema.recipe).set({ currentVersionId }).where(sql`${schema.recipe.id} = ${id}`);
    if (currentVersionId) currentVersionIdMap.set(id, currentVersionId);

    const domainItems = entry.items.map((item, index) => ({
      id: `${entry.key}-${index}`,
      type: item.type,
      refId:
        item.type === "overhead" ? null : item.type === "subrecipe" ? recipeId.get(item.ref ?? "") : ingredientId.get(item.ref ?? ""),
      name: item.label ?? null,
      qty: item.qty ?? "0",
      unit: item.unit ?? "gr",
      discrete: item.discrete ?? false,
      rounding: item.rounding ?? "none",
      nonLinearScaling: item.nonLinearScaling ?? false,
      note: item.note ?? null,
      overheadKind: item.overheadKind ?? null,
      overheadValue: item.overheadValue ?? null,
      sortOrder: index,
    }));

    domainRecipes.push({
      id,
      name: entry.name,
      category: entry.category,
      status: entry.status,
      isSubrecipe: entry.isSubrecipe,
      yieldQty: entry.yieldQty,
      yieldUnit: entry.yieldUnit,
      unitWeightG: entry.unitWeightG ?? null,
      yieldLossPct: entry.yieldLossPct,
      items: domainItems,
    });
  }

  let snapshotCount = 0;
  for (const entry of RECIPES) {
    if (!entry.sellingPrice) continue;
    const domainRecipe = domainRecipes.find((recipe) => recipe.id === recipeId.get(entry.key));
    if (!domainRecipe) continue;
    const result = calculateRecipeCost({
      recipe: domainRecipe,
      recipes: domainRecipes,
      ingredients: domainIngredients,
      prices: Object.fromEntries(
        INGREDIENTS.map((ingredient) => [
          ingredientId.get(ingredient.key)!,
          ingredient.prices.map((price) => ({
            pricePerBaseUnit: new Decimal(price.price)
              .div(new Decimal(convertQuantity(price.purchaseQty, price.purchaseUnit, ingredient.baseUnit, ingredient.conversions ?? [])))
              .toFixed(6),
            purchaseQty: price.purchaseQty,
            purchaseUnit: price.purchaseUnit,
            price: price.price,
            effectiveFrom: daysAgo(price.daysAgo).toISOString(),
          })),
        ]),
      ),
      priceStrategy: "latest",
      scaleFactor: 1,
    });
    const metrics = computePricingMetrics({ costPerUnit: result.costPerUnit, sellingPrice: entry.sellingPrice });
    const snapshot = await db
      .insert(schema.costingSnapshot)
      .values({
        ownerId: OWNER_ID,
        recipeId: recipeId.get(entry.key)!,
        recipeVersionId: currentVersionIdMap.get(recipeId.get(entry.key)!)!,
        label: `Snapshot rilis v1 — ${entry.name}`,
        scaleFactor: "1",
        priceStrategy: "latest",
        asOf: daysAgo(1),
        rawMaterialCost: result.rawMaterialCost,
        overheadCost: result.overheadCost,
        totalCost: result.totalCost,
        effectiveYieldQty: result.effectiveYieldQty,
        yieldUnit: result.yieldUnit,
        costPerUnit: result.costPerUnit,
        itemsBreakdown: {
          lines: result.lines,
          overheadLines: result.overheadLines,
          warnings: result.warnings,
          meta: { seeded: true },
        },
        computedAt: daysAgo(1, 3),
        createdBy: ACTOR,
      })
      .returning({ id: schema.costingSnapshot.id });

    await db.insert(schema.pricingScenario).values({
      ownerId: OWNER_ID,
      snapshotId: snapshot[0].id,
      sellingPrice: new Decimal(entry.sellingPrice).toFixed(6),
      marginPct: metrics.marginPct,
      markupPct: metrics.markupPct,
      foodCostPct: metrics.foodCostPct,
      targetMarginPct: "70",
      roundingTo: "500",
      createdAt: daysAgo(1, 3),
    });
    snapshotCount += 1;
  }

  const auditEntries: Array<{
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    daysAgo: number;
    hours?: number;
    metadata?: Record<string, unknown>;
  }> = [
    {
      action: "snapshot.created",
      entityType: "costing_snapshot",
      entityId: recipeId.get("roti-pemula"),
      summary: 'Snapshot HPP "Roti Pemula (Classic Loaf)" v3 disimpan — HPP/unit Rp2.600, margin 74.0%.',
      daysAgo: 0,
      hours: 2,
      metadata: { recipeId: recipeId.get("roti-pemula"), costPerUnit: "2600" },
    },
    {
      action: "ingredient.price.created",
      entityType: "ingredient",
      entityId: ingredientId.get("flour-strong"),
      summary: "Harga Tepung Terigu Protein Tinggi diperbarui: 1 kg = Rp12.000 (+5.3%).",
      daysAgo: 2,
      metadata: { purchaseQty: "1", purchaseUnit: "kg", price: "12000" },
    },
    {
      action: "ingredient.price.created",
      entityType: "ingredient",
      entityId: ingredientId.get("yeast"),
      summary: "Harga Ragi Instan diperbarui: 1 bungkus = Rp3.000 (+8.0%).",
      daysAgo: 4,
      metadata: { purchaseUnit: "bungkus", price: "3000" },
    },
    {
      action: "ingredient.price.created",
      entityType: "ingredient",
      entityId: ingredientId.get("egg"),
      summary: "Harga Telur Ayam Ras Grade A diperbarui: Rp2.000/butir (+4.2%).",
      daysAgo: 3,
      metadata: { price: "2000" },
    },
    {
      action: "recipe.updated",
      entityType: "recipe",
      entityId: recipeId.get("croissant-butter"),
      summary: 'Versi baru "Croissant Butter AOP" v4 dengan kalibrasi yield loss 8%.',
      daysAgo: 5,
      metadata: { versionNo: 4 },
    },
    {
      action: "ingredient.price.created",
      entityType: "ingredient",
      entityId: ingredientId.get("butter"),
      summary: "Harga Butter Unsalted diperbarui: 1 blok = Rp385.000 (+2.7%).",
      daysAgo: 7,
      metadata: { price: "385000" },
    },
    {
      action: "recipe.updated",
      entityType: "recipe",
      entityId: recipeId.get("brioche-bun"),
      summary: 'Versi baru "Brioche Burger Bun" v2 — penyesuaian tangzhong dan egg wash.',
      daysAgo: 12,
      metadata: { versionNo: 2 },
    },
    {
      action: "recipe.created",
      entityType: "recipe",
      entityId: recipeId.get("bolu-pandan"),
      summary: 'Resep baru "Bolu Pandan Pandaan" v1 ditambahkan ke portofolio produksi.',
      daysAgo: 18,
      metadata: { category: "Cake & Bolu" },
    },
    {
      action: "ingredient.price.created",
      entityType: "ingredient",
      entityId: ingredientId.get("flour-ap"),
      summary: "Harga Tepung Terigu Serbaguna diperbarui: 1 kg = Rp11.000.",
      daysAgo: 5,
      metadata: { price: "11000" },
    },
    {
      action: "settings.updated",
      entityType: "app_settings",
      summary: "Target food cost portofolio diset 30% dan strategi harga default latest.",
      daysAgo: 30,
      metadata: { defaultPriceStrategy: "latest", targetFoodCostPct: "30" },
    },
  ];

  for (const entry of auditEntries) {
    await db.insert(schema.auditLog).values({
      ownerId: OWNER_ID,
      actor: ACTOR,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
      metadata: entry.metadata ?? null,
      createdAt: daysAgo(entry.daysAgo, entry.hours ?? 0),
    });
  }

  await db.insert(schema.auditLog).values({
    ownerId: OWNER_ID,
    actor: ACTOR,
    action: "demo.seeded",
    entityType: "workspace",
    summary: `Workspace UFC diisi data contoh: ${INGREDIENTS.length} bahan, ${RECIPES.length} resep, ${snapshotCount} snapshot HPP.`,
    metadata: { ingredients: INGREDIENTS.length, recipes: RECIPES.length, snapshots: snapshotCount },
    createdAt: daysAgo(0, 1),
  });

  return { ingredients: INGREDIENTS.length, recipes: RECIPES.length, snapshots: snapshotCount };
}
