export type Prayer = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type WindowKey = "fajr" | "zuhrayn" | "maghribayn";

export type LogStatus = "ontime" | "delayed" | "qadha";

export const PRAYERS: Prayer[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const PRAYER_LABELS: Record<Prayer, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const PRAYER_ARABIC: Record<Prayer, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export interface PrayerWindow {
  key: WindowKey;
  label: string;
  arabicLabel: string;
  prayers: Prayer[];
  start: Date;
  end: Date;
}

export const WINDOW_META: Record<
  WindowKey,
  { label: string; arabicLabel: string; prayers: Prayer[] }
> = {
  fajr: { label: "Fajr", arabicLabel: "الفجر", prayers: ["fajr"] },
  zuhrayn: {
    label: "Dhuhr & Asr",
    arabicLabel: "الظهر والعصر",
    prayers: ["dhuhr", "asr"],
  },
  maghribayn: {
    label: "Maghrib & Isha",
    arabicLabel: "المغرب والعشاء",
    prayers: ["maghrib", "isha"],
  },
};

export interface DayTimes {
  dateISO: string; // YYYY-MM-DD (local)
  windows: PrayerWindow[];
  /** Raw display times keyed by timing name (Fajr, Sunrise, Dhuhr, ...) */
  display: Record<string, string>;
  hijri: string; // e.g. "12 Rabīʿ al-Awwal 1448"
}

export type Location =
  | { kind: "coords"; lat: number; lng: number; label: string }
  | { kind: "city"; city: string; country: string; label: string };

export interface Quote {
  id: string;
  arabic: string;
  english: string;
  source: string;
  category: "daily" | "reward" | "mercy";
}
