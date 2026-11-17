import Link from "next/link";
import {
  Calculator,
  ChefHat,
  Database,
  FileClock,
  History,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Wheat,
} from "lucide-react";
import { getAuditLog, getAuditStats } from "@/server/queries";
import { AUDIT_ACTION_LABEL } from "@/lib/constants";
import { formatDateTimeShort, formatRelative } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Audit Log Perubahan" };

const FILTERS = [
  { key: "all", label: "Semua Aktivitas", entity: undefined, icon: History },
  { key: "ingredient", label: "Bahan & Harga", entity: "ingredient", icon: Wheat },
  { key: "recipe", label: "Resep & Versi", entity: "recipe", icon: ChefHat },
  { key: "snapshot", label: "Snapshot HPP", entity: "costing_snapshot", icon: Calculator },
  { key: "settings", label: "Pengaturan", entity: "app_settings", icon: Settings },
];

const ENTITY_LABEL: Record<string, string> = {
  ingredient: "Bahan Baku",
  recipe: "Resep",
  costing_snapshot: "Snapshot HPP",
  app_settings: "Pengaturan",
  workspace: "Workspace",
};

function actionTone(action: string): "amber" | "emerald" | "blue" | "rose" | "neutral" {
  if (action.includes("price")) return "rose";
  if (action.includes("snapshot")) return "emerald";
  if (action.startsWith("recipe")) return "blue";
  if (action.includes("import") || action.includes("demo")) return "amber";
  return "neutral";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; q?: string }>;
}) {
  const params = await searchParams;
  const entity = FILTERS.find((filter) => filter.key === params.entity)?.entity;
  const [logs, stats] = await Promise.all([
    getAuditLog({ limit: 120, entityType: entity }),
    getAuditStats(),
  ]);
  const query = (params.q ?? "").trim().toLowerCase();
  const filtered = query
    ? logs.filter((log) => `${log.summary} ${log.actor} ${log.action} ${log.entityType}`.toLowerCase().includes(query))
    : logs;

  const activeKey = params.entity ?? "all";

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Tata Kelola · Audit Trail Append-Only
          </span>
        }
        title="Audit Log Perubahan"
        description="Jejak perubahan harga bahan, versi resep, snapshot HPP, dan pengaturan workspace. Semua record bersifat append-only untuk kebutuhan audit."
        actions={
          <form action="/audit" className="relative">
            {params.entity ? <input type="hidden" name="entity" value={params.entity} /> : null}
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle" />
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Cari aktivitas atau aktor..."
              className="h-9 w-56 rounded-lg border border-line bg-surface pl-8 pr-3 text-[11.5px] outline-none placeholder:text-subtle focus:border-amber focus:ring-2 focus:ring-amber/15"
            />
          </form>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Event Audit" value={stats.total} valueSuffix="Record" icon={<History className="h-4 w-4" />} footerLeft={<span>Append-only</span>} />
        <MetricCard label="Perubahan Harga" value={stats.priceChanges} valueSuffix="Event" tone="rose" icon={<Tags className="h-4 w-4" />} footerLeft={<span>Harga bahan</span>} />
        <MetricCard label="Versi Resep" value={stats.versions} valueSuffix="Versi" tone="amber" icon={<ChefHat className="h-4 w-4" />} footerLeft={<span>Snapshot tetap utuh</span>} />
        <MetricCard label="Snapshot HPP" value={stats.snapshots} valueSuffix="Snapshot" tone="emerald" icon={<Calculator className="h-4 w-4" />} footerLeft={<span>Audit lock</span>} />
      </div>

      <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {FILTERS.map((filter) => {
              const Icon = filter.icon;
              const active = activeKey === filter.key;
              return (
                <Link
                  key={filter.key}
                  href={filter.entity ? `/audit?entity=${filter.entity}` : "/audit"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors",
                    active
                      ? "border-inverse bg-inverse text-inverse-ink"
                      : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {filter.label}
                </Link>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-low/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-[14px] font-bold text-ink">Timeline Perubahan</h2>
                <Badge tone="neutral">{filtered.length} event</Badge>
              </div>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-muted">Terbaru di atas</span>
            </div>
            <div className="divide-y divide-line/70">
              {filtered.map((log) => (
                <div key={log.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-amber-soft/20">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-low text-copper">
                    {log.entityType === "ingredient" ? (
                      <Wheat className="h-3.5 w-3.5" />
                    ) : log.entityType === "recipe" ? (
                      <ChefHat className="h-3.5 w-3.5" />
                    ) : log.entityType === "costing_snapshot" ? (
                      <Calculator className="h-3.5 w-3.5" />
                    ) : (
                      <Settings className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-[11.5px] font-semibold leading-snug text-ink">{log.summary}</p>
                      <Badge tone={actionTone(log.action)}>{AUDIT_ACTION_LABEL[log.action] ?? log.action}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">
                      <span>{log.actor}</span>
                      <span>·</span>
                      <span>{ENTITY_LABEL[log.entityType] ?? log.entityType}</span>
                      {log.entityId ? (
                        <>
                          <span>·</span>
                          <span className="normal-case">{log.entityId.slice(0, 8)}</span>
                        </>
                      ) : null}
                      <span>·</span>
                      <span>{formatRelative(log.createdAt)}</span>
                    </div>
                    {log.metadata ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(log.metadata)
                          .slice(0, 4)
                          .map(([key, value]) => (
                            <span key={key} className="rounded bg-surface-low px-1.5 py-0.5 font-mono text-[8px] text-muted">
                              {key}: {typeof value === "object" ? JSON.stringify(value).slice(0, 40) : String(value).slice(0, 60)}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="font-mono text-[8.5px] text-subtle">{formatDateTimeShort(log.createdAt)}</p>
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? (
                <div className="px-4 py-12 text-center text-[11.5px] text-muted">Belum ada event audit yang cocok dengan filter.</div>
              ) : null}
            </div>
            <div className="border-t border-line bg-surface-low/35 px-4 py-2 text-[9px] text-muted">
              Log audit tidak dapat diedit atau dihapus dari UI. Retensi dilakukan di level database.
            </div>
          </div>
        </div>

        <aside className="space-y-3 xl:w-[320px]">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <ShieldCheck className="h-4 w-4 text-emerald" /> Prinsip Audit UFC
            </h2>
            <ul className="mt-2 space-y-2 text-[9.5px] leading-relaxed text-muted">
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Setiap perubahan harga bahan membuat record harga baru dengan effective_from.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Setiap perubahan takaran resep membuat versi formula baru.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Snapshot HPP membekukan versi resep, strategi harga, dan harga jual saat itu.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Identitas owner disimpan di setiap tabel, siap untuk multi-tenant.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <Database className="h-4 w-4 text-copper" /> Distribusi Aksi
            </h2>
            <div className="mt-2 space-y-2">
              {[
                { label: "Harga bahan", value: stats.priceChanges, total: stats.total, color: "bg-rose" },
                { label: "Versi resep", value: stats.versions, total: stats.total, color: "bg-amber" },
                { label: "Snapshot HPP", value: stats.snapshots, total: stats.total, color: "bg-emerald-bright" },
              ].map((entry) => (
                <div key={entry.label}>
                  <div className="flex items-center justify-between text-[9.5px] text-muted">
                    <span>{entry.label}</span>
                    <span className="font-mono font-semibold text-ink">{entry.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-mid">
                    <div className={cn("h-full rounded-full", entry.color)} style={{ width: `${entry.total ? (entry.value / entry.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-[9.5px] leading-relaxed text-muted shadow-card">
            <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
            <span>
              UI hanya membaca audit log. Koreksi data dilakukan dengan record baru, bukan menimpa histori. Ini memenuhi requirement auditability PRD §7.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
