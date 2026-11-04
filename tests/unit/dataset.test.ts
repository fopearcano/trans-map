import { describe, expect, it } from "vitest";
import { rawSeed } from "@data/seed";
import { validateDataset } from "@/domain/dataset";
import { CATEGORY_IDS } from "@/domain/categories";
import { loadFixture } from "./helpers";

describe("curated dataset", () => {
  const { dataset, issues, atlas } = loadFixture();

  it("validates without errors or warnings", () => {
    expect(issues).toEqual([]);
  });

  it("meets the MVP coverage requirements", () => {
    expect(dataset.events.length).toBeGreaterThanOrEqual(30);
    const categories = new Set(dataset.events.flatMap((e) => e.categories));
    expect(categories.size).toBeGreaterThanOrEqual(6);
    expect(categories.size).toBe(CATEGORY_IDS.length);
    const continents = new Set(atlas.flatMap((e) => e.continents));
    expect(continents.size).toBeGreaterThanOrEqual(5);
  });

  it("is not dominated by Europe or by disasters", () => {
    const european = atlas.filter((e) => e.continents.length > 0 && e.continents.every((c) => c === "europe"));
    expect(european.length / atlas.length).toBeLessThan(0.25);
    const disasters = dataset.events.filter((e) => e.categories[0] === "disasters-accidents");
    expect(disasters.length / dataset.events.length).toBeLessThan(0.25);
  });

  it("never encodes unknown values as zero and always cites sources", () => {
    for (const e of dataset.events) {
      expect(e.sources.length).toBeGreaterThan(0);
      for (const m of e.quantitativeMetrics) {
        expect(m.sourceIds.length).toBeGreaterThan(0);
        for (const v of [m.value, m.minEstimate, m.maxEstimate]) if (v !== undefined) expect(v === 0 && !m.documentedZero).toBe(false);
      }
    }
  });

  it("gives every coordinate an identifiable source", () => {
    for (const p of dataset.places) if (p.coordinates) expect(p.coordinateSourceIds.length).toBeGreaterThan(0);
  });

  it("keeps events without a definable location accessible", () => {
    const unlocated = atlas.filter((e) => e.points.length === 0).map((e) => e.id);
    expect(unlocated).toContain("influenza-1918");
    expect(unlocated).toContain("great-dying-americas");
    for (const id of unlocated) expect(dataset.events.find((e) => e.id === id)?.locationNote).toBeTruthy();
  });
});

describe("validation rules", () => {
  const base = structuredClone(rawSeed);
  const vajont = () => structuredClone(base.events.find((e) => e.id === "vajont-1963")!);

  const run = (mutate: (seed: typeof base) => void) => {
    const seed = structuredClone(base);
    mutate(seed);
    return validateDataset(seed).issues.filter((i) => i.level === "error").map((i) => i.message);
  };

  it("rejects zero used as unknown", () => {
    const errors = run((s) => {
      const e = vajont();
      e.quantitativeMetrics![0]!.value = 0;
      s.events = [e, ...s.events.filter((x) => x.id !== e.id)];
    });
    expect(errors.some((m) => m.includes("zero"))).toBe(true);
  });

  it("rejects metrics without sources and references to missing sources", () => {
    const noSource = run((s) => {
      const e = vajont();
      e.quantitativeMetrics![0]!.sourceIds = [];
      s.events = [e, ...s.events.filter((x) => x.id !== e.id)];
    });
    expect(noSource.some((m) => m.includes("almeno una fonte"))).toBe(true);
    const missingSource = run((s) => {
      const e = vajont();
      e.quantitativeMetrics![1]!.sourceIds = ["does-not-exist"];
      s.events = [e, ...s.events.filter((x) => x.id !== e.id)];
    });
    expect(missingSource.some((m) => m.includes("Fonte inesistente"))).toBe(true);
  });

  it("rejects year zero, unknown places and coordinates without sources", () => {
    const yearZero = run((s) => {
      const e = vajont();
      e.startDate = { year: 0 };
      s.events = [e, ...s.events.filter((x) => x.id !== e.id)];
    });
    expect(yearZero.some((m) => m.includes("anno 0"))).toBe(true);
    const unknownPlace = run((s) => {
      const e = vajont();
      e.locations = [{ placeId: "atlantis", role: "luogo" }];
      s.events = [e, ...s.events.filter((x) => x.id !== e.id)];
    });
    expect(unknownPlace.some((m) => m.includes("Luogo inesistente"))).toBe(true);
    const unsourcedCoords = run((s) => {
      s.places.push({ id: "nowhere", name: "Nowhere", coordinates: { lat: 1, lon: 1 }, precision: "exact", subregion: "polynesia", countryCodes: [], coordinateSourceIds: [] });
    });
    expect(unsourcedCoords.some((m) => m.includes("Coordinate senza fonte"))).toBe(true);
  });

  it("rejects incoherent units", () => {
    const errors = run((s) => {
      const e = vajont();
      e.quantitativeMetrics![0]!.unit = "km2";
      s.events = [e, ...s.events.filter((x) => x.id !== e.id)];
    });
    expect(errors.some((m) => m.includes("Unità incoerente"))).toBe(true);
  });
});
