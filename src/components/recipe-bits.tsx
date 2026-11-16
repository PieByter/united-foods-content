import Image from "next/image";
import {
  CakeSlice,
  ChefHat,
  Cookie,
  Croissant,
  FlaskConical,
  Package,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { RecipeView } from "@/lib/types";

const thumbStyles: Record<
  string,
  { gradient: [string, string, string]; icon: LucideIcon; label: string; image?: string }
> = {
  "Bakery & Roti": {
    gradient: ["#4a2b12", "#9a5d21", "#e2ad6b"],
    icon: Wheat,
    label: "Artisan Bake",
    image: "/media/sourdough-racks.jpg",
  },
  Viennoiserie: {
    gradient: ["#5f3710", "#c47820", "#f5cd86"],
    icon: Croissant,
    label: "Laminated",
    image: "/media/laminated-dough.jpg",
  },
  "Pastry & Donat": {
    gradient: ["#4f2a18", "#a35a2a", "#e7aa74"],
    icon: Cookie,
    label: "Pastry",
    image: "/media/donuts.jpg",
  },
  "Cake & Bolu": {
    gradient: ["#24402c", "#5f7f47", "#cdb77a"],
    icon: CakeSlice,
    label: "Cake",
    image: "/media/bread-crumb.jpg",
  },
  "Kue Kering": { gradient: ["#543a12", "#b78430", "#f2d18c"], icon: Cookie, label: "Kue Kering" },
  "Sub-resep": { gradient: ["#1a293e", "#3f5774", "#91a8c1"], icon: FlaskConical, label: "Sub-resep" },
  default: { gradient: ["#182338", "#3a5274", "#8fa4bd"], icon: ChefHat, label: "Formula" },
};

export function RecipeThumb({
  category,
  className,
  iconClassName,
  label,
  imageSrc,
  alt,
}: {
  category?: string | null;
  className?: string;
  iconClassName?: string;
  label?: string;
  imageSrc?: string;
  alt?: string;
}) {
  const style = (category && thumbStyles[category]) || thumbStyles.default;
  const Icon = style.icon;
  const image = imageSrc ?? style.image;

  return (
    <div
      className={cn("grain relative flex items-center justify-center overflow-hidden rounded-lg", className)}
      style={
        image
          ? undefined
          : {
              backgroundImage: `linear-gradient(135deg, ${style.gradient[0]} 0%, ${style.gradient[1]} 55%, ${style.gradient[2]} 100%)`,
            }
      }
    >
      {image ? (
        <>
          <Image
            src={image}
            alt={alt ?? label ?? style.label}
            fill
            sizes="(max-width: 768px) 40vw, 240px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1324]/70 via-transparent to-transparent" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.3),transparent_48%)]" />
          <Icon className={cn("relative z-10 h-1/2 w-1/2 text-white/90 drop-shadow", iconClassName)} strokeWidth={1.4} />
        </>
      )}
      {label !== "" ? (
        <span className="absolute bottom-1 left-1.5 z-10 font-mono text-[8px] font-semibold uppercase tracking-[0.12em] text-white/90">
          {label ?? style.label}
        </span>
      ) : null}
    </div>
  );
}

export function RecipeStatusBadge({ status }: { status: "draft" | "published" }) {
  return status === "published" ? (
    <Badge tone="emerald" dot>
      Published
    </Badge>
  ) : (
    <Badge tone="amber" dot>
      Draft
    </Badge>
  );
}

export function FoodCostBadge({ pct }: { pct: string | number }) {
  const value = Number(pct);
  if (value <= 20) return <Badge tone="blue">Low {Number(pct).toFixed(1)}%</Badge>;
  if (value <= 30) return <Badge tone="emerald">Healthy {Number(pct).toFixed(1)}%</Badge>;
  if (value <= 35) return <Badge tone="amber">Watch {Number(pct).toFixed(1)}%</Badge>;
  return <Badge tone="rose">Critical {Number(pct).toFixed(1)}%</Badge>;
}

export function SubrecipeBadge() {
  return (
    <Badge tone="blue" className="gap-1">
      <Package className="h-2.5 w-2.5" /> Sub-resep
    </Badge>
  );
}

export function recipeInitials(recipe: RecipeView) {
  return recipe.code.split("-").slice(-2).join("-");
}
