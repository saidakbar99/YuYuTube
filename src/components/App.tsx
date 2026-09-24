"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackExitNotice } from "@/components/BackExitNotice";
import { HomeScreen } from "@/components/HomeScreen";
import { OfflineNotice } from "@/components/OfflineNotice";
import { HomeIcon } from "@/components/PlayerIcons";
import { RestScreen } from "@/components/RestScreen";
import { WatchScreen } from "@/components/WatchScreen";
import { config } from "@/config";
import { videos, type Video } from "@/data/videos";
import { useBackGuard } from "@/hooks/useBackGuard";
import { useOnline } from "@/hooks/useOnline";
import { useScreenTime } from "@/hooks/useScreenTime";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { buildFeed, pushRecent } from "@/lib/feed";
import { reshuffleHome } from "@/lib/homeOrder";

export function App() {
  const [view, setView] = useState<"home" | "watch">("home");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [feed, setFeed] = useState<Video[]>([]);
  const [exhausted, setExhausted] = useState(false);

  const feedRef = useRef<Video[]>([]);
  const playRef = useRef<(id: string) => void>(() => {});
  const failuresRef = useRef(0);
  const currentIdRef = useRef<string | null>(null);

  const goTo = useCallback((id: string) => {
    const next = buildFeed(videos, id, pushRecent(id));
    feedRef.current = next;
    currentIdRef.current = id;
    setFeed(next);
    setCurrentId(id);
    playRef.current(id);
  }, []);

  const handleEnded = useCallback(() => {
    if (!config.autoplayNext) return;
    // With a one-video library the feed is empty; replay rather than stall on a dead poster.
    const next = feedRef.current[0]?.id ?? currentIdRef.current;
    if (next) goTo(next);
  }, [goTo]);

  const handleFailed = useCallback(
    (failedId: string | null) => {
      failuresRef.current += 1;
      const next = feedRef.current.find((v) => v.id !== failedId);
      if (!next || failuresRef.current >= videos.length) {
        setExhausted(true);
        return;
      }
      goTo(next.id);
    },
    [goTo],
  );

  const { containerRef, status, progress, play, pause, togglePlay } = useYouTubePlayer({
    onEnded: handleEnded,
    onFailed: handleFailed,
    preloadId: videos[0]?.id,
  });

  useEffect(() => {
    playRef.current = play;
  }, [play]);

  useEffect(() => {
    if (status === "playing") failuresRef.current = 0;
  }, [status]);

  const screenTime = useScreenTime(view === "watch" && status === "playing");
  const online = useOnline();
  const confirmingExit = useBackGuard();

  useEffect(() => {
    if (screenTime.locked) pause();
  }, [screenTime.locked, pause]);

  // Native fullscreen paints only the fullscreen element, so any full-screen overlay
  // would be invisible behind it. Drop out of fullscreen before showing one.
  const suspended = screenTime.locked || !online;

  const open = useCallback(
    (id: string) => {
      failuresRef.current = 0;
      setExhausted(false);
      goTo(id);
      setView("watch");
    },
    [goTo],
  );

  const goHome = useCallback(() => {
    pause();
    reshuffleHome();
    setView("home");
  }, [pause]);

  const playNext = useCallback(() => {
    const next = feedRef.current[0];
    if (next) goTo(next.id);
  }, [goTo]);

  const replay = useCallback(() => {
    if (currentId) playRef.current(currentId);
  }, [currentId]);

  const current = useMemo(() => videos.find((v) => v.id === currentId) ?? null, [currentId]);

  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    for (const type of ["contextmenu", "dragstart", "gesturestart"]) {
      document.addEventListener(type, block);
    }
    return () => {
      for (const type of ["contextmenu", "dragstart", "gesturestart"]) {
        document.removeEventListener(type, block);
      }
    };
  }, []);

  return (
    <main>
      <WatchScreen
        video={current}
        feed={feed}
        status={status}
        progress={progress}
        frameRef={containerRef}
        onSelect={goTo}
        onTogglePlay={togglePlay}
        onNext={playNext}
        onReplay={replay}
        onHome={goHome}
        suspended={suspended}
      />

      {exhausted && view === "watch" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-yt-bg px-8">
          <div className="text-7xl">🙈</div>
          <button
            type="button"
            onClick={goHome}
            aria-label="Pick another"
            className="flex size-24 items-center justify-center rounded-full bg-white text-black transition-transform duration-100 active:scale-90"
          >
            <HomeIcon filled className="size-12" />
          </button>
        </div>
      )}

      {view === "home" && (
        <div className="fixed inset-0 z-50">
          <HomeScreen onSelect={open} />
        </div>
      )}

      {screenTime.locked && <RestScreen onUnlock={screenTime.unlock} />}
      {!online && <OfflineNotice />}
      {confirmingExit && <BackExitNotice />}
    </main>
  );
}
