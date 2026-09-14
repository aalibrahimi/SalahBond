/**
 * Local-calendar date helpers. Every ISO string here is YYYY-MM-DD in the
 * device's local timezone. Never feed one to `new Date(iso)` — that parses as
 * UTC midnight, which lands on the previous local day anywhere west of
 * Greenwich. Always go through parseISODateLocal.
 */

export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "2026-09-14" -> local midnight of that day. */
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODateLocal(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

/** Whole calendar days from `from` to `to` (positive when `to` is later). */
export function daysBetweenISO(from: string, to: string): number {
  const ms = +parseISODateLocal(to) - +parseISODateLocal(from);
  // Round, don't floor: DST makes some days 23 or 25 hours long.
  return Math.round(ms / 86_400_000);
}

export function tomorrowISO(): string {
  return addDaysISO(todayISO(), 1);
}
