"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 50;

/**
 * Press and hold for `ms` to run `onDone`: too long for a toddler's tap, easy for a grown-up.
 * `held` is how far along (0–1), for drawing it filling up.
 */
export function useHold(ms: number, onDone: () => void) {
  const [held, setHeld] = useState(0);
  const timer = useRef<number | null>(null);

  const clear = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };

  const stop = () => {
    clear();
    setHeld(0);
  };

  useEffect(() => clear, []);

  // Progress is read off the clock, and `onDone` runs here in the timer, never inside a
  // state update (React may run those twice, and they must not change other components).
  const start = () => {
    if (timer.current !== null) return;
    const startedAt = Date.now();
    timer.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= ms) {
        stop();
        onDone();
        return;
      }
      setHeld(elapsed / ms);
    }, TICK_MS);
  };

  return {
    held,
    handlers: { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerCancel: stop },
  };
}
