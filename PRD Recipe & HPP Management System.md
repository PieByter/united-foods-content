# PRD: Recipe \& HPP Management System

**Status:** Draft v0.1 | **Fokus fase 1:** Inventory, Resep, Scaling, HPP \& Margin | **Fase berikutnya:** Content System

## 1\. Ringkasan

Sistem untuk mengelola bahan (inventory + harga beli), menyusun resep dari bahan tersebut, menskalakan resep otomatis (x0.5, x2, dst.), serta menghitung HPP (Harga Pokok Produksi) per batch dan per unit jual beserta rasio keuntungan terhadap harga jual. Arsitektur harus sejak awal disiapkan agar resep bisa menjadi entitas konten (deskripsi, tutorial, media, publikasi) di fase berikutnya.

## 2\. Tujuan \& Non-Tujuan

**Tujuan fase 1**

* CRUD bahan dengan harga beli per satuan apa pun (kg, gr, butir, bungkus, liter, dll.).
* CRUD resep: daftar bahan + takaran + yield (jumlah hasil, mis. 10 roti @100 gr).
* Scaling resep dengan faktor bebas, termasuk pembulatan yang masuk akal untuk satuan diskret (telur, bungkus).
* Kalkulasi HPP batch dan HPP per unit, dengan simulasi harga jual dan margin.
* Riwayat harga bahan, sehingga HPP historis tidak berubah saat harga bahan naik.

**Non-tujuan fase 1**

* Stok real-time, pembelian/PO, supplier management.
* POS atau penjualan.
* Multi-user kompleks (cukup single owner dengan ruang untuk multi-tenant).
* Content system penuh (hanya disiapkan skemanya).

## 3\. Persona \& Use Case

* **Pemilik usaha makanan kecil/rumahan:** ingin tahu HPP dan harga jual yang aman.
* **Content creator resep:** ingin resep yang bisa diskalakan dan menampilkan estimasi biaya (fase 2).

**User story inti**

1. Sebagai user, saya input tepung Rp12.000/kg, telur Rp2.000/butir, ragi instan Rp3.000/bungkus.
2. Saya membuat resep "Roti Pemula": 500 gr tepung, 2 telur, 1 bungkus ragi, yield 5 roti @100 gr.
3. Saya ubah faktor ke x2 dan otomatis dapat 1 kg tepung, 4 telur, 2 bungkus ragi, yield 10 roti.
4. Saya isi harga jual Rp10.000/roti dan melihat HPP/roti, laba/roti, margin dan markup.

## 4\. Keputusan Definisi yang Harus Dikunci Dulu

Contoh Anda: HPP Rp2.500, harga jual Rp10.000, "rasio 400%". Angka itu ambigu, dan ini harus didefinisikan eksplisit karena menentukan UI dan formula:

|Metrik|Formula|Hasil contoh|
|-|-|-|
|Price-to-cost ratio|harga jual / HPP|400%|
|Markup|(harga jual - HPP) / HPP|300%|
|Gross margin|(harga jual - HPP) / harga jual|75%|
|Laba per unit|harga jual - HPP|Rp7.500|

**Rekomendasi:** tampilkan margin dan markup sebagai metrik utama, dan price-to-cost sebagai opsional. Label "400%" tanpa nama metrik akan membingungkan saat nanti dibandingkan dengan standar industri (yang umumnya memakai margin atau food cost %). Tambahkan juga **food cost %** = HPP / harga jual (25% pada contoh), karena ini metrik standar F\&B.

## 5\. Functional Requirements

### 5.1 Ingredient \& Inventory

* Field: nama, kategori, satuan dasar (base unit), harga beli, kuantitas pembelian, satuan pembelian, catatan.
* Contoh: "Tepung terigu, Rp12.000 per 1 kg" disimpan dan dinormalisasi menjadi **harga per base unit** (Rp12/gr).
* Satuan didukung: massa (gr, kg), volume (ml, l, sdm, sdt), count (butir, bungkus, buah).
* **Konversi antar-dimensi per bahan:** bahan bisa punya konversi khusus, mis. 1 butir telur = ±55 gr, 1 sdm minyak = 15 ml, 1 bungkus ragi = 11 gr. Tanpa ini resep yang mencampur satuan tidak bisa dihitung.
* Riwayat harga: setiap perubahan harga membuat record baru (append-only) dengan `effective\_from`.
* Field stok (qty on hand) bersifat opsional di fase 1, tetapi skema harus siap.

### 5.2 Recipe

* Field: nama, deskripsi, yield (jumlah + satuan, mis. 5 buah), berat per unit (opsional), daftar item, versi.
* Item resep: bahan **atau sub-resep** (mis. adonan dasar, isian), kuantitas, satuan, catatan (mis. "dihaluskan").
* Biaya non-bahan (opsional): kemasan, gas/listrik, tenaga kerja, sebagai item biaya dengan tipe `overhead` yang bisa berupa nominal tetap atau persen.
* Resep versioned: perubahan takaran membuat versi baru, sehingga HPP lama dapat diaudit.

### 5.3 Scaling

* Input faktor (0.5, 2, 3.5) **atau** target yield ("saya mau 20 roti") dan sistem menghitung faktor.
* Output: kuantitas tiap bahan yang sudah diskalakan.
* **Pembulatan satuan diskret:** x0.5 pada 1 bungkus ragi menghasilkan 0.5 bungkus; telur 2 menjadi 1, tetapi telur 3 menjadi 1.5. Aturan: tampilkan nilai eksak dan nilai praktis (mis. 1.5 butir → "1 butir + 25 gr kocokan telur"), dengan flag per bahan `discrete: true|false` dan `rounding: none|half|whole`.
* **Peringatan non-linearitas:** ragi, garam, dan waktu panggang tidak selalu linear. Sediakan flag `non\_linear\_scaling` per item agar UI menampilkan warning pada faktor ekstrem (di bawah 0.25 atau di atas 4). Pada fase 1 cukup warning, tanpa koreksi otomatis.

### 5.4 HPP Calculation

* **HPP batch** = Σ (kuantitas bahan × harga per base unit) + overhead.
* **HPP per unit** = HPP batch / yield.
* Opsi **yield loss** (susut): mis. 10% hilang saat pemanggangan, sehingga yield efektif dihitung dari berat jadi, bukan berat adonan.
* **Strategi pemilihan harga**, harus dipilih dan konsisten:

  * `latest`: harga terakhir (default fase 1, paling sederhana).
  * `average`: rata-rata bergerak.
  * `snapshot`: harga pada tanggal tertentu (untuk laporan historis).
* Setiap hasil perhitungan HPP disimpan sebagai **snapshot** (resep versi X, harga bahan pada waktu Y, hasil Z), tidak dihitung ulang secara diam-diam.

### 5.5 Pricing \& Margin Simulator

* Input: harga jual per unit **atau** target margin ("saya mau margin 60%") sehingga sistem menyarankan harga jual.
* Output: HPP/unit, laba/unit, margin, markup, food cost %, titik impas (break-even) per batch.
* Skenario: "jika harga tepung naik 20%, HPP jadi berapa?" (what-if sederhana).
* Pembulatan harga jual ke kelipatan (Rp500/Rp1.000) sebagai opsi.

## 6\. Contoh Perhitungan (Acceptance Reference)

Asumsi harga: tepung Rp12.000/kg, telur Rp2.000/butir, ragi Rp3.000/bungkus.

|Bahan|Resep x1|Biaya|Resep x2|Biaya|
|-|-|-|-|-|
|Tepung|500 gr|Rp6.000|1 kg|Rp12.000|
|Telur|2 butir|Rp4.000|4 butir|Rp8.000|
|Ragi|1 bungkus|Rp3.000|2 bungkus|Rp6.000|
|**HPP batch**||**Rp13.000**||**Rp26.000**|

Jika yield x1 = 5 roti @100 gr, maka HPP/roti = Rp2.600. Dengan harga jual Rp10.000: laba Rp7.400, margin 74%, markup 284.6%, food cost 26%. Resep x2 menghasilkan 10 roti dengan HPP/roti tetap Rp2.600 (linear, tanpa overhead).

Test case ini harus lolos persis, termasuk saat satuan dicampur (mis. tepung dimasukkan dalam gr tetapi dibeli per kg).

## 7\. Non-Functional Requirements

* **Presisi uang dan kuantitas:** wajib decimal/numeric (bukan float). Rekomendasi `NUMERIC(18,6)` untuk kuantitas dan harga per base unit; pembulatan hanya di lapisan presentasi, dengan mode pembulatan eksplisit (half-up).
* **Mata uang:** fase 1 IDR saja, tetapi simpan kolom `currency` agar tidak perlu migrasi nanti.
* **Determinisme:** kalkulasi HPP harus pure function (input snapshot → output), mudah diuji dan dapat dijalankan ulang.
* **Performa:** resep dengan sub-resep bersarang harus dihitung dengan deteksi siklus (DAG) dan memoization; batas kedalaman (mis. 5).
* **Auditability:** semua perubahan harga dan resep append-only.
* **Offline-friendly (opsional):** jika nanti ada mobile, hindari desain yang memaksa kalkulasi di server saja.

## 8\. Arsitektur \& Model Data (Usulan)

**Prinsip:** pisahkan *domain kalkulasi* (unit conversion, scaling, costing) dari *delivery* (API/UI/konten). Domain kalkulasi menjadi library murni yang diuji intensif.

**Entitas utama**

* `ingredient` (id, name, category, base\_unit, base\_dimension)
* `ingredient\_price` (id, ingredient\_id, purchase\_qty, purchase\_unit, price, price\_per\_base\_unit, effective\_from) append-only
* `ingredient\_conversion` (ingredient\_id, from\_unit, to\_unit, factor) untuk butir↔gr, sdm↔ml, dst.
* `unit` (code, dimension, to\_base\_factor), tabel referensi
* `recipe` (id, name, description, current\_version\_id)
* `recipe\_version` (id, recipe\_id, version\_no, yield\_qty, yield\_unit, unit\_weight\_g, yield\_loss\_pct, created\_at)
* `recipe\_item` (id, recipe\_version\_id, item\_type \[ingredient|subrecipe|overhead], ref\_id, qty, unit, discrete, rounding, non\_linear\_scaling, note)
* `costing\_snapshot` (id, recipe\_version\_id, scale\_factor, price\_strategy, total\_cost, cost\_per\_unit, items\_breakdown JSONB, computed\_at)
* `pricing\_scenario` (id, snapshot\_id, selling\_price, margin, markup, food\_cost\_pct)

**Pipeline kalkulasi:** normalisasi satuan ke base unit → resolusi harga (strategi) → scaling → hitung biaya per item (rekursif untuk sub-resep) → overhead → yield → HPP/unit → metrik margin.

### Stack: Next.js + Supabase + Vercel + Drizzle

Stack terkunci: Next.js (App Router) di Vercel, Supabase (Postgres, Auth, Storage), dan Drizzle ORM dengan drizzle-kit. Domain kalkulasi (konversi satuan, scaling, costing) ditulis sebagai paket TypeScript murni (`packages/costing`) tanpa dependensi Next.js atau Drizzle, supaya bisa diuji terpisah dan dipakai server maupun klien.

|Area|Keputusan|Alasan / failure mode|
|-|-|-|
|Presisi angka|`decimal.js` di domain; kolom `numeric(18,6)`|Drizzle mengembalikan `numeric` sebagai string. Jangan `Number()`, karena float JS menimbulkan selisih rupiah saat agregasi.|
|Koneksi DB|Supavisor pooler mode transaction (port 6543), driver `postgres` dengan `prepare: false`|Fungsi serverless Vercel cepat menghabiskan koneksi langsung; prepared statement tidak jalan di transaction mode.|
|Migrasi|drizzle-kit sebagai satu-satunya sumber skema|Mengubah skema lewat dashboard Supabase menimbulkan drift.|
|Sub-resep|Recursive CTE lewat template `sql` Drizzle, hitung di domain; batas kedalaman 5 dan cek siklus saat simpan|Query builder Drizzle tidak mendukung CTE rekursif secara native.|
|Auth dan otorisasi|Supabase Auth; kolom `owner\_id` di semua tabel; RLS aktif|Koneksi Drizzle langsung memakai role Postgres yang melewati RLS. Pilih satu: cek `owner\_id` di setiap query di server, atau jalankan query dalam transaksi dengan `set local role authenticated` dan JWT claims. RLS menjadi lapisan kedua, bukan satu-satunya.|
|Mutasi dan validasi|Server Actions atau Route Handlers dengan validasi Zod; HPP dihitung di server|Klien hanya melakukan preview scaling dengan paket domain yang sama.|
|Caching|Cache dan revalidate-by-tag hanya untuk halaman publik; halaman privat (HPP, margin) dinamis|Mencegah HPP basi setelah harga bahan berubah. Snapshot tetap menjadi sumber data historis.|
|Region|Fungsi Vercel dan project Supabase di region yang sama (mis. Singapore)|Latensi dari Indonesia dan antara fungsi dan DB.|
|Data publik vs privat|Konten publik lewat tabel atau view `security\_invoker` terpisah; role `anon` tidak punya grant ke `ingredient\_price` dan `costing\_snapshot`|Mencegah kebocoran harga modal saat content system aktif.|
|Media (fase 2)|Supabase Storage dengan bucket publik untuk foto resep|Tabel `media` menyimpan path dan metadata.|

**Trade-off yang perlu diputuskan:** pakai Drizzle untuk semua akses data, dan supabase-js hanya untuk Auth dan Storage. Dua jalur akses data (supabase-js dan Drizzle) menggandakan model otorisasi dan membuka celah inkonsistensi RLS. Selain itu, free tier Supabase dijeda saat tidak aktif sekitar seminggu: cukup untuk pengembangan, tidak untuk produksi.

## 9\. Kesiapan untuk Content System (Fase 2)

Desain fase 1 agar tidak perlu refactor besar:

* Resep adalah **content-addressable entity** dengan `slug`, `status` (draft/published), `locale`, dan `author\_id` (kolom nullable sejak sekarang).
* Langkah tutorial dimodelkan sebagai `recipe\_step` (urutan, instruksi, durasi, media\_id, referensi ke item bahan yang dipakai di langkah itu), sehingga scaling juga bisa menskalakan kuantitas di dalam teks instruksi lewat token seperti `{{item:tepung}}`.
* Pisahkan data **privat** (harga beli, HPP, margin) dari data **publik** (resep, langkah, estimasi biaya). Konten publik tidak boleh membocorkan harga modal. Rancang view/DTO terpisah sejak awal, dengan visibilitas per field.
* Media (foto/video) lewat object storage dengan tabel `media` terpisah.
* Pencarian dan tagging (diet, waktu masak, kesulitan) lewat tabel `tag` dan indeks full-text.
* Nilai tambah: estimasi biaya publik ("±Rp15.000 per porsi") yang dihitung dari harga referensi, bukan harga modal pemilik.

## 10\. Risiko \& Failure Mode

|Risiko|Dampak|Mitigasi|
|-|-|-|
|Konversi satuan salah (butir↔gr, volume↔massa)|HPP salah diam-diam|Konversi per-bahan wajib eksplisit; error keras bila tidak ada konversi, jangan menebak|
|Harga bahan berubah|HPP lama berubah jika dihitung ulang|Snapshot + harga bertanggal|
|Float rounding|Selisih rupiah di agregasi|Decimal end-to-end, pembulatan hanya di presentasi|
|Scaling non-linear|Resep gagal pada faktor ekstrem|Flag non-linear + warning|
|Siklus sub-resep|Rekursi tak terbatas|Validasi DAG saat simpan|
|Overhead tersembunyi tidak dihitung|Margin tampak terlalu tinggi|Overhead sebagai item kelas satu, dengan peringatan jika kosong|
|Kebocoran data modal di konten publik|Rahasia bisnis|DTO terpisah, visibilitas per field|

## 11\. Metrik Keberhasilan

* Kalkulasi HPP pada test case referensi 100% akurat, tanpa selisih pembulatan.
* Waktu dari nol sampai resep pertama lengkap dengan HPP di bawah 5 menit.
* Perubahan harga satu bahan terefleksi pada HPP seluruh resep terkait dalam satu aksi.
* Cakupan unit test domain kalkulasi tinggi (properti: scale x lalu x1/x sama dengan original).

## 12\. Milestone

1. **M1 (fondasi):** model satuan, konversi, bahan + riwayat harga.
2. **M2:** resep + versi + scaling dengan aturan pembulatan.
3. **M3:** engine HPP + snapshot + simulator margin.
4. **M4:** UI/UX inti, import-export CSV bahan.
5. **M5 (fase 2):** langkah tutorial, media, publikasi, DTO publik.

## 13\. Pertanyaan Terbuka

* Satu pengguna saja atau multi-tenant sejak awal? Multi
* Perlu sub-resep (adonan dasar, isian) di fase 1, atau cukup flat? 1 resep sub resep bisa juga sihs
* Strategi harga default: harga terakhir atau rata-rata? mau perbandingan juga Harga pasaran
* Apakah yield dihitung dari jumlah unit, berat total, atau keduanya? Keduanya (1 kg tepung 50 rb , 1 gram = 50 rupiah)
* Platform target: web dulu, atau mobile juga? Web -> Web PWA Mobile
* Apakah overhead (gas, tenaga kerja, kemasan) masuk fase 1? Belum masuk fase 2 update

