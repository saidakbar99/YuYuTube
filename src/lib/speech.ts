import type { BoardItem } from "@/data/board";
import { getAudio } from "@/lib/audio";

const isLang = (voice: SpeechSynthesisVoice, code: string) => voice.lang.toLowerCase().startsWith(code);
// Pause between the recording ending and the name being said.
const NAME_GAP_MS = 150;
// A tile counts as still talking for at most this long, in case an end event never comes.
const MAX_TILE_MS = 10_000;

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
function speakName(item: BoardItem, onEnd: () => void) {
  const speech = synth();
  if (!speech) {
    onEnd();
    return;
  }
  try {
    const voices = speech.getVoices();
    const uzbek = voices.find((v) => isLang(v, "uz"));
    const turkish = voices.find((v) => isLang(v, "tr"));
    const utterance = new SpeechSynthesisUtterance(item.uz);
    const voice = uzbek ?? turkish;
    // Even with the voice list not loaded yet, the language tag alone picks Turkish on most phones.
    utterance.lang = voice?.lang ?? "tr-TR";
    if (voice) utterance.voice = voice;
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    speech.speak(utterance);
  } catch {
    // speech unavailable — the recording or chime already played
    onEnd();
  }
}

// iOS only lets speech start from inside a tap the first time; an empty utterance there unlocks it
// for the name said a moment later, after the recording. Call it from a click, not a touch-down.
let speechPrimed = false;
export function primeSpeech() {
  if (speechPrimed) return;
  speechPrimed = true;
  try {
    synth()?.speak(new SpeechSynthesisUtterance(""));
  } catch {
    // no speech
  }
}

// The board's recordings are quiet phone recordings, each at its own level. They are scaled to
// full scale on load, then pushed louder still through a limiter that keeps the peaks from clipping.
const BOARD_PEAK = 0.98;
const BOARD_BOOST = 2.5;

/** Scales the samples so the loudest one sits at `BOARD_PEAK`. */
function normalize(buffer: AudioBuffer): AudioBuffer {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    for (const sample of buffer.getChannelData(c)) peak = Math.max(peak, Math.abs(sample));
  }
  if (peak === 0) return buffer;
  const gain = BOARD_PEAK / peak;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) data[i] *= gain;
  }
  return buffer;
}

let boardOut: AudioNode | null = null;

/** Where the board's sounds go: boosted, then limited, then the speakers. */
function boardOutput(audio: AudioContext): AudioNode {
  if (boardOut?.context === audio) return boardOut;
  const boost = audio.createGain();
  boost.gain.value = BOARD_BOOST;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 3;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  boost.connect(limiter).connect(audio.destination);
  boardOut = boost;
  return boost;
}

const buffers = new Map<string, Promise<AudioBuffer | null>>();

/** `board`: one of the board's recordings, brought up to full level once decoded. */
function loadSound(name: string, board = false): Promise<AudioBuffer | null> {
  let pending = buffers.get(name);
  if (!pending) {
    pending = (async () => {
      const audio = getAudio();
      if (!audio) return null;
      try {
        const response = await fetch(`/sounds/${name}.mp3`);
        const buffer = await audio.decodeAudioData(await response.arrayBuffer());
        return board ? normalize(buffer) : buffer;
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
  for (const item of items) {
    if (item.sound) void loadSound(item.sound, true);
    if (item.voice) void loadSound(`voice/${item.voice}`, true);
  }
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
let taps = 0;
// The tile whose sound or name is still going.
let talking: BoardItem | null = null;
let talkingTimer: number | undefined;

/** Marks tap number `tap` as over, unless a newer tap has taken over since. */
function finished(tap: number) {
  if (taps !== tap) return;
  talking = null;
  window.clearTimeout(talkingTimer);
}

function playBuffer(audio: AudioContext, buffer: AudioBuffer, onEnd?: () => void) {
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(boardOutput(audio));
  if (onEnd) source.onended = onEnd;
  source.start();
  playing = source;
}

/** The family's own recording of the name when the tile has one, else the phone's voice. */
function sayName(item: BoardItem, tap: number) {
  const done = () => finished(tap);
  if (!item.voice) {
    speakName(item, done);
    return;
  }
  void loadSound(`voice/${item.voice}`, true).then((buffer) => {
    if (taps !== tap) return; // a newer tap took over while this loaded
    const audio = getAudio();
    if (buffer && audio) playBuffer(audio, buffer, done);
    else speakName(item, done);
  });
}

/** Unlocked audio may start on a touch-down; until then only a click can start it. */
export function audioRunning(): boolean {
  return getAudio()?.state === "running";
}

/**
 * Everything a tap should say: the real sound (or a chime), then the name. Tapping the same tile
 * again while it is still talking lets it finish; another tile cuts it off.
 */
export function playTile(item: BoardItem) {
  if (talking === item) return;
  taps += 1;
  const tap = taps;
  talking = item;
  window.clearTimeout(talkingTimer);
  talkingTimer = window.setTimeout(() => finished(tap), MAX_TILE_MS);
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
    // An own recording already makes the noise itself, so only the phone's voice gets the pop.
    if (!item.voice) pop();
    sayName(item, tap);
    return;
  }

  void loadSound(item.sound, true).then((buffer) => {
    if (taps !== tap) return; // a newer tap took over while this loaded
    const audio = getAudio();
    if (!buffer || !audio) {
      pop();
      sayName(item, tap);
      return;
    }
    playBuffer(audio, buffer);
    nameTimer = window.setTimeout(() => sayName(item, tap), buffer.duration * 1000 + NAME_GAP_MS);
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
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain).connect(boardOutput(audio));
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // no Web Audio — silent pop
  }
}
