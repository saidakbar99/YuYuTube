export function BackExitNotice() {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-80 flex justify-center px-4"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-app-elevated px-5 py-3 text-base font-medium text-app-text shadow-lg shadow-black/25">
        <span className="text-xl">{"👋"}</span>
        Chiqish uchun yana bir marta orqaga bosing
      </div>
    </div>
  );
}
