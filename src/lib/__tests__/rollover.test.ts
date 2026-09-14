import { describe, expect, test } from "bun:test";
import { collectMissedDays, totalMissed } from "../rollover";
import { LogStatus, Prayer } from "../types";

type Logs = Partial<Record<Prayer, LogStatus>>;

function withLogs(byDate: Record<string, Logs>) {
  return (date: string): Logs => byDate[date] ?? {};
}

const NONE = withLogs({});

describe("collectMissedDays", () => {
  test("install day itself is never processed", () => {
    const days = collectMissedDays({
      installDate: "2026-09-13",
      lastRollover: null,
      today: "2026-09-14",
      getLogs: NONE,
    });
    expect(days).toEqual([]);
  });

  test("one fully missed day banks all five prayers", () => {
    const days = collectMissedDays({
      installDate: "2026-09-12",
      lastRollover: null,
      today: "2026-09-14",
      getLogs: NONE,
    });
    expect(days).toEqual([
      {
        date: "2026-09-13",
        missed: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
      },
    ]);
    expect(totalMissed(days)).toBe(5);
  });

  test("logged prayers are excluded; qadha entries don't count as logged for that day either way", () => {
    const days = collectMissedDays({
      installDate: "2026-09-12",
      lastRollover: null,
      today: "2026-09-14",
      getLogs: withLogs({
        "2026-09-13": { fajr: "ontime", dhuhr: "delayed", isha: "ontime" },
      }),
    });
    expect(days[0].missed).toEqual(["asr", "maghrib"]);
  });

  test("regression: a day already rolled over is never re-counted", () => {
    // The old implementation parsed "2026-09-13" as UTC midnight and read it
    // back with local getters — west of Greenwich the cursor landed on
    // 2026-09-13 again and every missed prayer was double-banked.
    const days = collectMissedDays({
      installDate: "2026-09-10",
      lastRollover: "2026-09-13",
      today: "2026-09-15",
      getLogs: NONE,
    });
    expect(days.map((d) => d.date)).toEqual(["2026-09-14"]);
  });

  test("lastRollover before install never resurrects pre-install days", () => {
    const days = collectMissedDays({
      installDate: "2026-09-13",
      lastRollover: "2026-09-01",
      today: "2026-09-15",
      getLogs: NONE,
    });
    expect(days.map((d) => d.date)).toEqual(["2026-09-14"]);
  });

  test("a week away yields one entry per elapsed day, across a month boundary", () => {
    const days = collectMissedDays({
      installDate: "2026-08-01",
      lastRollover: "2026-08-28",
      today: "2026-09-05",
      getLogs: NONE,
    });
    expect(days.map((d) => d.date)).toEqual([
      "2026-08-29",
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
    expect(totalMissed(days)).toBe(35);
  });

  test("running twice in one day is a no-op the second time", () => {
    const first = collectMissedDays({
      installDate: "2026-09-10",
      lastRollover: null,
      today: "2026-09-14",
      getLogs: NONE,
    });
    expect(first.length).toBe(3);
    // After applyRollover, last_rollover = yesterday (2026-09-13).
    const second = collectMissedDays({
      installDate: "2026-09-10",
      lastRollover: "2026-09-13",
      today: "2026-09-14",
      getLogs: NONE,
    });
    expect(second).toEqual([]);
  });
});
