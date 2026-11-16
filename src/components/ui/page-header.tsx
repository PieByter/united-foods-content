import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div className="min-w-0 flex-1">
        {eyebrow ? <div className="mb-1.5 flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <h1 className="font-display text-[25px] font-extrabold leading-[1.15] tracking-[-0.025em] text-ink md:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-muted">{description}</p>
        ) : null}
        {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
