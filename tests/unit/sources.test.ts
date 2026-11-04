import { describe, expect, it, vi } from "vitest";
import { fetchJson, SourceHttpError, SourceNotFoundError, SourceParseError, SourceRateLimitError, SourceTimeoutError } from "@/server/sources/http";
import { parseEntity, parseWikidataTime, toDraftEvent } from "@/server/sources/wikidata";
import { parseCsv, fetchOwidPopulation } from "@/server/sources/owid";
import { EventSchema, PlaceSchema, SourceSchema } from "@/domain/schemas";

const ok = (body: string, status = 200, headers: Record<string, string> = {}) => new Response(body, { status, headers });
const fast = { baseDelayMs: 1, timeoutMs: 50 };

describe("resilient source client", () => {
  it("retries server errors and then succeeds", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(ok("err", 503)).mockResolvedValueOnce(ok("err", 500)).mockResolvedValueOnce(ok('{"a":1}'));
    await expect(fetchJson("https://x", { source: "test", fetchImpl, ...fast })).resolves.toEqual({ a: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("raises a rate-limit error after exhausting retries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("slow down", 429));
    await expect(fetchJson("https://x", { source: "test", fetchImpl, retries: 2, ...fast })).rejects.toBeInstanceOf(SourceRateLimitError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("does not retry client errors and maps 404", async () => {
    const f400 = vi.fn().mockResolvedValue(ok("bad", 400));
    await expect(fetchJson("https://x", { source: "test", fetchImpl: f400, ...fast })).rejects.toBeInstanceOf(SourceHttpError);
    expect(f400).toHaveBeenCalledTimes(1);
    const f404 = vi.fn().mockResolvedValue(ok("missing", 404));
    await expect(fetchJson("https://x", { source: "test", fetchImpl: f404, ...fast })).rejects.toBeInstanceOf(SourceNotFoundError);
  });

  it("times out hanging requests", async () => {
    const fetchImpl = vi.fn().mockImplementation((_u: string, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))));
    await expect(fetchJson("https://x", { source: "test", fetchImpl, retries: 1, ...fast })).rejects.toBeInstanceOf(SourceTimeoutError);
  });

  it("rejects malformed JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok("<html>"));
    await expect(fetchJson("https://x", { source: "test", fetchImpl, ...fast })).rejects.toBeInstanceOf(SourceParseError);
  });
});

describe("Wikidata adapter", () => {
  const entityJson = {
    entities: {
      Q3709251: {
        id: "Q3709251",
        labels: { it: { value: "disastro del Vajont" }, en: { value: "Vajont dam disaster" } },
        descriptions: { en: { value: "1963 landslide and flood in Vajont, Northern Italy" } },
        claims: {
          P625: [{ mainsnak: { datavalue: { value: { latitude: 46.2672, longitude: 12.3289 } } } }],
          P585: [{ mainsnak: { datavalue: { value: { time: "+1963-10-09T00:00:00Z", precision: 11 } } } }],
        },
        sitelinks: { itwiki: { title: "Disastro del Vajont" } },
      },
    },
  };

  it("parses dates, including BCE and partial precision", () => {
    expect(parseWikidataTime({ time: "+1963-10-09T00:00:00Z", precision: 11 })).toEqual({ year: 1963, month: 10, day: 9, precision: 11 });
    expect(parseWikidataTime({ time: "-0260-00-00T00:00:00Z", precision: 9 })).toEqual({ year: -260, month: undefined, day: undefined, precision: 9 });
    expect(parseWikidataTime({ nope: true })).toBeNull();
  });

  it("parses an entity and builds a valid draft (never verified)", () => {
    const entity = parseEntity(entityJson, "Q3709251");
    expect(entity.coordinates).toEqual({ lat: 46.2672, lon: 12.3289 });
    const draft = toDraftEvent(entity, { category: "disasters-accidents", subregion: "southern-europe", accessedAt: "2026-11-04" });
    const event = EventSchema.parse(draft.event);
    expect(event.evidenceStatus).toBe("draft");
    expect(event.startDate).toEqual({ year: 1963, month: 10, day: 9 });
    expect(event.quantitativeMetrics).toEqual([]);
    expect(PlaceSchema.parse(draft.place).coordinateSourceIds).toEqual(["wikidata-q3709251"]);
    expect(SourceSchema.parse(draft.source).license).toBe("CC0 1.0");
  });

  it("reports missing entities and malformed payloads", () => {
    expect(() => parseEntity({ entities: { Q1: { id: "Q1", missing: "" } } }, "Q1")).toThrow(SourceNotFoundError);
    expect(() => parseEntity({ foo: 1 }, "Q1")).toThrow(SourceParseError);
  });
});

describe("OWID adapter", () => {
  const csv = 'entity,code,year,population_historical\nItaly,ITA,1963,50570978\n"Korea, South",KOR,1963,27000000\n';

  it("parses CSV with quoted fields", () => {
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]!.entity).toBe("Korea, South");
  });

  it("returns the population of a country for a year", async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => ok(csv));
    await expect(fetchOwidPopulation("ITA", 1963, { fetchImpl, ...fast })).resolves.toMatchObject({ value: 50_570_978, year: 1963 });
    await expect(fetchOwidPopulation("ITA", 1700, { fetchImpl, ...fast })).rejects.toBeInstanceOf(SourceNotFoundError);
  });
});
