"use client";

import { Thumbnail } from "@/components/Thumbnail";
import type { Video } from "@/data/videos";

// Picture only: the viewer can't read yet, so the title lives on for screen readers alone.
export function VideoCard({ video, onSelect }: { video: Video; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video.id)}
      aria-label={video.title}
      className="block w-full overflow-hidden rounded-2xl bg-yt-surface transition-transform duration-100 ease-out active:scale-[0.95] sm:rounded-3xl"
    >
      <Thumbnail id={video.id} className="aspect-video w-full object-cover" />
    </button>
  );
}
