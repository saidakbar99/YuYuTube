/**
 * Tap-and-hear board tiles. `uz` is read by an Uzbek voice. Phones rarely have one, so
 * `tr` is the same words spelled for the Turkish voice that reads them instead.
 */
export type BoardItem = { emoji: string; uz: string; tr: string; bg: string };

export const boardItems: BoardItem[] = [
  { emoji: "🐱", uz: "Mushuk. Miyov!", tr: "Muşuk. Miyav!", bg: "#fde68a" },
  { emoji: "🐄", uz: "Sigir. Mo'o'!", tr: "Sigir. Möööö!", bg: "#bbf7d0" },
  { emoji: "🐑", uz: "Qo'y. Ba-a-a!", tr: "Koy. Meeee!", bg: "#e9d5ff" },
  { emoji: "🐔", uz: "Tovuq. Qo-qo-qo!", tr: "Tovuk. Gıt gıt gıdak!", bg: "#fed7aa" },
  { emoji: "🦆", uz: "O'rdak. G'aq-g'aq!", tr: "Ördak. Vak vak!", bg: "#bae6fd" },
  { emoji: "🐴", uz: "Ot. I-go-go!", tr: "Ot. İhahaha!", bg: "#fecaca" },
  { emoji: "🐘", uz: "Fil", tr: "Fil", bg: "#e5e7eb" },
  { emoji: "🦁", uz: "Sher. Arrr!", tr: "Şer. Grrr!", bg: "#fde68a" },
  { emoji: "🐟", uz: "Baliq", tr: "Balık", bg: "#a5f3fc" },
  { emoji: "🐦", uz: "Qush. Chik-chik!", tr: "Kuş. Cik cik!", bg: "#d9f99d" },
  { emoji: "🐰", uz: "Quyon", tr: "Kuyon", bg: "#fbcfe8" },
  { emoji: "🐪", uz: "Tuya", tr: "Tuya", bg: "#fef3c7" },
  { emoji: "🐝", uz: "Ari. Vizz!", tr: "Arı. Vızzz!", bg: "#fef08a" },
  { emoji: "🐸", uz: "Qurbaqa. Vaq-vaq!", tr: "Kurbaka. Vrak vrak!", bg: "#bbf7d0" },
  { emoji: "🍎", uz: "Olma", tr: "Olma", bg: "#fecaca" },
  { emoji: "🍌", uz: "Banan", tr: "Banan", bg: "#fef08a" },
  { emoji: "🚗", uz: "Mashina. Bip-bip!", tr: "Maşina. Bip bip!", bg: "#bfdbfe" },
  { emoji: "✈️", uz: "Samolyot", tr: "Samolyot", bg: "#c7d2fe" },
  { emoji: "🚌", uz: "Avtobus", tr: "Avtobus", bg: "#fed7aa" },
  { emoji: "☀️", uz: "Quyosh", tr: "Kuyoş", bg: "#fef08a" },
  { emoji: "🌙", uz: "Oy", tr: "Oy", bg: "#c7d2fe" },
  { emoji: "⭐", uz: "Yulduz", tr: "Yulduz", bg: "#fde68a" },
];
