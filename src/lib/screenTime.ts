import { readJSON, writeJSON } from "@/lib/storage";
import { createStore } from "@/lib/store";

const KEY = "yuyutube:screen-time";
const PERSIST_EVERY_MS = 5_000;

type Saved = { date: string; ms: number };

const today = () => new Date().toDateString();

const store = createStore(0);

if (typeof window !== "undefined") {
  const saved = readJSON<Saved>(KEY, { date: "", ms: 0 });
  if (saved.date === today() && typeof saved.ms === "number") store.set(saved.ms);
}

const persist = (ms: number) => writeJSON(KEY, { date: today(), ms } satisfies Saved);

export const subscribeScreenTime = store.subscribe;
export const getScreenTime = store.get;
export const getServerScreenTime = () => 0;

export function addScreenTime(ms: number) {
  const next = store.get() + ms;
  store.set(next);
  if (next % PERSIST_EVERY_MS === 0) persist(next);
}

export function resetScreenTime() {
  store.set(0);
  persist(0);
}
