import { getAudio } from "@/lib/audio";

/**
 * One sung "yu": a buzzy child-pitched voice shaped by two vocal-tract resonances.
 * The upper one sliding from ~2300Hz down to ~850Hz is what turns "ee" into "oo", i.e. "y-u".
 */
function yu(ctx: AudioContext, out: AudioNode, at: number, pitchFrom: number, pitchTo: number) {
  const length = 0.3;

  const voice = ctx.createOscillator();
  voice.type = "sawtooth";
  voice.frequency.setValueAtTime(pitchFrom, at);
  voice.frequency.linearRampToValueAtTime(pitchTo, at + length);
  // A little wobble keeps it sounding sung rather than electronic.
  const wobble = ctx.createOscillator();
  const wobbleDepth = ctx.createGain();
  wobble.frequency.value = 6;
  wobbleDepth.gain.value = pitchFrom * 0.02;
  wobble.connect(wobbleDepth).connect(voice.frequency);

  const low = ctx.createBiquadFilter();
  low.type = "bandpass";
  low.frequency.value = 330;
  low.Q.value = 5;

  const high = ctx.createBiquadFilter();
  high.type = "bandpass";
  high.Q.value = 7;
  high.frequency.setValueAtTime(2300, at);
  high.frequency.exponentialRampToValueAtTime(850, at + 0.15);

  const highLevel = ctx.createGain();
  highLevel.gain.value = 0.7;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(1, at + 0.03);
  envelope.gain.setValueAtTime(1, at + length - 0.1);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);

  voice.connect(low).connect(envelope);
  voice.connect(high).connect(highLevel).connect(envelope);
  envelope.connect(out);

  voice.start(at);
  wobble.start(at);
  voice.stop(at + length + 0.05);
  wobble.stop(at + length + 0.05);
}

function sing(ctx: AudioContext) {
  // Narrow resonances pass little energy: lift the level, and let a compressor catch the peaks.
  const level = ctx.createGain();
  level.gain.value = 3;
  const limiter = ctx.createDynamicsCompressor();
  level.connect(limiter).connect(ctx.destination);

  const at = ctx.currentTime + 0.05;
  yu(ctx, level, at, 380, 420);
  yu(ctx, level, at + 0.38, 480, 560); // the second "yu" goes up, like a happy call
}

/**
 * Plays the "Yu-Yu!" greeting once per launch. Installed Android apps may play sound straight
 * away; iOS (and Android before install) only after a touch, so then it waits for the first one.
 */
let started = false;

export function playLaunchJingle() {
  if (started) return;
  started = true;
  const ctx = getAudio();
  if (!ctx) return;

  if (ctx.state === "running") {
    sing(ctx);
    return;
  }

  let done = false;
  const onTouch = () => {
    window.removeEventListener("pointerdown", onTouch, true);
    if (done) return;
    done = true;
    const audio = getAudio();
    if (audio) void audio.resume().then(() => sing(audio), () => undefined);
  };
  window.addEventListener("pointerdown", onTouch, true);

  // resume() is async: if audio turns out to be allowed after all, sing now and stop waiting.
  void ctx
    .resume()
    .then(() => {
      if (done || ctx.state !== "running") return;
      done = true;
      window.removeEventListener("pointerdown", onTouch, true);
      sing(ctx);
    })
    .catch(() => undefined);
}
