import { z } from "zod";
import type { CategoryId } from "@/domain/categories";
import type { SubregionId } from "@/domain/regions";
import type { EventInput } from "@/domain/schemas";
import { fetchJson, SourceNotFoundError, SourceParseError, type FetchOptions } from "./http";

const TimeValue = z.object({ time: z.string(), precision: z.number() });
const Claim = z.object({ mainsnak: z.object({ datavalue: z.object({ value: z.unknown() }).optional() }) });
const EntitySchema = z.object({
  id: z.string(),
  labels: z.record(z.string(), z.object({ value: z.string() })).default({}),
  descriptions: z.record(z.string(), z.object({ value: z.string() })).default({}),
  claims: z.record(z.string(), z.array(Claim)).default({}),
  sitelinks: z.record(z.string(), z.object({ title: z.string() })).default({}),
});

export interface WikidataEntity {
  qid: string;
  label: { it?: string; en?: string };
  description: { it?: string; en?: string };
  coordinates: { lat: number; lon: number } | null;
  pointInTime: WikidataDate | null;
  start: WikidataDate | null;
  end: WikidataDate | null;
  wikipedia: { it?: string; en?: string };
}

export interface WikidataDate {
  year: number;
  month?: number;
  day?: number;
  /** Wikidata precision: 11 day, 10 month, 9 year, 8 decade, 7 century, 6 millennium. */
  precision: number;
}

/** Parses Wikidata's "+1963-10-09T00:00:00Z" (negative years are astronomical-ish: -0044 = 44 BCE). */
export function parseWikidataTime(raw: unknown): WikidataDate | null {
  const parsed = TimeValue.safeParse(raw);
  if (!parsed.success) return null;
  const m = /^([+-])(\d+)-(\d{2})-(\d{2})T/.exec(parsed.data.time);
  if (!m) return null;
  const year = Number(m[2]) * (m[1] === "-" ? -1 : 1);
  if (year === 0) return null;
  const month = Number(m[3]);
  const day = Number(m[4]);
  const p = parsed.data.precision;
  return { year, month: p >= 10 && month > 0 ? month : undefined, day: p >= 11 && day > 0 ? day : undefined, precision: p };
}

function firstValue(claims: Record<string, z.infer<typeof Claim>[]>, prop: string): unknown {
  return claims[prop]?.[0]?.mainsnak.datavalue?.value;
}

export function parseEntity(json: unknown, qid: string): WikidataEntity {
  const root = z.object({ entities: z.record(z.string(), z.unknown()) }).safeParse(json);
  if (!root.success) throw new SourceParseError("wikidata: struttura inattesa", "wikidata", qid);
  const raw = root.data.entities[qid];
  if (!raw || (raw as { missing?: string }).missing !== undefined) throw new SourceNotFoundError(`wikidata: ${qid} inesistente`, "wikidata", qid);
  const e = EntitySchema.safeParse(raw);
  if (!e.success) throw new SourceParseError(`wikidata: entità ${qid} non valida`, "wikidata", qid);
  const coord = z.object({ latitude: z.number(), longitude: z.number() }).safeParse(firstValue(e.data.claims, "P625"));
  return {
    qid,
    label: { it: e.data.labels.it?.value, en: e.data.labels.en?.value },
    description: { it: e.data.descriptions.it?.value, en: e.data.descriptions.en?.value },
    coordinates: coord.success ? { lat: coord.data.latitude, lon: coord.data.longitude } : null,
    pointInTime: parseWikidataTime(firstValue(e.data.claims, "P585")),
    start: parseWikidataTime(firstValue(e.data.claims, "P580")),
    end: parseWikidataTime(firstValue(e.data.claims, "P582")),
    wikipedia: { it: e.data.sitelinks.itwiki?.title, en: e.data.sitelinks.enwiki?.title },
  };
}

export async function fetchWikidataEntity(qid: string, opts: Partial<FetchOptions> = {}): Promise<WikidataEntity> {
  if (!/^Q\d+$/.test(qid)) throw new SourceParseError(`wikidata: identificativo non valido ${qid}`, "wikidata", qid);
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  return parseEntity(await fetchJson(url, { source: "wikidata", ...opts }), qid);
}

function precisionOf(d: WikidataDate): EventInput["datePrecision"] {
  if (d.precision >= 11) return "day";
  if (d.precision === 10) return "month";
  if (d.precision === 9) return "year";
  if (d.precision === 8) return "decade";
  if (d.precision === 7) return "century";
  return "millennium";
}

export interface DraftImport {
  event: EventInput;
  place: { id: string; name: string; coordinates: { lat: number; lon: number } | null; precision: "approximate"; subregion: SubregionId; countryCodes: string[]; wikidataId: string; coordinateSourceIds: string[] } | null;
  source: { id: string; type: "database"; title: string; url: string; accessedAt: string; reliability: "medium"; license: string };
}

/**
 * Builds a *draft* event from a Wikidata entity. Only identifiers, label,
 * dates and coordinates are taken; narrative fields are placeholders that an
 * editor must replace. Nothing here is presented as verified.
 */
export function toDraftEvent(entity: WikidataEntity, opts: { category: CategoryId; subregion: SubregionId; accessedAt: string }): DraftImport {
  const date = entity.pointInTime ?? entity.start;
  if (!date) throw new SourceParseError(`wikidata: ${entity.qid} senza data (P585/P580)`, "wikidata", entity.qid);
  const title = entity.label.it ?? entity.label.en ?? entity.qid;
  const description = entity.description.it ?? entity.description.en ?? "";
  const sourceId = `wikidata-${entity.qid.toLowerCase()}`;
  const id = `draft-${entity.qid.toLowerCase()}`;
  const placeId = `place-${entity.qid.toLowerCase()}`;
  const placeholder = `Bozza importata da Wikidata (${entity.qid}): ${description || "descrizione assente"}. Testo da redigere e verificare sulle fonti prima della pubblicazione.`;
  return {
    source: {
      id: sourceId,
      type: "database",
      title: `Wikidata ${entity.qid}: ${title}`,
      url: `https://www.wikidata.org/wiki/${entity.qid}`,
      accessedAt: opts.accessedAt,
      reliability: "medium",
      license: "CC0 1.0",
    },
    place: entity.coordinates
      ? { id: placeId, name: title, coordinates: entity.coordinates, precision: "approximate", subregion: opts.subregion, countryCodes: [], wikidataId: entity.qid, coordinateSourceIds: [sourceId] }
      : null,
    event: {
      id,
      title,
      summary: placeholder.slice(0, 400),
      detailedDescription: placeholder,
      context: "Contesto da redigere.",
      categories: [opts.category],
      startDate: { year: date.year, ...(date.month ? { month: date.month } : {}), ...(date.day ? { day: date.day } : {}) },
      ...(entity.end ? { endDate: { year: entity.end.year, ...(entity.end.month ? { month: entity.end.month } : {}) } } : {}),
      datePrecision: precisionOf(date),
      locations: entity.coordinates ? [{ placeId, role: "Coordinate dell'elemento Wikidata" }] : [],
      locationNote: entity.coordinates ? undefined : "Nessuna coordinata su Wikidata: localizzazione da definire.",
      knownGaps: ["Bozza: descrizione, metriche e fonti specialistiche da aggiungere in revisione editoriale."],
      sources: [sourceId],
      evidenceStatus: "draft",
      lastVerifiedAt: opts.accessedAt,
      wikidataId: entity.qid,
    },
  };
}
