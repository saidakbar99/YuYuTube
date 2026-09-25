import type { Video } from "@/data/videos";

/** The part of a video to play, in seconds. `end: null` plays to the natural end. */
export type Clip = { start: number; end: number | null };

/** Accepts seconds (`95`) or clock text (`"1:35"`, `"1:02:05"`). Returns undefined for anything else. */
export function toSeconds(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  const parts = value.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+(\.\d+)?$/.test(p))) return undefined;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

export function clipOf(video: Pick<Video, "start" | "end"> | undefined): Clip {
  const start = toSeconds(video?.start) ?? 0;
  const end = toSeconds(video?.end);
  // A mistyped end before the start is ignored rather than making the video end instantly.
  return { start, end: end !== undefined && end > start ? end : null };
}
