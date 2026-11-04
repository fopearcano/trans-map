/**
 * Reads the whole database back into domain objects (Dataset).
 * The engines work in memory on this structure; with thousands of events the
 * full dataset still fits comfortably (a few MB).
 */
import type { Dataset } from "@/domain/dataset";
import type { CategoryId } from "@/domain/categories";
import type { DatePrecision, HistoricalDate } from "@/domain/dates";
import type { SubregionId } from "@/domain/regions";
import type { CuratedComparison, EventRecord, Metric, Place, Relation, Source, Tag } from "@/domain/schemas";
import type { TransMapDb } from "./client";
import * as t from "./schema";

const parse = <T>(text: string | null | undefined, fallback: T): T => (text ? (JSON.parse(text) as T) : fallback);
const opt = <T>(v: T | null | undefined): T | undefined => (v === null || v === undefined ? undefined : v);

function date(year: number | null, month: number | null, day: number | null): HistoricalDate | undefined {
  if (year === null) return undefined;
  const d: HistoricalDate = { year };
  if (month !== null) d.month = month;
  if (day !== null) d.day = day;
  return d;
}

function groupBy<T, K>(rows: T[], key: (r: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

export function loadDataset(db: TransMapDb): Dataset & { origins: Map<string, string> } {
  const sourceRows = db.select().from(t.sources).all();
  const placeRows = db.select().from(t.places).all();
  const placeSourceRows = db.select().from(t.placeSources).all();
  const tagRows = db.select().from(t.tags).all();
  const eventRows = db.select().from(t.events).all();
  const catRows = db.select().from(t.eventCategories).all();
  const tagLinkRows = db.select().from(t.eventTags).all();
  const locRows = db.select().from(t.eventLocations).all();
  const evSourceRows = db.select().from(t.eventSources).all();
  const footprintRows = db.select().from(t.footprints).all();
  const metricRows = db.select().from(t.metrics).all();
  const metricSourceRows = db.select().from(t.metricSources).all();
  const denominatorRows = db.select().from(t.metricDenominators).all();
  const statementRows = db.select().from(t.eventStatements).all();
  const statementSourceRows = db.select().from(t.statementSources).all();
  const relationRows = db.select().from(t.relations).all();
  const relationSourceRows = db.select().from(t.relationSources).all();
  const comparisonRows = db.select().from(t.comparisons).all();
  const comparisonEventRows = db.select().from(t.comparisonEvents).all();
  const comparisonSourceRows = db.select().from(t.comparisonSources).all();

  const sources: Source[] = sourceRows.map((s) => ({
    id: s.id,
    type: s.type as Source["type"],
    title: s.title,
    authors: s.authorsJson ? (JSON.parse(s.authorsJson) as string[]) : undefined,
    publisher: opt(s.publisher),
    year: opt(s.year),
    url: opt(s.url),
    doi: opt(s.doi),
    accessedAt: opt(s.accessedAt),
    reliability: s.reliability as Source["reliability"],
    license: opt(s.license),
    note: opt(s.note),
  }));

  const placeSources = groupBy(placeSourceRows, (r) => r.placeId);
  const places: Place[] = placeRows.map((p) => ({
    id: p.id,
    name: p.name,
    coordinates: p.lat !== null && p.lon !== null ? { lat: p.lat, lon: p.lon } : null,
    precision: p.precision as Place["precision"],
    subregion: p.subregion as SubregionId,
    countryCodes: parse<string[]>(p.countryCodesJson, []),
    wikidataId: opt(p.wikidataId),
    coordinateSourceIds: (placeSources.get(p.id) ?? []).map((r) => r.sourceId),
    note: opt(p.note),
  }));

  const tags: Tag[] = tagRows.map((r) => ({ id: r.id, label: r.label }));

  const cats = groupBy(catRows, (r) => r.eventId);
  const tagLinks = groupBy(tagLinkRows, (r) => r.eventId);
  const locs = groupBy(locRows, (r) => r.eventId);
  const evSources = groupBy(evSourceRows, (r) => r.eventId);
  const fps = groupBy(footprintRows, (r) => r.eventId);
  const mets = groupBy(metricRows, (r) => r.eventId);
  const metSources = groupBy(metricSourceRows, (r) => r.metricId);
  const dens = groupBy(denominatorRows, (r) => r.metricId);
  const stmts = groupBy(statementRows, (r) => r.eventId);
  const stmtSources = groupBy(statementSourceRows, (r) => r.statementId);
  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

  const origins = new Map<string, string>();
  const events: EventRecord[] = eventRows.map((e) => {
    origins.set(e.id, e.origin);
    const statements = (stmts.get(e.id) ?? []).sort(byPos);
    const srcOf = (id: number) => (stmtSources.get(id) ?? []).map((r) => r.sourceId);
    const metricsOut: Metric[] = (mets.get(e.id) ?? []).sort(byPos).map((m) => ({
      id: m.id,
      metricType: m.metricType as Metric["metricType"],
      value: opt(m.value),
      minEstimate: opt(m.minEstimate),
      maxEstimate: opt(m.maxEstimate),
      unit: m.unit as Metric["unit"],
      estimateKind: m.estimateKind as Metric["estimateKind"],
      attributedTo: m.attributedTo,
      scope: opt(m.scope),
      measurementPeriod: opt(m.measurementPeriod),
      populationDenominators: (dens.get(m.id) ?? []).map((d) => ({
        kind: d.kind as Metric["populationDenominators"][number]["kind"],
        value: d.value,
        year: d.year,
        description: d.description,
        sourceIds: parse<string[]>(d.sourceIdsJson, []),
      })),
      methodology: opt(m.methodology),
      sourceIds: (metSources.get(m.id) ?? []).map((r) => r.sourceId),
      uncertainty: m.uncertainty as Metric["uncertainty"],
      isReference: m.isReference,
      documentedZero: m.documentedZero,
      note: opt(m.note),
    }));

    return {
      id: e.id,
      title: e.title,
      summary: e.summary,
      detailedDescription: e.detailedDescription,
      context: e.context,
      categories: (cats.get(e.id) ?? []).sort(byPos).map((r) => r.categoryId as CategoryId),
      tags: (tagLinks.get(e.id) ?? []).map((r) => r.tagId),
      startDate: date(e.startYear, e.startMonth, e.startDay)!,
      endDate: date(e.endYear, e.endMonth, e.endDay),
      ongoing: e.ongoing,
      datePrecision: e.datePrecision as DatePrecision,
      dateCirca: e.dateCirca,
      dateNote: opt(e.dateNote),
      locations: (locs.get(e.id) ?? []).sort(byPos).map((l) => ({ placeId: l.placeId, role: l.role, note: opt(l.note) })),
      locationNote: opt(e.locationNote),
      geographicFootprints: (fps.get(e.id) ?? []).map((f) => ({
        id: f.id,
        kind: f.kind as "countries" | "global",
        label: f.label,
        countryCodes: parse<string[]>(f.countryCodesJson, []),
        approximation: f.approximation,
        sourceIds: parse<string[]>(f.sourceIdsJson, []),
      })),
      peopleOrRegionsAffected: parse<string[]>(e.peopleAffectedJson, []),
      quantitativeMetrics: metricsOut,
      qualitativeImpacts: statements
        .filter((s) => s.kind === "impact")
        .map((s) => ({
          domain: s.subtype as EventRecord["qualitativeImpacts"][number]["domain"],
          scale: s.scale as EventRecord["qualitativeImpacts"][number]["scale"],
          text: s.text,
          duration: opt(s.duration),
          sourceIds: srcOf(s.id),
        })),
      causes: parse<string[]>(e.causesJson, []),
      consequences: statements
        .filter((s) => s.kind === "consequence")
        .map((s) => ({ kind: s.subtype as "direct" | "indirect" | "long-term", text: s.text, sourceIds: srcOf(s.id) })),
      interpretations: statements.filter((s) => s.kind === "interpretation").map((s) => ({ text: s.text, heldBy: opt(s.heldBy), sourceIds: srcOf(s.id) })),
      controversies: statements.filter((s) => s.kind === "controversy").map((s) => ({ text: s.text, heldBy: opt(s.heldBy), sourceIds: srcOf(s.id) })),
      knownGaps: parse<string[]>(e.knownGapsJson, []),
      sources: (evSources.get(e.id) ?? []).sort(byPos).map((r) => r.sourceId),
      evidenceStatus: e.evidenceStatus as EventRecord["evidenceStatus"],
      lastVerifiedAt: e.lastVerifiedAt,
      wikidataId: opt(e.wikidataId),
    };
  });

  const relSources = groupBy(relationSourceRows, (r) => r.relationId);
  const relations: Relation[] = relationRows.map((r) => ({
    id: r.id,
    from: r.fromEventId,
    to: r.toEventId,
    type: r.type as Relation["type"],
    basis: r.basis as Relation["basis"],
    description: r.description,
    sourceIds: (relSources.get(r.id) ?? []).map((s) => s.sourceId),
  }));

  const compEvents = groupBy(comparisonEventRows, (r) => r.comparisonId);
  const compSources = groupBy(comparisonSourceRows, (r) => r.comparisonId);
  const comparisons: CuratedComparison[] = comparisonRows.map((c) => ({
    id: c.id,
    title: c.title,
    question: c.question,
    eventIds: (compEvents.get(c.id) ?? []).sort(byPos).map((r) => r.eventId),
    methodologicalNotes: parse<string[]>(c.notesJson, []),
    sourceIds: (compSources.get(c.id) ?? []).map((r) => r.sourceId),
  }));

  return { sources, places, tags, events, relations, comparisons, origins };
}
