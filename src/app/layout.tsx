import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { getSettings } from "@/server/queries";
import { formatDateTimeShort } from "@/lib/format";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "UFC — United Foods Content",
    template: "%s · UFC",
  },
  description:
    "Recipe, scaling, dan HPP costing system untuk F&B: bahan baku, konversi satuan, HPP per batch/unit, margin, dan snapshot audit.",
  applicationName: "United Foods Content",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UFC",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1324",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  const syncedAt = formatDateTimeShort(new Date());

  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${jakarta.variable} ${jetbrains.variable} min-h-dvh font-sans`}>
        <AppShell settings={settings} syncedAt={syncedAt}>
          {children}
        </AppShell>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-inter)",
              fontSize: "13px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            },
          }}
        />
      </body>
    </html>
  );
}
