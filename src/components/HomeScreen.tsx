"use client";

import { useSyncExternalStore } from "react";
import { VideoCard } from "@/components/VideoCard";
import { useHold } from "@/hooks/useHold";
import { getHidden, getServerHidden, subscribeHidden } from "@/lib/hidden";
import { getHomeOrder, getServerHomeOrder, subscribeHomeOrder } from "@/lib/homeOrder";

// Holding the sun this long opens the parent panel.
const PANEL_HOLD_MS = 2000;

// The same smiling sun as the app icon (scripts/generate-icons.mjs).
function Logo({ onHeld }: { onHeld: () => void }) {
  const { held, handlers } = useHold(PANEL_HOLD_MS, onHeld);
  return (
    <div className="flex items-center gap-2">
      {/* Holding it opens the parent panel; it swells as a sign the hold is counting. */}
      <button
        type="button"
        aria-label="Ota-ona paneli: bosib turing"
        {...handlers}
        className="-m-2 p-2"
        style={{ transform: `scale(${1 + held * 0.5}) rotate(${held * 360}deg)` }}
      >
      <svg viewBox="0 0 64 64" className="size-7" aria-hidden>
        <defs>
          <linearGradient id="logo-sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe066" />
            <stop offset="1" stopColor="#ffaa1e" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill="url(#logo-sun)" />
        <circle cx="13.44" cy="37.76" r="4.16" fill="#ff786e" fillOpacity="0.5" />
        <circle cx="50.56" cy="37.76" r="4.16" fill="#ff786e" fillOpacity="0.5" />
        <ellipse cx="21.12" cy="25.6" rx="4" ry="6" fill="#6b3e1e" />
        <ellipse cx="42.88" cy="25.6" rx="4" ry="6" fill="#6b3e1e" />
        <path d="M44.33 41.56 A16 16 0 0 1 19.67 41.56" fill="none" stroke="#6b3e1e" strokeWidth="6" strokeLinecap="round" />
      </svg>
      </button>
      <span className="text-xl font-bold tracking-[-0.03em] text-app-text">YuYuTube</span>
    </div>
  );
}

type Props = { onSelect: (id: string) => void; onBoard: () => void; onPanel: () => void; calmOnly: boolean };

export function HomeScreen({ onSelect, onBoard, onPanel, calmOnly }: Props) {
  const order = useSyncExternalStore(subscribeHomeOrder, getHomeOrder, getServerHomeOrder);
  const hidden = useSyncExternalStore(subscribeHidden, getHidden, getServerHidden);
  const shown = order.filter((v) => !hidden.includes(v.id) && (!calmOnly || v.calm));

  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-app-bg">
      <header className="sticky top-0 z-30 flex min-h-14 transform-gpu items-center bg-app-bg px-4 pt-[env(safe-area-inset-top)]">
        <Logo onHeld={onPanel} />
        {/* The tap-and-hear board, any time he wants it: a picture he knows from the breaks. */}
        <button
          type="button"
          onClick={onBoard}
          aria-label="Hayvonlar"
          className="ml-auto flex size-12 items-center justify-center rounded-2xl bg-[#fde68a] text-3xl leading-none transition-transform duration-100 active:scale-90"
        >
          <span className="bob">🐱</span>
        </button>
      </header>

      <div className="mx-auto max-w-7xl px-3 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-5">
        {/* The prerendered HTML holds the unshuffled order; fade in once the
            client store takes over so the reorder is not a visible jump. */}
        <div
          className={`grid grid-cols-1 gap-4 transition-opacity duration-300 md:grid-cols-2 md:gap-5 ${
            order === getServerHomeOrder() ? "opacity-0" : "opacity-100"
          }`}
        >
          {shown.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
