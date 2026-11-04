/**
 * Writes a validated dataset into the database.
 *
 * Idempotent: curated records are replaced by id inside one transaction;
 * records imported by other pipelines (origin = "imported") are preserved.
 */
import { eq, inArray } from "drizzle-orm";
import { CATEGORY_FAMILY, CATEGORY_IDS } from "@/domain/categories";
import { temporalExtent, PRESENT_YEAR } from "@/domain/dates";
import type { Dataset } from "@/domain/dataset";
import type { EventRecord } from "@/domain/schemas";
import type { TransMapDb } from "./client";
import * as t from "./schema";

const json = (v: unknown) => JSON.stringify(v ?? []);

export function eventTemporalValues(e: Pick<EventRecord, "startDate" | "endDate" | "ongoing">) {
  const extent = temporalExtent(e.startDate, e.ongoing ? { year: PRESENT_YEAR } : e.endDate);
  return { startValue: extent.start, endValue: extent.end };
}

export function writeEvent(tx: TransMapDb, e: EventRecord, origin: "curated" | "imported" = "curated"): void {
  tx.delete(t.events).where(eq(t.events.id, e.id)).run();
  const { startValue, endValue } = eventTemporalValues(e);
  tx.insert(t.events)
    .values({
      id: e.id,
      origin,
      title: e.title,
      summary: e.summary,
      detailedDescription: e.detailedDescription,
      context: e.context,
      startYear: e.startDate.year,
      startMonth: e.startDate.month ?? null,
      startDay: e.startDate.day ?? null,
      endYear: e.endDate?.year ?? null,
      endMonth: e.endDate?.month ?? null,
      endDay: e.endDate?.day ?? null,
      ongoing: e.ongoing,
      datePrecision: e.datePrecision,
      dateCirca: e.dateCirca,
      dateNote: e.dateNote ?? null,
      startValue,
      endValue,
      locationNote: e.locationNote ?? null,
      peopleAffectedJson: json(e.peopleOrRegionsAffected),
      causesJson: json(e.causes),
      knownGapsJson: json(e.knownGaps),
      evidenceStatus: e.evidenceStatus,
      lastVerifiedAt: e.lastVerifiedAt,
      wikidataId: e.wikidataId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .run();

  e.categories.forEach((categoryId, position) => tx.insert(t.eventCategories).values({ eventId: e.id, categoryId, position }).run());
  for (const tagId of e.tags) tx.insert(t.eventTags).values({ eventId: e.id, tagId }).run();
  e.locations.forEach((l, position) =>
    tx.insert(t.eventLocations).values({ eventId: e.id, placeId: l.placeId, role: l.role, note: l.note ?? null, position }).run(),
  );
  e.sources.forEach((sourceId, position) => tx.insert(t.eventSources).values({ eventId: e.id, sourceId, position }).run());
  for (const f of e.geographicFootprints)
    tx.insert(t.footprints)
      .values({
        id: f.id,
        eventId: e.id,
        kind: f.kind,
        label: f.label,
        countryCodesJson: json(f.countryCodes),
        approximation: f.approximation,
        sourceIdsJson: json(f.sourceIds),
      })
      .run();

  e.quantitativeMetrics.forEach((m, position) => {
    tx.insert(t.metrics)
      .values({
        id: m.id,
        eventId: e.id,
        metricType: m.metricType,
        value: m.value ?? null,
        minEstimate: m.minEstimate ?? null,
        maxEstimate: m.maxEstimate ?? null,
        unit: m.unit,
        estimateKind: m.estimateKind,
        attributedTo: m.attributedTo,
        scope: m.scope ?? null,
        measurementPeriod: m.measurementPeriod ?? null,
        methodology: m.methodology ?? null,
        uncertainty: m.uncertainty,
        isReference: m.isReference,
        documentedZero: m.documentedZero,
        note: m.note ?? null,
        position,
      })
      .run();
    for (const sourceId of m.sourceIds) tx.insert(t.metricSources).values({ metricId: m.id, sourceId }).run();
    for (const den of m.populationDenominators)
      tx.insert(t.metricDenominators)
        .values({ metricId: m.id, kind: den.kind, value: den.value, year: den.year, description: den.description, sourceIdsJson: json(den.sourceIds) })
        .run();
  });

  const statements: { kind: string; subtype?: string; scale?: string; duration?: string; heldBy?: string; text: string; sourceIds: string[] }[] = [
    ...e.consequences.map((c) => ({ kind: "consequence", subtype: c.kind, text: c.text, sourceIds: c.sourceIds })),
    ...e.interpretations.map((c) => ({ kind: "interpretation", heldBy: c.heldBy, text: c.text, sourceIds: c.sourceIds })),
    ...e.controversies.map((c) => ({ kind: "controversy", heldBy: c.heldBy, text: c.text, sourceIds: c.sourceIds })),
    ...e.qualitativeImpacts.map((q) => ({ kind: "impact", subtype: q.domain, scale: q.scale, duration: q.duration, text: q.text, sourceIds: q.sourceIds })),
  ];
  statements.forEach((s, position) => {
    const row = tx
      .insert(t.eventStatements)
      .values({
        eventId: e.id,
        kind: s.kind,
        subtype: s.subtype ?? null,
        scale: s.scale ?? null,
        duration: s.duration ?? null,
        heldBy: s.heldBy ?? null,
        text: s.text,
        position,
      })
      .returning({ id: t.eventStatements.id })
      .get();
    for (const sourceId of s.sourceIds) tx.insert(t.statementSources).values({ statementId: row.id, sourceId }).run();
  });
}

export function writeDataset(db: TransMapDb, dataset: Dataset): { events: number } {
  db.transaction((tx) => {
    for (const id of CATEGORY_IDS)
      tx.insert(t.categories).values({ id, family: CATEGORY_FAMILY[id] }).onConflictDoUpdate({ target: t.categories.id, set: { family: CATEGORY_FAMILY[id] } }).run();

    for (const s of dataset.sources) {
      const values = {
        id: s.id,
        type: s.type,
        title: s.title,
        authorsJson: s.authors ? JSON.stringify(s.authors) : null,
        publisher: s.publisher ?? null,
        year: s.year ?? null,
        url: s.url ?? null,
        doi: s.doi ?? null,
        accessedAt: s.accessedAt ?? null,
        reliability: s.reliability,
        license: s.license ?? null,
        note: s.note ?? null,
      };
      tx.insert(t.sources).values(values).onConflictDoUpdate({ target: t.sources.id, set: values }).run();
    }

    for (const tag of dataset.tags)
      tx.insert(t.tags).values(tag).onConflictDoUpdate({ target: t.tags.id, set: { label: tag.label } }).run();

    for (const p of dataset.places) {
      const values = {
        id: p.id,
        name: p.name,
        lat: p.coordinates?.lat ?? null,
        lon: p.coordinates?.lon ?? null,
        precision: p.precision,
        subregion: p.subregion,
        countryCodesJson: json(p.countryCodes),
        wikidataId: p.wikidataId ?? null,
        note: p.note ?? null,
      };
      tx.insert(t.places).values(values).onConflictDoUpdate({ target: t.places.id, set: values }).run();
      tx.delete(t.placeSources).where(eq(t.placeSources.placeId, p.id)).run();
      for (const sourceId of p.coordinateSourceIds) tx.insert(t.placeSources).values({ placeId: p.id, sourceId }).run();
    }

    for (const e of dataset.events) writeEvent(tx as unknown as TransMapDb, e, "curated");

    const relationIds = dataset.relations.map((r) => r.id);
    if (relationIds.length) tx.delete(t.relations).where(inArray(t.relations.id, relationIds)).run();
    for (const r of dataset.relations) {
      tx.insert(t.relations).values({ id: r.id, fromEventId: r.from, toEventId: r.to, type: r.type, basis: r.basis, description: r.description }).run();
      for (const sourceId of r.sourceIds) tx.insert(t.relationSources).values({ relationId: r.id, sourceId }).run();
    }

    const comparisonIds = dataset.comparisons.map((c) => c.id);
    if (comparisonIds.length) tx.delete(t.comparisons).where(inArray(t.comparisons.id, comparisonIds)).run();
    for (const c of dataset.comparisons) {
      tx.insert(t.comparisons).values({ id: c.id, title: c.title, question: c.question, notesJson: json(c.methodologicalNotes) }).run();
      c.eventIds.forEach((eventId, position) => tx.insert(t.comparisonEvents).values({ comparisonId: c.id, eventId, position }).run());
      for (const sourceId of c.sourceIds) tx.insert(t.comparisonSources).values({ comparisonId: c.id, sourceId }).run();
    }
  });
  return { events: dataset.events.length };
}
