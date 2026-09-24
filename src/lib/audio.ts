let context: AudioContext | null = null;

/** One shared Web Audio context for the app's own little sounds (never the YouTube player). */
export function getAudio(): AudioContext | null {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => undefined);
    return context;
  } catch {
    return null; // no Web Audio here
  }
}
