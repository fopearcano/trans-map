import { describe, expect, it } from "vitest";
import {
  centuryOf, centuryRange, dateValue, formatCentury, formatDateRange, formatYear, fromAstronomical,
  overlaps, positionToYear, temporalExtent, toAstronomical, yearToPosition,
} from "@/domain/dates";

describe("historical dates", () => {
  it("has no year zero", () => {
    expect(toAstronomical(1)).toBe(1);
    expect(toAstronomical(-1)).toBe(0);
    expect(toAstronomical(-44)).toBe(-43);
    expect(fromAstronomical(0)).toBe(-1);
    expect(() => toAstronomical(0)).toThrow();
  });

  it("orders BCE and CE dates continuously", () => {
    expect(dateValue({ year: -1 })).toBeLessThan(dateValue({ year: 1 }));
    expect(dateValue({ year: 1963, month: 10, day: 9 })).toBeGreaterThan(dateValue({ year: 1963 }));
  });

  it("formats years in Italian and English", () => {
    expect(formatYear(1963)).toBe("1963");
    expect(formatYear(-3200)).toBe("3200 a.C.");
    expect(formatYear(-3200, "en")).toBe("3200 BCE");
    expect(formatYear(-71000, "it", { circa: true })).toBe("c. 73.000 anni fa");
    expect(formatDateRange({ year: 1963, month: 10, day: 9 }, undefined, "it", { precision: "day" })).toBe("9 ottobre 1963");
  });

  it("computes centuries without a year zero", () => {
    expect(centuryOf(1963)).toBe(20);
    expect(centuryOf(2000)).toBe(20);
    expect(centuryOf(2001)).toBe(21);
    expect(centuryOf(-1)).toBe(-1);
    expect(centuryOf(-100)).toBe(-1);
    expect(centuryOf(-101)).toBe(-2);
    expect(centuryRange(20)).toEqual({ from: 1901, to: 2000 });
    expect(centuryRange(-5)).toEqual({ from: -500, to: -401 });
    expect(formatCentury(-5)).toBe("V secolo a.C.");
    expect(formatCentury(20, "en")).toBe("20th century");
  });

  it("detects overlapping extents", () => {
    const famine = temporalExtent({ year: 1959 }, { year: 1961 });
    expect(overlaps(famine, temporalExtent({ year: 1961 }))).toBe(true);
    expect(overlaps(famine, temporalExtent({ year: 1962 }))).toBe(false);
  });

  it("maps the deep-time scale monotonically and invertibly", () => {
    const years = [-3_000_000, -100_000, -10_000, -3000, -500, 1, 1000, 1500, 1800, 1900, 1963, 2020];
    const positions = years.map(yearToPosition);
    for (let i = 1; i < positions.length; i++) expect(positions[i]!).toBeGreaterThan(positions[i - 1]!);
    expect(Math.abs(positionToYear(yearToPosition(1963)) - 1963)).toBeLessThanOrEqual(1);
    expect(Math.abs(positionToYear(yearToPosition(-3000)) + 3000)).toBeLessThanOrEqual(100);
  });
});
