"use client";

import { useState } from "react";
import { fallbackThumbnail, maxResThumbnail } from "@/lib/thumbnails";

type Props = { id: string; className?: string; priority?: boolean };

export function Thumbnail({ id, className = "", priority = false }: Props) {
  const [src, setSrc] = useState(() => maxResThumbnail(id));

  return (
    <img
      src={src}
      alt=""
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      // Not every video has a maxres still; drop to the one that always exists.
      onError={() => setSrc(fallbackThumbnail(id))}
      className={className}
    />
  );
}
