"use client";

import { useEffect, useRef, useState } from "react";

const HOLD_MS = 3000;
const TICK_MS = 50;

export function RestScreen({ onUnlock }: { onUnlock: () => void }) {
  const [held, setHeld] = useState(0);
  const timer = useRef<number | null>(null);

  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setHeld(0);
  };

  useEffect(() => stop, []);

  const start = () => {
    if (timer.current !== null) return;
    timer.current = window.setInterval(() => {
      setHeld((ms) => {
        const next = ms + TICK_MS;
        if (next >= HOLD_MS) {
          stop();
          onUnlock();
        }
        return next;
      });
    }, TICK_MS);
  };

  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-yt-bg px-8 text-center">
      <div role="img" aria-label="Time to rest" className="bob text-8xl">
        {"🌙"}
      </div>

      <button
        type="button"
        aria-label="Parent unlock: press and hold"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 size-12 overflow-hidden rounded-full bg-white/5"
      >
        <span
          className="absolute inset-x-0 bottom-0 bg-yt-red/70 transition-[height] duration-75 ease-linear"
          style={{ height: `${(held / HOLD_MS) * 100}%` }}
        />
      </button>
    </div>
  );
}
