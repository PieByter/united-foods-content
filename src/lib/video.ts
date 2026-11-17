export const VIDEO_PLATFORMS = ["youtube", "vimeo", "instagram", "tiktok", "other"] as const;

export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

export const VIDEO_PLATFORM_LABEL: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  tiktok: "TikTok",
  other: "Video",
};

/**
 * Accepts a full URL or a bare domain/path. Returns a normalized http(s) URL,
 * or null when the value is not a safe external link.
 */
export function normalizeVideoUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isValidVideoUrl(value: string): boolean {
  return normalizeVideoUrl(value) !== null;
}

function hostnameOf(value: string): string | null {
  const normalized = normalizeVideoUrl(value);
  if (!normalized) return null;
  return new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
}

export function detectVideoPlatform(value: string): VideoPlatform {
  const host = hostnameOf(value);
  if (!host) return "other";
  if (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com") || host.endsWith(".youtube-nocookie.com")) {
    return "youtube";
  }
  if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return "vimeo";
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  return "other";
}

export function youtubeVideoId(value: string): string | null {
  const normalized = normalizeVideoUrl(value);
  if (!normalized) return null;

  const url = new URL(normalized);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (host === "youtube.com" || host.endsWith(".youtube.com") || host.endsWith(".youtube-nocookie.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
      return parts[1] ?? null;
    }
  }

  return null;
}

/** Deterministic YouTube thumbnail URL. No network request is made here. */
export function youtubeThumbnail(value: string): string | null {
  const id = youtubeVideoId(value);
  return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : null;
}

/** Human-friendly duration for tutorial steps and video metadata. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) return null;

  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  if (minutes > 0) return secs > 0 ? `${minutes} menit ${secs} detik` : `${minutes} menit`;
  return `${secs} detik`;
}
