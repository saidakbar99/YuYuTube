import { config } from "@/config";
import type { Video } from "@/data/videos";
import { readJSON, writeJSON } from "@/lib/storage";
import { shuffle } from "@/lib/shuffle";

const KEY = "yuyutube:picks";
// Each pick fades the older ones, so favorites follow what he likes now, not last month.
const DECAY = 0.9;
// About two recent picks: a single pick is just "the last one he watched".
const FAVORITE_SCORE = 1.5;

type Scores = Record<string, number>;

function readScores(): Scores {
  const value = readJSON<unknown>(KEY, {});
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Scores) : {};
}

/** Counts a video he chose himself (a tap on a tile), not autoplay or a parent's "next". */
export function recordPick(id: string) {
  const next: Scores = {};
  for (const [key, score] of Object.entries(readScores())) {
    const faded = typeof score === "number" ? score * DECAY : 0;
    if (faded >= 0.05) next[key] = faded;
  }
  next[id] = (next[id] ?? 0) + 1;
  writeJSON(KEY, next);
}

/** His top picks first, most loved leading; everything else shuffled after them. */
export function favoritesFirst(library: readonly Video[]): Video[] {
  const scores = readScores();
  const score = (v: Video) => scores[v.id] ?? 0;
  const favorites = library
    .filter((v) => score(v) >= FAVORITE_SCORE)
    .sort((a, b) => score(b) - score(a))
    .slice(0, config.favoritesOnTop);
  const pinned = new Set(favorites.map((v) => v.id));
  return [...favorites, ...shuffle(library.filter((v) => !pinned.has(v.id)))];
}
