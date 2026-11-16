import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Label({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1.5 block text-[11px] font-semibold tracking-[0.01em] text-ink-soft", className)}
    >
      {children}
      {required ? <span className="ml-0.5 text-rose">*</span> : null}
    </label>
  );
}

const fieldBase =
  "w-full rounded-md border border-line-strong bg-white text-[12.5px] text-ink outline-none transition-colors placeholder:text-subtle focus:border-amber focus:ring-2 focus:ring-amber/15 disabled:bg-surface-low disabled:text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-9 px-3", className)} {...props} />;
}

export function NumberInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      inputMode="decimal"
      className={cn(fieldBase, "h-9 px-3 text-right font-mono tabular-nums", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={cn(fieldBase, "h-9 px-2.5", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-[76px] px-3 py-2 leading-relaxed", className)} {...props} />;
}

export function HelpText({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-[10.5px] leading-relaxed text-muted", className)}>{children}</p>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-[10.5px] font-medium text-rose">{children}</p>;
}

export function Field({
  label,
  htmlFor,
  required,
  help,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      <FieldError>{error}</FieldError>
      {help ? <HelpText>{help}</HelpText> : null}
    </div>
  );
}

export function InputGroup({
  prefix,
  suffix,
  children,
  className,
}: {
  prefix?: ReactNode;
  suffix?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-stretch overflow-hidden rounded-md border border-line-strong bg-white transition-colors focus-within:border-amber focus-within:ring-2 focus-within:ring-amber/15",
        className,
      )}
    >
      {prefix ? (
        <span className="flex items-center border-r border-line bg-surface-low px-2.5 text-[11px] font-semibold text-muted">
          {prefix}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center [&>input]:h-full [&>input]:border-0 [&>input]:ring-0 [&>input]:focus:ring-0 [&>input]:rounded-none">
        {children}
      </div>
      {suffix ? (
        <span className="flex items-center border-l border-line bg-surface-low px-2.5 font-mono text-[10.5px] text-muted">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function FormSection({
  step,
  title,
  description,
  badge,
  children,
  className,
}: {
  step?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-line bg-surface-low/35 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
            {step ? (
              <span className="flex h-5 w-5 items-center justify-center rounded bg-navy font-mono text-[10px] text-amber-bright">
                {step}
              </span>
            ) : null}
            {title}
          </h3>
          {description ? <p className="mt-1 text-[11px] leading-relaxed text-muted">{description}</p> : null}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}
