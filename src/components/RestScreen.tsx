"use client";

import { useHold } from "@/hooks/useHold";

const HOLD_MS = 3000;

/** `emoji`: 🌙 for bedtime, 👋 when today's time is used up. */
export function RestScreen({ emoji, onUnlock }: { emoji: string; onUnlock: () => void }) {
  const { held, handlers } = useHold(HOLD_MS, onUnlock);

  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-app-bg px-8 text-center">
      <div role="img" aria-label="Dam olish vaqti" className="bob text-8xl">
        {emoji}
      </div>

      <button
        type="button"
        aria-label="Ota-ona uchun: bosib turing"
        {...handlers}
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 size-12 overflow-hidden rounded-full bg-app-text/5"
      >
        <span
          className="absolute inset-x-0 bottom-0 bg-app-accent/70 transition-[height] duration-75 ease-linear"
          style={{ height: `${held * 100}%` }}
        />
      </button>
    </div>
  );
}
