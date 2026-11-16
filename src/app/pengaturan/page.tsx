import { AlertTriangle, BookMarked, Database, Download, FileUp, Globe2, Layers, ShieldCheck } from "lucide-react";
import { getSettings } from "@/server/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettingsForm } from "@/components/settings/settings-form";
import { SeedDemoButton } from "@/components/seed-demo-button";
import { APP_NAME, APP_SHORT, APP_TAGLINE, APP_VERSION } from "@/lib/constants";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Tata Kelola · Workspace Configuration
          </span>
        }
        title="Pengaturan & Kesiapan Sistem"
        description="Konfigurasi identitas workspace, strategi harga default, target finansial, dan kesiapan content system fase 2."
      />

      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <SettingsForm settings={settings} />
        </div>

        <aside className="space-y-3 xl:col-span-4">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <Layers className="h-4 w-4 text-copper" /> Content System Fase 2
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Skema resep sudah siap untuk publikasi konten. Harga modal dan HPP tetap privat.
            </p>
            <div className="mt-2 space-y-1.5 text-[9.5px]">
              {[
                ["slug publik", "recipe.slug"],
                ["status draft/published", "recipe.status"],
                ["locale & author", "recipe.locale / author_id"],
                ["langkah tutorial & media", "recipe_step / media"],
                ["tag & pencarian", "tag / recipe_tag"],
              ].map(([label, column]) => (
                <div key={label} className="flex items-center justify-between rounded border border-line bg-surface-low/40 px-2 py-1.5">
                  <span className="text-muted">{label}</span>
                  <span className="font-mono text-[8.5px] text-ink-soft">{column}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-start gap-1.5 rounded-md border border-blue-line bg-blue-soft px-2.5 py-2 text-[9px] leading-relaxed text-blue">
              <Globe2 className="mt-0.5 h-3 w-3 shrink-0" />
              DTO publik terpisah wajib dibuat sebelum konten dipublikasikan agar harga modal tidak bocor.
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <Database className="h-4 w-4 text-copper" /> Data &amp; Integrasi
            </h2>
            <div className="mt-2 space-y-1.5">
              <ButtonLink href="/api/export/ingredients" variant="soft" size="sm" className="w-full justify-start" icon={<Download className="h-3.5 w-3.5" />}>
                Ekspor bahan baku (CSV)
              </ButtonLink>
              <ButtonLink href="/bahan-baku" variant="soft" size="sm" className="w-full justify-start" icon={<FileUp className="h-3.5 w-3.5" />}>
                Import bahan baku
              </ButtonLink>
              <ButtonLink href="/panduan#arsitektur" variant="soft" size="sm" className="w-full justify-start" icon={<BookMarked className="h-3.5 w-3.5" />}>
                Dokumentasi arsitektur
              </ButtonLink>
            </div>
            <div className="mt-2 rounded-md border border-line bg-surface-low/40 px-2.5 py-2 text-[9px] leading-relaxed text-muted">
              Lokal: PGlite embedded di <span className="font-mono">.data/pglite</span>. Produksi: isi <span className="font-mono">DATABASE_URL</span> Supabase transaction pooler (port 6543), lalu jalankan <span className="font-mono">npm run db:migrate</span>.
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <ShieldCheck className="h-4 w-4 text-emerald" /> Status Build
            </h2>
            <div className="mt-2 space-y-1.5 font-mono text-[9px] text-muted">
              <div className="flex justify-between"><span>Aplikasi</span><span className="text-ink">{APP_NAME}</span></div>
              <div className="flex justify-between"><span>Kode</span><span className="text-ink">{APP_SHORT} · {APP_TAGLINE}</span></div>
              <div className="flex justify-between"><span>Versi</span><span className="text-ink">{APP_VERSION}</span></div>
              <div className="flex justify-between"><span>Presisi</span><span className="text-ink">Numeric 18,6</span></div>
              <div className="flex justify-between"><span>Domain</span><span className="text-ink">@ufc/costing</span></div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge tone="emerald">Decimal.js</Badge>
              <Badge tone="blue">Drizzle</Badge>
              <Badge tone="amber">PGlite / Supabase</Badge>
            </div>
          </div>

          <div className="rounded-xl border border-rose-line bg-rose-soft p-4">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-bold text-rose">
              <AlertTriangle className="h-4 w-4" /> Zona Demo
            </h2>
            <p className="mt-1 text-[9.5px] leading-relaxed text-rose/90">
              Memuat ulang data contoh akan mengganti seluruh bahan, resep, snapshot, dan audit log di workspace lokal.
            </p>
            <div className="mt-2">
              <SeedDemoButton label="Reset & isi data contoh" variant="outline" force />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
