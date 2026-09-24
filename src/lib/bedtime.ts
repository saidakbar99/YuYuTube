import { config } from "@/config";
import { readJSON, writeJSON } from "@/lib/storage";
import { createStore } from "@/lib/store";

const UNLOCK_KEY = "yuyutube:bedtime-unlocked";
const TICK_MS = 30_000;
const DAY_MINUTES = 24 * 60;

/** Tonight's bedtime: `night` names it (the date it began), `elapsed` is minutes since it began. */
export type Bedtime = { night: string; elapsed: number } | null;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** How warm the screen should be: from `config.eveningFrom` it warms up, at bedtime more so. */
export type Warmth = "day" | "evening" | "night";

const minuteOfDay = (now: Date) => now.getHours() * 60 + now.getMinutes();

// Usually a window crosses midnight (20:00–07:00), but a same-day one works too.
const within = (t: number, start: number, end: number) => (start <= end ? t >= start && t < end : t >= start || t < end);

function computeWarmth(now = new Date()): Warmth {
  const t = minuteOfDay(now);
  const morning = toMinutes(config.bedtime?.end ?? "07:00");
  if (config.bedtime && within(t, toMinutes(config.bedtime.start), morning)) return "night";
  if (config.eveningFrom && within(t, toMinutes(config.eveningFrom), morning)) return "evening";
  return "day";
}

function compute(now = new Date()): Bedtime {
  if (!config.bedtime) return null;
  const start = toMinutes(config.bedtime.start);
  const t = minuteOfDay(now);
  if (!within(t, start, toMinutes(config.bedtime.end))) return null;
  const elapsed = (t - start + DAY_MINUTES) % DAY_MINUTES;
  return { night: new Date(now.getTime() - elapsed * 60_000).toDateString(), elapsed };
}

const clock = createStore<Bedtime>(null);
const unlocked = createStore<string>("");
const warmth = createStore<Warmth>("day");

if (typeof window !== "undefined") {
  clock.set(compute());
  unlocked.set(readJSON(UNLOCK_KEY, ""));
  warmth.set(computeWarmth());
}

const tick = () => {
  const next = compute();
  const prev = clock.get();
  if (next?.night !== prev?.night || next?.elapsed !== prev?.elapsed) clock.set(next);
  warmth.set(computeWarmth());
};

export function subscribeBedtime(listener: () => void) {
  const offClock = clock.subscribe(listener);
  const offUnlock = unlocked.subscribe(listener);
  const offWarmth = warmth.subscribe(listener);
  // Timers are throttled in the background, so re-check the moment the app comes back.
  const onVisible = () => {
    if (!document.hidden) tick();
  };
  const timer = window.setInterval(tick, TICK_MS);
  document.addEventListener("visibilitychange", onVisible);
  tick();
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
    offClock();
    offUnlock();
    offWarmth();
  };
}

export const getBedtime = clock.get;
export const getUnlockedNight = unlocked.get;
export const getServerBedtime = (): Bedtime => null;
export const getServerUnlockedNight = () => "";
export const getWarmth = warmth.get;
export const getServerWarmth = (): Warmth => "day";

/** A parent's unlock lasts for the rest of tonight's bedtime only. */
export function unlockBedtime() {
  const night = clock.get()?.night ?? "";
  unlocked.set(night);
  writeJSON(UNLOCK_KEY, night);
}
