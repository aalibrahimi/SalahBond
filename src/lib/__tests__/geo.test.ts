import { describe, expect, test } from "bun:test";
import { haversineKm } from "../geo";

describe("haversineKm", () => {
  test("zero distance for identical points", () => {
    expect(haversineKm(37.33, -121.89, 37.33, -121.89)).toBe(0);
  });

  test("San Jose to Chicago is ~2,940 km — clearly past the travel threshold", () => {
    const km = haversineKm(37.3387, -121.8853, 41.8781, -87.6298);
    expect(km).toBeGreaterThan(2900);
    expect(km).toBeLessThan(3000);
  });

  test("a cross-town move stays under the 100 km threshold", () => {
    // San Jose downtown to Milpitas, ~13 km.
    const km = haversineKm(37.3387, -121.8853, 37.4323, -121.8996);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(20);
  });
});
