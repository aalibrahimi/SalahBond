import { describe, expect, test } from "bun:test";
import {
  addDaysISO,
  daysBetweenISO,
  parseISODateLocal,
  todayISO,
} from "../dates";

describe("parseISODateLocal", () => {
  test("lands on local midnight of the same calendar day", () => {
    const d = parseISODateLocal("2026-09-14");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(14);
    expect(d.getHours()).toBe(0);
  });

  test("round-trips through todayISO in every timezone", () => {
    // This is the exact property `new Date("YYYY-MM-DD")` violates west of
    // Greenwich (UTC parse, local read = previous day).
    for (const iso of ["2026-01-01", "2026-03-08", "2026-11-01", "2026-12-31"]) {
      expect(todayISO(parseISODateLocal(iso))).toBe(iso);
    }
  });
});

describe("addDaysISO", () => {
  test("crosses month and year boundaries", () => {
    expect(addDaysISO("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("leap year February", () => {
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysISO("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("daysBetweenISO", () => {
  test("counts whole calendar days, signed", () => {
    expect(daysBetweenISO("2026-09-10", "2026-09-14")).toBe(4);
    expect(daysBetweenISO("2026-09-14", "2026-09-10")).toBe(-4);
    expect(daysBetweenISO("2026-09-14", "2026-09-14")).toBe(0);
  });

  test("stays exact across the US spring-forward week (23-hour day)", () => {
    // 2026-03-08 is the US DST jump; rounding absorbs the missing hour.
    expect(daysBetweenISO("2026-03-06", "2026-03-13")).toBe(7);
  });
});
