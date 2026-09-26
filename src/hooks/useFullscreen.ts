"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { animateStage, capturePose, type Pose } from "@/lib/stageMotion";

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

/** Settles once the attempt is over. Desktop and iOS refuse; the CSS rotation covers iPhone. */
function lockLandscape(): Promise<void> | null {
  const orientation = screen.orientation as LockableOrientation | undefined;
  if (!orientation?.lock) return null;
  return orientation.lock("landscape").catch(() => {});
}

// Installed with display "fullscreen" (see manifest.ts), the app already has the whole screen with
// no bars. Our own layer is enough there, and skipping the Fullscreen API skips Chrome's
// "swipe down to exit full screen" toast along with it. Chrome still lets installed apps lock
// orientation without the API.
function appIsFullscreen() {
  return window.matchMedia("(display-mode: fullscreen)").matches;
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
  // While the landscape lock is being tried, the CSS layer waits rather than turning sideways too.
  const [locking, setLocking] = useState(false);
  // Where the stage was on screen just before the CSS fullscreen layer was toggled.
  const departureRef = useRef<Pose | null>(null);
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
    if (el && request && !appIsFullscreen()) {
      try {
        await request.call(el);
        void lockLandscape();
        return;
      } catch {
        // iOS Safari and locked-down embeds reject — fall through to the CSS layer
      }
    }
    if (el) departureRef.current = capturePose(el);
    setPseudo(true);
    const lock = lockLandscape();
    if (lock) {
      setLocking(true);
      void lock.then(() => setLocking(false));
    }
  }, [targetRef]);

  const exit = useCallback(async () => {
    if (pseudo && targetRef.current) departureRef.current = capturePose(targetRef.current);
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
  }, [pseudo, targetRef]);

  // Runs after the classes flip but before paint, so the first painted frame is already the start pose.
  // Native fullscreen is left alone: the browser and OS own that transition (and the rotation on Android).
  useLayoutEffect(() => {
    const departure = departureRef.current;
    departureRef.current = null;
    if (departure && targetRef.current) animateStage(targetRef.current, departure);
  }, [pseudo, targetRef]);

  const active = native || pseudo;
  // iPhone can neither lock orientation nor go truly fullscreen, so while the phone is held
  // upright the CSS layer is turned sideways to fill the long edge instead.
  const rotated = pseudo && portrait && !locking;
  const toggle = useCallback(() => (active ? exit() : enter()), [active, enter, exit]);

  return { active, pseudo, rotated, enter, exit, toggle };
}
