"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { config } from "@/config";
import type { Video } from "@/data/videos";
import type { PlayerStatus } from "@/hooks/useYouTubePlayer";
import { useGestures } from "@/hooks/useGestures";
import type { useFullscreen } from "@/hooks/useFullscreen";
import { NightTint } from "@/components/NightTint";
import { SparkleLayer, useSparkles } from "@/components/Sparkles";
import { TapBoard } from "@/components/TapBoard";
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
// Dragging down in fullscreen: the picture follows the finger at this fraction and shrinks a little,
// like YouTube, so he can see that pulling it down is how to get out.
const PULL_FOLLOW = 0.5;
const PULL_SHRINK_PER_PX = 0.0006;
const PULL_MAX_PX = 300;

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
  /** Set while the tap-and-hear break is due: shown inside the fullscreen player, so fullscreen stays on. */
  onBoardDone: (() => void) | null;
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
  onBoardDone,
}: Props) {
  // A tap shows the controls for a few seconds; while paused they stay up.
  const [woken, setWoken] = useState(false);
  const [shownFor, setShownFor] = useState(video?.id);

  if (video?.id !== shownFor) {
    setShownFor(video?.id);
    setWoken(false);
  }

  const controlsShown = woken || status !== "playing";

  // The app-wide sparkles can't reach a fullscreen player, so it keeps its own.
  const sparkles = useSparkles();

  const pullRef = useRef<HTMLDivElement | null>(null);
  const pull = (dy: number) => {
    const el = pullRef.current;
    if (!el) return;
    const distance = fullscreen.active ? Math.min(Math.max(0, dy), PULL_MAX_PX) : 0;
    // Springs back on release; the fullscreen exit (if it was far enough) takes over from there.
    el.style.transition = distance === 0 ? "transform 200ms ease-out" : "none";
    el.style.transform =
      distance === 0 ? "" : `translateY(${distance * PULL_FOLLOW}px) scale(${1 - distance * PULL_SHRINK_PER_PX})`;
  };

  const wake = () => setWoken(true);
  // Hidden buttons must not catch a stray tap.
  const interactive = controlsShown ? "pointer-events-auto" : "pointer-events-none";
  // Tapping a control counts as interaction, so the 3s hide timer restarts too.
  const withWake = (action: () => void) => () => {
    wake();
    action();
  };
  const gestures = useGestures({
    onTap: (point) => {
      wake();
      onTogglePlay();
      if (fullscreen.active) sparkles.spawn(point.x, point.y);
      // A tiny buzz with it. Android only: iOS has no vibration API for web pages.
      try {
        navigator.vibrate?.(15);
      } catch {
        // not allowed here
      }
    },
    onSwipeUp: () => {
      if (!fullscreen.active) fullscreen.enter();
    },
    onSwipeDown: () => {
      if (fullscreen.active) fullscreen.exit();
    },
    onDrag: (_dx, dy) => pull(dy),
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
      <div ref={pullRef} className="absolute inset-0">
        <div ref={frameRef} className="player-frame" />

        {/* Opaque poster: keeps YouTube's suggestions and end screen out of sight. */}
        {covered && (
          <div className="pointer-events-none absolute inset-0 z-10 bg-black">
            {video && (
              <Thumbnail key={video.id} id={video.id} priority className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}
      </div>

      <div {...gestures} className="absolute inset-0 z-20 touch-none" />

      <SparkleLayer {...sparkles} className="absolute inset-0 z-25" />

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
              aria-label="Bosh sahifaga"
              className={`${interactive} flex size-12 items-center justify-center rounded-full text-white active:bg-white/20`}
            >
              <ChevronDownIcon className="size-7" />
            </button>
          </div>

          {/* Exactly one control in the centre, so nothing reads as a duplicate. */}
          <div className="absolute inset-0 flex items-center justify-center">
            {status === "loading" ? (
              <div
                aria-label="Yuklanmoqda"
                role="status"
                className="size-14 animate-spin rounded-full border-4 border-white/25 border-t-white sm:size-16"
              />
            ) : (
              <button
                type="button"
                onClick={withWake(onTogglePlay)}
                aria-label={status === "playing" ? "Pauza" : "Ijro etish"}
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
                    aria-label="Keyingi video"
                    className={`${interactive} flex size-12 items-center justify-center rounded-full text-white active:bg-white/20`}
                  >
                    <NextIcon className="size-6" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={withWake(fullscreen.toggle)}
                  aria-label={fullscreen.active ? "To'liq ekrandan chiqish" : "To'liq ekran"}
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

      {/* Native fullscreen paints only this element, so the page-wide warm tint needs a copy in here. */}
      {fullscreen.active && !fullscreen.pseudo && <NightTint className="absolute inset-0 z-45" />}

      {onBoardDone && <TapBoard inPlayer onDone={onBoardDone} />}

      {showStallCard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center gap-6 bg-black/85 px-6">
          <button
            type="button"
            onClick={onReplay}
            aria-label="Qayta urinish"
            className="flex size-24 items-center justify-center rounded-full bg-white text-5xl transition-transform duration-100 active:scale-90"
          >
            🔄
          </button>
          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              aria-label="Keyingisini qo'yish"
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
            aria-label="Yana ko'rish"
            className="flex size-24 items-center justify-center rounded-full bg-white text-black transition-transform duration-100 active:scale-90"
          >
            <PlayIcon className="size-12" />
          </button>
          <button
            type="button"
            onClick={onHome}
            aria-label="Boshqasini tanlash"
            className="flex size-24 items-center justify-center rounded-full bg-white/15 text-white transition-transform duration-100 active:scale-90"
          >
            <HomeIcon filled className="size-12" />
          </button>
        </div>
      )}
    </div>
  );
}
