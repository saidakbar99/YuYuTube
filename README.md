# YuYuTube

A private, static, kid-safe video player. YouTube embeds only, no YouTube UI.

## Adding a video

One line in `src/data/videos.ts`, then push:

```ts
{ id: "XqZsoesa55w", title: "Baby Shark Dance" },
```

To skip a channel intro or a "subscribe!" outro, give the part to play (`"m:ss"` or seconds):

```ts
{ id: "XqZsoesa55w", title: "Baby Shark Dance", start: "0:08", end: "2:15" },
```

Check the whole library is still playable and embeddable:

```
npm run check-videos
```

Exits non-zero and names the offending IDs if any are removed, private, or embedding-disabled, or have a mistyped `start`/`end`.

## Config

`src/config.ts`:

| key | default | meaning |
| --- | --- | --- |
| `autoplayNext` | `true` | roll straight into the next video, else show a "watch again / pick another" card |
| `recentWindow` | `5` | how many recently-watched IDs get pushed to the end of the feed |
| `maxVolume` | `60` | 0–100 cap on the player's volume. iOS ignores it (Safari blocks programmatic volume) — on iPhone use Settings → Sounds & Haptics → Headphone Safety → Reduce Loud Audio |
| `screenTimeLimitMinutes` | `60` | `null` is off. Playback time accumulates per day (resets at midnight). When it runs out, the current video finishes and a 👋 rest screen follows; unlock (another full period) by pressing and holding the bottom-right corner button for 3s |
| `graceMinutes` | `10` | how long a video may keep going after time is up or bedtime starts, before it is stopped anyway (long compilations) |
| `bedtime` | `20:00`–`07:00` | `null` is off. During it only videos marked `calm: true` in `videos.ts` are shown; if none are marked, a 🌙 screen follows the current video. The corner hold unlocks the full library for the rest of that night |
| `eveningFrom` | `18:00` | `null` is off. From then the whole screen, videos included, takes a warm tint (less blue light), fading in over a minute; stronger during `bedtime` |
| `boardEvery` | `3` | `null` is off. After this many videos, a tap-and-hear break comes before the next one: big pictures that bounce, play a real recording (animals and vehicles, `public/sounds/`, credits in `public/sounds/CREDITS.md`) or a chime, then say their name in Uzbek with the phone's voice if it has one. In fullscreen the break shows inside the player, so fullscreen stays on. Tiles live in `src/data/board.ts` |
| `boardSeconds` | `30` | how long the break lasts; then the next video plays by itself. The break does not count as screen time |
| `favoritesOnTop` | `4` | how many favorites lead the home screen. A video earns points when he picks it himself (1 point) and for time actually watched (0.3 per minute, up to 10 minutes per sitting, autoplayed videos included). Points halve every week, so it follows what he likes now; about 3 points makes a favorite |

Mark a bedtime video with `calm: true`:

```ts
{ id: "4cXrmtd01Fc", title: "Going to Sleep", calm: true },
```

Tapping the playing video gives a short vibration along with the emoji (Android only; iOS has no web vibration API).

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
- Built for a toddler: a tap on the video pauses or resumes it and shows the controls for 3s (hidden controls can't be tapped). Every touch anywhere in the app pops a sparkle emoji; taps on the video also buzz (Android). Swipe up/down toggles fullscreen; swiping sideways does nothing.
- The first video after opening the app is preceded by a spoken "Bismillah", and the 👋/🌙 rest screen by "Alhamdulillah" (recordings in `public/sounds/`, credits in `CREDITS.md` there).
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
