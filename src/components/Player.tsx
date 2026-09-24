"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { config } from "@/config";
import type { Video } from "@/data/videos";
import type { PlayerStatus } from "@/hooks/useYouTubePlayer";
import { useGestures, type LocalPoint } from "@/hooks/useGestures";
import type { useFullscreen } from "@/hooks/useFullscreen";
import { Thumbnail } from "@/components/Thumbnail";
import {
  ChevronDownIcon,
  CollapseIcon,
  ExpandIcon,
  HomeIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/PlayerIcons";

const HIDE_CONTROLS_MS = 3000;
const MAX_SPARKLES = 8;
const SPARKLE_EMOJI = ["⭐", "🌟", "💖", "🎈", "🫧", "🦋"];

type Sparkle = LocalPoint & { id: number; emoji: string };

function clock(seconds: number) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

type Props = {
  video: Video | null;
  status: PlayerStatus;
  progress: { current: number; duration: number };
  frameRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  fullscreen: ReturnType<typeof useFullscreen>;
  hasNext: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
};

export function Player({
  video,
  status,
  progress,
  frameRef,
  stageRef,
  fullscreen,
  hasNext,
  onTogglePlay,
  onNext,
  onReplay,
  onHome,
}: Props) {
  // Set only by a parent (long-press, or using a control). While a video plays the
  // controls stay hidden otherwise, so a toddler never sees a pause button to hit.
  const [woken, setWoken] = useState(false);
  const [shownFor, setShownFor] = useState(video?.id);

  if (video?.id !== shownFor) {
    setShownFor(video?.id);
    setWoken(false);
  }

  const controlsShown = woken || status !== "playing";

  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const sparkleId = useRef(0);

  const wake = () => setWoken(true);
  // Hidden buttons must not catch a stray tap.
  const interactive = controlsShown ? "pointer-events-auto" : "pointer-events-none";
  // Tapping a control counts as interaction, so the 3s hide timer restarts too.
  const withWake = (action: () => void) => () => {
    wake();
    action();
  };
  const gestures = useGestures({
    // While playing, a tap is just for fun — only a parent's long-press can change playback.
    onTap: (point) => {
      if (status !== "playing") {
        onTogglePlay();
        return;
      }
      sparkleId.current += 1;
      const emoji = SPARKLE_EMOJI[Math.floor(Math.random() * SPARKLE_EMOJI.length)];
      const sparkle = { ...point, id: sparkleId.current, emoji };
      setSparkles((list) => [...list.slice(-(MAX_SPARKLES - 1)), sparkle]);
      // A tiny buzz with it. Android only: iOS has no vibration API for web pages.
      try {
        navigator.vibrate?.(15);
      } catch {
        // not allowed here
      }
    },
    onLongPress: wake,
    onSwipeUp: () => {
      if (!fullscreen.active) fullscreen.enter();
    },
    onSwipeDown: () => {
      if (fullscreen.active) fullscreen.exit();
    },
  }, fullscreen.rotated);

  useEffect(() => {
    if (status !== "playing" || !woken) return;
    const timer = window.setTimeout(() => setWoken(false), HIDE_CONTROLS_MS);
    return () => window.clearTimeout(timer);
  }, [status, woken]);

  const covered = status !== "playing";
  const showEndCard = status === "ended" && !config.autoplayNext;
  const showStallCard = status === "stalled";
  const ratio = progress.duration > 0 ? Math.min(1, progress.current / progress.duration) : 0;

  return (
    <div
      ref={stageRef}
      data-covered={covered}
      className={[
        "player-stage relative aspect-video w-full overflow-hidden bg-black",
        fullscreen.active && "is-fullscreen",
        fullscreen.pseudo && "is-pseudo-fullscreen",
        fullscreen.rotated && "is-rotated",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div ref={frameRef} className="player-frame absolute inset-0" />

      {/* Opaque poster: keeps YouTube's suggestions and end screen out of sight. */}
      {covered && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-black">
          {video && (
            <Thumbnail key={video.id} id={video.id} priority className="h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <div {...gestures} className="absolute inset-0 z-20 touch-none" />

      <div aria-hidden className="pointer-events-none absolute inset-0 z-25 overflow-hidden">
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="sparkle absolute text-5xl"
            style={{ left: s.x, top: s.y }}
            onAnimationEnd={() => setSparkles((list) => list.filter((item) => item.id !== s.id))}
          >
            {s.emoji}
          </span>
        ))}
      </div>

      {!showEndCard && !showStallCard && (
        <div
          className={`player-controls pointer-events-none absolute inset-0 z-30 transition-opacity duration-200 ${
            controlsShown ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-x-0 top-0 bg-linear-to-b from-black/60 to-transparent p-1">
            <button
              type="button"
              onClick={onHome}
              aria-label="Back to home"
              className={`${interactive} flex size-12 items-center justify-center rounded-full text-white active:bg-white/20`}
            >
              <ChevronDownIcon className="size-7" />
            </button>
          </div>

          {/* Exactly one control in the centre, so nothing reads as a duplicate. */}
          <div className="absolute inset-0 flex items-center justify-center">
            {status === "loading" ? (
              <div
                aria-label="Loading"
                role="status"
                className="size-14 animate-spin rounded-full border-4 border-white/25 border-t-white sm:size-16"
              />
            ) : (
              <button
                type="button"
                // Resuming is for anyone; only a parent pausing should keep the controls up.
                onClick={status === "playing" ? withWake(onTogglePlay) : onTogglePlay}
                aria-label={status === "playing" ? "Pause" : "Play"}
                className={`${interactive} flex size-22 items-center justify-center rounded-full bg-black/40 text-white transition-transform duration-100 active:scale-90 sm:size-26`}
              >
                {status === "playing" ? (
                  <PauseIcon className="size-12 sm:size-14" />
                ) : (
                  <PlayIcon className="size-12 sm:size-14" />
                )}
              </button>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-3 pb-1 pt-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tabular-nums text-white">
                {clock(progress.current)} / {clock(progress.duration)}
              </span>
              <div className="flex items-center gap-1">
                {hasNext && (
                  <button
                    type="button"
                    onClick={withWake(onNext)}
                    aria-label="Next video"
                    className={`${interactive} flex size-12 items-center justify-center rounded-full text-white active:bg-white/20`}
                  >
                    <NextIcon className="size-6" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={withWake(fullscreen.toggle)}
                  aria-label={fullscreen.active ? "Exit fullscreen" : "Fullscreen"}
                  className={`${interactive} flex size-12 items-center justify-center rounded-full text-white active:bg-white/20`}
                >
                  {fullscreen.active ? <CollapseIcon className="size-6" /> : <ExpandIcon className="size-6" />}
                </button>
              </div>
            </div>
            <div className="mt-1 h-0.75 w-full rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-yt-red transition-[width] duration-200 ease-linear"
                style={{ width: `${ratio * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {showStallCard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center gap-6 bg-black/85 px-6">
          <button
            type="button"
            onClick={onReplay}
            aria-label="Try again"
            className="flex size-24 items-center justify-center rounded-full bg-white text-5xl transition-transform duration-100 active:scale-90"
          >
            🔄
          </button>
          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Play the next one"
              className="flex size-24 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-100 active:scale-90"
            >
              <NextIcon className="size-12" />
            </button>
          )}
        </div>
      )}

      {showEndCard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center gap-6 bg-black/85 px-6">
          <button
            type="button"
            onClick={onReplay}
            aria-label="Watch again"
            className="flex size-24 items-center justify-center rounded-full bg-white text-black transition-transform duration-100 active:scale-90"
          >
            <PlayIcon className="size-12" />
          </button>
          <button
            type="button"
            onClick={onHome}
            aria-label="Pick another"
            className="flex size-24 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-100 active:scale-90"
          >
            <HomeIcon filled className="size-12" />
          </button>
        </div>
      )}
    </div>
  );
}
