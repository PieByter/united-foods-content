"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applyTheme,
  getServerThemeSnapshot,
  getThemeSnapshot,
  persistTheme,
  preferredTheme,
  subscribeToTheme,
} from "@/components/theme/theme-store";

export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const isDark = theme === "dark";

  // The inline script in the root layout handles the initial paint. Re-apply
  // here so the theme survives React's development remount of <html>.
  useLayoutEffect(() => {
    applyTheme(preferredTheme());
  }, []);

  return (
    <button
      type="button"
      onClick={() => persistTheme(getThemeSnapshot() === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-transparent text-ink-soft transition-colors hover:border-line hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/40",
        withLabel ? "h-9 px-3 text-[11.5px] font-semibold" : "h-9 w-9",
        className,
      )}
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
    >
      <Sun aria-hidden="true" className="hidden h-[18px] w-[18px] text-amber dark:block" />
      <Moon aria-hidden="true" className="block h-[18px] w-[18px] dark:hidden" />
      {withLabel ? (
        <>
          <span className="dark:hidden">Aktifkan mode gelap</span>
          <span className="hidden dark:inline">Aktifkan mode terang</span>
        </>
      ) : null}
    </button>
  );
}
