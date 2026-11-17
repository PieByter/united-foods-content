"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
} from "@/components/theme/theme-store";

export function ThemedToaster() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);

  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: "var(--font-inter)",
          fontSize: "13px",
          borderRadius: "8px",
          border: "1px solid var(--color-line)",
        },
      }}
    />
  );
}
