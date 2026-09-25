"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@/config";
import type { Clip } from "@/lib/clip";
import { PLAYER_VARS, SKIPPABLE_ERRORS, loadYouTubeApi } from "@/lib/youtube";

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error" | "stalled";

const END_LEAD_SECONDS = 0.5;
const POLL_MS = 250;
const STALL_MS = 10_000;
const TIME_EPSILON = 0.05;

type Handlers = {
  onEnded: () => void;
  onFailed: (id: string | null) => void;
  /** Cued (not played) at startup so the very first tap has a warm player. */
  preloadId?: string;
  /** Which part of a video to play: skips intros, stops before outros. */
  clipFor: (id: string) => Clip;
};

function capVolume(player: YT.Player | null) {
  try {
    player?.setVolume(config.maxVolume);
  } catch {
    // player not ready — the next PLAYING event applies it
  }
}

export function useYouTubePlayer({ onEnded, onFailed, preloadId, clipFor }: Handlers) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const apiRef = useRef<typeof YT | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const endFiredRef = useRef(false);
  const stallRef = useRef({ time: -1, at: 0 });
  const clipRef = useRef<Clip>({ start: 0, end: null });

  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [progress, setProgress] = useState({ current: 0, duration: 0 });

  const handlers = useRef({ onEnded, onFailed, clipFor });
  const preloadRef = useRef(preloadId);
  useEffect(() => {
    handlers.current = { onEnded, onFailed, clipFor };
  });

  // Only the start goes to YouTube. The end is enforced by the poll below: at `endSeconds`
  // YouTube may merely pause, which would leave the child on a paused poster instead of moving on.
  const load = useCallback((player: YT.Player, id: string) => {
    player.loadVideoById({ videoId: id, startSeconds: clipRef.current.start });
  }, []);

  const fireEnd = useCallback(() => {
    if (endFiredRef.current) return;
    endFiredRef.current = true;
    setStatus("ended");
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // player may already be torn down
    }
    handlers.current.onEnded();
  }, []);

  const play = useCallback((id: string) => {
    currentIdRef.current = id;
    clipRef.current = handlers.current.clipFor(id);
    endFiredRef.current = false;
    stallRef.current = { time: -1, at: Date.now() };
    setProgress({ current: 0, duration: 0 });
    setStatus("loading");
    if (readyRef.current && playerRef.current) load(playerRef.current, id);
    else pendingRef.current = id;
  }, [load]);

  const resume = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const togglePlay = useCallback(() => {
    if (status === "playing") pause();
    else if (status === "paused" || status === "loading" || status === "stalled") resume();
    // A finished video has nothing to resume — a tap should start it over.
    else if (status === "ended" && currentIdRef.current) play(currentIdRef.current);
  }, [status, pause, resume, play]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    loadYouTubeApi().then((api) => {
      if (cancelled || !container) return;
      apiRef.current = api;

      // YT replaces its target node with the iframe, so give it a node React does not own.
      const host = document.createElement("div");
      host.className = "h-full w-full";
      container.appendChild(host);

      playerRef.current = new api.Player(host, {
        host: "https://www.youtube-nocookie.com",
        videoId: preloadRef.current,
        playerVars: { ...PLAYER_VARS, origin: window.location.origin },
        events: {
          onReady: () => {
            readyRef.current = true;
            capVolume(playerRef.current);
            const queued = pendingRef.current;
            pendingRef.current = null;
            if (queued && playerRef.current) load(playerRef.current, queued);
          },
          onStateChange: (event) => {
            if (endFiredRef.current) return;
            switch (event.data) {
              case api.PlayerState.PLAYING:
                // Re-applied per video: a fresh load can come back at full volume.
                capVolume(playerRef.current);
                setStatus("playing");
                break;
              case api.PlayerState.PAUSED:
                setStatus("paused");
                break;
              case api.PlayerState.ENDED:
                fireEnd();
                break;
              case api.PlayerState.UNSTARTED:
              case api.PlayerState.CUED:
                setStatus("loading");
                break;
              default:
                break; // BUFFERING keeps the current cover in place
            }
          },
          onError: (event) => {
            const id = currentIdRef.current;
            // The startup preload is not something the child chose; failing it is not worth reacting to.
            if (id === null) return;
            const known = SKIPPABLE_ERRORS.has(event.data) ? "removed or not embeddable" : "playback error";
            console.warn(`[YuYuTube] skipping ${id} — YouTube error ${event.data} (${known})`);
            endFiredRef.current = true;
            setStatus("error");
            handlers.current.onFailed(id);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // already gone
      }
      playerRef.current = null;
      apiRef.current = null;
      if (container) container.replaceChildren();
    };
  }, [fireEnd, load]);

  // Backgrounding throttles the iframe and our poll, so state drifts. Stop on the
  // way out, and take the player's own word for it on the way back in.
  useEffect(() => {
    const onVisibilityChange = () => {
      const player = playerRef.current;
      const api = apiRef.current;
      if (!player || !api || !readyRef.current) return;

      if (document.hidden) {
        try {
          player.pauseVideo();
        } catch {
          // nothing to pause
        }
        return;
      }

      if (endFiredRef.current) return;
      try {
        const state = player.getPlayerState();
        if (state === api.PlayerState.PLAYING) setStatus("playing");
        else if (state === api.PlayerState.PAUSED) setStatus("paused");
        stallRef.current = { time: -1, at: Date.now() };
      } catch {
        // player not answering — the next state event will correct us
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    stallRef.current = { time: -1, at: Date.now() };

    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getDuration) return;
      const duration = player.getDuration();
      const current = player.getCurrentTime();
      const { start, end } = clipRef.current;
      const stopAt = end !== null && duration > 0 ? Math.min(end, duration) : duration;
      // The parent's progress bar shows the clip, not the whole upload.
      setProgress({ current: Math.max(0, current - start), duration: Math.max(0, stopAt - start) });

      if (stopAt > 0 && stopAt - current <= END_LEAD_SECONDS) {
        fireEnd();
        return;
      }

      // Playing but the clock is not moving: a silent network stall.
      const mark = stallRef.current;
      const now = Date.now();
      if (Math.abs(current - mark.time) > TIME_EPSILON) {
        stallRef.current = { time: current, at: now };
      } else if (now - mark.at >= STALL_MS) {
        console.warn(`[YuYuTube] playback stalled on ${currentIdRef.current}`);
        setStatus("stalled");
      }
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [status, fireEnd]);

  return { containerRef, status, progress, play, pause, resume, togglePlay };
}
