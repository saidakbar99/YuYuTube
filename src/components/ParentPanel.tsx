"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Thumbnail } from "@/components/Thumbnail";
import { config } from "@/config";
import { boardItems } from "@/data/board";
import { videos, type Video } from "@/data/videos";
import { getHidden, getServerHidden, setHidden, subscribeHidden } from "@/lib/hidden";
import { getScreenTime, getServerScreenTime, resetScreenTime, subscribeScreenTime } from "@/lib/screenTime";
import { clearStats, lastDays, SKIP_MS, type VideoStats } from "@/lib/stats";

const PERIODS = [
  { days: 1, label: "Bugun" },
  { days: 7, label: "7 kun" },
  { days: 30, label: "30 kun" },
] as const;

const WEEKDAYS = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

const minutes = (ms: number) => Math.round(ms / 60_000);

function duration(ms: number) {
  const m = minutes(ms);
  if (m < 60) return `${m} daq`;
  return `${Math.floor(m / 60)} soat ${m % 60} daq`;
}

type Row = { video: Video; stats: VideoStats };

function sum(list: readonly VideoStats[]): VideoStats {
  const out = { ms: 0, plays: 0, finished: 0, skips: 0, failed: 0 };
  for (const s of list) {
    out.ms += s.ms;
    out.plays += s.plays;
    out.finished += s.finished;
    out.skips += s.skips;
    out.failed += s.failed;
  }
  return out;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-app-surface p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-app-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function VideoRow({ video, detail, hidden }: { video: Video; detail: string; hidden: boolean }) {
  return (
    <li className={`flex items-center gap-3 ${hidden ? "opacity-50" : ""}`}>
      <Thumbnail id={video.id} className="aspect-video w-24 shrink-0 rounded-xl bg-app-bg object-cover" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{video.title}</div>
        <div className="text-xs text-app-muted">{detail}</div>
      </div>
      <button
        type="button"
        onClick={() => setHidden(video.id, !hidden)}
        className="shrink-0 rounded-full bg-app-text/10 px-3 py-1.5 text-xs font-medium active:scale-95"
      >
        {hidden ? "Qaytarish" : "Yashirish"}
      </button>
    </li>
  );
}

const Empty = () => <p className="text-sm text-app-muted">Hali hech narsa yo&lsquo;q</p>;

/** Daily minutes for the last 7 days; tap a bar to read it. */
function WeekChart({ week }: { week: { date: Date; ms: number }[] }) {
  const [picked, setPicked] = useState(week.length - 1);
  const top = Math.max(...week.map((d) => d.ms), 1);
  const limit = config.screenTimeLimitMinutes;
  const day = week[picked];

  return (
    <div>
      <div className="mb-2 text-sm">
        <span className="text-app-muted">{picked === week.length - 1 ? "Bugun" : WEEKDAYS[day.date.getDay()]}: </span>
        <span className="font-semibold tabular-nums">{duration(day.ms)}</span>
      </div>
      <div className="flex h-32 items-end gap-0.5 border-b border-app-text/15" role="list" aria-label="Kunlik ko'rish">
        {week.map((d, i) => (
          <button
            key={d.date.toDateString()}
            type="button"
            role="listitem"
            aria-label={`${WEEKDAYS[d.date.getDay()]}: ${duration(d.ms)}`}
            onClick={() => setPicked(i)}
            // The whole column is the hit target, not just the bar.
            className="flex h-full flex-1 items-end justify-center px-1.5"
          >
            <span
              className={`w-full max-w-8 rounded-t bg-app-accent transition-opacity ${i === picked ? "" : "opacity-55"}`}
              style={{ height: `${(d.ms / top) * 100}%`, minHeight: d.ms > 0 ? 2 : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 flex gap-0.5">
        {week.map((d, i) => (
          <span
            key={d.date.toDateString()}
            className={`flex-1 text-center text-xs ${i === picked ? "font-semibold" : "text-app-muted"}`}
          >
            {WEEKDAYS[d.date.getDay()]}
          </span>
        ))}
      </div>
      {limit !== null && <p className="mt-2 text-xs text-app-muted">Kunlik chegara: {limit} daq</p>}
    </div>
  );
}

/** For grown-ups: opened by holding the sun on the home screen. Everything here is this phone's only. */
export function ParentPanel({ onClose }: { onClose: () => void }) {
  const [period, setPeriod] = useState<1 | 7 | 30>(7);
  // Read once on opening (and again after clearing): it only changes while he watches.
  const [month, setMonth] = useState(() => lastDays(30));
  const [confirmClear, setConfirmClear] = useState(false);

  const hiddenList = useSyncExternalStore(subscribeHidden, getHidden, getServerHidden);
  const hidden = useMemo(() => new Set(hiddenList), [hiddenList]);
  const usedToday = useSyncExternalStore(subscribeScreenTime, getScreenTime, getServerScreenTime);

  const days = useMemo(() => month.slice(-period), [month, period]);
  const totalMs = days.reduce((n, d) => n + d.stats.ms, 0);

  const rows = useMemo(() => {
    const byId = new Map<string, VideoStats[]>();
    for (const d of days) {
      for (const [id, s] of Object.entries(d.stats.videos)) byId.set(id, [...(byId.get(id) ?? []), s]);
    }
    return videos
      .filter((v) => byId.has(v.id))
      .map((video): Row => ({ video, stats: sum(byId.get(video.id)!) }));
  }, [days]);

  const plays = rows.reduce((n, r) => n + r.stats.plays, 0);
  const top = [...rows].filter((r) => r.stats.ms > 0).sort((a, b) => b.stats.ms - a.stats.ms).slice(0, 5);
  // Opened at least twice and dropped more often than not.
  const skipped = rows
    .filter((r) => r.stats.skips >= 2 && r.stats.skips * 2 >= r.stats.plays)
    .sort((a, b) => b.stats.skips - a.stats.skips);
  const failed = rows.filter((r) => r.stats.failed > 0).sort((a, b) => b.stats.failed - a.stats.failed);

  const taps = new Map<string, number>();
  for (const d of days) for (const [name, n] of Object.entries(d.stats.taps)) taps.set(name, (taps.get(name) ?? 0) + n);
  const tapTotal = [...taps.values()].reduce((a, b) => a + b, 0);
  const favourites = [...taps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const week = month.slice(-7).map((d) => ({ date: d.date, ms: d.stats.ms }));

  return (
    <div className="fixed inset-0 z-65 overflow-y-auto overscroll-contain bg-app-bg text-app-text">
      <header className="sticky top-0 z-10 flex min-h-14 items-center gap-3 bg-app-bg px-4 pt-[env(safe-area-inset-top)]">
        <h1 className="text-xl font-bold">Ota-ona paneli</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Yopish"
          className="ml-auto flex size-11 items-center justify-center rounded-full bg-app-surface text-2xl leading-none shadow-sm active:scale-90"
        >
          ×
        </button>
      </header>

      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <p className="text-sm text-app-muted">Statistika faqat shu telefonda saqlanadi.</p>

        <div className="flex gap-1 rounded-full bg-app-surface p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPeriod(p.days)}
              className={`flex-1 rounded-full py-2 text-sm font-medium ${
                period === p.days ? "bg-app-accent text-white" : "text-app-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Ko'rdi", value: duration(totalMs) },
            { label: "Videolar", value: `${plays} ta` },
            { label: "Rasmlar", value: `${tapTotal} marta` },
          ].map((tile) => (
            <div key={tile.label} className="rounded-3xl bg-app-surface p-3 shadow-sm">
              <div className="text-xs text-app-muted">{tile.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{tile.value}</div>
            </div>
          ))}
        </div>

        <Section title="Bugungi vaqt">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tabular-nums">
              {minutes(usedToday)}
              {config.screenTimeLimitMinutes !== null && ` / ${config.screenTimeLimitMinutes}`} daq
            </span>
            <button
              type="button"
              onClick={resetScreenTime}
              className="ml-auto rounded-full bg-app-text/10 px-3 py-1.5 text-xs font-medium active:scale-95"
            >
              Nolga tushirish
            </button>
          </div>
        </Section>

        <Section title="Kunlik ko'rish" hint="Oxirgi 7 kun">
          <WeekChart week={week} />
        </Section>

        <Section title="Eng ko'p ko'rgani">
          {top.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-col gap-3">
              {top.map(({ video, stats }) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  hidden={hidden.has(video.id)}
                  detail={`${duration(stats.ms)} · ${stats.plays} marta ochdi · ${stats.finished} marta oxirigacha`}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Tez tashlab ketadi" hint={`Ochib, ${SKIP_MS / 1000} soniyaga yetmay boshqasini tanlagan. Yoqmasa, yashiring.`}>
          {skipped.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-col gap-3">
              {skipped.map(({ video, stats }) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  hidden={hidden.has(video.id)}
                  detail={`${stats.plays} marta ochdi, ${stats.skips} marta tashladi`}
                />
              ))}
            </ul>
          )}
        </Section>

        {failed.length > 0 && (
          <Section title="Ochilmadi" hint="O'chirilgan yoki bloklangan bo'lishi mumkin: npm run check-videos bilan tekshiring.">
            <ul className="flex flex-col gap-3">
              {failed.map(({ video, stats }) => (
                <VideoRow key={video.id} video={video} hidden={hidden.has(video.id)} detail={`${stats.failed} marta`} />
              ))}
            </ul>
          </Section>
        )}

        <Section title="Sevimli rasmlari" hint="O'yinda eng ko'p bosgani">
          {favourites.length === 0 ? (
            <Empty />
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {favourites.map(([name, n]) => {
                const item = boardItems.find((b) => b.uz === name);
                return (
                  <li
                    key={name}
                    className="flex flex-col items-center rounded-2xl py-2"
                    style={{ backgroundColor: item?.bg ?? "transparent" }}
                  >
                    <span className="text-3xl leading-none">{item?.emoji ?? "❔"}</span>
                    <span className="mt-1 text-xs font-medium text-[#1d3557] tabular-nums">{n}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Barcha videolar" hint={`Yashirilgani: ${hiddenList.length} ta. Faqat shu telefonda yashiriladi.`}>
          <details>
            <summary className="cursor-pointer text-sm font-medium text-app-accent">Ro&lsquo;yxatni ochish</summary>
            <ul className="mt-3 flex flex-col gap-3">
              {videos.map((video) => (
                <VideoRow
                  key={video.id}
                  video={video}
                  hidden={hidden.has(video.id)}
                  detail={video.calm ? "Tinch (kechqurun ham)" : "Kunduzi"}
                />
              ))}
            </ul>
          </details>
        </Section>

        <div className="flex justify-center pt-2">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearStats();
                  setConfirmClear(false);
                  setMonth(lastDays(30));
                }}
                className="rounded-full bg-[#e5484d] px-4 py-2 text-sm font-medium text-white active:scale-95"
              >
                Ha, tozalash
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-full bg-app-text/10 px-4 py-2 text-sm font-medium active:scale-95"
              >
                Yo&lsquo;q
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="text-sm text-app-muted underline">
              Statistikani tozalash
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
