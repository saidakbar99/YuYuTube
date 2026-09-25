import { config } from "@/config";
import type { Video } from "@/data/videos";
import { readJSON, writeJSON } from "@/lib/storage";
import { shuffle } from "@/lib/shuffle";

const KEY = "yuyutube:picks";
// Interest fades by half each week, so favorites follow what he likes now, not last month.
const HALF_LIFE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Points: choosing a video himself is worth 1; watching it earns more per minute.
const PICK_POINTS = 1;
const POINTS_PER_MINUTE = 0.3;
// Time counts per sitting up to this, so one long compilation can't outweigh everything else.
const MAX_MINUTES_PER_SITTING = 10;
// Roughly: picked twice and watched to the end, or watched through at length.
const FAVORITE_SCORE = 3;

/** `s`: score as of time `t` (ms). Older data stored a bare number. */
type Entry = { s: number; t: number };
type Scores = Record<string, Entry>;

function readScores(now: number): Scores {
  const value = readJSON<unknown>(KEY, {});
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const scores: Scores = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === "number") scores[id] = { s: raw, t: now };
    else if (raw && typeof raw === "object" && typeof (raw as Entry).s === "number") scores[id] = raw as Entry;
  }
  return scores;
}

const faded = (entry: Entry | undefined, now: number) =>
  entry ? entry.s * 0.5 ** (Math.max(0, now - entry.t) / DAY_MS / HALF_LIFE_DAYS) : 0;

function addPoints(id: string, points: number) {
  const now = Date.now();
  const scores = readScores(now);
  const next: Scores = {};
  // Rewrite everything at today's value and drop what has faded away.
  for (const [key, entry] of Object.entries(scores)) {
    const s = faded(entry, now);
    if (s >= 0.05) next[key] = { s, t: now };
  }
  next[id] = { s: (next[id]?.s ?? 0) + points, t: now };
  writeJSON(KEY, next);
}

/** Counts a video he chose himself (a tap on a tile), not autoplay or a parent's "next". */
export function recordPick(id: string) {
  addPoints(id, PICK_POINTS);
}

let sitting = { id: "", seconds: 0 };

/** Adds watched time, whether he picked the video or it came on by itself. */
export function recordWatch(id: string, seconds: number) {
  if (sitting.id !== id) sitting = { id, seconds: 0 };
  const room = MAX_MINUTES_PER_SITTING * 60 - sitting.seconds;
  const counted = Math.min(seconds, room);
  if (counted <= 0) return;
  sitting.seconds += counted;
  addPoints(id, (counted / 60) * POINTS_PER_MINUTE);
}

/** His favorites first, most loved leading; everything else shuffled after them. */
export function favoritesFirst(library: readonly Video[]): Video[] {
  const now = Date.now();
  const scores = readScores(now);
  const score = (v: Video) => faded(scores[v.id], now);
  const favorites = library
    .filter((v) => score(v) >= FAVORITE_SCORE)
    .sort((a, b) => score(b) - score(a))
    .slice(0, config.favoritesOnTop);
  const pinned = new Set(favorites.map((v) => v.id));
  return [...favorites, ...shuffle(library.filter((v) => !pinned.has(v.id)))];
}
