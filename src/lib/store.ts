import * as Location from "expo-location";
import { create } from "zustand";
import { useBuddies } from "./buddies";
import * as db from "./db";
import { ensureNotificationSetup, scheduleDay } from "./notifications";
import {
  DEFAULT_LOCATION,
  fetchDayTimes,
  tomorrowISO,
} from "./prayer-times";
import { totalMissed } from "./rollover";
import {
  DayTimes,
  LogStatus,
  Location as Loc,
  Prayer,
  PrayerWindow,
  WindowKey,
} from "./types";

/** A gap of this many unprocessed days switches on the welcome-back flow. */
const DRIFT_DAYS = 7;

export interface DriftState {
  daysAway: number;
  missedCount: number;
}

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
  /**
   * Set when the user comes back after a long gap; rollover is held until
   * they choose to bank the missed days or start fresh.
   */
  drift: DriftState | null;
  /** A "Prayed ✓" tap that arrived before init finished. */
  queuedLog: { key: WindowKey; date: string } | null;

  init: () => Promise<void>;
  resolveDrift: (countQadha: boolean) => void;
  setCity: (city: string, country: string) => Promise<void>;
  logWindow: (w: PrayerWindow) => void;
  togglePrayer: (p: Prayer, w: PrayerWindow) => void;
  logWindowByKey: (key: WindowKey, date: string) => void;
  payQadha: (p: Prayer) => void;
  adjustQadha: (p: Prayer, delta: number) => void;
  dismissCelebration: () => void;
}

/** Count of today's prayers that are logged (qadha entries never count). */
function prayedCount(logs: Partial<Record<Prayer, LogStatus>>): number {
  return Object.values(logs).filter((s) => s && s !== "qadha").length;
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
  drift: null,
  queuedLog: null,

  init: async () => {
    try {
      db.initDb();

      // A short gap rolls straight into the qadha bank. A long one means the
      // user drifted — hold the rollover and let them choose a fresh start.
      const pending = db.getPendingRollover();
      let drift: DriftState | null = null;
      if (pending.length >= DRIFT_DAYS) {
        drift = { daysAway: pending.length, missedCount: totalMissed(pending) };
      } else {
        db.applyRollover(pending, true);
      }

      // Resolve location: saved -> GPS -> fallback city.
      let loc: Loc | null = null;
      let fallback = false;
      const saved = db.getMeta("location");
      if (saved) {
        loc = JSON.parse(saved);
      } else {
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (!perm.granted) throw new Error("location permission denied");
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
        } catch {
          // No GPS fix or permission — fall back to the default city;
          // the user can set theirs in More.
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
        drift,
        ready: true,
        error: null,
      });

      // A "Prayed ✓" tap from a cold start queued itself; apply it now.
      const queued = get().queuedLog;
      if (queued) {
        set({ queuedLog: null });
        get().logWindowByKey(queued.key, queued.date);
      }

      const granted = await ensureNotificationSetup();
      if (granted) await scheduleDay(today);
    } catch (e: any) {
      set({ error: e?.message ?? "Something went wrong", ready: true });
    }
  },

  resolveDrift: (countQadha) => {
    db.applyRollover(db.getPendingRollover(), countQadha);
    set({ drift: null, qadha: db.getQadhaCounts() });
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
    const logs = db.getLogsForDate(date);
    set({ logs, celebrating: w.key });
    useBuddies.getState().syncToday(prayedCount(logs));
  },

  togglePrayer: (p, w) => {
    const date = db.todayISO();
    const logs = get().logs;
    if (logs[p]) {
      db.unlogPrayer(date, p);
    } else {
      db.logPrayer(date, p, statusFor(w));
    }
    const next = db.getLogsForDate(date);
    set({ logs: next });
    useBuddies.getState().syncToday(prayedCount(next));
  },

  logWindowByKey: (key, date) => {
    if (!get().ready) {
      // Cold start from a notification action: today's times aren't loaded
      // yet, so park the tap and let init() replay it.
      set({ queuedLog: { key, date } });
      return;
    }
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
