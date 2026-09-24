# YuYuTube

A private, static, kid-safe video player. YouTube embeds only, no YouTube UI.

## Adding a video

One line in `src/data/videos.ts`, then push:

```ts
{ id: "XqZsoesa55w", title: "Baby Shark Dance" },
```

Check the whole library is still playable and embeddable:

```
npm run check-videos
```

Exits non-zero and names the offending IDs if any are removed, private, or embedding-disabled.

## Config

`src/config.ts`:

| key | default | meaning |
| --- | --- | --- |
| `autoplayNext` | `true` | roll straight into the next video, else show a "watch again / pick another" card |
| `recentWindow` | `5` | how many recently-watched IDs get pushed to the end of the feed |
| `maxVolume` | `60` | 0–100 cap on the player's volume. iOS ignores it (Safari blocks programmatic volume) — on iPhone use Settings → Sounds & Haptics → Headphone Safety → Reduce Loud Audio |
| `screenTimeLimitMinutes` | `null` | `null` is off. When set, playback time accumulates per day and locks to a "time to rest" screen; unlock by pressing and holding the bottom-right corner button for 3s |

## Commands

```
npm run dev
npm run build          # static export to out/
npm run lint
npm run typecheck
npm run check-videos
npm run generate-icons # regenerate favicon, iOS and Android icons
```

## Deploy

Import the repo on Vercel. Framework autodetects as Next.js; no settings, no env vars.

## Notes

- Player host is `youtube-nocookie.com`, controls off, and a transparent overlay covers the iframe at all times so no tap reaches YouTube's UI.
- Built for a toddler: while a video plays, a tap only pops a sparkle emoji and never pauses or skips. Swipe up/down still toggles fullscreen. Parent controls (pause, next, fullscreen, back) appear on a 1.5s press-and-hold and are untappable while hidden. When the video is not playing, a tap resumes it.
- The UI is picture-only: no titles on cards, and icon buttons instead of text on the stall, end and error screens. Titles in `videos.ts` are still used as accessibility labels.
- Pause and the last ~0.5s of playback are covered by an opaque layer, so suggestions and the end screen are never on screen.
- `rel: 0` no longer removes related videos (YouTube changed this in 2018) — the overlay and the pause/end covers are what actually keep them out of reach.
- Thumbnails use `maxresdefault.jpg` (1280x720, true 16:9) and fall back to `hqdefault.jpg` on error. `check-videos` reports which videos lack a maxres still — cosmetic only, it never fails the build.
- Backgrounding the app pauses playback and re-reads the player's own state on return, so the overlay can't drift out of sync with what is actually playing.
- If playback silently stalls (clock stops advancing for 10s while the player still claims to be playing) the app shows its own retry screen. It also recovers on its own if the stream resumes.
- All icons are drawn by `scripts/generate-icons.mjs` from one set of design constants (colours and proportions at the top of the file), so tweak those and rerun rather than editing the images:
  - `src/app/favicon.ico` (16/32/48) and `src/app/icon.svg` — browser tab, transparent background
  - `src/app/apple-icon.png` (180) — iOS/iPadOS home screen, opaque because iOS fills transparency with black
  - `public/icons/icon-{192,512}.png` — installed-app icon and Android splash, transparent
  - `public/icons/icon-maskable-{192,512}.png` — Android launcher, full bleed with the badge inside the safe zone
