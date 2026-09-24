export function BackExitNotice() {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-80 flex justify-center px-4"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-yt-elevated px-5 py-3 text-base font-medium text-yt-text shadow-lg shadow-black/50">
        <span className="text-xl">{"👋"}</span>
        Press back again to leave
      </div>
    </div>
  );
}
