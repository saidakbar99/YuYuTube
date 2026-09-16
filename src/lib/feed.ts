import { config } from "@/config";
import type { Video } from "@/data/videos";
import { readJSON, writeJSON } from "@/lib/storage";
import { shuffle } from "@/lib/shuffle";

const RECENT_KEY = "yuyutube:recent";

export function readRecent(): string[] {
  const value = readJSON<unknown>(RECENT_KEY, []);
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

export function pushRecent(id: string): string[] {
  const next = [id, ...readRecent().filter((v) => v !== id)].slice(0, config.recentWindow);
  writeJSON(RECENT_KEY, next);
  return next;
}

export function buildFeed(library: readonly Video[], currentId: string | null, recent: readonly string[]): Video[] {
  const pool = shuffle(library.filter((v) => v.id !== currentId));
  if (library.length <= config.recentWindow) return pool;

  const seen = new Set(recent);
  return [...pool.filter((v) => !seen.has(v.id)), ...pool.filter((v) => seen.has(v.id))];
}
