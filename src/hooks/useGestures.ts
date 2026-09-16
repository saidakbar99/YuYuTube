"use client";

import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

const SWIPE_THRESHOLD = 80;
const TAP_SLOP = 12;
const TAP_MAX_MS = 500;

type GestureHandlers = {
  onTap: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft: () => void;
};

export function useGestures(handlers: GestureHandlers) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  const origin = useRef<{ x: number; y: number; t: number } | null>(null);

  return useMemo(
    () => ({
      onPointerDown: (event: ReactPointerEvent) => {
        origin.current = { x: event.clientX, y: event.clientY, t: Date.now() };
        // Keeps pointerup on this element even if the finger drifts off it.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // not capturable — implicit touch capture still applies
        }
      },
      onPointerCancel: () => {
        origin.current = null;
      },
      onPointerUp: (event: ReactPointerEvent) => {
        const start = origin.current;
        origin.current = null;
        if (!start) return;

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < TAP_SLOP && absY < TAP_SLOP && Date.now() - start.t < TAP_MAX_MS) {
          latest.current.onTap();
        } else if (absY > SWIPE_THRESHOLD && absY > absX) {
          if (dy > 0) latest.current.onSwipeDown();
          else latest.current.onSwipeUp();
        } else if (absX > SWIPE_THRESHOLD && absX > absY && dx < 0) {
          latest.current.onSwipeLeft();
        }
      },
    }),
    [],
  );
}
