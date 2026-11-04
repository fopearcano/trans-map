import { describe, expect, it } from "vitest";
import { compareEvents } from "@/engine/compare";
import { loadFixture } from "./helpers";

describe("comparison engine: Vajont vs Banqiao", () => {
  const { event, dataset } = loadFixture();
  const result = compareEvents([event("vajont-1963"), event("banqiao-1975")], dataset.relations);

  it("compares direct deaths only with direct deaths", () => {
    const row = result.sharedRows.find((r) => r.metricType === "deaths_direct");
    expect(row).toBeDefined();
    expect(row!.comparability).toBe("same-definition");
    const ratio = row!.ratios[0]!;
    expect(ratio.numeratorId).toBe("banqiao-1975");
    expect(ratio.reference).toBeCloseTo(26_000 / 1917, 3);
    // Range across all estimates: lowest Banqiao / highest Vajont … highest Banqiao / lowest Vajont
    expect(ratio.low).toBeCloseTo(26_000 / 2500, 3);
    expect(ratio.high).toBeCloseTo(85_600 / 1917, 3);
  });

  it("isolates cross-definition comparisons and flags them", () => {
    expect(result.crossDefinitionRows).toHaveLength(1);
    const row = result.crossDefinitionRows[0]!;
    expect(row.comparability).toBe("cross-definition");
    expect(row.entries.map((e) => e.metricType).sort()).toEqual(["deaths_direct", "deaths_total"]);
    expect(row.warnings.some((w) => w.code === "definitions-differ")).toBe(true);
    expect(row.warnings.some((w) => w.code === "estimate-kinds-differ")).toBe(true);
    // Never mixed into the same-definition rows
    expect(result.sharedRows.some((r) => r.metricType === "deaths_total")).toBe(false);
  });

  it("compares per-capita values only for denominators of the same kind", () => {
    const row = result.sharedRows.find((r) => r.metricType === "deaths_direct")!;
    const national = row.perCapita.find((g) => g.kind === "national-population")!;
    expect(national.comparable).toBe(true);
    const v = national.entries.find((e) => e.eventId === "vajont-1963")!;
    const b = national.entries.find((e) => e.eventId === "banqiao-1975")!;
    expect(v.perMillion).toBeCloseTo((1917 / 50_570_978) * 1e6, 3);
    expect(b.perMillion).toBeCloseTo((26_000 / 916_116_796) * 1e6, 3);
    const affected = row.perCapita.find((g) => g.kind === "affected-area-population")!;
    expect(affected.comparable).toBe(false);
    expect(affected.ratios).toEqual([]);
  });

  it("lists metrics documented for only one event as missing, not zero", () => {
    const landslide = result.missing.find((m) => m.metricType === "landslide_volume");
    expect(landslide).toEqual({ metricType: "landslide_volume", presentIn: ["vajont-1963"], missingIn: ["banqiao-1975"] });
    const vajontOnly = result.exclusive.find((x) => x.eventId === "vajont-1963")!;
    expect(vajontOnly.rows.map((r) => r.metricType)).toContain("landslide_volume");
    for (const row of result.sharedRows) for (const e of row.entries) expect(e.reference.value).toBeGreaterThan(0);
  });

  it("finds the curated relation and shared categories", () => {
    expect(result.relationsBetween.map((r) => r.id)).toContain("vajont-1963--scale-contrast--banqiao-1975");
    expect(result.sharedCategories).toEqual(expect.arrayContaining(["disasters-accidents"]));
    expect(result.crossDiscipline).toBe(false);
  });
});

describe("comparison engine: general rules", () => {
  const { event } = loadFixture();

  it("does not compute ratios for logarithmic or percentage scales", () => {
    const r = compareEvents([event("black-death"), event("great-dying-americas")]);
    for (const row of r.sharedRows) if (row.unit === "percent") expect(row.ratios).toEqual([]);
  });

  it("separates qualitative dimensions for cross-disciplinary comparisons", () => {
    const r = compareEvents([event("brahmasphutasiddhanta-zero"), event("m-pesa")]);
    expect(r.sharedRows).toEqual([]);
    expect(r.crossDiscipline).toBe(true);
    expect(r.qualitative).toHaveLength(2);
    expect(r.temporal.map((t) => t.eventId)).toEqual(["brahmasphutasiddhanta-zero", "m-pesa"]);
  });

  it("supports more than two events", () => {
    const r = compareEvents([event("black-death"), event("influenza-1918"), event("hiv-aids-pandemic")]);
    const deaths = r.sharedRows.find((x) => x.metricType === "deaths_total")!;
    expect(deaths.entries).toHaveLength(3);
    expect(deaths.ratios).toHaveLength(3);
    expect(deaths.warnings.some((w) => w.code === "approximate-reference")).toBe(true);
  });
});
