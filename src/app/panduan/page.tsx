import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock3,
  FlaskConical,
  Info,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wheat,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { KITCHEN_CONVERSIONS } from "@/lib/constants";

export const metadata = { title: "Panduan Standar Biaya F&B" };

const metrics = [
  { name: "Price-to-cost ratio", formula: "harga jual / HPP", value: "384,6%", note: "Harga jual 4x biaya" },
  { name: "Markup", formula: "(harga jual − HPP) / HPP", value: "284,6%", note: "Metrik utama" },
  { name: "Gross margin", formula: "(harga jual − HPP) / harga jual", value: "74,0%", note: "Metrik utama" },
  { name: "Laba per unit", formula: "harga jual − HPP", value: "Rp7.400", note: "Per roti" },
  { name: "Food cost %", formula: "HPP / harga jual", value: "26,0%", note: "Standar F&B" },
];

const reference = [
  { name: "Tepung terigu", x1: "500 gr", cost1: "Rp6.000", x2: "1 kg", cost2: "Rp12.000" },
  { name: "Telur ayam", x1: "2 butir", cost1: "Rp4.000", x2: "4 butir", cost2: "Rp8.000" },
  { name: "Ragi instan", x1: "1 bungkus", cost1: "Rp3.000", x2: "2 bungkus", cost2: "Rp6.000" },
];

export default function GuidePage() {
  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Tata Kelola · Standar Biaya &amp; Formula F&amp;B
          </span>
        }
        title="Panduan Standar Biaya F&B"
        description="Referensi formula, definisi metrik, standar konversi dapur, dan acceptance test yang dipakai UFC untuk memastikan HPP deterministik dan bebas ambiguitas."
        actions={
          <div className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[10px] text-muted shadow-card">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
            PRD Draft v0.1 · Phase 1 Production Costing
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {[
          { href: "#formula", label: "Formula & Metrik" },
          { href: "#acceptance", label: "Acceptance Reference" },
          { href: "#konversi", label: "Konversi Satuan" },
          { href: "#scaling", label: "Aturan Scaling" },
          { href: "#harga", label: "Strategi Harga" },
          { href: "#arsitektur", label: "Arsitektur" },
          { href: "#fase-2", label: "Kesiapan Fase 2" },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted transition-colors hover:border-amber-line hover:bg-amber-soft hover:text-copper"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="space-y-3">
        <section id="formula" className="scroll-mt-20 rounded-xl border border-line bg-surface p-4 shadow-card lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-ink">
                <Calculator className="h-4 w-4 text-copper" /> Definisi Metrik yang Dikunci
              </h2>
              <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-muted">
                Angka “400%” tanpa nama metrik ambigu. UFC menampilkan margin dan markup sebagai metrik utama, price-to-cost sebagai opsional, serta food cost % karena standar industri F&amp;B.
              </p>
            </div>
            <Badge tone="amber">PRD §4</Badge>
          </div>
          <div className="mt-3 overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-surface-low/45 font-mono text-[8.5px] uppercase tracking-[0.11em] text-muted">
                  <th className="px-3 py-2 font-semibold">Metrik</th>
                  <th className="px-3 py-2 font-semibold">Formula</th>
                  <th className="px-3 py-2 text-right font-semibold">Hasil (HPP Rp2.600 / jual Rp10.000)</th>
                  <th className="px-3 py-2 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {metrics.map((metric) => (
                  <tr key={metric.name}>
                    <td className="px-3 py-2 text-[11px] font-semibold text-ink">{metric.name}</td>
                    <td className="px-3 py-2 font-mono text-[10px] text-ink-soft">{metric.formula}</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] font-bold text-ink">{metric.value}</td>
                    <td className="px-3 py-2 text-[10px] text-muted">{metric.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-line bg-surface-low/50 px-3 py-2 text-[10px] leading-relaxed text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-copper" />
            Formula HPP: Σ (kuantitas bahan × harga per base unit) + overhead. HPP per unit = total HPP / yield efektif setelah yield loss.
          </div>
        </section>

        <section id="acceptance" className="scroll-mt-20 rounded-xl border border-line bg-surface p-4 shadow-card lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-ink">
                <CheckCircle2 className="h-4 w-4 text-emerald" /> Acceptance Reference — Roti Pemula
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                Asumsi harga: tepung Rp12.000/kg, telur Rp2.000/butir, ragi Rp3.000/bungkus. Resep x1: 500 gr tepung, 2 telur, 1 bungkus ragi, yield 5 roti @100 gr.
              </p>
            </div>
            <Badge tone="emerald">Test case wajib lolos 100%</Badge>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="flex items-center justify-between border-b border-line bg-surface-low/50 px-3 py-2">
                <span className="text-[11px] font-bold text-ink">Resep x1 — 5 roti</span>
                <Badge tone="neutral">Batch x1</Badge>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line font-mono text-[8px] uppercase tracking-wider text-muted">
                    <th className="px-3 py-1.5 font-semibold">Bahan</th>
                    <th className="px-3 py-1.5 font-semibold">Takaran</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {reference.map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-1.5 text-[10px] text-ink-soft">{row.name}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-ink-soft">{row.x1}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[10px] text-ink">{row.cost1}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-low/40">
                    <td colSpan={2} className="px-3 py-2 text-[10.5px] font-semibold text-ink">HPP Batch</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] font-bold text-ink">Rp13.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="flex items-center justify-between border-b border-line bg-surface-low/50 px-3 py-2">
                <span className="text-[11px] font-bold text-ink">Resep x2 — 10 roti</span>
                <Badge tone="amber">Batch x2</Badge>
              </div>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line font-mono text-[8px] uppercase tracking-wider text-muted">
                    <th className="px-3 py-1.5 font-semibold">Bahan</th>
                    <th className="px-3 py-1.5 font-semibold">Takaran</th>
                    <th className="px-3 py-1.5 text-right font-semibold">Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {reference.map((row) => (
                    <tr key={row.name}>
                      <td className="px-3 py-1.5 text-[10px] text-ink-soft">{row.name}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] text-ink-soft">{row.x2}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[10px] text-ink">{row.cost2}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-low/40">
                    <td colSpan={2} className="px-3 py-2 text-[10.5px] font-semibold text-ink">HPP Batch</td>
                    <td className="px-3 py-2 text-right font-mono text-[11px] font-bold text-ink">Rp26.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-6">
            {[
              { label: "HPP / roti", value: "Rp2.600" },
              { label: "Harga jual", value: "Rp10.000" },
              { label: "Laba / roti", value: "Rp7.400" },
              { label: "Margin", value: "74%" },
              { label: "Markup", value: "284,6%" },
              { label: "Food cost", value: "26%" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-line bg-surface-low/40 px-2.5 py-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-muted">{metric.label}</p>
                <p className="mt-0.5 font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink">{metric.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9.5px] leading-relaxed text-muted">
            Test otomatis di <span className="font-mono">tests/costing.test.ts</span> mengunci angka ini, termasuk satuan campuran (tepung dibeli per kg, dipakai dalam gr; ragi per bungkus, base gr).
          </p>
        </section>

        <section id="konversi" className="scroll-mt-20 rounded-xl border border-line bg-surface p-4 shadow-card lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-ink">
                <Scale className="h-4 w-4 text-copper" /> Standar Konversi &amp; Unit
              </h2>
              <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-muted">
                Massa dinormalisasi ke gram, volume ke mililiter, count ke pcs. Konversi antar-dimensi wajib eksplisit per bahan. Jika tidak ada jalur konversi, HPP gagal keras dan tidak menebak.
              </p>
            </div>
            <Badge tone="rose">Konversi hilang = error</Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {KITCHEN_CONVERSIONS.map((conversion) => (
              <div key={conversion.label} className="rounded-lg border border-line bg-surface-low/40 px-2.5 py-2">
                <p className="text-[9.5px] text-muted">{conversion.label}</p>
                <p className="mt-0.5 font-mono text-[13px] font-bold text-ink">{conversion.value}</p>
                <p className="mt-0.5 text-[8.5px] leading-tight text-subtle">{conversion.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-surface-low/40 px-3 py-2 text-[10px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Contoh normalisasi:</span> Butter Rp385.000 / 1 blok = 2.500 gr → Rp154 / gr. Harga per base unit disimpan NUMERIC(18,6).
            </div>
            <div className="rounded-md border border-line bg-surface-low/40 px-3 py-2 text-[10px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Presisi:</span> cost dihitung dari harga lot asli (Rp385.000 / 2.500 gr) sehingga tidak ada selisih pembulatan saat agregasi.
            </div>
          </div>
        </section>

        <section id="scaling" className="scroll-mt-20 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Layers className="h-4 w-4 text-copper" /> Aturan Pembulatan Diskret
            </h2>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-muted">
              <li><span className="font-semibold text-ink">none:</span> tampilkan nilai eksak, mis. 1,5 butir. Nilai praktis menampilkan 1 butir + 27,5 gr kocokan telur.</li>
              <li><span className="font-semibold text-ink">half:</span> bulatkan ke kelipatan 0,5 terdekat (ceil), mis. 1,2 butir → 1,5 butir.</li>
              <li><span className="font-semibold text-ink">whole:</span> bulatkan ke atas, mis. 1,5 butir → 2 butir.</li>
              <li>Kalkulasi biaya selalu memakai kuantitas eksak, bukan nilai praktis.</li>
            </ul>
            <div className="mt-2 rounded-md border border-amber-line bg-amber-soft px-3 py-2 text-[9.5px] leading-relaxed text-copper">
              <TriangleAlert className="mr-1 inline h-3 w-3" />
              Scaling non-linear berlaku untuk ragi, garam, dan leavener. Warning muncul di bawah 0,25x atau di atas 4x.
            </div>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <Clock3 className="h-4 w-4 text-copper" /> Scaling &amp; Yield Loss
            </h2>
            <ul className="mt-2 space-y-2 text-[10.5px] leading-relaxed text-muted">
              <li>Faktor bebas (0,5x / 2x / 3,5x) atau target yield (“saya mau 20 roti”).</li>
              <li>Yield loss dihitung sebagai penyusutan kuantitas: effective yield = yield × (1 − loss%).</li>
              <li>HPP per unit = total biaya batch / effective yield. Saat batch diskalakan linear, HPP per unit tetap.</li>
              <li>Contoh Roti Pemula 10% loss: 5 roti → 4,5 unit efektif; HPP/unit = Rp13.000 / 4,5.</li>
            </ul>
          </div>
        </section>

        <section id="harga" className="scroll-mt-20 rounded-xl border border-line bg-surface p-4 shadow-card lg:p-5">
          <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-ink">
            <Wheat className="h-4 w-4 text-copper" /> Strategi Pemilihan Harga &amp; Snapshot
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { title: "Latest", desc: "Harga record terakhir. Default fase 1. Paling sederhana dan cocok untuk operasional harian.", tone: "emerald" as const },
              { title: "Average", desc: "Rata-rata berbobot dari seluruh pembelian sampai tanggal kalkulasi. Meredam lonjakan ekstrem.", tone: "amber" as const },
              { title: "Snapshot", desc: "Harga pada tanggal historis. Dipakai untuk laporan, audit, dan perbandingan periode.", tone: "blue" as const },
            ].map((strategy) => (
              <div key={strategy.title} className="rounded-lg border border-line bg-surface-low/40 p-3">
                <Badge tone={strategy.tone}>{strategy.title}</Badge>
                <p className="mt-1.5 text-[10px] leading-relaxed text-muted">{strategy.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-start gap-2 rounded-md border border-emerald-line bg-emerald-soft px-3 py-2 text-[10px] leading-relaxed text-emerald">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Setiap HPP yang disimpan menjadi snapshot append-only: resep versi X, strategi harga, tanggal, dan breakdown item. Harga bahan berubah tidak mengubah snapshot lama.
          </div>
        </section>

        <section id="arsitektur" className="scroll-mt-20 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <FlaskConical className="h-4 w-4 text-copper" /> Arsitektur Implementasi
            </h2>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-muted">
              <li className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald" /> Next.js App Router + Server Actions + Zod.</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald" /> Domain kalkulasi murni di <span className="font-mono">@ufc/costing</span> (Decimal.js, tanpa Next/Drizzle).</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald" /> Drizzle ORM + Postgres; PGlite lokal, Supabase/Postgres via DATABASE_URL.</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald" /> Kolom NUMERIC(18,6) untuk kuantitas/harga; pembulatan hanya di presentasi.</li>
              <li className="flex items-start gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald" /> Snapshot &amp; audit log append-only; owner_id di semua tabel.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
              <ShieldCheck className="h-4 w-4 text-emerald" /> Risiko &amp; Mitigasi
            </h2>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-muted">
              <li><span className="font-semibold text-ink">Konversi salah:</span> wajib eksplisit, error keras.</li>
              <li><span className="font-semibold text-ink">Harga berubah:</span> snapshot + effective_from.</li>
              <li><span className="font-semibold text-ink">Float rounding:</span> Decimal end-to-end.</li>
              <li><span className="font-semibold text-ink">Siklus sub-resep:</span> validasi DAG saat simpan, max depth 5.</li>
              <li><span className="font-semibold text-ink">Overhead tersembunyi:</span> overhead kelas satu + warning jika kosong.</li>
              <li><span className="font-semibold text-ink">Kebocoran harga modal:</span> DTO publik dipisah di fase 2.</li>
            </ul>
          </div>
        </section>

        <section id="fase-2" className="scroll-mt-20 rounded-xl border border-white/10 bg-navy p-4 text-white shadow-card lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 font-display text-[16px] font-bold">
                <Sparkles className="h-4 w-4 text-amber-bright" /> Kesiapan Content System (Fase 2)
              </h2>
              <p className="mt-1 max-w-3xl text-[11.5px] leading-relaxed text-slate-400">
                Skema resep sudah memiliki slug, status draft/published, locale, author, recipe_step, media, dan tag. Data privat (harga beli, HPP, margin) dipisahkan dari DTO publik.
              </p>
            </div>
            <Badge tone="dark">Schema ready</Badge>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[
              { title: "Content-addressable recipe", desc: "slug, status, locale, author_id tersedia sejak fase 1." },
              { title: "Tutorial & scaling text", desc: "recipe_step dengan referensi item untuk token {{item:tepung}}." },
              { title: "Public cost estimate", desc: "Estimasi publik memakai harga referensi, bukan harga modal." },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.05] p-2.5">
                <p className="text-[10px] font-semibold text-amber-bright">{item.title}</p>
                <p className="mt-0.5 text-[9px] leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-[10px] text-muted shadow-card">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-copper" />
            Dokumen sumber: <span className="font-medium text-ink">PRD Recipe &amp; HPP Management System v0.1</span>
          </span>
          <a href="/dashboard" className="inline-flex items-center gap-1 font-semibold text-copper hover:underline">
            Kembali ke dashboard <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
