declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let pending: Promise<typeof YT> | null = null;

export function loadYouTubeApi(): Promise<typeof YT> {
  if (pending) return pending;

  pending = new Promise<typeof YT>((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });

  return pending;
}

export const PLAYER_VARS = {
  controls: 0,
  rel: 0,
  playsinline: 1,
  iv_load_policy: 3,
  disablekb: 1,
  fs: 0,
  modestbranding: 1,
} as const;

export const SKIPPABLE_ERRORS = new Set([100, 101, 150]);
