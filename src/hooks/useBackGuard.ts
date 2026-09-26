"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CONFIRM_MS = 3000;

export type BackLayer = "watch" | "fullscreen";

type Entry = { layer: BackLayer; depth: number; onBack: () => void };

/**
 * Back button handling. The history stack is kept as [page, guard, ...layers], layers being
 * `watch` and then `fullscreen` on top of it:
 * - back pops the top layer and calls its `onBack` (fullscreen → watch → home, like YouTube);
 * - back on home pops `guard` and only shows a notice (`confirming`);
 * - back again while the notice is up goes past the app and leaves it.
 *
 * Every entry records its depth, so a back that lands several entries down (Chrome may skip
 * entries it considers pushed without a gesture) still closes every layer it passed.
 *
 * Chrome skips entries pushed without a user gesture when going back, so `guard` is (re)added
 * on a touch rather than at mount, and layers are opened from the tap that causes them.
 */
export function useBackGuard() {
  const [confirming, setConfirming] = useState(false);

  const state = useRef({
    armed: false,
    guardDepth: 0,
    // Our position in the history stack, counted from the page itself.
    depth: 0,
    layers: [] as Entry[],
    // Entries already closed here but not yet walked back over in the history.
    pendingBack: 0,
    flushTimer: undefined as number | undefined,
  });

  const open = useCallback((layer: BackLayer, onBack: () => void) => {
    const s = state.current;
    if (s.layers.some((entry) => entry.layer === layer)) return;
    // Closed and reopened before the history caught up (a quick toggle, or StrictMode's double
    // effect): keep the entry that is still there instead of going back and pushing again.
    if (s.pendingBack > 0) {
      s.pendingBack -= 1;
      s.layers.push({ layer, depth: s.depth - s.pendingBack, onBack });
      return;
    }
    s.depth += 1;
    history.pushState({ yuyutube: layer, depth: s.depth }, "");
    s.layers.push({ layer, depth: s.depth, onBack });
  }, []);

  // Closed with an on-screen button or gesture: drop its entry (and any above it) so the next back
  // press belongs to what is underneath, not a second trip out of the same thing.
  const close = useCallback((layer: BackLayer) => {
    const s = state.current;
    const index = s.layers.findIndex((entry) => entry.layer === layer);
    if (index === -1) return;
    s.pendingBack += s.layers.length - index;
    s.layers.length = index;
    // Batched, so closing fullscreen and watch together is one trip back, not two racing ones.
    window.clearTimeout(s.flushTimer);
    s.flushTimer = window.setTimeout(() => {
      if (s.pendingBack === 0) return;
      s.depth -= s.pendingBack;
      history.go(-s.pendingBack);
      s.pendingBack = 0;
    });
  }, []);

  useEffect(() => {
    const s = state.current;
    let timer: number | undefined;
    const depthOf = (value: unknown) =>
      typeof (value as { depth?: unknown } | null)?.depth === "number" ? (value as { depth: number }).depth : 0;
    // A reload keeps the entry we were on; count from there.
    s.depth = depthOf(history.state);

    const hideNotice = () => {
      window.clearTimeout(timer);
      setConfirming(false);
    };

    const arm = () => {
      if (s.armed) return;
      s.depth += 1;
      s.guardDepth = s.depth;
      history.pushState({ yuyutube: "guard", depth: s.depth }, "");
      s.armed = true;
      // Touching the screen means they're staying.
      hideNotice();
    };

    const onPopState = (event: PopStateEvent) => {
      const depth = depthOf(event.state);
      s.depth = depth;

      // Our own trip back after `close` lands on a layer that is still open: nothing to do.
      let popped = false;
      while (s.layers.length > 0 && s.layers[s.layers.length - 1].depth > depth) {
        s.layers.pop()!.onBack();
        popped = true;
      }
      if (popped || !s.armed || depth >= s.guardDepth) return;

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
      window.clearTimeout(s.flushTimer);
      window.removeEventListener("pointerdown", arm, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return { confirming, open, close };
}
