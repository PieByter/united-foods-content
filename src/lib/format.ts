import Decimal from "decimal.js";

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const idrPrecise = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const idrUnit2 = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const idrUnit4 = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const numberFormat = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 3,
});

const numberFormat2 = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export function formatCurrency(value: string | number | null | undefined): string {
  return idr.format(toDecimal(value).toNumber()).replace(/\s/g, "");
}

export function formatCurrencyPrecise(value: string | number | null | undefined): string {
  return idrPrecise.format(toDecimal(value).toNumber()).replace(/\s/g, "");
}

/** Harga satuan ringkas: 2 desimal untuk nilai >= 1, 4 desimal untuk nilai kecil. */
export function formatUnitPrice(value: string | number | null | undefined): string {
  const decimal = toDecimal(value);
  const formatter = decimal.abs().gte(1) ? idrUnit2 : idrUnit4;
  return formatter.format(decimal.toNumber()).replace(/\s/g, "");
}

export function formatNumber(value: string | number | null | undefined, digits = 3): string {
  const decimal = toDecimal(value);
  if (digits === 2) return numberFormat2.format(decimal.toNumber());
  return numberFormat.format(decimal.toNumber());
}

export function formatQty(value: string | number | null | undefined, unit?: string): string {
  const qty = formatNumber(value);
  return unit ? `${qty} ${unit}` : qty;
}

export function formatPct(value: string | number | null | undefined, digits = 1): string {
  const decimal = toDecimal(value);
  const fixed = decimal.toFixed(digits);
  return `${fixed}%`;
}

export function formatSignedPct(value: string | number | null | undefined, digits = 1): string {
  const decimal = toDecimal(value);
  return `${decimal.gt(0) ? "+" : ""}${decimal.toFixed(digits)}%`;
}

export function formatCompact(value: string | number | null | undefined): string {
  const decimal = toDecimal(value);
  if (decimal.abs().gte(1_000_000_000)) return `${(decimal.toNumber() / 1_000_000_000).toFixed(1)} M`;
  if (decimal.abs().gte(1_000_000)) return `${(decimal.toNumber() / 1_000_000).toFixed(1)} jt`;
  if (decimal.abs().gte(1_000)) return `${(decimal.toNumber() / 1_000).toFixed(0)} rb`;
  return formatNumber(decimal.toFixed());
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${dateTimeFormatter.format(date)} WIB`;
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${timeFormatter.format(date)} WIB`;
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Kemarin";
  if (days < 7) return `${days} hari lalu`;
  return formatDate(date);
}

export function formatDateTimeShort(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  const day = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${day}, ${timeFormatter.format(date)} WIB`;
}

/** Tanggal hari ini di zona WIB dalam format input date (YYYY-MM-DD). */
export function todayInputWIB(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseDecimalInput(value: FormDataEntryValue | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value).trim();
  if (!text) return "";
  text = text.replace(/rp/gi, "").replace(/\s/g, "");
  // Format Indonesia: 12.000,50 → 12000.50
  if (text.includes(",")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, "");
  }
  return text;
}

/** Tampilkan numeric DB (mis. "8.000000") sebagai input ringkas ("8"). */
export function normalizeDecimalInput(value: string | number | null | undefined, fallback = "0"): string {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return new Decimal(String(value)).toFixed();
  } catch {
    return fallback;
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function foodCostTone(pct: string | number | null | undefined): "healthy" | "watch" | "critical" | "low" {
  const value = toDecimal(pct);
  if (value.lt(20)) return "low";
  if (value.lte(30)) return "healthy";
  if (value.lte(35)) return "watch";
  return "critical";
}
