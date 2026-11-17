"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calculator,
  ChevronDown,
  CloudCheck,
  Database,
  FlaskConical,
  History,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Wheat,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import { APP_SHORT, APP_TAGLINE, APP_VERSION, GOV_NAV_ITEMS, NAV_ITEMS } from "@/lib/constants";
import type { SettingsView } from "@/lib/types";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV_ICONS = {
  LayoutDashboard,
  Wheat,
  FlaskConical,
  Calculator,
  History,
  BookOpen,
  Settings,
} as const;

interface AppShellProps {
  children: React.ReactNode;
  settings: SettingsView;
  syncedAt: string;
}

export function AppShell({ children, settings, syncedAt }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close the drawer when the layout crosses into the desktop breakpoint.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (media.matches) setMobileOpen(false);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Lock background scrolling while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  // Return focus to the trigger when the drawer is dismissed on mobile.
  useEffect(() => {
    if (wasOpenRef.current && !mobileOpen && window.matchMedia("(max-width: 1023px)").matches) {
      menuButtonRef.current?.focus();
    }
    wasOpenRef.current = mobileOpen;
  }, [mobileOpen]);

  const isActive = (href: string) => {
    if (href === "/simulator") return pathname === "/simulator" || pathname.endsWith("/simulator");
    if (href === "/resep") return pathname.startsWith("/resep") && !pathname.endsWith("/simulator");
    if (href === "/bahan-baku") return pathname.startsWith("/bahan-baku");
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[268px_minmax(0,1fr)]">
      {/* Mobile backdrop */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Tutup navigasi"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        id="app-sidebar"
        aria-label="Navigasi utama"
        className={cn(
          "no-print fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-navy text-slate-300 transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          mobileOpen ? "translate-x-0 max-lg:visible" : "-translate-x-full max-lg:invisible",
        )}
      >
        <div
          className="flex items-center gap-3 border-b border-white/10 px-5 py-[18px]"
          style={{ paddingTop: "max(18px, env(safe-area-inset-top))" }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-amber-bright to-amber text-[13px] font-extrabold tracking-tight text-navy shadow-[0_6px_16px_-8px_rgba(245,158,11,0.8)]">
            UFC
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-tight text-white">United Foods</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">Content · {APP_TAGLINE}</p>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-bright shadow-[0_0_0_3px_rgba(245,158,11,0.14)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
              Fase 1: Production Costing
            </span>
          </div>
        </div>

        <nav className="scrollbar-slim mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Modul Operasional</p>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.icon as keyof typeof NAV_ICONS];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-amber-bright" />
                  ) : null}
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-amber-bright" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <p className="px-2 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Tata Kelola & Panduan
          </p>
          <div className="space-y-1">
            {GOV_NAV_ITEMS.map((item) => {
              const Icon = NAV_ICONS[item.icon as keyof typeof NAV_ICONS];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-amber-bright" />
                  ) : null}
                  <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-amber-bright" : "text-slate-500 group-hover:text-slate-300")} />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-bright" />
              Numeric 18,6 · Decimal
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              HPP dihitung di domain murni. Pembulatan hanya di lapisan presentasi.
            </p>
          </div>
        </nav>

        <div
          className="border-t border-white/10 p-4"
          style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-bright opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-bright" />
              </span>
              <div>
                <p className="text-[11px] font-semibold text-slate-200">Database Sinkron</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">{APP_VERSION} Production</p>
              </div>
            </div>
            <CloudCheck className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 px-1 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600">
            Sync {syncedAt}
          </p>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header
          className="no-print sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex h-[62px] items-center gap-3 px-4 lg:px-7">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-ink-soft hover:bg-surface-low lg:hidden"
              aria-label="Buka menu"
              aria-expanded={mobileOpen}
              aria-controls="app-sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form action="/cari" className="relative hidden max-w-[520px] flex-1 md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                name="q"
                type="search"
                placeholder="Cari formula resep, SKU bahan baku, atau kode batch..."
                className="h-9 w-full rounded-lg border border-line bg-surface-low/70 pl-9 pr-3 text-[12.5px] text-ink outline-none transition-colors placeholder:text-subtle focus:border-amber/60 focus:bg-surface focus:ring-2 focus:ring-amber/15 lg:pr-20"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-subtle lg:flex">
                <Sparkles className="h-2.5 w-2.5" /> Cari
              </span>
            </form>

            <div className="ml-auto flex items-center gap-2 lg:gap-3">
              <div className="hidden items-center gap-1.5 rounded-lg border border-line bg-surface-low px-2.5 py-1.5 text-[11px] font-semibold text-ink-soft sm:flex">
                <Database className="h-3.5 w-3.5 text-copper" />
                <span className="font-mono">IDR (Rp)</span>
                <ChevronDown className="h-3 w-3 text-subtle" />
              </div>

              <button
                type="button"
                className="relative rounded-lg border border-transparent p-2 text-ink-soft hover:border-line hover:bg-surface-low"
                aria-label="Notifikasi"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose ring-2 ring-surface" />
              </button>

              <ThemeToggle />

              <div className="hidden h-7 w-px bg-line sm:block" />

              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy-3 to-navy text-[11px] font-bold text-amber-bright ring-2 ring-surface">
                  {initials(settings.ownerName)}
                </div>
                <div className="hidden leading-tight sm:block">
                  <p className="text-[12px] font-semibold text-ink">{settings.ownerName}</p>
                  <p className="text-[10px] text-muted">{settings.ownerRole}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1580px] flex-1 px-4 py-6 lg:px-7 lg:py-7">{children}</main>

        <footer
          className="no-print mx-auto flex w-full max-w-[1580px] flex-wrap items-center justify-between gap-2 px-4 pb-5 text-[10px] text-subtle lg:px-7"
          style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
        >
          <span className="font-mono uppercase tracking-[0.12em]">
            {APP_SHORT} · {APP_TAGLINE} · {settings.workspaceName}
          </span>
          <span className="flex items-center gap-2 font-mono uppercase tracking-[0.12em]">
            <Database className="h-3 w-3" /> Numeric 18,6 · PGlite / Supabase ready
          </span>
        </footer>
      </div>
    </div>
  );
}
