/**
 * Pure time formatting and window-state logic — no React Native, no storage,
 * no network — so `bun test` can exercise it directly.
 */
import { DayTimes, PrayerWindow } from "./types";

/** "05:34 (PDT)" -> Date on the given local day. */
export function parseTime(dateISO: string, raw: string): Date {
  const clean = raw.trim().split(" ")[0];
  const [h, min] = clean.split(":").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

/** 5:34 AM — always 12-hour, always the device's local time. */
export function fmtClock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "05:34 (PDT)" from the API → "5:34 AM" on the given local day. */
export function fmtApiTime(dateISO: string, raw: string | undefined): string {
  if (!raw) return "—";
  return fmtClock(parseTime(dateISO, raw));
}

/**
 * Humanized remaining time — reads like a person, not a stopwatch:
 * "2h 14m", "48 min", "under a minute", "now".
 */
export function fmtRelative(ms: number): string {
  if (ms <= 0) return "now";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 1) return "under a minute";
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

/** Legacy stopwatch format — kept for anything that still wants digits. */
export function fmtCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface NowState {
  /** The window currently open, if any. */
  open: PrayerWindow | null;
  /** The next window that has not started yet (today). */
  next: PrayerWindow | null;
  /** True when all of today's windows have closed. */
  dayOver: boolean;
}

export function windowStateAt(now: Date, day: DayTimes): NowState {
  let open: PrayerWindow | null = null;
  let next: PrayerWindow | null = null;
  for (const w of day.windows) {
    if (now >= w.start && now < w.end && !(open && open.key === "maghribayn")) {
      // zuhrayn and maghribayn share the Maghrib boundary; prefer the later window.
      open = w;
    }
    if (now < w.start && !next) next = w;
  }
  // Maghrib boundary: at exactly Maghrib, zuhrayn has closed and maghribayn is open.
  const maghribayn = day.windows.find((w) => w.key === "maghribayn")!;
  if (now >= maghribayn.start && now < maghribayn.end) open = maghribayn;
  const dayOver = !open && !next;
  return { open, next, dayOver };
}
