"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CONFIRM_MS = 3000;

/**
 * Back button handling. The history stack is kept as [page, guard, watch?]:
 * - back on the watch screen pops `watch` and calls `onBackFromWatch`;
 * - back on home pops `guard` and only shows a notice (`confirming`);
 * - back again while the notice is up goes past the app and leaves it.
 *
 * Chrome skips entries pushed without a user gesture when going back, so `guard` is (re)added
 * on a touch rather than at mount, and `watch` is pushed from the tap that opens a video.
 */
export function useBackGuard(onBackFromWatch: () => void) {
  const [confirming, setConfirming] = useState(false);
  const onBack = useRef(onBackFromWatch);
  useEffect(() => {
    onBack.current = onBackFromWatch;
  });

  const state = useRef({ armed: false, watch: false, ignoreNextPop: false });

  const enterWatch = useCallback(() => {
    if (state.current.watch) return;
    history.pushState({ yuyutube: "watch" }, "");
    state.current.watch = true;
  }, []);

  // Leaving the watch screen with an on-screen button: drop its entry so the next back press
  // is the home screen's, not a second trip home.
  const leaveWatch = useCallback(() => {
    if (!state.current.watch) return;
    state.current.watch = false;
    state.current.ignoreNextPop = true;
    history.back();
  }, []);

  useEffect(() => {
    const s = state.current;
    let timer: number | undefined;

    const hideNotice = () => {
      window.clearTimeout(timer);
      setConfirming(false);
    };

    const arm = () => {
      if (s.armed) return;
      history.pushState({ yuyutube: "guard" }, "");
      s.armed = true;
      // Touching the screen means they're staying.
      hideNotice();
    };

    const onPopState = () => {
      if (s.ignoreNextPop) {
        s.ignoreNextPop = false;
        return;
      }
      if (s.watch) {
        s.watch = false;
        onBack.current();
        return;
      }
      if (!s.armed) return;
      // The guard is gone; the next back press goes past the app.
      s.armed = false;
      setConfirming(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    };

    window.addEventListener("pointerdown", arm, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", arm, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return { confirming, enterWatch, leaveWatch };
}
