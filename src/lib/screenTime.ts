import { readJSON, writeJSON } from "@/lib/storage";
import { createStore } from "@/lib/store";

const KEY = "yuyutube:screen-time";
const PERSIST_EVERY_MS = 5_000;

type Saved = { date: string; ms: number };

const today = () => new Date().toDateString();

const store = createStore(0);
// The day the count belongs to, so an app left open past midnight starts the new day at zero.
let countingDay = "";

if (typeof window !== "undefined") {
  countingDay = today();
  const saved = readJSON<Saved>(KEY, { date: "", ms: 0 });
  if (saved.date === countingDay && typeof saved.ms === "number") store.set(saved.ms);
}

const persist = (ms: number) => writeJSON(KEY, { date: countingDay, ms } satisfies Saved);

export const subscribeScreenTime = store.subscribe;
export const getScreenTime = store.get;
export const getServerScreenTime = () => 0;

export function addScreenTime(ms: number) {
  if (today() !== countingDay) {
    countingDay = today();
    store.set(0);
  }
  const next = store.get() + ms;
  store.set(next);
  if (next % PERSIST_EVERY_MS === 0) persist(next);
}

export function resetScreenTime() {
  countingDay = today();
  store.set(0);
  persist(0);
}
