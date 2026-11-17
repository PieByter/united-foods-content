"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Clock,
  Info,
  Link2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import type { RecipeStepView, RecipeVideoView } from "@/lib/types";
import { saveRecipeTutorialAction } from "@/server/actions/recipes";
import type { ActionState } from "@/server/actions/shared";
import { detectVideoPlatform, formatDuration, isValidVideoUrl, VIDEO_PLATFORM_LABEL } from "@/lib/video";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, NumberInput, Textarea } from "@/components/ui/form";
import { ErrorNote } from "@/components/ui/feedback";

const initialState: ActionState = {};

type StepDraft = {
  key: string;
  instruction: string;
  durationMin: string;
};

type VideoDraft = {
  key: string;
  url: string;
  title: string;
  description: string;
  authorName: string;
};

let uidCounter = 0;
function nextKey(prefix: string) {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

function minutesFromSeconds(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "";
  return String(Math.round((seconds / 60) * 100) / 100);
}

function secondsFromMinutes(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 60);
}

function initialStep(): StepDraft {
  return { key: "new-step", instruction: "", durationMin: "" };
}

function initialVideo(): VideoDraft {
  return { key: "new-video", url: "", title: "", description: "", authorName: "" };
}

function emptyStep(): StepDraft {
  return { key: nextKey("step"), instruction: "", durationMin: "" };
}

function emptyVideo(): VideoDraft {
  return { key: nextKey("video"), url: "", title: "", description: "", authorName: "" };
}

export function TutorialEditor({
  recipeId,
  recipeName,
  versionNo,
  initialSteps,
  initialVideos,
}: {
  recipeId: string;
  recipeName: string;
  versionNo: number;
  initialSteps: RecipeStepView[];
  initialVideos: RecipeVideoView[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveRecipeTutorialAction, initialState);

  const [steps, setSteps] = useState<StepDraft[]>(() =>
    initialSteps.length > 0
      ? initialSteps.map((step) => ({
          key: step.id,
          instruction: step.instruction,
          durationMin: minutesFromSeconds(step.durationSec),
        }))
      : [initialStep()],
  );
  const [videos, setVideos] = useState<VideoDraft[]>(() =>
    initialVideos.length > 0
      ? initialVideos.map((video) => ({
          key: video.id,
          url: video.url,
          title: video.title ?? "",
          description: video.description ?? "",
          authorName: video.authorName ?? "",
        }))
      : [initialVideo()],
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Tutorial berhasil disimpan.");
      router.push(`/resep/${recipeId}`);
      router.refresh();
    } else if (state.ok === false && state.message) {
      toast.error(state.message);
    }
  }, [state, recipeId, router]);

  const cleanSteps = useMemo(
    () =>
      steps
        .filter((step) => step.instruction.trim().length > 0)
        .map((step) => ({
          instruction: step.instruction.trim(),
          durationSec: secondsFromMinutes(step.durationMin),
        })),
    [steps],
  );

  const cleanVideos = useMemo(
    () =>
      videos
        .filter((video) => video.url.trim().length > 0)
        .map((video) => ({
          url: video.url.trim(),
          title: video.title.trim() || null,
          description: video.description.trim() || null,
          authorName: video.authorName.trim() || null,
        })),
    [videos],
  );

  const invalidVideoKeys = useMemo(
    () =>
      new Set(
        videos
          .filter((video) => video.url.trim().length > 0 && !isValidVideoUrl(video.url))
          .map((video) => video.key),
      ),
    [videos],
  );

  const totalDuration = cleanSteps.reduce((sum, step) => sum + (step.durationSec ?? 0), 0);
  const totalDurationLabel = formatDuration(totalDuration);

  const payload = JSON.stringify({ steps: cleanSteps, videos: cleanVideos });

  const updateStep = (key: string, patch: Partial<StepDraft>) => {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  };

  const addStep = () =>
    setSteps((current) => (current.length >= 40 ? current : [...current, emptyStep()]));

  const removeStep = (key: string) => {
    setSteps((current) => (current.length <= 1 ? current : current.filter((step) => step.key !== key)));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateVideo = (key: string, patch: Partial<VideoDraft>) => {
    setVideos((current) => current.map((video) => (video.key === key ? { ...video, ...patch } : video)));
  };

  const addVideo = () =>
    setVideos((current) => (current.length >= 12 ? current : [...current, emptyVideo()]));

  const removeVideo = (key: string) => {
    setVideos((current) => (current.length <= 1 ? current : current.filter((video) => video.key !== key)));
  };

  const moveVideo = (index: number, direction: -1 | 1) => {
    setVideos((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const hasFieldError = state.ok === false && state.message && !state.fieldErrors;

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-copper">
            Content System · Tutorial Produksi
          </span>
        }
        title={`Cara Pembuatan — ${recipeName}`}
        description="Susun langkah kerja operator dan simpan beberapa tautan video referensi. Langkah mengikuti versi formula aktif, sedangkan video berlaku untuk seluruh versi resep. Perhitungan HPP tidak berubah."
        meta={
          <>
            <Badge tone="amber">Formula v{versionNo}</Badge>
            <Badge tone={cleanSteps.length > 0 ? "emerald" : "neutral"}>{cleanSteps.length} langkah</Badge>
            <Badge tone={cleanVideos.length > 0 ? "blue" : "neutral"}>{cleanVideos.length} video</Badge>
          </>
        }
        actions={
          <>
            <ButtonLink
              href={`/resep/${recipeId}`}
              variant="outline"
              icon={<ArrowLeft className="h-3.5 w-3.5" />}
            >
              Kembali ke Studio
            </ButtonLink>
            <Button
              type="submit"
              form="tutorial-form"
              variant="amber"
              loading={pending}
              disabled={invalidVideoKeys.size > 0}
              icon={<Save className="h-3.5 w-3.5" />}
            >
              {pending ? "Menyimpan..." : "Simpan Tutorial"}
            </Button>
          </>
        }
      />

      <form id="tutorial-form" action={action} className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
        <input type="hidden" name="recipeId" value={recipeId} />
        <input type="hidden" name="payload" value={payload} />

        <div className="space-y-3 xl:col-span-8">
          {hasFieldError ? <ErrorNote>{state.message}</ErrorNote> : null}

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                  <BookOpen className="h-4 w-4 text-copper" /> Langkah Produksi
                </h2>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                  Tulis satu aksi utama per langkah agar mudah diikuti operator. Urutan bisa diubah dengan tombol panah.
                </p>
              </div>
              <Badge tone="neutral">{cleanSteps.length} langkah terisi</Badge>
            </div>

            <div className="mt-3 space-y-2">
              {steps.map((step, index) => (
                <div key={step.key} className="rounded-lg border border-line bg-surface p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-soft font-mono text-[9px] font-bold text-copper ring-1 ring-amber-line">
                        {index + 1}
                      </span>
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
                        Langkah {index + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        className="rounded p-1 text-subtle transition-colors hover:bg-surface-low hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Naikkan langkah ${index + 1}`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 1)}
                        disabled={index === steps.length - 1}
                        className="rounded p-1 text-subtle transition-colors hover:bg-surface-low hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Turunkan langkah ${index + 1}`}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(step.key)}
                        disabled={steps.length <= 1}
                        className="rounded p-1 text-subtle transition-colors hover:bg-rose-soft hover:text-rose disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Hapus langkah ${index + 1}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_130px]">
                    <Textarea
                      value={step.instruction}
                      onChange={(event) => updateStep(step.key, { instruction: event.target.value })}
                      rows={2}
                      maxLength={2000}
                      placeholder="Contoh: Mix tepung, ragi, dan air hingga adonan menyatu, lalu istirahatkan 30 menit."
                      aria-label={`Instruksi langkah ${index + 1}`}
                    />
                    <div>
                      <label className="mb-1.5 block text-[10.5px] font-semibold text-ink-soft" htmlFor={`step-duration-${step.key}`}>
                        Durasi (menit)
                      </label>
                      <NumberInput
                        id={`step-duration-${step.key}`}
                        value={step.durationMin}
                        onChange={(event) => updateStep(step.key, { durationMin: event.target.value.replace(/[^\d.,]/g, "") })}
                        placeholder="15"
                        max={1440}
                        aria-label={`Durasi langkah ${index + 1} dalam menit`}
                      />
                      <p className="mt-1 text-[9px] leading-relaxed text-subtle">Opsional. Boleh desimal, mis. 1,5.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="soft"
              size="xs"
              className="mt-2"
              icon={<Plus className="h-3 w-3" />}
              onClick={addStep}
              disabled={steps.length >= 40}
            >
              Tambah Langkah
            </Button>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
                  <Video className="h-4 w-4 text-copper" /> Video Referensi
                </h2>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                  Simpan beberapa link video produksi. Judul, channel, dan deskripsi membantu operator memilih referensi yang tepat.
                </p>
              </div>
              <Badge tone="neutral">{cleanVideos.length} video terisi</Badge>
            </div>

            <div className="mt-3 space-y-2">
              {videos.map((video, index) => {
                const platform = detectVideoPlatform(video.url);
                const urlIsValid = video.url.trim().length > 0 && isValidVideoUrl(video.url);
                const urlIsInvalid = invalidVideoKeys.has(video.key);
                return (
                  <div key={video.key} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-surface-low text-copper ring-1 ring-line">
                          <Link2 className="h-3 w-3" />
                        </span>
                        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
                          Video {index + 1}
                        </span>
                        {urlIsValid ? (
                          <Badge tone="blue">{VIDEO_PLATFORM_LABEL[platform]}</Badge>
                        ) : (
                          <Badge tone="neutral">URL belum diisi</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveVideo(index, -1)}
                          disabled={index === 0}
                          className="rounded p-1 text-subtle transition-colors hover:bg-surface-low hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Naikkan video ${index + 1}`}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveVideo(index, 1)}
                          disabled={index === videos.length - 1}
                          className="rounded p-1 text-subtle transition-colors hover:bg-surface-low hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Turunkan video ${index + 1}`}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeVideo(video.key)}
                          disabled={videos.length <= 1}
                          className="rounded p-1 text-subtle transition-colors hover:bg-rose-soft hover:text-rose disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Hapus video ${index + 1}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-2">
                      <Field
                        label="URL video"
                        htmlFor={`video-url-${video.key}`}
                        required
                        error={urlIsInvalid ? "URL harus berupa tautan http/https yang valid." : undefined}
                        help={
                          urlIsValid && platform === "youtube"
                            ? "YouTube terdeteksi. Thumbnail akan dibuat otomatis saat disimpan."
                            : "Tempel link YouTube, Vimeo, Instagram, TikTok, atau URL video lainnya."
                        }
                      >
                        <Input
                          id={`video-url-${video.key}`}
                          value={video.url}
                          onChange={(event) => updateVideo(video.key, { url: event.target.value })}
                          placeholder="https://www.youtube.com/watch?v=..."
                          inputMode="url"
                          autoComplete="off"
                          maxLength={1000}
                        />
                      </Field>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Judul video" htmlFor={`video-title-${video.key}`}>
                          <Input
                            id={`video-title-${video.key}`}
                            value={video.title}
                            onChange={(event) => updateVideo(video.key, { title: event.target.value })}
                            placeholder="Teknik laminasi croissant"
                            maxLength={180}
                          />
                        </Field>
                        <Field label="Channel / kreator" htmlFor={`video-author-${video.key}`}>
                          <Input
                            id={`video-author-${video.key}`}
                            value={video.authorName}
                            onChange={(event) => updateVideo(video.key, { authorName: event.target.value })}
                            placeholder="Nama channel atau chef"
                            maxLength={120}
                          />
                        </Field>
                      </div>

                      <Field label="Deskripsi singkat" htmlFor={`video-description-${video.key}`}>
                        <Textarea
                          id={`video-description-${video.key}`}
                          value={video.description}
                          onChange={(event) => updateVideo(video.key, { description: event.target.value })}
                          rows={2}
                          maxLength={800}
                          placeholder="Apa yang bisa dipelajari operator dari video ini?"
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="soft"
              size="xs"
              className="mt-2"
              icon={<Plus className="h-3 w-3" />}
              onClick={addVideo}
              disabled={videos.length >= 12}
            >
              Tambah Video
            </Button>

            {invalidVideoKeys.size > 0 ? (
              <p className="mt-2 text-[10px] font-medium text-rose">
                Perbaiki {invalidVideoKeys.size} URL video yang tidak valid sebelum menyimpan.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
            <p className="flex items-center gap-1.5 text-[10px] text-muted">
              <Info className="h-3 w-3 text-copper" />
              Menyimpan tutorial tidak membuat versi formula baru.
            </p>
            <div className="flex gap-2">
              <ButtonLink href={`/resep/${recipeId}`} variant="outline">
                Batal
              </ButtonLink>
              <Button
                type="submit"
                variant="amber"
                loading={pending}
                disabled={invalidVideoKeys.size > 0}
                icon={<Save className="h-3.5 w-3.5" />}
              >
                {pending ? "Menyimpan..." : "Simpan Tutorial"}
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-[76px] xl:col-span-4">
          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <Clock className="h-4 w-4 text-copper" /> Ringkasan Tutorial
            </h2>
            <div className="mt-2 space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between rounded border border-line bg-surface-low/40 px-2.5 py-2">
                <span className="text-muted">Total langkah</span>
                <span className="font-mono font-bold text-ink">{cleanSteps.length}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-line bg-surface-low/40 px-2.5 py-2">
                <span className="text-muted">Total durasi</span>
                <span className="font-mono font-bold text-ink">{totalDurationLabel ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-line bg-surface-low/40 px-2.5 py-2">
                <span className="text-muted">Video referensi</span>
                <span className="font-mono font-bold text-ink">{cleanVideos.length}</span>
              </div>
              <div className="flex items-center justify-between rounded border border-line bg-surface-low/40 px-2.5 py-2">
                <span className="text-muted">Versi formula</span>
                <span className="font-mono font-bold text-ink">v{versionNo}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <Sparkles className="h-4 w-4 text-copper" /> Tips Menyusun Tutorial
            </h2>
            <ul className="mt-2 space-y-1.5 text-[9.5px] leading-relaxed text-muted">
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Tulis satu aksi utama per langkah, mis. “Bulk fermentation 60 menit”, bukan seluruh proses dalam satu paragraf.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Durasi langkah membantu operator menyusun timeline produksi dan shift.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Simpan lebih dari satu video: satu untuk teknik dasar, satu untuk shaping atau quality control.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-emerald-bright" />
                Langkah menempel pada versi formula aktif dan otomatis dibawa saat formula naik versi. Video tetap tersimpan untuk seluruh versi resep.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-blue-line bg-blue-soft/40 p-4">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-[13px] font-bold text-ink">
              <Sparkles className="h-4 w-4 text-blue" /> Metadata Video Otomatis
              <Badge tone="blue">Roadmap</Badge>
            </h2>
            <p className="mt-1.5 text-[9.5px] leading-relaxed text-muted">
              Integrasi AI berikutnya dapat mengisi judul, deskripsi, channel, thumbnail, dan durasi video secara otomatis
              dari link yang ditempel. Struktur data dan form manual sudah disiapkan untuk fase itu.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-surface p-3.5 text-[9.5px] leading-relaxed text-muted shadow-card">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
            <span>
              Tutorial yang tersimpan akan tampil di Recipe Studio dan ikut tercetak saat operator mencetak lembar kerja.
            </span>
          </div>
        </aside>
      </form>
    </div>
  );
}
