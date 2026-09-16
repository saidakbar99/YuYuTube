"use client";

import { useEffect, useSyncExternalStore } from "react";
import { config } from "@/config";
import {
  addScreenTime,
  getScreenTime,
  getServerScreenTime,
  resetScreenTime,
  subscribeScreenTime,
} from "@/lib/screenTime";

export function useScreenTime(counting: boolean) {
  const limitMs = config.screenTimeLimitMinutes === null ? null : config.screenTimeLimitMinutes * 60_000;
  const elapsed = useSyncExternalStore(subscribeScreenTime, getScreenTime, getServerScreenTime);
  const locked = limitMs !== null && elapsed >= limitMs;

  useEffect(() => {
    if (limitMs === null || locked || !counting) return;
    const timer = window.setInterval(() => addScreenTime(1000), 1000);
    return () => window.clearInterval(timer);
  }, [limitMs, locked, counting]);

  return { locked, unlock: resetScreenTime };
}
