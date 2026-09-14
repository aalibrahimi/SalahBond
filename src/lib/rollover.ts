import { addDaysISO } from "./dates";
import { LogStatus, Prayer, PRAYERS } from "./types";

export interface MissedDay {
  date: string;
  missed: Prayer[];
}

/**
 * The fully-elapsed days that haven't been rolled over yet — strictly after
 * the later of install date and last rollover, strictly before today — with
 * the prayers left unlogged on each. Pure: storage is injected, so this is
 * the piece the qadha tests pin down.
 */
export function collectMissedDays(opts: {
  installDate: string;
  lastRollover: string | null;
  today: string;
  getLogs: (date: string) => Partial<Record<Prayer, LogStatus>>;
}): MissedDay[] {
  const { installDate, lastRollover, today, getLogs } = opts;
  // ISO date strings compare correctly as strings.
  const last =
    lastRollover && lastRollover > installDate ? lastRollover : installDate;
  const out: MissedDay[] = [];
  for (
    let date = addDaysISO(last, 1);
    date < today;
    date = addDaysISO(date, 1)
  ) {
    const logs = getLogs(date);
    out.push({ date, missed: PRAYERS.filter((p) => !logs[p]) });
  }
  return out;
}

export function totalMissed(days: MissedDay[]): number {
  return days.reduce((sum, d) => sum + d.missed.length, 0);
}
