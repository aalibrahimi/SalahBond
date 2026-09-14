import * as Location from "expo-location";
import { create } from "zustand";
import * as db from "./db";
import { ensureNotificationSetup, scheduleDay } from "./notifications";
import {
  DEFAULT_LOCATION,
  fetchDayTimes,
  tomorrowISO,
} from "./prayer-times";
import {
  DayTimes,
  LogStatus,
  Location as Loc,
  Prayer,
  PrayerWindow,
  WindowKey,
} from "./types";

interface AppState {
  ready: boolean;
  error: string | null;
  usingFallbackLocation: boolean;
  location: Loc | null;
  today: DayTimes | null;
  tomorrow: DayTimes | null;
  logs: Partial<Record<Prayer, LogStatus>>;
  qadha: Record<Prayer, number>;
  /** Set briefly after logging to drive the reward moment. */
  celebrating: WindowKey | "qadha" | null;

  init: () => Promise<void>;
  setCity: (city: string, country: string) => Promise<void>;
  logWindow: (w: PrayerWindow) => void;
  togglePrayer: (p: Prayer, w: PrayerWindow) => void;
  logWindowByKey: (key: WindowKey, date: string) => void;
  payQadha: (p: Prayer) => void;
  adjustQadha: (p: Prayer, delta: number) => void;
  dismissCelebration: () => void;
}

function statusFor(w: PrayerWindow): LogStatus {
  const now = new Date();
  return now >= w.start && now < w.end ? "ontime" : "delayed";
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  usingFallbackLocation: false,
  location: null,
  today: null,
  tomorrow: null,
  logs: {},
  qadha: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  celebrating: null,

  init: async () => {
    try {
      db.initDb();
      db.rolloverMissedDays();

      // Resolve location: saved -> GPS -> fallback city.
      let loc: Loc | null = null;
      let fallback = false;
      const saved = db.getMeta("location");
      if (saved) {
        loc = JSON.parse(saved);
      } else {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          let label = "My location";
          try {
            const places = await Location.reverseGeocodeAsync(pos.coords);
            label = places[0]?.city ?? label;
          } catch {}
          loc = {
            kind: "coords",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label,
          };
          db.setMeta("location", JSON.stringify(loc));
        } else {
          loc = DEFAULT_LOCATION;
          fallback = true;
        }
      }

      if (!loc) loc = DEFAULT_LOCATION;
      const todayISO = db.todayISO();
      const [today, tomorrow] = await Promise.all([
        fetchDayTimes(todayISO, loc),
        fetchDayTimes(tomorrowISO(), loc),
      ]);

      set({
        location: loc,
        usingFallbackLocation: fallback,
        today,
        tomorrow,
        logs: db.getLogsForDate(todayISO),
        qadha: db.getQadhaCounts(),
        ready: true,
        error: null,
      });

      const granted = await ensureNotificationSetup();
      if (granted) await scheduleDay(today);
    } catch (e: any) {
      set({ error: e?.message ?? "Something went wrong", ready: true });
    }
  },

  setCity: async (city, country) => {
    const loc: Loc = { kind: "city", city, country, label: city };
    db.setMeta("location", JSON.stringify(loc));
    set({ location: loc, usingFallbackLocation: false, ready: false });
    const [today, tomorrow] = await Promise.all([
      fetchDayTimes(db.todayISO(), loc),
      fetchDayTimes(tomorrowISO(), loc),
    ]);
    set({ today, tomorrow, ready: true });
    const granted = await ensureNotificationSetup();
    if (granted) await scheduleDay(today);
  },

  logWindow: (w) => {
    const date = db.todayISO();
    const status = statusFor(w);
    for (const p of w.prayers) db.logPrayer(date, p, status);
    set({ logs: db.getLogsForDate(date), celebrating: w.key });
  },

  togglePrayer: (p, w) => {
    const date = db.todayISO();
    const logs = get().logs;
    if (logs[p]) {
      db.unlogPrayer(date, p);
    } else {
      db.logPrayer(date, p, statusFor(w));
    }
    set({ logs: db.getLogsForDate(date) });
  },

  logWindowByKey: (key, date) => {
    const day = get().today;
    if (!day || date !== day.dateISO) return;
    const w = day.windows.find((x) => x.key === key);
    if (w) get().logWindow(w);
  },

  payQadha: (p) => {
    if (db.payQadha(p)) {
      set({ qadha: db.getQadhaCounts(), celebrating: "qadha" });
    }
  },

  adjustQadha: (p, delta) => {
    db.adjustQadha(p, delta);
    set({ qadha: db.getQadhaCounts() });
  },

  dismissCelebration: () => set({ celebrating: null }),
}));
