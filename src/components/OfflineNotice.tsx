export function OfflineNotice() {
  return (
    <div className="fixed inset-0 z-70 flex flex-col items-center justify-center bg-yt-bg px-8 text-center">
      <div className="text-6xl">{"☁️"}</div>
      <h2 className="mt-6 text-2xl font-semibold text-yt-text">No internet</h2>
      <p className="mt-2 max-w-sm text-base text-yt-muted">
        The videos are taking a nap. They&rsquo;ll be back when the internet comes home.
      </p>
    </div>
  );
}
