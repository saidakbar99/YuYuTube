export function OfflineNotice() {
  return (
    <div className="fixed inset-0 z-70 flex flex-col items-center justify-center bg-yt-bg px-8 text-center">
      <div className="text-6xl">{"☁️"}</div>
      <h2 className="mt-6 text-2xl font-semibold text-yt-text">Internet yo&lsquo;q</h2>
      <p className="mt-2 max-w-sm text-base text-yt-muted">
        Videolar uxlab qoldi. Internet qaytganda ular ham qaytadi.
      </p>
    </div>
  );
}
