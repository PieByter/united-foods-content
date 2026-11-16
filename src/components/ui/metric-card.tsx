import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  valueSuffix,
  icon,
  footerLeft,
  footerRight,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  valueSuffix?: ReactNode;
  icon: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  tone?: "neutral" | "amber" | "emerald" | "rose";
  className?: string;
}) {
  const iconTone = {
    neutral: "bg-surface-low text-ink-soft",
    amber: "bg-amber-soft text-copper",
    emerald: "bg-emerald-soft text-emerald",
    rose: "bg-rose-soft text-rose",
  }[tone];

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card", className)}>
      <div className="flex flex-1 items-start justify-between gap-3 px-5 pb-4 pt-4">
        <div className="min-w-0">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
            <span className="font-display text-[27px] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
              {value}
            </span>
            {valueSuffix ? <span className="text-[12px] font-medium text-muted">{valueSuffix}</span> : null}
          </div>
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconTone)}>{icon}</div>
      </div>
      {footerLeft || footerRight ? (
        <div className="flex flex-nowrap items-center justify-between gap-2 border-t border-line/70 bg-surface-low/45 px-5 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-[10.5px] text-muted">{footerLeft}</div>
          <div className="shrink-0">{footerRight}</div>
        </div>
      ) : null}
    </div>
  );
}
