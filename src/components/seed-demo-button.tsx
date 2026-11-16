"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DatabaseZap } from "lucide-react";
import { seedDemoAction } from "@/server/actions/demo";
import { Button } from "@/components/ui/button";

export function SeedDemoButton({
  label = "Muat data contoh",
  variant = "amber",
  force = false,
}: {
  label?: string;
  variant?: "amber" | "outline" | "primary";
  force?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant={variant}
      loading={pending}
      icon={pending ? undefined : <DatabaseZap className="h-3.5 w-3.5" />}
      onClick={() => {
        if (force && !window.confirm("Muat ulang data contoh? Seluruh data workspace akan diganti.")) return;
        startTransition(async () => {
          const result = await seedDemoAction(force);
          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message ?? "Gagal memuat data contoh.");
          }
        });
      }}
    >
      {label}
    </Button>
  );
}
