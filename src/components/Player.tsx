"use client";

import { useEffect, useState, type RefObject } from "react";
import { config } from "@/config";
import type { Video } from "@/data/videos";
import type { PlayerStatus } from "@/hooks/useYouTubePlayer";
import { useGestures } from "@/hooks/useGestures";
import type { useFullscreen } from "@/hooks/useFullscreen";
import { Thumbnail } from "@/components/Thumbnail";
import {
  ChevronDownIcon,
  CollapseIcon,
  ExpandIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
} from "@/components/PlayerIcons";

const HIDE_CONTROLS_MS = 3000;

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
  const [controlsShown, setControlsShown] = useState(true);
  const [shownFor, setShownFor] = useState(video?.id);

  if (video?.id !== shownFor) {
    setShownFor(video?.id);
    setControlsShown(true);
  }

  const wake = () => setControlsShown(true);
  // Tapping a control counts as interaction, so the 3s hide timer restarts too.
  const withWake = (action: () => void) => () => {
    wake();
    action();
  };
  const gestures = useGestures({
    onTap: () => {
      wake();
      onTogglePlay();
    },
    onSwipeUp: () => {
      wake();
      if (!fullscreen.active) fullscreen.enter();
    },
    onSwipeDown: () => {
      wake();
      if (fullscreen.active) fullscreen.exit();
    },
    onSwipeLeft: () => {
      wake();
      onNext();
    },
  }, fullscreen.rotated);

  useEffect(() => {
    if (status !== "playing" || !controlsShown) return;
    const timer = window.setTimeout(() => setControlsShown(false), HIDE_CONTROLS_MS);
    return () => window.clearTimeout(timer);
  }, [status, controlsShown]);

  const covered = status !== "playing";
  const showEndCard = status === "ended" && !config.autoplayNext;
  const showStallCard = status === "stalled";
  const ratio = progress.duration > 0 ? Math.min(1, progress.current / progress.duration) : 0;

  return (
    <div
      ref={stageRef}
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
              className="pointer-events-auto flex size-12 items-center justify-center rounded-full text-white active:bg-white/20"
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
                onClick={withWake(onTogglePlay)}
                aria-label={status === "playing" ? "Pause" : "Play"}
                className="pointer-events-auto flex size-22 items-center justify-center rounded-full bg-black/40 text-white transition-transform duration-100 active:scale-90 sm:size-26"
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
                    className="pointer-events-auto flex size-12 items-center justify-center rounded-full text-white active:bg-white/20"
                  >
                    <NextIcon className="size-6" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={withWake(fullscreen.toggle)}
                  aria-label={fullscreen.active ? "Exit fullscreen" : "Fullscreen"}
                  className="pointer-events-auto flex size-12 items-center justify-center rounded-full text-white active:bg-white/20"
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
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
          <p className="text-base font-medium text-white sm:text-lg">This video got stuck.</p>
          <button
            type="button"
            onClick={onReplay}
            className="rounded-full bg-white px-7 py-3.5 text-base font-medium text-black transition-transform duration-100 active:scale-95"
          >
            Try again
          </button>
          {hasNext && (
            <button
              type="button"
              onClick={onNext}
              className="rounded-full border border-white/25 px-7 py-3.5 text-base font-medium text-white transition-transform duration-100 active:scale-95"
            >
              Play the next one
            </button>
          )}
        </div>
      )}

      {showEndCard && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/85 px-6">
          <button
            type="button"
            onClick={onReplay}
            className="flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-base font-medium text-black transition-transform duration-100 active:scale-95"
          >
            <PlayIcon className="size-5" /> Watch again
          </button>
          <button
            type="button"
            onClick={onHome}
            className="rounded-full border border-white/25 px-7 py-3.5 text-base font-medium text-white transition-transform duration-100 active:scale-95"
          >
            Pick another
          </button>
        </div>
      )}
    </div>
  );
}
