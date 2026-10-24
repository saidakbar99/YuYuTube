import { readJSON, writeJSON } from "@/lib/storage";
import { createStore } from "@/lib/store";

/** Videos a parent took out on this phone (from the parent panel); `videos.ts` stays as it is. */
const KEY = "yuyutube:hidden";

const store = createStore<readonly string[]>([]);

if (typeof window !== "undefined") {
  const saved = readJSON<unknown>(KEY, []);
  if (Array.isArray(saved)) store.set(saved.filter((v): v is string => typeof v === "string"));
}

const EMPTY: readonly string[] = [];

export const subscribeHidden = store.subscribe;
export const getHidden = store.get;
export const getServerHidden = () => EMPTY;

export function setHidden(id: string, hidden: boolean) {
  const rest = store.get().filter((v) => v !== id);
  const next = hidden ? [...rest, id] : rest;
  store.set(next);
  writeJSON(KEY, next);
}
