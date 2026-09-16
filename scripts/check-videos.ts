import { videos } from "../src/data/videos";
import { maxResThumbnail } from "../src/lib/thumbnails";

type Result = { id: string; title: string; ok: boolean; detail: string; maxres: boolean };

const REASONS: Record<number, string> = {
  401: "embedding disabled by the uploader",
  403: "forbidden",
  404: "not found (removed, private, or bad ID)",
};

async function hasMaxRes(id: string): Promise<boolean> {
  try {
    const res = await fetch(maxResThumbnail(id));
    await res.body?.cancel();
    return res.ok;
  } catch {
    return false;
  }
}

async function check(id: string, title: string): Promise<Result> {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as { title?: string };
      return { id, title, ok: true, detail: data.title ?? "", maxres: await hasMaxRes(id) };
    }
    return {
      id,
      title,
      ok: false,
      detail: `HTTP ${res.status} — ${REASONS[res.status] ?? "unavailable"}`,
      maxres: false,
    };
  } catch (err) {
    return { id, title, ok: false, detail: `request failed — ${(err as Error).message}`, maxres: false };
  }
}

async function main() {
  const seen = new Set<string>();
  const dupes = videos.filter((v) => (seen.has(v.id) ? true : (seen.add(v.id), false)));

  const results = await Promise.all(videos.map((v) => check(v.id, v.title)));
  const bad = results.filter((r) => !r.ok);

  for (const r of results) {
    const note = r.ok && !r.maxres ? "  (low-res thumbnail only)" : "";
    console.log(`${r.ok ? "OK  " : "FAIL"}  ${r.id}  ${r.title}${note}${r.ok ? "" : `\n        ${r.detail}`}`);
  }

  const lowRes = results.filter((r) => r.ok && !r.maxres);
  console.log(`\n${results.length - bad.length}/${results.length} playable.`);
  if (lowRes.length) console.log(`${lowRes.length} fall back to the 480x360 thumbnail (cosmetic only).`);
  if (dupes.length) console.log(`Duplicate IDs: ${dupes.map((d) => d.id).join(", ")}`);
  if (bad.length) {
    console.log(`Remove or replace: ${bad.map((b) => b.id).join(", ")}`);
    process.exitCode = 1;
  }
}

main();
