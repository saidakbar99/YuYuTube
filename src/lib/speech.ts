import type { BoardItem } from "@/data/board";
import { getAudio } from "@/lib/audio";

const isLang = (voice: SpeechSynthesisVoice, code: string) => voice.lang.toLowerCase().startsWith(code);
// Pause between the recording ending and the name being said.
const NAME_GAP_MS = 150;

const synth = () => (typeof window !== "undefined" ? window.speechSynthesis : undefined);

/** Voices load late on Chrome; asking early at least starts that. */
export function warmUpVoices() {
  try {
    synth()?.getVoices();
  } catch {
    // no speech on this device
  }
}

/** Says the tile's name: an Uzbek voice if the phone has one, else the Turkish voice with Turkish spelling. */
function sayName(item: BoardItem) {
  const speech = synth();
  if (!speech) return;
  try {
    const voices = speech.getVoices();
    const uzbek = voices.find((v) => isLang(v, "uz"));
    const turkish = voices.find((v) => isLang(v, "tr"));
    const utterance = new SpeechSynthesisUtterance(uzbek ? item.uz : item.tr);
    const voice = uzbek ?? turkish;
    // Even with the voice list not loaded yet, the language tag alone picks Turkish on most phones.
    utterance.lang = voice?.lang ?? "tr-TR";
    if (voice) utterance.voice = voice;
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    speech.speak(utterance);
  } catch {
    // speech unavailable — the recording or chime already played
  }
}

// iOS only lets speech start from inside a tap the first time; an empty utterance there unlocks it
// for the name said a moment later, after the recording.
let speechPrimed = false;
function primeSpeech() {
  if (speechPrimed) return;
  speechPrimed = true;
  try {
    synth()?.speak(new SpeechSynthesisUtterance(""));
  } catch {
    // no speech
  }
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();

function loadSound(name: string): Promise<AudioBuffer | null> {
  let pending = buffers.get(name);
  if (!pending) {
    pending = (async () => {
      const audio = getAudio();
      if (!audio) return null;
      try {
        const response = await fetch(`/sounds/${name}.mp3`);
        return await audio.decodeAudioData(await response.arrayBuffer());
      } catch {
        buffers.delete(name); // try again next time, e.g. once back online
        return null;
      }
    })();
    buffers.set(name, pending);
  }
  return pending;
}

/** Fetches and decodes the board's recordings ahead of the first tap. */
export function preloadSounds(items: readonly BoardItem[]) {
  for (const item of items) if (item.sound) void loadSound(item.sound);
}

export type Phrase = "bismillah" | "alhamdulillah";

export function preloadPhrases() {
  void loadSound("bismillah");
  void loadSound("alhamdulillah");
}

/** Plays a spoken phrase from `public/sounds`; resolves with its length in seconds (0 if it couldn't play). */
export async function playPhrase(name: Phrase): Promise<number> {
  const buffer = await loadSound(name);
  const audio = getAudio();
  if (!buffer || !audio) return 0;
  try {
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start();
    return buffer.duration;
  } catch {
    return 0;
  }
}

let playing: AudioBufferSourceNode | null = null;
let nameTimer: number | undefined;

/** Everything a tap should say: the real sound (or a chime), then the name. A new tap cuts the last one off. */
export function playTile(item: BoardItem) {
  primeSpeech();
  window.clearTimeout(nameTimer);
  try {
    playing?.stop();
  } catch {
    // already finished
  }
  playing = null;
  try {
    synth()?.cancel();
  } catch {
    // no speech
  }

  if (!item.sound) {
    pop();
    sayName(item);
    return;
  }

  void loadSound(item.sound).then((buffer) => {
    const audio = getAudio();
    if (!buffer || !audio) {
      pop();
      sayName(item);
      return;
    }
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start();
    playing = source;
    nameTimer = window.setTimeout(() => sayName(item), buffer.duration * 1000 + NAME_GAP_MS);
  });
}

/** A short rising "pop" for tiles without a recording (and whenever one fails to load). */
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
