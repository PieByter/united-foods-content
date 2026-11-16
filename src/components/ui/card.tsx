import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-surface shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <div className="mt-0.5 text-copper">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="font-display text-[16px] font-bold tracking-[-0.01em] text-ink">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}

export function SectionDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
