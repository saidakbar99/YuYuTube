"use client";

import { useEffect, useRef, useState } from "react";
import { config } from "@/config";
import { boardItems } from "@/data/board";
import { shuffle } from "@/lib/shuffle";
import { pop, sayItem, warmUpVoices } from "@/lib/speech";

const TILES = 6;

/**
 * A short break between videos: big pictures that pop, bounce and say their name in Uzbek.
 * Nothing to finish or get wrong; after `config.boardSeconds` the next video comes on by itself.
 */
export function TapBoard({ onDone }: { onDone: () => void }) {
  const [items] = useState(() => shuffle(boardItems).slice(0, TILES));
  // Bumping a tile's count remounts its emoji, which restarts the bounce animation.
  const [taps, setTaps] = useState<number[]>(() => items.map(() => 0));

  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    warmUpVoices();
    const timer = window.setTimeout(() => done.current(), config.boardSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, []);

  const tap = (index: number) => {
    pop();
    sayItem(items[index]);
    try {
      navigator.vibrate?.(15);
    } catch {
      // not allowed here
    }
    setTaps((list) => list.map((n, i) => (i === index ? n + 1 : n)));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-yt-bg px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-1 mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="board-timer h-full rounded-full bg-white/40" style={{ animationDuration: `${config.boardSeconds}s` }} />
      </div>

      <div className="grid flex-1 grid-cols-2 grid-rows-3 gap-3 landscape:grid-cols-3 landscape:grid-rows-2">
        {items.map((item, i) => (
          <button
            key={item.emoji}
            type="button"
            aria-label={item.uz}
            onPointerDown={() => tap(i)}
            className="flex items-center justify-center rounded-3xl transition-transform duration-100 active:scale-95"
            style={{ backgroundColor: item.bg }}
          >
            <span key={taps[i]} className={`text-[min(22vw,22vh)] leading-none ${taps[i] ? "board-bounce" : ""}`}>
              {item.emoji}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
