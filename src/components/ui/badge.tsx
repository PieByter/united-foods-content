import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "amber" | "emerald" | "rose" | "blue" | "dark" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-low text-ink-soft border-line",
  amber: "bg-amber-soft text-copper border-amber-line",
  emerald: "bg-emerald-soft text-emerald border-emerald-line",
  rose: "bg-rose-soft text-rose border-rose-line",
  blue: "bg-blue-soft text-blue border-blue-line",
  dark: "bg-navy text-white border-navy",
  outline: "bg-transparent text-muted border-line-strong",
};

const dots: Record<Tone, string> = {
  neutral: "bg-subtle",
  amber: "bg-amber",
  emerald: "bg-emerald-bright",
  rose: "bg-rose",
  blue: "bg-blue",
  dark: "bg-amber-bright",
  outline: "bg-subtle",
};

export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4 tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} /> : null}
      {children}
    </span>
  );
}

export function Chip({
  children,
  className,
  onClick,
  active,
  title,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] font-medium tabular-nums transition-colors",
        active
          ? "border-amber-line bg-amber-soft text-copper"
          : "border-line bg-surface-low text-ink-soft",
        onClick ? "hover:border-line-strong hover:bg-surface-mid" : "",
        className,
      )}
    >
      {children}
    </Comp>
  );
}
