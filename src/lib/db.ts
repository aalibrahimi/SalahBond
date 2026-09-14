import * as SQLite from "expo-sqlite";
import { LogStatus, Prayer, PRAYERS } from "./types";

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

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
 * Move unlogged prayers from fully-elapsed past days into the qadha bank.
 * Runs at most once per day; never counts days before install.
 */
export function rolloverMissedDays() {
  const install = getMeta("install_date")!;
  const last = getMeta("last_rollover") ?? install;
  const today = todayISO();

  const start = new Date(Math.max(+new Date(last), +new Date(install)));
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1); // first unprocessed day

  while (todayISO(cursor) < today) {
    const date = todayISO(cursor);
    const logs = getLogsForDate(date);
    for (const p of PRAYERS) {
      if (!logs[p]) adjustQadha(p, 1);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  setMeta("last_rollover", todayISO(yesterday));
}
