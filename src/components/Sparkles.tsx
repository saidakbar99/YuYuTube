"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SPARKLES = 8;
const SPARKLE_EMOJI = ["⭐", "🌟", "💖", "🎈", "🫧", "🦋"];

type Sparkle = { id: number; x: number; y: number; emoji: string };

export function useSparkles() {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const nextId = useRef(0);

  const spawn = useCallback((x: number, y: number) => {
    nextId.current += 1;
    const emoji = SPARKLE_EMOJI[Math.floor(Math.random() * SPARKLE_EMOJI.length)];
    const sparkle = { id: nextId.current, x, y, emoji };
    setSparkles((list) => [...list.slice(-(MAX_SPARKLES - 1)), sparkle]);
  }, []);

  const remove = useCallback((id: number) => {
    setSparkles((list) => list.filter((s) => s.id !== id));
  }, []);

  return { sparkles, spawn, remove };
}

/** Emoji popping up at each touch point; `x`/`y` are relative to this layer. */
export function SparkleLayer({
  sparkles,
  remove,
  className,
}: ReturnType<typeof useSparkles> & { className: string }) {
  return (
    <div aria-hidden className={`pointer-events-none overflow-hidden ${className}`}>
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="sparkle absolute text-5xl"
          style={{ left: s.x, top: s.y }}
          onAnimationEnd={() => remove(s.id)}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * A sparkle under every finger, anywhere in the app. A fullscreen player shows its own
 * instead: native fullscreen hides this layer, and the sideways view would tilt the emoji.
 */
export function TouchSparkles() {
  const layer = useSparkles();
  const { spawn } = layer;

  useEffect(() => {
    const onDown = (event: PointerEvent) => {
      if (document.querySelector(".player-stage.is-fullscreen")) return;
      spawn(event.clientX, event.clientY);
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [spawn]);

  return <SparkleLayer {...layer} className="fixed inset-0 z-96" />;
}
