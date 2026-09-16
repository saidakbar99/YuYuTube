"use client";

import { HomeIcon } from "@/components/PlayerIcons";

export function BottomNav({ active, onHome }: { active: boolean; onHome: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-white/10 bg-yt-bg pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        onClick={onHome}
        className="flex w-40 flex-col items-center gap-1 rounded-2xl py-3 transition-transform duration-100 active:scale-95 active:bg-white/10"
      >
        <HomeIcon filled={active} className={`size-7 ${active ? "text-yt-text" : "text-yt-muted"}`} />
        <span className={`text-xs ${active ? "font-medium text-yt-text" : "text-yt-muted"}`}>Home</span>
      </button>
    </nav>
  );
}
