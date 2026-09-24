"use client";

import { useSyncExternalStore } from "react";
import { getServerWarmth, getWarmth, subscribeBedtime } from "@/lib/bedtime";

/**
 * A warm filter over everything, videos included, to cut blue light in the evening.
 * Multiply-blended, so it tints rather than washes out. It can't steal taps.
 */
export function NightTint({ className = "fixed inset-0 z-95" }: { className?: string }) {
  const warmth = useSyncExternalStore(subscribeBedtime, getWarmth, getServerWarmth);
  return <div aria-hidden data-warmth={warmth} className={`night-tint pointer-events-none ${className}`} />;
}
