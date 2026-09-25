"use client";

import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

const SWIPE_THRESHOLD = 80;
// Toddlers press slowly, so any release that hasn't moved counts as a tap, however long it took.
const TAP_SLOP = 12;

/** A point in the surface's own (unrotated) frame, relative to its top-left corner. */
export type LocalPoint = { x: number; y: number };

type GestureHandlers = {
  onTap: (point: LocalPoint) => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
};

type Press = { x: number; y: number };

/** `rotated`: the surface is turned 90° clockwise, so swipes are read in the video's frame, not the screen's. */
export function useGestures(handlers: GestureHandlers, rotated = false) {
  const latest = useRef({ ...handlers, rotated });
  useEffect(() => {
    latest.current = { ...handlers, rotated };
  });
  const press = useRef<Press | null>(null);

  return useMemo(() => {
    const cancel = () => {
      press.current = null;
    };

    return {
      onPointerDown: (event: ReactPointerEvent) => {
        press.current = { x: event.clientX, y: event.clientY };
        // Keeps pointerup on this element even if the finger drifts off it.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // not capturable — implicit touch capture still applies
        }
      },
      onPointerCancel: cancel,
      onPointerUp: (event: ReactPointerEvent) => {
        const start = press.current;
        cancel();
        if (!start) return;

        const screenX = event.clientX - start.x;
        const screenY = event.clientY - start.y;
        // Undo the clockwise quarter turn: the video's "down" is the screen's left.
        const [dx, dy] = latest.current.rotated ? [screenY, -screenX] : [screenX, screenY];
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < TAP_SLOP && absY < TAP_SLOP) {
          const rect = event.currentTarget.getBoundingClientRect();
          latest.current.onTap(
            latest.current.rotated
              ? { x: event.clientY - rect.top, y: rect.right - event.clientX }
              : { x: event.clientX - rect.left, y: event.clientY - rect.top },
          );
        } else if (absY > SWIPE_THRESHOLD && absY > absX) {
          if (dy > 0) latest.current.onSwipeDown();
          else latest.current.onSwipeUp();
        }
      },
    };
  }, []);
}
