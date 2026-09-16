"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";

type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
// `lock` was dropped from TypeScript's DOM types because only Chromium on Android implements it.
type LockableOrientation = ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function lockLandscape() {
  (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape").catch(() => {
    // desktop and iOS refuse; the CSS rotation covers iPhone
  });
}

function unlockOrientation() {
  try {
    screen.orientation?.unlock();
  } catch {
    // nothing was locked
  }
}

function subscribePortrait(onChange: () => void) {
  const query = window.matchMedia("(orientation: portrait)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const portrait = useSyncExternalStore(
    subscribePortrait,
    () => window.matchMedia("(orientation: portrait)").matches,
    () => false,
  );

  useEffect(() => {
    const sync = () => {
      const active = Boolean(fullscreenElement());
      setNative(active);
      if (!active) unlockOrientation();
    };
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const enter = useCallback(async () => {
    const el = targetRef.current as WebkitElement | null;
    const request = el?.requestFullscreen ?? el?.webkitRequestFullscreen;
    if (el && request) {
      try {
        await request.call(el);
        lockLandscape();
        return;
      } catch {
        // iOS Safari and locked-down embeds reject — fall through to the CSS layer
      }
    }
    setPseudo(true);
  }, [targetRef]);

  const exit = useCallback(async () => {
    const doc = document as WebkitDocument;
    if (fullscreenElement()) {
      try {
        await (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
      } catch {
        // ignore
      }
    }
    unlockOrientation();
    setPseudo(false);
  }, []);

  const active = native || pseudo;
  // iPhone can neither lock orientation nor go truly fullscreen, so while the phone is held
  // upright the CSS layer is turned sideways to fill the long edge instead.
  const rotated = pseudo && portrait;
  const toggle = useCallback(() => (active ? exit() : enter()), [active, enter, exit]);

  return { active, pseudo, rotated, enter, exit, toggle };
}
