import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-low text-copper">
          <Compass className="h-5 w-5" />
        </div>
        <p className="mt-3 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-copper">Error 404</p>
        <h1 className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Resep atau rute yang Anda cari mungkin sudah diarsipkan atau tidak tersedia.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex h-9 items-center rounded-lg bg-ink px-4 text-[12px] font-semibold text-white hover:bg-ink-soft"
        >
          Kembali ke dashboard
        </Link>
      </div>
    </div>
  );
}
