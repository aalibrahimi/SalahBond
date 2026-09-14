import AsyncStorage from "@react-native-async-storage/async-storage";
import { DayTimes, Location, PrayerWindow, WINDOW_META } from "./types";
import { todayISO } from "./db";

// Aladhan: method=0 is Shia Ithna-Ashari (Leva Institute, Qum);
// midnightMode=1 is the Jafari midnight (midpoint of sunset to fajr).
const METHOD = 0;
const MIDNIGHT_MODE = 1;

function locKey(loc: Location): string {
  return loc.kind === "coords"
    ? `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`
    : `${loc.city},${loc.country}`;
}

function buildUrl(dateISO: string, loc: Location): string {
  const [y, m, d] = dateISO.split("-");
  const ddmmyyyy = `${d}-${m}-${y}`;
  const params = `method=${METHOD}&midnightMode=${MIDNIGHT_MODE}`;
  if (loc.kind === "coords") {
    return `https://api.aladhan.com/v1/timings/${ddmmyyyy}?latitude=${loc.lat}&longitude=${loc.lng}&${params}`;
  }
  return `https://api.aladhan.com/v1/timingsByCity/${ddmmyyyy}?city=${encodeURIComponent(
    loc.city
  )}&country=${encodeURIComponent(loc.country)}&${params}`;
}

/** "05:34 (PDT)" -> Date on the given local day. */
function parseTime(dateISO: string, raw: string): Date {
  const clean = raw.trim().split(" ")[0];
  const [h, min] = clean.split(":").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export async function fetchDayTimes(
  dateISO: string,
  loc: Location
): Promise<DayTimes> {
  const cacheKey = `timings:v2:${dateISO}:${locKey(loc)}`;
  let payload: any | null = null;

  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    payload = JSON.parse(cached);
  } else {
    const res = await fetch(buildUrl(dateISO, loc));
    if (!res.ok) throw new Error(`Prayer times request failed (${res.status})`);
    const json = await res.json();
    if (json.code !== 200) throw new Error("Prayer times unavailable");
    payload = json.data;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  }

  const t: Record<string, string> = payload.timings;

  const fajr = parseTime(dateISO, t.Fajr);
  const sunrise = parseTime(dateISO, t.Sunrise);
  const dhuhr = parseTime(dateISO, t.Dhuhr);
  const maghrib = parseTime(dateISO, t.Maghrib);
  let midnight = parseTime(dateISO, t.Midnight);
  // Islamic midnight falls after 00:00 of the next civil day.
  if (midnight <= maghrib) midnight = new Date(+midnight + 24 * 3600 * 1000);

  const windows: PrayerWindow[] = (
    [
      { key: "fajr" as const, start: fajr, end: sunrise },
      { key: "zuhrayn" as const, start: dhuhr, end: maghrib },
      { key: "maghribayn" as const, start: maghrib, end: midnight },
    ] as const
  ).map((w) => ({ ...WINDOW_META[w.key], key: w.key, start: w.start, end: w.end }));

  const h = payload.date?.hijri;
  const hijri = h ? `${h.day} ${h.month?.en} ${h.year} AH` : "";

  return { dateISO, windows, display: t, hijri };
}

export function fmtClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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

export const DEFAULT_LOCATION: Location = {
  kind: "city",
  city: "San Jose",
  country: "United States",
  label: "San Jose",
};

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayISO(d);
}
