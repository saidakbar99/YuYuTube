"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackExitNotice } from "@/components/BackExitNotice";
import { HomeScreen } from "@/components/HomeScreen";
import { OfflineNotice } from "@/components/OfflineNotice";
import { NightTint } from "@/components/NightTint";
import { HomeIcon } from "@/components/PlayerIcons";
import { RestScreen } from "@/components/RestScreen";
import { TouchSparkles } from "@/components/Sparkles";
import { WatchScreen } from "@/components/WatchScreen";
import { config } from "@/config";
import { videos, type Video } from "@/data/videos";
import { useBackGuard } from "@/hooks/useBackGuard";
import { useBedtime } from "@/hooks/useBedtime";
import { useOnline } from "@/hooks/useOnline";
import { useScreenTime } from "@/hooks/useScreenTime";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { recordPick, recordWatch } from "@/lib/favorites";
import { playLaunchJingle } from "@/lib/jingle";
import { buildFeed, pushRecent } from "@/lib/feed";
import { reshuffleHome } from "@/lib/homeOrder";

const WATCH_TICK_S = 5;

export function App() {
  const [view, setView] = useState<"home" | "watch">("home");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [feed, setFeed] = useState<Video[]>([]);
  const [exhausted, setExhausted] = useState(false);
  // Set while the tap-and-hear break is up: the video to play once it's over.
  const [boardNext, setBoardNext] = useState<string | null>(null);

  const feedRef = useRef<Video[]>([]);
  const playRef = useRef<(id: string) => void>(() => {});
  const failuresRef = useRef(0);
  const currentIdRef = useRef<string | null>(null);
  // What may play right now (calm videos only at bedtime), and whether time is up.
  // Refs, because the player's end/failure handlers are created before those are known.
  const libraryRef = useRef<readonly Video[]>(videos);
  const blockedRef = useRef(false);
  const sinceBoardRef = useRef(0);
  const boardNextRef = useRef<string | null>(null);
  const enterFullscreenRef = useRef<() => void>(() => {});

  const goTo = useCallback((id: string) => {
    const next = buildFeed(libraryRef.current, id, pushRecent(id));
    sinceBoardRef.current += 1;
    feedRef.current = next;
    currentIdRef.current = id;
    setFeed(next);
    setCurrentId(id);
    playRef.current(id);
  }, []);

  // The feed can predate bedtime starting, so filter it by what is allowed now.
  const nextAllowed = useCallback((except: string | null) => {
    const allowed = new Set(libraryRef.current.map((v) => v.id));
    return feedRef.current.find((v) => v.id !== except && allowed.has(v.id)) ?? null;
  }, []);

  const handleEnded = useCallback(() => {
    // Time is up: stay on the finished video so the rest screen takes over.
    if (!config.autoplayNext || blockedRef.current) return;
    const current = currentIdRef.current;
    // With a one-video library the feed is empty; replay rather than stall on a dead poster.
    const replayable = libraryRef.current.some((v) => v.id === current) ? current : null;
    const next = nextAllowed(current)?.id ?? replayable;
    if (!next) return;
    // Every few videos, a break to tap and hear before the next one.
    if (config.boardEvery !== null && sinceBoardRef.current >= config.boardEvery) {
      setBoardNext(next);
      return;
    }
    goTo(next);
  }, [goTo, nextAllowed]);

  const finishBoard = useCallback(() => {
    const planned = boardNextRef.current;
    sinceBoardRef.current = 0;
    setBoardNext(null);
    // Time ran out during the break: stay put and let the rest screen take over.
    if (!planned || blockedRef.current) return;
    // Bedtime may have started meanwhile, so re-check that the planned video is still allowed.
    const stillAllowed = libraryRef.current.some((v) => v.id === planned);
    const next = stillAllowed ? planned : nextAllowed(currentIdRef.current)?.id;
    if (next) goTo(next);
  }, [goTo, nextAllowed]);

  const handleFailed = useCallback(
    (failedId: string | null) => {
      if (blockedRef.current) return;
      failuresRef.current += 1;
      const next = nextAllowed(failedId);
      if (!next || failuresRef.current >= libraryRef.current.length) {
        setExhausted(true);
        return;
      }
      goTo(next.id);
    },
    [goTo, nextAllowed],
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

  // Watching time feeds the favorites too, not just taps.
  const watchingId = view === "watch" && status === "playing" ? currentId : null;
  useEffect(() => {
    if (!watchingId) return;
    const timer = window.setInterval(() => recordWatch(watchingId, WATCH_TICK_S), WATCH_TICK_S * 1000);
    return () => window.clearInterval(timer);
  }, [watchingId]);
  const bedtime = useBedtime();
  const online = useOnline();

  const library = useMemo(() => (bedtime.active ? videos.filter((v) => v.calm) : videos), [bedtime.active]);
  const bedtimeEmpty = bedtime.active && library.length === 0;

  // Time is up (or it's bedtime with nothing calm to show). The video playing may finish
  // first, so it ends gently, unless it runs on past the grace period.
  const blocked = screenTime.reached || bedtimeEmpty;
  const pastGrace = screenTime.overGrace || (bedtimeEmpty && bedtime.minutesIn >= config.graceMinutes);
  const midVideo = view === "watch" && (status === "playing" || status === "loading");
  const resting = blocked && (!midVideo || pastGrace);

  useEffect(() => {
    libraryRef.current = library;
    blockedRef.current = blocked;
    boardNextRef.current = boardNext;
  });

  useEffect(() => {
    if (resting) pause();
  }, [resting, pause]);

  // Bedtime began during a lively video that is still going after the grace period: move to a calm one.
  const currentAllowed = currentId === null || library.some((v) => v.id === currentId);
  const overstaying =
    bedtime.active && !bedtimeEmpty && !currentAllowed && bedtime.minutesIn >= config.graceMinutes;
  useEffect(() => {
    if (!overstaying || view !== "watch" || status !== "playing") return;
    const next = nextAllowed(currentIdRef.current);
    if (next) goTo(next.id);
  }, [overstaying, view, status, nextAllowed, goTo]);

  // Native fullscreen paints only the fullscreen element, so any full-screen overlay
  // would be invisible behind it. Drop out of fullscreen before showing one.
  const suspended = resting || !online;

  const showHome = useCallback(() => {
    pause();
    setBoardNext(null);
    reshuffleHome();
    setView("home");
  }, [pause]);

  // Back on the watch screen returns home; back on home asks for a second press before leaving.
  const back = useBackGuard(showHome);
  const { enterWatch, leaveWatch } = back;

  // Picking a video opens it fullscreen. Browsers allow that only inside the tap itself,
  // so it has to happen here, before anything else.
  const open = useCallback(
    (id: string) => {
      enterFullscreenRef.current();
      recordPick(id);
      failuresRef.current = 0;
      setExhausted(false);
      goTo(id);
      setView("watch");
      enterWatch();
    },
    [goTo, enterWatch],
  );

  const goHome = useCallback(() => {
    leaveWatch();
    showHome();
  }, [leaveWatch, showHome]);

  // A tile he picked from the list under the player.
  const choose = useCallback(
    (id: string) => {
      if (blockedRef.current) {
        pause();
        return;
      }
      enterFullscreenRef.current();
      recordPick(id);
      goTo(id);
    },
    [goTo, pause],
  );

  const playNext = useCallback(() => {
    const next = nextAllowed(currentIdRef.current);
    if (next) goTo(next.id);
  }, [goTo, nextAllowed]);

  const visibleFeed = useMemo(() => (bedtime.active ? feed.filter((v) => v.calm) : feed), [feed, bedtime.active]);

  const unlock = () => {
    if (screenTime.reached) screenTime.reset();
    if (bedtimeEmpty) bedtime.unlock();
  };

  const replay = useCallback(() => {
    if (currentId) playRef.current(currentId);
  }, [currentId]);

  const current = useMemo(() => videos.find((v) => v.id === currentId) ?? null, [currentId]);

  // "Yu-Yu!" as the app opens, right after Android's icon splash.
  useEffect(() => playLaunchJingle(), []);

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
        feed={visibleFeed}
        status={status}
        progress={progress}
        frameRef={containerRef}
        enterFullscreenRef={enterFullscreenRef}
        onBoardDone={boardNext !== null && view === "watch" ? finishBoard : null}
        onSelect={choose}
        onTogglePlay={togglePlay}
        onNext={playNext}
        onReplay={replay}
        onHome={goHome}
        // Also covers the back button, which reaches home without passing through WatchScreen.
        suspended={suspended || view === "home"}
      />

      {exhausted && view === "watch" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-yt-bg px-8">
          <div className="text-7xl">🙈</div>
          <button
            type="button"
            onClick={goHome}
            aria-label="Boshqasini tanlash"
            className="flex size-24 items-center justify-center rounded-full bg-white text-black transition-transform duration-100 active:scale-90"
          >
            <HomeIcon filled className="size-12" />
          </button>
        </div>
      )}

      {view === "home" && (
        <div className="fixed inset-0 z-50">
          <HomeScreen onSelect={open} calmOnly={bedtime.active} />
        </div>
      )}

      {resting && <RestScreen emoji={bedtimeEmpty ? "🌙" : "👋"} onUnlock={unlock} />}
      {!online && <OfflineNotice />}
      {back.confirming && <BackExitNotice />}
      <NightTint />
      <TouchSparkles />
    </main>
  );
}
