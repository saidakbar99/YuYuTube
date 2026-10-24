import { readJSON, writeJSON } from "@/lib/storage";

/**
 * What was watched and played, per day, for the parent panel. Kept on this phone only (there is
 * no server), for the last `KEEP_DAYS` days.
 */
const KEY = "yuyutube:stats";
const KEEP_DAYS = 30;
const PERSIST_EVERY_MS = 5_000;
/** Left a video within this much watching: counts as skipped (he didn't want it). */
export const SKIP_MS = 20_000;

export type VideoStats = { ms: number; plays: number; finished: number; skips: number; failed: number };
export type DayStats = { ms: number; videos: Record<string, VideoStats>; taps: Record<string, number> };
type Saved = Record<string, DayStats>;

const pad = (n: number) => String(n).padStart(2, "0");
/** Local "YYYY-MM-DD", so days split at the phone's own midnight. */
export const dayKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

let days: Saved = {};
let dirty = false;
let lastPersist = 0;

if (typeof window !== "undefined") {
  const saved = readJSON<unknown>(KEY, {});
  if (saved && typeof saved === "object" && !Array.isArray(saved)) days = saved as Saved;
  // Backgrounded apps may be killed without warning: save what the last few seconds added.
  window.addEventListener("pagehide", () => persist());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) persist();
  });
}

function persist() {
  if (!dirty) return;
  const oldest = dayKey(new Date(Date.now() - KEEP_DAYS * 86_400_000));
  for (const key of Object.keys(days)) if (key < oldest) delete days[key];
  writeJSON(KEY, days);
  dirty = false;
  lastPersist = Date.now();
}

/** `now`: save straight away, not batched with the next few seconds. */
function changed(now = false) {
  dirty = true;
  if (now || Date.now() - lastPersist >= PERSIST_EVERY_MS) persist();
}

function today(): DayStats {
  const key = dayKey();
  days[key] ??= { ms: 0, videos: {}, taps: {} };
  return days[key];
}

function videoToday(id: string): VideoStats {
  const day = today();
  day.videos[id] ??= { ms: 0, plays: 0, finished: 0, skips: 0, failed: 0 };
  return day.videos[id];
}

// The video on screen now and how long it has played this time.
let current: { id: string; ms: number; finished: boolean } | null = null;

/** Whatever was on screen is left: a short look that didn't finish is a skip. */
function leave() {
  if (current && !current.finished && current.ms < SKIP_MS) {
    videoToday(current.id).skips += 1;
    changed(true);
  }
  current = null;
}

export function startVideo(id: string) {
  leave();
  current = { id, ms: 0, finished: false };
  videoToday(id).plays += 1;
  changed(true);
}

export function addWatch(id: string, ms: number) {
  if (current?.id === id) current.ms += ms;
  today().ms += ms;
  videoToday(id).ms += ms;
  changed();
}

export function finishVideo(id: string) {
  if (current?.id === id) current.finished = true;
  videoToday(id).finished += 1;
  changed(true);
}

/** It wouldn't play: not his choice, so not a skip. */
export function failVideo(id: string) {
  if (current?.id === id) current = null;
  videoToday(id).failed += 1;
  changed(true);
}

export function stopVideo() {
  leave();
  persist();
}

export function tapTile(name: string) {
  const taps = today().taps;
  taps[name] = (taps[name] ?? 0) + 1;
  changed();
}

/** The last `count` days, oldest first, with empty days filled in. */
export function lastDays(count: number): { key: string; date: Date; stats: DayStats }[] {
  persist();
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - i);
    const key = dayKey(date);
    out.push({ key, date, stats: days[key] ?? { ms: 0, videos: {}, taps: {} } });
  }
  return out;
}

export function clearStats() {
  days = {};
  current = null;
  dirty = true;
  persist();
}
