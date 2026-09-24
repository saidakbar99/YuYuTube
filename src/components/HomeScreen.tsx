"use client";

import { useRef, useSyncExternalStore } from "react";
import { BottomNav } from "@/components/BottomNav";
import { VideoCard } from "@/components/VideoCard";
import { getHomeOrder, getServerHomeOrder, subscribeHomeOrder } from "@/lib/homeOrder";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-9 items-center justify-center rounded-lg bg-yt-red">
        <svg viewBox="0 0 24 24" className="size-4 text-white" fill="currentColor" aria-hidden>
          <path d="M8 5.5v13l11-6.5L8 5.5Z" />
        </svg>
      </span>
      <span className="text-xl font-bold tracking-[-0.03em] text-yt-text">YuYuTube</span>
    </div>
  );
}

export function HomeScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const order = useSyncExternalStore(subscribeHomeOrder, getHomeOrder, getServerHomeOrder);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain bg-yt-bg">
      <header className="sticky top-0 z-30 flex min-h-14 transform-gpu items-center bg-yt-bg px-4 pt-[env(safe-area-inset-top)]">
        <Logo />
      </header>

      <div className="mx-auto max-w-7xl px-3 pt-2 pb-32 sm:px-5">
        {/* The prerendered HTML holds the unshuffled order; fade in once the
            client store takes over so the reorder is not a visible jump. */}
        <div
          className={`grid grid-cols-2 gap-3 transition-opacity duration-300 sm:gap-5 md:landscape:grid-cols-3 ${
            order === getServerHomeOrder() ? "opacity-0" : "opacity-100"
          }`}
        >
          {order.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelect} />
          ))}
        </div>
      </div>

      <BottomNav active onHome={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })} />
    </div>
  );
}
