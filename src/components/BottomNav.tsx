"use client";

import { HomeIcon } from "@/components/PlayerIcons";

export function BottomNav({ active, onHome }: { active: boolean; onHome: () => void }) {
  return (
    // The bar is a fixed 56px. On iPhones the home-indicator inset (~34px) would stack on top of that, so
    // part of it is absorbed and the content sits slightly into the inset, like native tab bars do.
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-yt-bg pb-[max(0px,calc(env(safe-area-inset-bottom)-14px))]">
      <div className="flex h-14 justify-center">
        <button
          type="button"
          onClick={onHome}
          className="my-1 flex w-28 flex-col items-center justify-center gap-0.5 rounded-xl transition-transform duration-100 active:scale-95 active:bg-white/10"
        >
          <HomeIcon filled={active} className={`size-6 ${active ? "text-yt-text" : "text-yt-muted"}`} />
          <span className={`text-[11px] leading-none ${active ? "font-medium text-yt-text" : "text-yt-muted"}`}>
            Home
          </span>
        </button>
      </div>
    </nav>
  );
}
