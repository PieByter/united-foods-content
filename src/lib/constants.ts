export const APP_NAME = "United Foods Content";
export const APP_SHORT = "UFC";
export const APP_TAGLINE = "Culinary ERP";
export const APP_VERSION = "v1.4.2";

export const INGREDIENT_CATEGORIES = [
  "Tepung & Pati",
  "Dairy & Telur",
  "Ragi & Pengembang",
  "Gula & Pemanis",
  "Lemak & Minyak",
  "Cokelat & Isian",
  "Keju & Olahan",
  "Buah & Sayur",
  "Bumbu & Garam",
  "Kemasan",
  "Lainnya",
] as const;

export const RECIPE_CATEGORIES = [
  "Bakery & Roti",
  "Viennoiserie",
  "Pastry & Donat",
  "Cake & Bolu",
  "Kue Kering",
  "Sub-resep",
] as const;

export const RECIPE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
};

export const PRICE_STRATEGY_LABEL: Record<string, string> = {
  latest: "Terakhir (Latest)",
  average: "Rata-rata (Average)",
  snapshot: "Snapshot Historis",
};

export const ROUNDING_LABEL: Record<string, string> = {
  none: "Eksak",
  half: "Setengah",
  whole: "Bulat",
};

export const UNIT_OPTIONS = [
  { code: "gr", label: "Gram (gr)", dimension: "mass" },
  { code: "kg", label: "Kilogram (kg)", dimension: "mass" },
  { code: "mg", label: "Miligram (mg)", dimension: "mass" },
  { code: "ml", label: "Mililiter (ml)", dimension: "volume" },
  { code: "l", label: "Liter (l)", dimension: "volume" },
  { code: "sdm", label: "Sendok makan (sdm)", dimension: "volume" },
  { code: "sdt", label: "Sendok teh (sdt)", dimension: "volume" },
  { code: "cup", label: "Cup", dimension: "volume" },
  { code: "pcs", label: "Pcs", dimension: "count" },
  { code: "buah", label: "Buah", dimension: "count" },
  { code: "butir", label: "Butir", dimension: "count" },
  { code: "bungkus", label: "Bungkus", dimension: "count" },
  { code: "sachet", label: "Sachet", dimension: "count" },
  { code: "blok", label: "Blok", dimension: "count" },
  { code: "sak", label: "Sak", dimension: "count" },
  { code: "pack", label: "Pack", dimension: "count" },
  { code: "tray", label: "Tray", dimension: "count" },
  { code: "box", label: "Box", dimension: "count" },
  { code: "porsi", label: "Porsi", dimension: "count" },
] as const;

export const BASE_UNIT_OPTIONS = UNIT_OPTIONS.filter((unit) =>
  ["gr", "ml", "pcs", "butir", "buah", "bungkus", "sachet", "blok", "sak", "pack"].includes(unit.code),
);

export const DIMENSION_LABEL: Record<string, string> = {
  mass: "Massa",
  volume: "Volume",
  count: "Count / Diskret",
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "ingredient.created": "Bahan baru dibuat",
  "ingredient.updated": "Bahan diperbarui",
  "ingredient.archived": "Bahan diarsipkan",
  "ingredient.price.created": "Harga bahan diperbarui",
  "ingredient.imported": "Import bahan",
  "recipe.created": "Resep dibuat",
  "recipe.updated": "Versi resep baru",
  "recipe.published": "Resep dipublikasikan",
  "recipe.tutorial.updated": "Tutorial resep diperbarui",
  "snapshot.created": "Snapshot HPP disimpan",
  "settings.updated": "Pengaturan diperbarui",
  "demo.seeded": "Data contoh dimuat",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard & Overview", icon: "LayoutDashboard" },
  { href: "/bahan-baku", label: "Bahan Baku & Inventory", icon: "Wheat" },
  { href: "/resep", label: "Recipe Studio & Scaler", icon: "FlaskConical" },
  { href: "/simulator", label: "HPP Engine & Margin Simulator", icon: "Calculator" },
] as const;

export const GOV_NAV_ITEMS = [
  { href: "/audit", label: "Audit Log Perubahan", icon: "History" },
  { href: "/panduan", label: "Panduan Standar Biaya F&B", icon: "BookOpen" },
  { href: "/pengaturan", label: "Pengaturan", icon: "Settings" },
] as const;

export const KITCHEN_CONVERSIONS = [
  { label: "1 sdm", value: "15 ml", note: "Standar air / minyak" },
  { label: "1 sdt", value: "5 ml", note: "Ragi, garam, ekstrak" },
  { label: "1 cup", value: "240 ml", note: "Cup ukur standar" },
  { label: "1 butir telur", value: "±55 gr", note: "Putih 35 gr, kuning 20 gr" },
  { label: "1 sachet ragi", value: "11 gr", note: "Ragi instan kemasan" },
  { label: "1 blok butter", value: "2.500 gr", note: "Butter blok komersial" },
] as const;
