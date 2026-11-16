"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-lg rounded-xl border border-rose-line bg-surface p-6 text-center shadow-card">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-soft text-rose">
          <CircleAlert className="h-5 w-5" />
        </div>
        <h1 className="mt-3 font-display text-[20px] font-bold text-ink">Terjadi kesalahan saat memuat halaman</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          {error.message || "Kalkulasi atau koneksi database gagal. Coba muat ulang halaman."}
        </p>
        {error.digest ? <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-subtle">Digest: {error.digest}</p> : null}
        <div className="mt-4 flex justify-center">
          <Button variant="dark" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset}>
            Coba lagi
          </Button>
        </div>
      </div>
    </div>
  );
}
