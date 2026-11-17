import { describe, expect, it } from "vitest";
import {
  detectVideoPlatform,
  formatDuration,
  isValidVideoUrl,
  normalizeVideoUrl,
  youtubeThumbnail,
  youtubeVideoId,
} from "@/lib/video";

describe("video helpers", () => {
  it("normalizes bare domains and rejects unsafe protocols", () => {
    expect(normalizeVideoUrl("www.youtube.com/watch?v=abc123")).toBe("https://www.youtube.com/watch?v=abc123");
    expect(normalizeVideoUrl("https://vimeo.com/123456")).toBe("https://vimeo.com/123456");
    expect(normalizeVideoUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeVideoUrl("ftp://example.com/video.mp4")).toBeNull();
    expect(isValidVideoUrl("not a url")).toBe(false);
  });

  it("detects supported video platforms", () => {
    expect(detectVideoPlatform("https://youtu.be/abc123")).toBe("youtube");
    expect(detectVideoPlatform("https://www.youtube.com/watch?v=abc123")).toBe("youtube");
    expect(detectVideoPlatform("https://vimeo.com/123456")).toBe("vimeo");
    expect(detectVideoPlatform("https://www.instagram.com/reel/abc")).toBe("instagram");
    expect(detectVideoPlatform("https://www.tiktok.com/@chef/video/123")).toBe("tiktok");
    expect(detectVideoPlatform("https://example.com/video")).toBe("other");
  });

  it("extracts YouTube IDs and thumbnail URLs", () => {
    expect(youtubeVideoId("https://youtu.be/abc123")).toBe("abc123");
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abc123&t=10")).toBe("abc123");
    expect(youtubeVideoId("https://www.youtube.com/shorts/abc123")).toBe("abc123");
    expect(youtubeVideoId("https://vimeo.com/123456")).toBeNull();
    expect(youtubeThumbnail("https://youtu.be/abc123")).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(youtubeThumbnail("https://example.com/video")).toBeNull();
  });

  it("formats tutorial durations", () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(45)).toBe("45 detik");
    expect(formatDuration(90)).toBe("1 menit 30 detik");
    expect(formatDuration(60 * 15)).toBe("15 menit");
    expect(formatDuration(60 * 90)).toBe("1 jam 30 menit");
  });
});
