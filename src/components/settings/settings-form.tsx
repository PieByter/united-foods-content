"use client";

import { useActionState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { suggestSellingPrice } from "@ufc/costing";
import type { SettingsView } from "@/lib/types";
import { updateSettingsAction } from "@/server/actions/recipes";
import type { ActionState } from "@/server/actions/shared";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select, HelpText } from "@/components/ui/form";
import { ErrorNote } from "@/components/ui/feedback";

const initialState: ActionState = {};

export function SettingsForm({ settings }: { settings: SettingsView }) {
  const [state, action, pending] = useActionState(updateSettingsAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else if (state.ok === false && state.message && !state.fieldErrors) {
      toast.error(state.message);
    }
  }, [state, router]);

  const errors = state.fieldErrors ?? {};

  const example = useMemo(() => {
    try {
      const margin = Number(settings.targetMarginPct || 70);
      const foodCost = Number(settings.targetFoodCostPct || 30);
      return {
        marginPrice: suggestSellingPrice({ costPerUnit: 2600, targetMarginPct: margin, roundingTo: 500 }),
        foodCostPrice: suggestSellingPrice({ costPerUnit: 2600, targetFoodCostPct: foodCost, roundingTo: 500 }),
      };
    } catch {
      return { marginPrice: "—", foodCostPrice: "—" };
    }
  }, [settings.targetMarginPct, settings.targetFoodCostPct]);

  return (
    <form action={action} className="space-y-3">
      {state.ok === false && state.message && !Object.keys(errors).length ? <ErrorNote>{state.message}</ErrorNote> : null}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-[15px] font-bold text-ink">Identitas Workspace</h2>
            <p className="mt-0.5 text-[10.5px] text-muted">Tampil di sidebar, header, dan audit log.</p>
          </div>
          <span className="rounded-full border border-line bg-surface-low px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-muted">
            single owner · multi-tenant ready
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nama Workspace" htmlFor="workspaceName" required error={errors.workspaceName}>
            <Input id="workspaceName" name="workspaceName" defaultValue={settings.workspaceName} />
          </Field>
          <Field label="Nama Owner / Chef" htmlFor="ownerName" required error={errors.ownerName}>
            <Input id="ownerName" name="ownerName" defaultValue={settings.ownerName} />
          </Field>
          <Field label="Role" htmlFor="ownerRole" required error={errors.ownerRole}>
            <Input id="ownerRole" name="ownerRole" defaultValue={settings.ownerRole} />
          </Field>
          <Field label="Mata Uang" help="Fase 1 hanya IDR. Kolom currency sudah disiapkan untuk ekspansi.">
            <Input value={`${settings.currency} (Rp)`} readOnly className="bg-surface-low font-mono" />
          </Field>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
        <div className="mb-3">
          <h2 className="font-display text-[15px] font-bold text-ink">Default Kalkulasi &amp; Target Finansial</h2>
          <p className="mt-0.5 text-[10.5px] text-muted">Dipakai dashboard, recipe studio, dan simulator saat harga jual belum diatur.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Strategi Harga Default" htmlFor="defaultPriceStrategy">
            <Select id="defaultPriceStrategy" name="defaultPriceStrategy" defaultValue={settings.defaultPriceStrategy}>
              <option value="latest">Latest — harga terakhir aktif</option>
              <option value="average">Average — rata-rata berbobot</option>
              <option value="snapshot">Snapshot — tanggal historis</option>
            </Select>
          </Field>
          <Field label="Target Food Cost Portofolio (%)" htmlFor="targetFoodCostPct" error={errors.targetFoodCostPct}>
            <NumberInput id="targetFoodCostPct" name="targetFoodCostPct" defaultValue={settings.targetFoodCostPct} />
          </Field>
          <Field label="Target Gross Margin (%)" htmlFor="targetMarginPct" error={errors.targetMarginPct}>
            <NumberInput id="targetMarginPct" name="targetMarginPct" defaultValue={settings.targetMarginPct} />
          </Field>
          <div className="flex items-end">
            <div className="w-full rounded-md border border-line bg-surface-low/50 px-3 py-2 text-[9.5px] leading-relaxed text-muted">
              <p className="font-semibold text-ink">Contoh pada HPP Rp2.600/roti</p>
              <p className="mt-0.5">
                Margin {settings.targetMarginPct}% → <span className="font-mono font-semibold text-copper">{formatCurrency(example.marginPrice)}</span>
              </p>
              <p>
                Food cost {settings.targetFoodCostPct}% → <span className="font-mono font-semibold text-copper">{formatCurrency(example.foodCostPrice)}</span>
              </p>
            </div>
          </div>
        </div>
        <HelpText>
          Target food cost 25–30% adalah standar F&amp;B yang sehat. Margin dihitung dari harga jual, markup dihitung dari HPP.
        </HelpText>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="amber" loading={pending} icon={<Save className="h-3.5 w-3.5" />}>
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  );
}
