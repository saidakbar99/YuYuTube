export const config = {
  autoplayNext: true,
  recentWindow: 5,
  screenTimeLimitMinutes: 60 as number | null,
  /** When time is up or bedtime starts, the current video may finish, but for no longer than this. */
  graceMinutes: 10,
  /** Local "HH:MM" times, `null` is off. During it only `calm: true` videos show; with none, the 🌙 screen. */
  bedtime: { start: "20:00", end: "07:00" } as { start: string; end: string } | null,
  /** How many of his most-picked videos lead the home screen. */
  favoritesOnTop: 4,
  /** 0–100, applied to the YouTube player. iOS ignores it; use the device's own limits there. */
  maxVolume: 60,
};
