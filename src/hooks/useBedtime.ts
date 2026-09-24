"use client";

import { useSyncExternalStore } from "react";
import {
  getBedtime,
  getServerBedtime,
  getServerUnlockedNight,
  getUnlockedNight,
  subscribeBedtime,
  unlockBedtime,
} from "@/lib/bedtime";

export function useBedtime() {
  const bedtime = useSyncExternalStore(subscribeBedtime, getBedtime, getServerBedtime);
  const unlockedNight = useSyncExternalStore(subscribeBedtime, getUnlockedNight, getServerUnlockedNight);
  return {
    active: bedtime !== null && bedtime.night !== unlockedNight,
    minutesIn: bedtime?.elapsed ?? 0,
    unlock: unlockBedtime,
  };
}
