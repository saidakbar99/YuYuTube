"use client";

import { Thumbnail } from "@/components/Thumbnail";
import type { Video } from "@/data/videos";

type Props = {
  video: Video;
  onSelect: (id: string) => void;
  /** Feed cards keep the full-width thumbnail but sit under a smaller title. */
  compact?: boolean;
};

export function VideoCard({ video, onSelect, compact = false }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video.id)}
      className="w-full text-left transition-transform duration-100 ease-out active:scale-[0.97]"
    >
      <div
        className={`overflow-hidden bg-yt-surface ${compact ? "rounded-xl sm:rounded-2xl" : "rounded-2xl sm:rounded-3xl"}`}
      >
        <Thumbnail id={video.id} className="aspect-video w-full object-cover" />
      </div>
      <h3
        className={`line-clamp-2 px-1.5 font-medium text-yt-text ${
          compact ? "mt-2 text-sm leading-5" : "mt-2.5 text-base leading-6 sm:text-lg sm:leading-7"
        }`}
      >
        {video.title}
      </h3>
    </button>
  );
}
