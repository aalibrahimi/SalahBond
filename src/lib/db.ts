import * as SQLite from "expo-sqlite";
import { addDaysISO, todayISO } from "./dates";
import { collectMissedDays, MissedDay } from "./rollover";
import { LogStatus, Prayer, PRAYERS } from "./types";

// Date helpers grew into their own module; re-export the one everyone imports
// from here so call sites don't churn.
export { todayISO };

const db = SQLite.openDatabaseSync("salahbond.db");

export function initDb() {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      prayer TEXT NOT NULL,
      status TEXT NOT NULL,
      logged_at TEXT NOT NULL,
      UNIQUE(date, prayer)
    );
    CREATE TABLE IF NOT EXISTS qadha (
      prayer TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  for (const p of PRAYERS) {
    db.runSync(`INSERT OR IGNORE INTO qadha (prayer, count) VALUES (?, 0)`, [p]);
  }
  if (!getMeta("install_date")) {
    setMeta("install_date", todayISO());
  }
}

export function getMeta(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

export function setMeta(key: string, value: string) {
  db.runSync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export function logPrayer(date: string, prayer: Prayer, status: LogStatus) {
  db.runSync(
    `INSERT INTO logs (date, prayer, status, logged_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(date, prayer) DO UPDATE SET status = excluded.status, logged_at = excluded.logged_at`,
    [date, prayer, status, new Date().toISOString()]
  );
}

export function unlogPrayer(date: string, prayer: Prayer) {
  db.runSync(`DELETE FROM logs WHERE date = ? AND prayer = ?`, [date, prayer]);
}

export function getLogsForDate(
  date: string
): Partial<Record<Prayer, LogStatus>> {
  const rows = db.getAllSync<{ prayer: Prayer; status: LogStatus }>(
    `SELECT prayer, status FROM logs WHERE date = ?`,
    [date]
  );
  const out: Partial<Record<Prayer, LogStatus>> = {};
  for (const r of rows) out[r.prayer] = r.status;
  return out;
}

export interface DayCount {
  date: string;
  count: number;
}

export function getDailyCounts(fromDate: string, toDate: string): DayCount[] {
  return db.getAllSync<DayCount>(
    `SELECT date, COUNT(*) as count FROM logs
     WHERE date >= ? AND date <= ? AND status != 'qadha'
     GROUP BY date ORDER BY date ASC`,
    [fromDate, toDate]
  );
}

export function getQadhaCounts(): Record<Prayer, number> {
  const rows = db.getAllSync<{ prayer: Prayer; count: number }>(
    `SELECT prayer, count FROM qadha`
  );
  const out = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
  for (const r of rows) out[r.prayer] = r.count;
  return out;
}

export function adjustQadha(prayer: Prayer, delta: number) {
  db.runSync(
    `UPDATE qadha SET count = MAX(0, count + ?) WHERE prayer = ?`,
    [delta, prayer]
  );
}

/** Decrement the qadha bank and record a qadha prayer performed today. */
export function payQadha(prayer: Prayer): boolean {
  const row = db.getFirstSync<{ count: number }>(
    `SELECT count FROM qadha WHERE prayer = ?`,
    [prayer]
  );
  if (!row || row.count <= 0) return false;
  db.runSync(`UPDATE qadha SET count = count - 1 WHERE prayer = ?`, [prayer]);
  db.runSync(
    `INSERT INTO logs (date, prayer, status, logged_at) VALUES (?, ?, 'qadha', ?)
     ON CONFLICT(date, prayer) DO NOTHING`,
    [`qadha:${todayISO()}:${Date.now()}`, prayer, new Date().toISOString()]
  );
  return true;
}

/**
 * The fully-elapsed days that haven't been rolled into the qadha bank yet.
 * (The old implementation parsed ISO dates with `new Date(iso)` — UTC — which
 * shifted the cursor back a day in western timezones and double-counted the
 * last processed day. collectMissedDays stays in local dates throughout.)
 */
export function getPendingRollover(): MissedDay[] {
  return collectMissedDays({
    installDate: getMeta("install_date")!,
    lastRollover: getMeta("last_rollover"),
    today: todayISO(),
    getLogs: getLogsForDate,
  });
}

/**
 * Close out the pending days: bank their missed prayers as qadha, or — when
 * the user chooses a fresh start after time away — just mark them processed.
 */
export function applyRollover(days: MissedDay[], countQadha: boolean) {
  if (countQadha) {
    for (const d of days) for (const p of d.missed) adjustQadha(p, 1);
  }
  setMeta("last_rollover", addDaysISO(todayISO(), -1));
}
