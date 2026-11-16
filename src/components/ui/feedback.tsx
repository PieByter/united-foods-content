import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-low/40 px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-3 text-subtle">{icon}</div> : null}
      <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("rounded-md border border-rose-line bg-rose-soft px-3 py-2 text-[11.5px] font-medium text-rose", className)}>
      {children}
    </div>
  );
}

export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <div className={cn("rounded-md border border-amber-line bg-amber-soft px-3 py-2 text-[11.5px] leading-relaxed text-copper", className)}>
      {children}
    </div>
  );
}
