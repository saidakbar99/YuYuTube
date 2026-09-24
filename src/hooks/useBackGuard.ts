"use client";

import { useEffect, useState } from "react";

const CONFIRM_MS = 3000;

/**
 * The first back press only shows a notice; a second one within CONFIRM_MS leaves the app.
 *
 * It works by keeping one extra history entry on top. Chrome skips entries pushed without a
 * user gesture when going back, so the entry is (re)added on a touch rather than at mount.
 */
export function useBackGuard() {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let armed = false;
    let waiting = false;
    let timer: number | undefined;

    const arm = () => {
      if (armed || waiting) return;
      history.pushState({ yuyutubeGuard: true }, "");
      armed = true;
    };

    // The guard entry has just been popped; the next back press goes past the app.
    const onPopState = () => {
      if (!armed) return;
      armed = false;
      waiting = true;
      setConfirming(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        waiting = false;
        setConfirming(false);
      }, CONFIRM_MS);
    };

    window.addEventListener("pointerdown", arm, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", arm, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return confirming;
}
