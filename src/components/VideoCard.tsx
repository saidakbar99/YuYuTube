"use client";

import { Thumbnail } from "@/components/Thumbnail";
import type { Video } from "@/data/videos";

// Each video keeps its own frame colour wherever it shows up, so he can find "the green one" again.
const FRAMES = ["#ffb547", "#ff7aa8", "#5ec8f2", "#7ed957", "#b18cff", "#ff8c42"];

function frameOf(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return FRAMES[Math.abs(hash) % FRAMES.length];
}

// Picture only: the viewer can't read yet, so the title lives on for screen readers alone.
export function VideoCard({ video, onSelect }: { video: Video; onSelect: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(video.id)}
      aria-label={video.title}
      className="block w-full rounded-3xl p-1.5 shadow-md shadow-black/10 transition-transform duration-100 ease-out active:scale-[0.95]"
      style={{ backgroundColor: frameOf(video.id) }}
    >
      <Thumbnail id={video.id} className="aspect-video w-full rounded-[1.15rem] bg-app-surface object-cover" />
    </button>
  );
}
