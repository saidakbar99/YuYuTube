"use client";

import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

const SWIPE_THRESHOLD = 80;
const TAP_SLOP = 12;
// Toddlers press slowly, so any still release before this counts as a tap.
const LONG_PRESS_MS = 1500;

/** A point in the surface's own (unrotated) frame, relative to its top-left corner. */
export type LocalPoint = { x: number; y: number };

type GestureHandlers = {
  onTap: (point: LocalPoint) => void;
  onLongPress: () => void;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
};

type Press = { x: number; y: number; timer: number; long: boolean };

/** `rotated`: the surface is turned 90° clockwise, so swipes are read in the video's frame, not the screen's. */
export function useGestures(handlers: GestureHandlers, rotated = false) {
  const latest = useRef({ ...handlers, rotated });
  useEffect(() => {
    latest.current = { ...handlers, rotated };
  });
  const press = useRef<Press | null>(null);

  useEffect(() => {
    const ref = press;
    return () => {
      if (ref.current) window.clearTimeout(ref.current.timer);
    };
  }, []);

  return useMemo(() => {
    const cancel = () => {
      if (press.current) window.clearTimeout(press.current.timer);
      press.current = null;
    };

    return {
      onPointerDown: (event: ReactPointerEvent) => {
        cancel();
        const timer = window.setTimeout(() => {
          if (!press.current) return;
          press.current.long = true;
          latest.current.onLongPress();
        }, LONG_PRESS_MS);
        press.current = { x: event.clientX, y: event.clientY, timer, long: false };
        // Keeps pointerup on this element even if the finger drifts off it.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // not capturable — implicit touch capture still applies
        }
      },
      onPointerMove: (event: ReactPointerEvent) => {
        const start = press.current;
        if (!start || start.long) return;
        // A drifting finger is a swipe in progress, not a hold.
        if (Math.abs(event.clientX - start.x) >= TAP_SLOP || Math.abs(event.clientY - start.y) >= TAP_SLOP) {
          window.clearTimeout(start.timer);
        }
      },
      onPointerCancel: cancel,
      onPointerUp: (event: ReactPointerEvent) => {
        const start = press.current;
        cancel();
        if (!start || start.long) return;

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
