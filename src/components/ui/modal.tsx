"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  size = "lg",
  tone = "light",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "light" | "dark";
}) {
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup modal"
        onClick={onClose}
        className="fixed inset-0 bg-navy/60 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-ufc-rise relative z-10 my-auto w-full overflow-hidden rounded-xl border border-line bg-surface shadow-modal",
          widths[size],
        )}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-4 border-b px-5 py-4",
            tone === "dark" ? "border-white/10 bg-navy text-white" : "border-line bg-surface-low/60 text-ink",
          )}
        >
          <div>
            {eyebrow ? (
              <p
                className={cn(
                  "mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em]",
                  tone === "dark" ? "text-amber-bright" : "text-copper",
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-[18px] font-bold tracking-[-0.015em]">{title}</h2>
            {description ? (
              <p className={cn("mt-1 max-w-2xl text-[12px] leading-relaxed", tone === "dark" ? "text-slate-400" : "text-muted")}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              tone === "dark" ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-surface-mid",
            )}
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(100dvh-220px)] overflow-y-auto scrollbar-slim px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-low/40 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
