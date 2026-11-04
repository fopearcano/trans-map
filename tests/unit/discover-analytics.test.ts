import { describe, expect, it } from "vitest";
import { buildDiscoveryPath, discover, isInsideHorizon } from "@/engine/discover";
import { connectionsGraph, coverage, distributionByContinent, distributionByPeriod } from "@/engine/analytics";
import { HORIZONS } from "@/domain/regions";
import { loadFixture } from "./helpers";

const horizon = (id: string) => HORIZONS.find((h) => h.id === id)!.subregions;

describe("discovery engine", () => {
  const { atlas, relations } = loadFixture();

  it("suggests Banqiao to someone starting from Vajont", () => {
    const r = discover(atlas, relations, { horizon: horizon("southern-europe"), seeds: ["vajont-1963"] });
    expect(r.suggestions[0]?.event.id).toBe("banqiao-1975");
    const codes = r.suggestions[0]!.reasons.map((x) => x.code);
    expect(codes).toEqual(expect.arrayContaining(["editorial-relation", "same-category", "scale-contrast", "distant-region"]));
  });

  it("uses events inside the horizon as implicit seeds and never suggests them", () => {
    const h = horizon("southern-europe");
    const r = discover(atlas, relations, { horizon: h });
    expect(r.seeds.map((e) => e.id)).toContain("vajont-1963");
    for (const s of r.suggestions) expect(isInsideHorizon(s.event, new Set(h))).toBe(false);
    const fromVajont = r.bySeed.find((x) => x.seed.id === "vajont-1963");
    expect(fromVajont?.suggestions[0]?.event.id).toBe("banqiao-1975");
  });

  it("proposes other epidemics from the Black Death", () => {
    const r = discover(atlas, relations, { horizon: horizon("europe"), seeds: ["black-death"] });
    const ids = r.suggestions.map((s) => s.event.id);
    expect(ids).toEqual(expect.arrayContaining(["great-dying-americas", "hiv-aids-pandemic"]));
  });

  it("proposes other industrial transformations from the British industrial revolution", () => {
    const r = discover(atlas, relations, { horizon: horizon("europe"), seeds: ["british-industrial-revolution"] });
    expect(r.suggestions.slice(0, 3).map((s) => s.event.id)).toContain("meiji-restoration");
  });

  it("falls back to a diverse sample when there are no thematic links", () => {
    const r = discover(atlas, relations, { horizon: ["antarctica"], seeds: [] , limit: 8 });
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it("builds a navigable path on documented and curated relations", () => {
    const path = buildDiscoveryPath("sputnik-1", atlas, relations, 4);
    expect(path[0]!.event.id).toBe("sputnik-1");
    expect(path[1]!.event.id).toBe("arpanet-first-message");
    expect(path[1]!.via?.basis).toBe("documented");
    expect(new Set(path.map((p) => p.event.id)).size).toBe(path.length);
  });
});

describe("analytics", () => {
  const { atlas, relations } = loadFixture();

  it("distributes events across conventional periods", () => {
    const d = distributionByPeriod(atlas);
    expect(d.reduce((n, p) => n + p.total, 0)).toBeGreaterThanOrEqual(atlas.length);
    expect(d.find((p) => p.periodId === "1945-today")!.total).toBeGreaterThan(0);
  });

  it("counts unlocated events separately", () => {
    const d = distributionByContinent(atlas);
    expect(d.find((x) => x.continent === "unlocated")!.total).toBe(atlas.filter((e) => e.continents.length === 0).length);
  });

  it("summarises dataset coverage", () => {
    const c = coverage(atlas);
    expect(c.total).toBe(atlas.length);
    expect(c.withCoordinates).toBeLessThan(c.total);
    expect(c.byStatus.verified + c.byStatus.disputed).toBe(c.total);
  });

  it("builds the connections graph", () => {
    const g = connectionsGraph(atlas, relations);
    expect(g.edges.length).toBe(relations.length);
    expect(g.nodes.find((n) => n.id === "vajont-1963")!.degree).toBeGreaterThan(0);
  });
});
