import { describe, expect, it } from "vitest";
import { filterEvents, timeSelectionToYears } from "@/engine/filter";
import { search } from "@/engine/search";
import { loadFixture } from "./helpers";

describe("filters", () => {
  const { atlas, searchIndex } = loadFixture();
  const ids = (r: { events: { id: string }[] }) => r.events.map((e) => e.id);

  it("returns everything without criteria", () => {
    expect(filterEvents(atlas, {}).events).toHaveLength(atlas.length);
  });

  it("combines multiple categories with OR semantics", () => {
    const med = filterEvents(atlas, { categories: ["medicine-health"] }).events.length;
    const math = filterEvents(atlas, { categories: ["science-mathematics"] }).events.length;
    const both = filterEvents(atlas, { categories: ["medicine-health", "science-mathematics"] }).events.length;
    expect(both).toBeGreaterThanOrEqual(Math.max(med, math));
    expect(both).toBeLessThanOrEqual(med + math);
  });

  it("filters by single year", () => {
    const r = ids(filterEvents(atlas, { time: { mode: "year", year: 1963 } }));
    expect(r).toContain("vajont-1963");
    expect(r).not.toContain("banqiao-1975");
    // Ongoing phenomena overlapping 1963 are included
    expect(r).toContain("aral-sea-desiccation");
  });

  it("filters by century, including BCE centuries", () => {
    expect(ids(filterEvents(atlas, { time: { mode: "century", century: 20 } }))).toEqual(
      expect.arrayContaining(["vajont-1963", "banqiao-1975", "partition-of-india", "influenza-1918"]),
    );
    const third = ids(filterEvents(atlas, { time: { mode: "century", century: -3 } }));
    expect(third).toContain("ashoka-edicts");
    expect(third).not.toContain("hijra");
  });

  it("filters by range and by conventional period", () => {
    const deep = ids(filterEvents(atlas, { time: { mode: "range", from: -100_000, to: -5000 } }));
    expect(deep).toEqual(expect.arrayContaining(["blombos-drawing", "gobekli-tepe"]));
    expect(deep).not.toContain("uruk-cuneiform");
    const p = ids(filterEvents(atlas, { time: { mode: "period", periodId: "1500-1800" } }));
    expect(p).toEqual(expect.arrayContaining(["potosi-silver", "atlantic-slave-trade", "haitian-revolution"]));
    expect(timeSelectionToYears({ mode: "range", from: 1900, to: 1800 })).toEqual({ from: 1800, to: 1900 });
  });

  it("filters by continent and evidence status", () => {
    const africa = filterEvents(atlas, { continents: ["africa"] }).events;
    expect(africa.every((e) => e.continents.includes("africa"))).toBe(true);
    expect(africa.length).toBeGreaterThanOrEqual(6);
    const disputed = filterEvents(atlas, { evidence: ["disputed"] }).events.map((e) => e.id);
    expect(disputed).toContain("banqiao-1975");
    expect(disputed).not.toContain("vajont-1963");
  });

  it("reports matching events without coordinates separately", () => {
    const r = filterEvents(atlas, { categories: ["medicine-health"] });
    expect(r.unlocated.map((e) => e.id)).toContain("influenza-1918");
  });
});

describe("search", () => {
  const { searchIndex, atlas } = loadFixture();

  it("is accent-insensitive", () => {
    expect(search(searchIndex, "cernobyl")[0]?.id).toBe("chernobyl-1986");
    expect(search(searchIndex, "gobekli")[0]?.id).toBe("gobekli-tepe");
  });

  it("matches prefixes and requires all tokens", () => {
    expect(search(searchIndex, "vaj")[0]?.id).toBe("vajont-1963");
    expect(search(searchIndex, "diga banqiao")[0]?.id).toBe("banqiao-1975");
    expect(search(searchIndex, "diga zzzzz")).toEqual([]);
  });

  it("finds events by place name and tag", () => {
    expect(search(searchIndex, "Kinshasa").map((h) => h.id)).toContain("hiv-aids-pandemic");
    expect(search(searchIndex, "stampa").map((h) => h.id)).toEqual(expect.arrayContaining(["jikji", "gutenberg-bible"]));
  });

  it("combines search with filters", () => {
    const r = filterEvents(atlas, { query: "diga", time: { mode: "century", century: 20 } }, searchIndex);
    expect(r.events.map((e) => e.id)).toEqual(expect.arrayContaining(["vajont-1963", "banqiao-1975"]));
  });

  it("scales to thousands of events", () => {
    const many = Array.from({ length: 40 }, (_, i) => atlas.map((e) => ({ ...e, id: `${e.id}-${i}` }))).flat();
    const t0 = performance.now();
    const r = filterEvents(many, { categories: ["medicine-health"], time: { mode: "century", century: 20 } });
    expect(r.events.length).toBeGreaterThan(0);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
