# UFC — United Foods Content

Recipe, scaling, dan HPP (Harga Pokok Produksi) management system untuk operasional F&B. Aplikasi menerapkan **PRD Recipe & HPP Management System** (fase 1: inventory, resep, scaling, HPP & margin) dengan visual system dari **Google Stitch — Culinary Operations & Precision HPP System**.

## Daftar isi

- [Fitur yang sudah berjalan](#fitur-yang-sudah-berjalan)
- [Halaman aplikasi](#halaman-aplikasi)
- [Acceptance reference PRD §6](#acceptance-reference-prd-6)
- [Cakupan requirement PRD](#cakupan-requirement-prd)
- [Stack](#stack)
- [Menjalankan lokal](#menjalankan-lokal)
- [Mode Supabase / Postgres produksi](#mode-supabase--postgres-produksi)
- [Troubleshooting](#troubleshooting)
- [Struktur proyek](#struktur-proyek)
- [Skema data](#skema-data)
- [Kesiapan content system fase 2](#kesiapan-content-system-fase-2)
- [Batasan fase 1](#batasan-fase-1)
- [Design](#design)

## Fitur yang sudah berjalan

### Master bahan & harga
- CRUD bahan baku dengan kategori, SKU, base unit, satuan diskret, catatan, dan stok opsional di skema.
- Harga beli multi-satuan dinormalisasi otomatis ke **harga per base unit** (contoh: Rp385.000 / 1 blok 2.500 gr → Rp154 / gr).
- Riwayat harga **append-only** dengan `effective_from`; harga lama tidak ditimpa.
- Konversi antar-dimensi eksplisit per bahan (butir ↔ gr, sdm ↔ ml, bungkus ↔ gr). Konversi hilang menghasilkan error keras, bukan tebakan.
- Import/export CSV bahan baku.
- Inspector SKU: riwayat harga, konversi, dan resep terkait.

### Resep, versi, dan scaling
- Formula resep versioned: setiap penyimpanan formula membuat versi baru dan menyimpan `current_version_id`.
- Item resep dapat berupa bahan, sub-resep, atau overhead.
- Sub-resep rekursif dengan batas kedalaman 5, memoization, dan validasi DAG/cycle saat simpan.
- Scaling faktor bebas (0.5x, 2x, 3.5x, 10x) atau target yield.
- Nilai eksak dan nilai praktis dapur untuk satuan diskret (contoh 1,5 butir → “1 butir + 27,5 gr”).
- Flag non-linear scaling untuk ragi/garam/leavener + warning otomatis pada faktor <0,25x atau >4x.
- Yield loss memengaruhi effective yield dan HPP per unit.

### HPP engine & simulator margin
- HPP batch = Σ(kebutuhan bahan × harga) + overhead; HPP/unit = total / yield efektif.
- Strategi harga: `latest`, `average` (weighted), dan `snapshot` tanggal historis.
- Simulasi what-if kenaikan harga bahan tanpa mengubah data master.
- Target margin / reverse pricing, pembulatan harga Rp500/Rp1.000, food cost, markup, price-to-cost, laba/unit, dan break-even.
- Snapshot HPP append-only + pricing scenario.
- Detail komponen biaya per bahan dan proporsi terhadap HPP.

### Tata kelola
- Audit log append-only untuk perubahan bahan, harga, versi resep, snapshot, dan settings.
- Pengaturan workspace, strategi harga default, target food cost, dan target margin.
- PWA manifest + ikon installable.
- Seed data contoh lengkap (17 bahan, 8 resep, 7 snapshot) yang dapat dimuat ulang dari UI.

## Halaman aplikasi

| Route | Fungsi |
| --- | --- |
| `/dashboard` | KPI portofolio, highlight produk, tabel resep + HPP, price alerts, distribusi food cost, snapshot terakhir |
| `/bahan-baku` | Katalog bahan, normalisasi harga base unit, inspector harga/konversi/resep, import/export CSV |
| `/resep` | Katalog formula, status, margin, HPP, sub-resep |
| `/resep/baru` | Formula builder untuk resep baru |
| `/resep/[id]` | Recipe Studio & Interactive Scaler + versi formula |
| `/resep/[id]/edit` | Edit formula; menyimpan versi baru |
| `/resep/[id]/simulator` | HPP engine, margin simulator, what-if, snapshot |
| `/simulator` | Daftar resep untuk simulasi + snapshot terakhir |
| `/audit` | Audit trail append-only dengan filter |
| `/panduan` | Formula, definisi metrik, acceptance reference, konversi, arsitektur |
| `/pengaturan` | Workspace, strategi harga default, target finansial, reset demo |
| `/cari?q=` | Pencarian bahan dan resep |
| `/api/export/ingredients` | Export CSV bahan (`?template=1` untuk template import) |

Aplikasi juga menyediakan `manifest.webmanifest` + ikon 192/512/maskable untuk instalasi PWA.

## Acceptance reference PRD §6

Seed “Roti Pemula” dan unit test mengunci angka berikut:

| Metrik | Nilai |
| --- | --- |
| HPP batch x1 | **Rp13.000** |
| HPP / roti | **Rp2.600** |
| Harga jual | Rp10.000 |
| Laba / roti | Rp7.400 |
| Margin | **74%** |
| Markup | **284,6%** |
| Food cost | **26%** |
| Price-to-cost | **384,6%** |

Test juga mencakup scaling x2 (HPP batch Rp26.000, HPP/unit tetap Rp2.600), satuan campuran (kg→gr, bungkus→gr), yield loss, overhead fixed/percent, sub-resep, strategi harga, dan error konversi.

```bash
npm test
```

## Cakupan requirement PRD

| Requirement | Status | Implementasi |
| --- | --- | --- |
| §5.1 Ingredient & inventory | ✅ | CRUD bahan, harga per base unit, konversi antar-dimensi, riwayat append-only |
| §5.2 Recipe | ✅ | Versi resep, item bahan/sub-resep/overhead, yield, berat per unit |
| §5.3 Scaling | ✅ | Faktor/target yield, diskret + rounding, nilai praktis, warning non-linear |
| §5.4 HPP | ✅ | Batch/unit HPP, yield loss, latest/average/snapshot, snapshot append-only |
| §5.5 Pricing & margin | ✅ | Margin, markup, food cost, price-to-cost, reverse pricing, what-if, BEP |
| §6 Acceptance | ✅ | Dikunci di unit test dan seed “Roti Pemula” |
| §7 Presisi & audit | ✅ | `NUMERIC(18,6)`, Decimal.js, audit log append-only, DAG depth 5 |
| §8 Stack | ✅ | Next.js App Router, Drizzle, Postgres/Supabase-ready, domain package murni |
| §9 Content readiness | ✅ skema | `slug`, status, locale, author, `recipe_step`, `media`, `tag` |
| Open question multi-tenant | ⚠️ | `owner_id` tersedia di semua tabel operasional; auth/RLS policy belum diaktifkan |
| Open question market price | ⚠️ | Belum ada field harga pasaran; strategi harga latest/average/snapshot sudah ada |
| Overhead | ✅ melebihi fase 1 | Fixed per batch dan persen bahan sudah dihitung |

## Stack

- **Next.js 16 App Router** (React 19, Server Actions, Route Handlers)
- **Drizzle ORM** + PostgreSQL
- **PGlite** embedded Postgres untuk mode lokal tanpa setup
- **Supabase/Postgres** untuk produksi melalui `DATABASE_URL`
- **decimal.js** di seluruh domain kalkulasi
- **Tailwind CSS v4**
- **Zod** untuk validasi input
- **Vitest** untuk unit test domain

### Pemisahan domain

Kalkulasi murni berada di workspace package [`packages/costing`](packages/costing/README.md):

- `units.ts` — registry satuan, BFS conversion, error konversi.
- `scaling.ts` — faktor/target yield, pembulatan, nilai praktis, warning non-linear.
- `costing.ts` — recursive recipe cost, price strategy, overhead, yield loss, DAG.
- `pricing.ts` — margin, markup, food cost, reverse pricing, break-even.

Package ini tidak bergantung pada Next.js atau Drizzle sehingga dapat dipakai server maupun client (preview scaling dan simulator memakai fungsi yang sama dengan server).

## Menjalankan lokal

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`. Tidak perlu environment variable: aplikasi otomatis memakai PGlite di `.data/pglite`.

> PGlite mengunci direktori data. Hentikan `npm run dev` sebelum menjalankan `npm run db:seed` atau `npm run db:migrate`, lalu jalankan dev kembali. Di UI, tombol **Reset & isi data contoh** dapat dipakai tanpa menghentikan server.

### Scripts

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Menjalankan build production |
| `npm test` | Unit test domain (`vitest`) |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate migrasi Drizzle dari schema |
| `npm run db:migrate` | Jalankan migrasi ke PGlite/Postgres |
| `npm run db:seed` | Reset + isi data contoh |

## Mode Supabase / Postgres produksi

1. Salin connection string **Supabase → Connect → Transaction pooler** (port `6543`).
2. Isi `.env.local`:

```env
DATABASE_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres
```

3. Jalankan migrasi:

```bash
npm run db:migrate
```

4. (Opsional, hanya untuk database demo) isi data contoh. Perintah ini menghapus seluruh data workspace dan membutuhkan `--force` saat `DATABASE_URL` terisi:

```bash
npm run db:seed -- --force
```

Catatan penting:

- Gunakan transaction pooler untuk Vercel/serverless. Host `db.*.supabase.co` bersifat IPv6-only dan tidak terjangkau dari Vercel.
- Driver `postgres` dikonfigurasi `prepare: false` karena Supavisor transaction mode tidak mendukung prepared statements.
- Skema memakai `NUMERIC(18,6)` untuk kuantitas dan harga; Drizzle mengembalikan numeric sebagai string dan domain tidak memakai `Number()` untuk agregasi uang.
- `DATABASE_URL` yang masih berisi placeholder `<ref>/<region>` otomatis diabaikan dan fallback ke PGlite.

## Troubleshooting

**PGlite error “database is locked” / ENOENT saat seed**
Hentikan dev server, jalankan seed/migrate, lalu nyalakan lagi. PGlite mengunci direktori `.data/pglite`. Alternatifnya gunakan tombol **Reset & isi data contoh** di `/pengaturan` selama server hidup.

**Dashboard kosong dan KPI bernilai 0**
Data contoh belum dimuat. Jalankan `npm run db:seed` (server harus berhenti) atau klik **Muat data contoh** pada empty state dashboard.

**HPP gagal dengan pesan konversi**
Bahan memakai satuan yang belum punya jalur konversi ke base unit. Buka `/bahan-baku`, pilih bahan, tab **Konversi**, lalu tambahkan mis. `1 butir = 55 gr` atau `1 sdm = 15 ml`.

**HPP gagal dengan pesan harga tidak tersedia**
Tambahkan riwayat harga lewat tombol **Update Harga Beli** pada inspector bahan.

**Supabase connection timeout di Vercel**
Gunakan transaction pooler (port `6543`), bukan direct connection `db.<ref>.supabase.co` yang IPv6-only. Pastikan `prepare: false` tetap aktif (sudah default di driver).

**Port 3000 dipakai proses lain**
```bash
npm run dev -- -p 3001
```

**Foto produk tidak muncul**
Pastikan aset ada di `public/media/` dan `sharp` terpasang. Jalankan `npm install` ulang jika `/_next/image` mengembalikan error.

## Struktur proyek

```
src/
  app/                     # routes: dashboard, bahan-baku, resep, simulator, audit, panduan, pengaturan
  components/              # app shell, UI primitives, workspace, studio, simulator
  lib/                     # formatting, constants, tipe view, pure mappers
  server/
    db/                    # Drizzle client + schema
    actions/               # server actions (Zod validated)
    queries.ts             # read layer
    costing-service.ts     # bridge view model → domain
    csv.ts                 # CSV parser/export
packages/costing/          # domain kalkulasi murni
scripts/                   # migrate, seed, seed-data
tests/                     # acceptance + domain tests
drizzle/                   # migration SQL + meta
```

## Skema data

Mengikuti PRD §8:

- `ingredient`, `ingredient_price`, `ingredient_conversion`, `app_settings`
- `recipe`, `recipe_version`, `recipe_item`
- `costing_snapshot`, `pricing_scenario`
- `audit_log`
- Kesiapan fase 2: `media`, `recipe_step`, `tag`, `recipe_tag`

Semua tabel operasional memiliki `owner_id`. Fase 1 memakai satu workspace (`UFC_OWNER_ID`), sehingga siap dikembangkan menjadi multi-tenant tanpa migrasi kolom.

## Kesiapan content system fase 2

- `recipe` sudah memiliki `slug`, `status` (draft/published), `locale`, `author_id`, dan kode formula.
- `recipe_step` mendukung urutan instruksi, durasi, media, dan referensi item untuk token seperti `{{item:tepung}}`.
- `media`, `tag`, dan `recipe_tag` sudah ada di schema.
- Harga modal/HPP tetap privat; DTO publik terpisah harus dibuat sebelum publikasi konten.

## Batasan fase 1

- Belum ada autentikasi multi-user penuh. Aplikasi berjalan sebagai single-owner workspace; `owner_id` dan RLS-ready schema sudah disiapkan.
- Belum ada stok real-time, PO, supplier management, POS, atau penjualan.
- Overhead tersedia sebagai item kelas satu, tetapi fase 1 belum menghitung alokasi tenaga kerja berbasis jam.
- Foto produk memakai aset statis dari desain Stitch di `public/media/`; upload media dinamis dan bucket Supabase Storage baru disiapkan di schema fase 2.

## Dokumentasi domain

Dokumentasi API dan prinsip package kalkulasi murni ada di [`packages/costing/README.md`](packages/costing/README.md). Package ini dipakai bersama oleh server actions dan preview client sehingga hasil scaling/scaling HPP konsisten.

## Design

Visual mengacu pada Stitch package di `stitch_recipe_hpp_costing_engine/`:

- Deep navy sidebar, warm amber/copper accents, slate canvas.
- Plus Jakarta Sans (heading), Inter (body), JetBrains Mono (angka/tabular).
- High-density data grids, status chips, sticky HPP summary rails, hairline borders.
- Label metrik eksplisit (margin, markup, food cost) mengikuti rekomendasi PRD §4.
- Foto bakery lokal di `public/media/` diambil dari aset desain Stitch.

Referensi layar desain:

- [`Dashboard`](stitch_recipe_hpp_costing_engine/dashboard_hpp_financial_overview/screen.png)
- [`Bahan Baku`](stitch_recipe_hpp_costing_engine/bahan_baku_inventory_manager/screen.png)
- [`Recipe Studio`](stitch_recipe_hpp_costing_engine/recipe_studio_interactive_scaler/screen.png)
- [`HPP Simulator`](stitch_recipe_hpp_costing_engine/hpp_engine_margin_simulator/screen.png)
- [`Modal Bahan`](stitch_recipe_hpp_costing_engine/modal_tambah_bahan_konversi_satuan/screen.png)

