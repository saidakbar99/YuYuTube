import type { BoardItem } from "@/data/board";
import { getAudio } from "@/lib/audio";

const isLang = (voice: SpeechSynthesisVoice, code: string) => voice.lang.toLowerCase().startsWith(code);

/** Voices load late on Chrome; asking early at least starts that. */
export function warmUpVoices() {
  try {
    window.speechSynthesis?.getVoices();
  } catch {
    // no speech on this device
  }
}

/** Says the tile's word: an Uzbek voice if the phone has one, else the Turkish voice with Turkish spelling. */
export function sayItem(item: BoardItem) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return;
  try {
    const voices = synth.getVoices();
    const uzbek = voices.find((v) => isLang(v, "uz"));
    const turkish = voices.find((v) => isLang(v, "tr"));
    const utterance = new SpeechSynthesisUtterance(uzbek ? item.uz : item.tr);
    const voice = uzbek ?? turkish;
    // Even with the voice list not loaded yet, the language tag alone picks Turkish on most phones.
    utterance.lang = voice?.lang ?? "tr-TR";
    if (voice) utterance.voice = voice;
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    // A new tap cuts off the previous word, so every tap answers straight away.
    synth.cancel();
    synth.speak(utterance);
  } catch {
    // speech unavailable — the tile still bounces and pops
  }
}

/** A short rising "pop", so a tap always makes a sound even where speech is missing. */
export function pop() {
  const audio = getAudio();
  if (!audio) return;
  try {
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // no Web Audio — silent pop
  }
}
