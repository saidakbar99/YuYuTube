"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Player } from "@/components/Player";
import { VideoCard } from "@/components/VideoCard";
import type { Video } from "@/data/videos";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { PlayerStatus } from "@/hooks/useYouTubePlayer";
import { maxResThumbnail } from "@/lib/thumbnails";

type Props = {
  video: Video | null;
  feed: Video[];
  status: PlayerStatus;
  progress: { current: number; duration: number };
  frameRef: RefObject<HTMLDivElement | null>;
  suspended: boolean;
  onSelect: (id: string) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
};

export function WatchScreen({
  video,
  feed,
  status,
  progress,
  frameRef,
  suspended,
  onSelect,
  onTogglePlay,
  onNext,
  onReplay,
  onHome,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const fullscreen = useFullscreen(stageRef);
  const { exit } = fullscreen;

  useEffect(() => {
    if (suspended) exit();
  }, [suspended, exit]);

  // Autoplay rolls into feed[0]; having its poster already decoded avoids a
  // black frame at the hand-off.
  const nextId = feed[0]?.id;
  useEffect(() => {
    if (!nextId) return;
    const image = new Image();
    image.src = maxResThumbnail(nextId);
  }, [nextId]);

  // Leaving for the grid while still fullscreen would strand the child on a
  // fullscreen player with the home screen painted behind it.
  const leave = useCallback(() => {
    exit();
    onHome();
  }, [exit, onHome]);

  const select = (id: string) => {
    onSelect(id);
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-yt-bg md:landscape:h-dvh md:landscape:flex-row md:landscape:overflow-hidden">
      {/* No transform here: it would become the containing block for the
          pseudo-fullscreen stage's position:fixed and break iOS fullscreen. */}
      <div className="sticky top-0 z-30 bg-black md:landscape:static md:landscape:flex md:landscape:w-[65%] md:landscape:items-center">
        <Player
          video={video}
          status={status}
          progress={progress}
          frameRef={frameRef}
          stageRef={stageRef}
          fullscreen={fullscreen}
          hasNext={feed.length > 0}
          onTogglePlay={onTogglePlay}
          onNext={onNext}
          onReplay={onReplay}
          onHome={leave}
        />
      </div>

      {!fullscreen.active && (
        <div
          ref={feedRef}
          className="flex-1 pb-32 md:landscape:w-[35%] md:landscape:overflow-y-auto md:landscape:overscroll-contain"
        >
          <h1 className="px-4 py-4 text-lg font-semibold leading-6 text-yt-text sm:text-xl">
            {video?.title ?? ""}
          </h1>

          <div className="h-px bg-white/10" />

          <div className="px-3 pt-4">
            <p className="px-1 pb-3 text-base font-medium text-yt-muted">More videos</p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2 md:landscape:grid-cols-1">
              {feed.map((item) => (
                <VideoCard key={item.id} video={item} onSelect={select} compact />
              ))}
            </div>
          </div>
        </div>
      )}

      {!fullscreen.active && <BottomNav active={false} onHome={leave} />}
    </div>
  );
}
