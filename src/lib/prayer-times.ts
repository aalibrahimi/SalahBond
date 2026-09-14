import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDaysISO, todayISO, tomorrowISO } from "./dates";
import { parseTime } from "./time-logic";
import { DayTimes, Location, PrayerWindow, WINDOW_META } from "./types";

// Formatting and window-state logic live in time-logic.ts (pure, unit-tested);
// re-exported here so screens keep one import site.
export {
  fmtApiTime,
  fmtClock,
  fmtCountdown,
  fmtRelative,
  windowStateAt,
} from "./time-logic";
export type { NowState } from "./time-logic";
export { tomorrowISO };

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

/**
 * Warm the AsyncStorage cache for the next `days` days so a weekend offline
 * doesn't blank the app. Best-effort: stops quietly on the first failure.
 */
export async function prefetchDays(loc: Location, days = 7): Promise<void> {
  const start = todayISO();
  for (let i = 0; i < days; i++) {
    try {
      await fetchDayTimes(addDaysISO(start, i), loc);
    } catch {
      return;
    }
  }
}

export const DEFAULT_LOCATION: Location = {
  kind: "city",
  city: "San Jose",
  country: "United States",
  label: "San Jose",
};
