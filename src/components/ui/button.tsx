import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "amber" | "outline" | "ghost" | "soft" | "danger" | "dark";
type Size = "xs" | "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-inverse text-inverse-ink hover:bg-inverse/90 shadow-[0_1px_2px_rgba(15,23,42,0.18)] disabled:bg-subtle",
  amber:
    "bg-amber text-white hover:bg-copper shadow-[0_1px_2px_rgba(180,83,9,0.24)] disabled:bg-amber/50",
  outline:
    "border border-line-strong bg-surface text-ink hover:border-ink/30 hover:bg-surface-low disabled:text-subtle",
  ghost: "text-ink-soft hover:bg-surface-low hover:text-ink disabled:text-subtle",
  soft: "bg-surface-low text-ink-soft hover:bg-surface-mid disabled:text-subtle",
  danger: "bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50",
  dark: "bg-navy text-white hover:bg-navy-3 disabled:bg-slate-500",
};

const sizes: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] gap-1.5 rounded-md",
  sm: "h-8 px-3 text-[12px] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-[12.5px] gap-2 rounded-lg",
  lg: "h-10 px-4 text-[13px] gap-2 rounded-lg",
  icon: "h-8 w-8 rounded-md",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface disabled:cursor-not-allowed",
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  icon,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
