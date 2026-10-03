/**
 * Tap-and-hear board tiles.
 * - `sound`: a real recording in `public/sounds/<sound>.mp3` (credits in `public/sounds/CREDITS.md`).
 * - `uz`: the name, read by an Uzbek voice (or the Turkish one, which most phones have instead).
 * - `voice`: optional own recording of the name in `public/sounds/voice/<voice>.mp3`; used instead
 *   of the phone's voice (which then only steps in if the file is missing).
 * Tiles with a recording play it first and then say their name; the rest chime and say it.
 */
export type BoardItem = { emoji: string; uz: string; bg: string; sound?: string; voice?: string };

export const boardItems: BoardItem[] = [
  { emoji: "🐱", uz: "Mushuk", bg: "#fde68a", voice: "mushuk" },
  { emoji: "🐄", uz: "Sigir", bg: "#bbf7d0", voice: "sigir" },
  { emoji: "🐑", uz: "Qo'y", bg: "#e9d5ff", voice: "qoy" },
  { emoji: "🦆", uz: "O'rdak", bg: "#bae6fd", voice: "ordak" },
  { emoji: "🐴", uz: "Ot", bg: "#fecaca", voice: "ot" },
  { emoji: "🦁", uz: "Sher", bg: "#fde68a", voice: "sher" },
  { emoji: "🐦", uz: "Qush", bg: "#d9f99d", voice: "qush" },
  { emoji: "🐝", uz: "Ari", bg: "#fef08a", voice: "ari" },
  { emoji: "🐸", uz: "Qurbaqa", bg: "#bbf7d0", voice: "qurbaqa" },
  { emoji: "🚗", uz: "Mashina", bg: "#bfdbfe", voice: "moshina" },
  { emoji: "🐟", uz: "Baliq", bg: "#a5f3fc", voice: "baliq" },
  { emoji: "🐪", uz: "Tuya", bg: "#fef3c7", voice: "tuya" },
  { emoji: "🍎", uz: "Olma", bg: "#fecaca", voice: "olma" },
  { emoji: "🍌", uz: "Banan", bg: "#fef08a", voice: "banan" },
  { emoji: "☀️", uz: "Quyosh", bg: "#fef08a", voice: "quyosh" },
  { emoji: "🌙", uz: "Oy", bg: "#c7d2fe", voice: "oy" },
  { emoji: "👨", uz: "Ada", bg: "#f0f0f0", voice: "ada" },
];
