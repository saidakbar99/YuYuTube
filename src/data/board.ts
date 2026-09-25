/**
 * Tap-and-hear board tiles.
 * - `sound`: a real recording in `public/sounds/<sound>.mp3` (credits in `public/sounds/CREDITS.md`).
 * - `uz`: the name, read by an Uzbek voice. Phones rarely have one, so `tr` is the same words
 *   spelled for the Turkish voice that reads them instead.
 * Tiles with a recording play it first and then say their name; the rest chime and say it.
 */
export type BoardItem = { emoji: string; uz: string; tr: string; bg: string; sound?: string };

export const boardItems: BoardItem[] = [
  { emoji: "🐱", uz: "Mushuk", tr: "Muşuk", bg: "#fde68a", sound: "cat" },
  { emoji: "🐄", uz: "Sigir", tr: "Sigir", bg: "#bbf7d0", sound: "cow" },
  { emoji: "🐑", uz: "Qo'y", tr: "Koy", bg: "#e9d5ff", sound: "sheep" },
  { emoji: "🐔", uz: "Tovuq", tr: "Tovuk", bg: "#fed7aa", sound: "chicken" },
  { emoji: "🦆", uz: "O'rdak", tr: "Ördak", bg: "#bae6fd", sound: "duck" },
  { emoji: "🐴", uz: "Ot", tr: "Ot", bg: "#fecaca", sound: "horse" },
  { emoji: "🐘", uz: "Fil", tr: "Fil", bg: "#e5e7eb", sound: "elephant" },
  { emoji: "🦁", uz: "Sher", tr: "Şer", bg: "#fde68a", sound: "lion" },
  { emoji: "🐦", uz: "Qush", tr: "Kuş", bg: "#d9f99d", sound: "bird" },
  { emoji: "🐝", uz: "Ari", tr: "Arı", bg: "#fef08a", sound: "bee" },
  { emoji: "🐸", uz: "Qurbaqa", tr: "Kurbaka", bg: "#bbf7d0", sound: "frog" },
  { emoji: "🚗", uz: "Mashina", tr: "Maşina", bg: "#bfdbfe", sound: "car" },
  { emoji: "🚌", uz: "Avtobus", tr: "Avtobus", bg: "#fed7aa", sound: "bus" },
  { emoji: "✈️", uz: "Samolyot", tr: "Samolyot", bg: "#c7d2fe", sound: "plane" },
  { emoji: "🐟", uz: "Baliq", tr: "Balık", bg: "#a5f3fc" },
  { emoji: "🐰", uz: "Quyon", tr: "Kuyon", bg: "#fbcfe8" },
  { emoji: "🐪", uz: "Tuya", tr: "Tuya", bg: "#fef3c7" },
  { emoji: "🍎", uz: "Olma", tr: "Olma", bg: "#fecaca" },
  { emoji: "🍌", uz: "Banan", tr: "Banan", bg: "#fef08a" },
  { emoji: "☀️", uz: "Quyosh", tr: "Kuyoş", bg: "#fef08a" },
  { emoji: "🌙", uz: "Oy", tr: "Oy", bg: "#c7d2fe" },
  { emoji: "⭐", uz: "Yulduz", tr: "Yulduz", bg: "#fde68a" },
];
