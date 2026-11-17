import {
  BookOpen,
  Clock,
  ExternalLink,
  Instagram,
  Pencil,
  Play,
  Video,
  Youtube,
} from "lucide-react";
import type { RecipeStepView, RecipeVideoView, VideoPlatform } from "@/lib/types";
import { VIDEO_PLATFORM_LABEL, formatDuration, normalizeVideoUrl, youtubeThumbnail } from "@/lib/video";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

function VideoPlatformIcon({ platform, className }: { platform: VideoPlatform; className?: string }) {
  if (platform === "youtube") return <Youtube className={className} />;
  if (platform === "instagram") return <Instagram className={className} />;
  return <Video className={className} />;
}

function VideoCard({ video }: { video: RecipeVideoView }) {
  const href = normalizeVideoUrl(video.url);
  if (!href) return null;

  const platformLabel = VIDEO_PLATFORM_LABEL[video.platform];
  const title = video.title?.trim() || `Video tutorial ${platformLabel}`;
  const thumbnail = video.thumbnailUrl ?? youtubeThumbnail(href);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-lg border border-line bg-surface-low/35 transition-colors hover:border-amber-line hover:bg-amber-soft/30"
    >
      <div
        className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-navy-3 to-navy"
        style={
          thumbnail
            ? { backgroundImage: `url("${thumbnail.replace(/"/g, '\\"')}")`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {!thumbnail ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20">
              <Play className="ml-0.5 h-4 w-4" />
            </span>
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/15 to-transparent" />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-navy/80 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
          <VideoPlatformIcon platform={video.platform} className="h-2.5 w-2.5" />
          {platformLabel}
        </span>
        {video.source === "ai" ? (
          <span className="absolute right-2 top-2 rounded bg-amber-bright/90 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-navy">
            AI
          </span>
        ) : null}
        <span className="absolute inset-x-2 bottom-2 line-clamp-2 font-display text-[11.5px] font-bold leading-tight text-white">
          {title}
        </span>
      </div>
      <div className="px-2.5 py-2">
        {video.authorName ? (
          <p className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">
            <VideoPlatformIcon platform={video.platform} className="h-2.5 w-2.5 text-copper" />
            {video.authorName}
          </p>
        ) : null}
        {video.description ? (
          <p className="mt-0.5 line-clamp-2 text-[9.5px] leading-relaxed text-muted">{video.description}</p>
        ) : null}
        <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em] text-copper group-hover:underline">
          {video.durationSec ? (
            <>
              <Clock className="h-2.5 w-2.5" /> {formatDuration(video.durationSec)}
            </>
          ) : (
            <>
              Tonton video <ExternalLink className="h-2.5 w-2.5" />
            </>
          )}
        </span>
      </div>
    </a>
  );
}

export function RecipeTutorialPanel({
  recipeId,
  recipeName,
  versionNo,
  steps,
  videos,
}: {
  recipeId: string;
  recipeName: string;
  versionNo: number;
  steps: RecipeStepView[];
  videos: RecipeVideoView[];
}) {
  const hasSteps = steps.length > 0;
  const hasVideos = videos.length > 0;

  return (
    <div className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[16px] font-bold text-ink">
            <BookOpen className="h-4 w-4 text-copper" /> Cara Pembuatan
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Langkah produksi untuk formula aktif v{versionNo}, lengkap dengan video referensi resep.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={hasSteps ? "emerald" : "neutral"}>{steps.length} langkah</Badge>
          <Badge tone={hasVideos ? "blue" : "neutral"}>{videos.length} video</Badge>
          <ButtonLink
            href={`/resep/${recipeId}/tutorial`}
            variant="outline"
            size="sm"
            className="no-print"
            icon={<Pencil className="h-3 w-3" />}
          >
            Kelola Tutorial
          </ButtonLink>
        </div>
      </div>

      {!hasSteps && !hasVideos ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            icon={<BookOpen className="h-7 w-7" />}
            title="Tutorial produksi belum disusun"
            description={`Tambahkan langkah kerja dan tautan video untuk ${recipeName}. Panduan ini membantu operator menjaga konsistensi batch.`}
            action={
              <ButtonLink href={`/resep/${recipeId}/tutorial`} variant="amber" icon={<Pencil className="h-3.5 w-3.5" />}>
                Susun Tutorial
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-5">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-muted">Langkah Produksi</h3>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">
                Versi v{versionNo}
              </span>
            </div>
            {hasSteps ? (
              <ol className="space-y-2.5">
                {steps.map((step, index) => {
                  const duration = formatDuration(step.durationSec);
                  return (
                    <li key={step.id} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-soft font-mono text-[9px] font-bold text-copper ring-1 ring-amber-line">
                          {step.stepNo}
                        </span>
                        {index < steps.length - 1 ? <span className="mt-1 w-px flex-1 bg-line" /> : null}
                      </div>
                      <div className="min-w-0 flex-1 rounded-lg border border-line bg-surface-low/35 px-3 py-2.5">
                        <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-ink-soft">
                          {step.instruction}
                        </p>
                        {duration ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[8.5px] text-muted">
                            <Clock className="h-2.5 w-2.5 text-copper" /> {duration}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="rounded-lg border border-dashed border-line-strong bg-surface-low/30 px-3 py-6 text-center text-[10.5px] text-muted">
                Belum ada langkah tertulis. Tambahkan lewat tombol Kelola Tutorial.
              </div>
            )}
          </div>

          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-muted">Video Referensi</h3>
              <span className="inline-flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-subtle">
                <Play className="h-2.5 w-2.5" /> {videos.length} tautan
              </span>
            </div>
            {hasVideos ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {videos.map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line-strong bg-surface-low/30 px-3 py-6 text-center text-[10.5px] text-muted">
                Belum ada video referensi. Tambahkan beberapa link YouTube, Vimeo, Instagram, atau TikTok.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
