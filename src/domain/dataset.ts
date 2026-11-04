/**
 * Dataset validation: schema validation (Zod) + referential integrity.
 * Used by the seed script, the `data:validate` CLI and the unit tests, and by
 * source adapters before anything imported can be stored.
 */
import { z } from "zod";
import {
  CuratedComparisonSchema,
  EventSchema,
  PlaceSchema,
  RelationSchema,
  SourceSchema,
  TagSchema,
  type CuratedComparison,
  type EventRecord,
  type Place,
  type Relation,
  type Source,
  type Tag,
} from "./schemas";

export interface Dataset {
  events: EventRecord[];
  sources: Source[];
  places: Place[];
  tags: Tag[];
  relations: Relation[];
  comparisons: CuratedComparison[];
}

export interface DatasetIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface RawDataset {
  events: unknown[];
  sources: unknown[];
  places: unknown[];
  tags: unknown[];
  relations: unknown[];
  comparisons: unknown[];
}

function parseAll<T>(schema: z.ZodType<T>, items: unknown[], label: string, issues: DatasetIssue[]): T[] {
  const out: T[] = [];
  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    const id = (item as { id?: string })?.id ?? `#${index}`;
    if (result.success) out.push(result.data);
    else
      for (const issue of result.error.issues)
        issues.push({ level: "error", path: `${label}/${id}/${issue.path.join(".")}`, message: issue.message });
  });
  return out;
}

function checkUnique(ids: string[], label: string, issues: DatasetIssue[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push({ level: "error", path: `${label}/${id}`, message: "Identificativo duplicato" });
    seen.add(id);
  }
}

export function validateDataset(raw: RawDataset): { dataset: Dataset; issues: DatasetIssue[] } {
  const issues: DatasetIssue[] = [];
  const dataset: Dataset = {
    sources: parseAll(SourceSchema, raw.sources, "sources", issues),
    places: parseAll(PlaceSchema, raw.places, "places", issues),
    tags: parseAll(TagSchema, raw.tags, "tags", issues),
    events: parseAll(EventSchema, raw.events, "events", issues),
    relations: parseAll(RelationSchema, raw.relations, "relations", issues),
    comparisons: parseAll(CuratedComparisonSchema, raw.comparisons, "comparisons", issues),
  };

  checkUnique(dataset.sources.map((s) => s.id), "sources", issues);
  checkUnique(dataset.places.map((p) => p.id), "places", issues);
  checkUnique(dataset.tags.map((t) => t.id), "tags", issues);
  checkUnique(dataset.events.map((e) => e.id), "events", issues);
  checkUnique(dataset.relations.map((r) => r.id), "relations", issues);
  checkUnique(dataset.comparisons.map((c) => c.id), "comparisons", issues);
  checkUnique(dataset.events.flatMap((e) => e.quantitativeMetrics.map((m) => m.id)), "metrics", issues);

  const sourceIds = new Set(dataset.sources.map((s) => s.id));
  const placeIds = new Set(dataset.places.map((p) => p.id));
  const tagIds = new Set(dataset.tags.map((t) => t.id));
  const eventIds = new Set(dataset.events.map((e) => e.id));

  const needSource = (ids: string[], path: string) => {
    for (const id of ids) if (!sourceIds.has(id)) issues.push({ level: "error", path, message: `Fonte inesistente: ${id}` });
  };

  for (const place of dataset.places) needSource(place.coordinateSourceIds, `places/${place.id}`);

  for (const e of dataset.events) {
    const base = `events/${e.id}`;
    needSource(e.sources, `${base}/sources`);
    for (const loc of e.locations)
      if (!placeIds.has(loc.placeId)) issues.push({ level: "error", path: `${base}/locations`, message: `Luogo inesistente: ${loc.placeId}` });
    for (const tag of e.tags) if (!tagIds.has(tag)) issues.push({ level: "error", path: `${base}/tags`, message: `Tag inesistente: ${tag}` });
    for (const m of e.quantitativeMetrics) {
      needSource(m.sourceIds, `${base}/metrics/${m.id}`);
      for (const den of m.populationDenominators) needSource(den.sourceIds, `${base}/metrics/${m.id}/denominator`);
    }
    for (const f of e.geographicFootprints) needSource(f.sourceIds, `${base}/footprints/${f.id}`);
    for (const c of e.consequences) needSource(c.sourceIds, `${base}/consequences`);
    for (const c of [...e.interpretations, ...e.controversies]) needSource(c.sourceIds, `${base}/interpretations`);
    for (const q of e.qualitativeImpacts) needSource(q.sourceIds, `${base}/impacts`);

    // Every source cited in the event body should appear in the event bibliography.
    const cited = new Set<string>([
      ...e.quantitativeMetrics.flatMap((m) => [...m.sourceIds, ...m.populationDenominators.flatMap((d) => d.sourceIds)]),
      ...e.consequences.flatMap((c) => c.sourceIds),
      ...e.interpretations.flatMap((c) => c.sourceIds),
      ...e.controversies.flatMap((c) => c.sourceIds),
      ...e.qualitativeImpacts.flatMap((c) => c.sourceIds),
      ...e.geographicFootprints.flatMap((c) => c.sourceIds),
    ]);
    for (const id of cited)
      if (!e.sources.includes(id))
        issues.push({ level: "warning", path: `${base}/sources`, message: `Fonte citata nel testo ma assente dalla bibliografia dell'evento: ${id}` });

    const typesWithReference = new Map<string, number>();
    for (const m of e.quantitativeMetrics) if (m.isReference) typesWithReference.set(m.metricType, (typesWithReference.get(m.metricType) ?? 0) + 1);
    for (const [type, count] of typesWithReference)
      if (count > 1) issues.push({ level: "error", path: `${base}/metrics`, message: `Più valori di riferimento per ${type}` });
  }

  for (const r of dataset.relations) {
    if (!eventIds.has(r.from)) issues.push({ level: "error", path: `relations/${r.id}`, message: `Evento inesistente: ${r.from}` });
    if (!eventIds.has(r.to)) issues.push({ level: "error", path: `relations/${r.id}`, message: `Evento inesistente: ${r.to}` });
    needSource(r.sourceIds, `relations/${r.id}`);
  }
  for (const c of dataset.comparisons) {
    for (const id of c.eventIds) if (!eventIds.has(id)) issues.push({ level: "error", path: `comparisons/${c.id}`, message: `Evento inesistente: ${id}` });
    needSource(c.sourceIds, `comparisons/${c.id}`);
  }

  return { dataset, issues };
}
