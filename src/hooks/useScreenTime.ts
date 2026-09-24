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
  const graceMs = config.graceMinutes * 60_000;
  const elapsed = useSyncExternalStore(subscribeScreenTime, getScreenTime, getServerScreenTime);

  // Keeps counting past the limit: the grace period for finishing a video is measured here too.
  useEffect(() => {
    if (limitMs === null || !counting) return;
    const timer = window.setInterval(() => addScreenTime(1000), 1000);
    return () => window.clearInterval(timer);
  }, [limitMs, counting]);

  return {
    /** Time is up: let the current video finish, then rest. */
    reached: limitMs !== null && elapsed >= limitMs,
    /** Still going well past the limit (a long compilation): stop now. */
    overGrace: limitMs !== null && elapsed >= limitMs + graceMs,
    reset: resetScreenTime,
  };
}
