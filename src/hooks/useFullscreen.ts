"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function fullscreenElement(): Element | null {
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);

  useEffect(() => {
    const sync = () => setNative(Boolean(fullscreenElement()));
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
    setPseudo(false);
  }, []);

  const active = native || pseudo;
  const toggle = useCallback(() => (active ? exit() : enter()), [active, enter, exit]);

  return { active, pseudo, enter, exit, toggle };
}
