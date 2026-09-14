import { describe, expect, test } from "bun:test";
import {
  fmtClock,
  fmtRelative,
  parseTime,
  windowStateAt,
} from "../time-logic";
import { DayTimes, PrayerWindow, WINDOW_META } from "../types";

/** A typical day: fajr 5:30–6:45, zuhrayn 13:00–19:12, maghribayn 19:12–00:24. */
function makeDay(dateISO = "2026-09-14"): DayTimes {
  const at = (raw: string) => parseTime(dateISO, raw);
  const midnight = new Date(+at("00:24") + 24 * 3600 * 1000); // next civil day
  const win = (
    key: keyof typeof WINDOW_META,
    start: Date,
    end: Date
  ): PrayerWindow => ({ ...WINDOW_META[key], key, start, end });
  return {
    dateISO,
    windows: [
      win("fajr", at("05:30"), at("06:45")),
      win("zuhrayn", at("13:00"), at("19:12")),
      win("maghribayn", at("19:12"), midnight),
    ],
    display: {},
    hijri: "",
  };
}

const day = makeDay();
const at = (raw: string) => parseTime(day.dateISO, raw);

describe("windowStateAt", () => {
  test("before fajr: nothing open, fajr is next", () => {
    const s = windowStateAt(at("04:00"), day);
    expect(s.open).toBeNull();
    expect(s.next?.key).toBe("fajr");
    expect(s.dayOver).toBe(false);
  });

  test("during fajr window", () => {
    const s = windowStateAt(at("05:45"), day);
    expect(s.open?.key).toBe("fajr");
    expect(s.next?.key).toBe("zuhrayn");
  });

  test("between sunrise and dhuhr: gap with zuhrayn next", () => {
    const s = windowStateAt(at("09:00"), day);
    expect(s.open).toBeNull();
    expect(s.next?.key).toBe("zuhrayn");
  });

  test("exactly at maghrib the boundary belongs to maghribayn, not zuhrayn", () => {
    const s = windowStateAt(at("19:12"), day);
    expect(s.open?.key).toBe("maghribayn");
  });

  test("one minute before maghrib, zuhrayn is still open", () => {
    const s = windowStateAt(at("19:11"), day);
    expect(s.open?.key).toBe("zuhrayn");
  });

  test("after Islamic midnight (past civil midnight) the day is over", () => {
    const afterEnd = new Date(+day.windows[2].end + 60_000);
    const s = windowStateAt(afterEnd, day);
    expect(s.open).toBeNull();
    expect(s.next).toBeNull();
    expect(s.dayOver).toBe(true);
  });

  test("at 23:59 maghribayn is still open (end is past civil midnight)", () => {
    const s = windowStateAt(at("23:59"), day);
    expect(s.open?.key).toBe("maghribayn");
    expect(s.dayOver).toBe(false);
  });
});

describe("parseTime", () => {
  test("strips the timezone suffix Aladhan appends", () => {
    const d = parseTime("2026-09-14", "05:34 (PDT)");
    expect(d.getHours()).toBe(5);
    expect(d.getMinutes()).toBe(34);
    expect(d.getDate()).toBe(14);
  });
});

describe("fmtClock", () => {
  test("12-hour edges", () => {
    expect(fmtClock(at("00:05"))).toBe("12:05 AM");
    expect(fmtClock(at("12:00"))).toBe("12:00 PM");
    expect(fmtClock(at("19:12"))).toBe("7:12 PM");
  });
});

describe("fmtRelative", () => {
  test("reads like a person", () => {
    expect(fmtRelative(-5)).toBe("now");
    expect(fmtRelative(30_000)).toBe("1 min"); // ceil
    expect(fmtRelative(48 * 60_000)).toBe("48 min");
    expect(fmtRelative(2 * 3600_000 + 14 * 60_000)).toBe("2h 14m");
    expect(fmtRelative(3 * 3600_000)).toBe("3h");
    expect(fmtRelative(26 * 3600_000)).toBe("1d 2h");
  });
});
