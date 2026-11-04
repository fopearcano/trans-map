/**
 * Lightweight atlas index: everything the map, timeline, filters, search and
 * discovery engine need, without long texts. Built server-side from the
 * dataset and shipped to the client once.
 */
import { familyOf, type CategoryId, type FamilyId } from "./categories";
import { PRESENT_YEAR, temporalExtent, type DatePrecision, type HistoricalDate } from "./dates";
import { METRIC_TYPES, type MetricTypeId } from "./metrics";
import { SUBREGIONS, type ContinentId, type SubregionId } from "./regions";
import type { Dataset } from "./dataset";
import type { EvidenceStatus, Metric, Relation } from "./schemas";

export interface AtlasPoint {
  placeId: string;
  name: string;
  lat: number;
  lon: number;
  precision: "exact" | "settlement" | "approximate" | "region" | "disputed";
  role: string;
}

export interface ReferenceValue {
  value: number;
  low: number;
  high: number;
  /** true when the reference is a range midpoint or a single bound. */
  approx: boolean;
  metricId: string;
}

export interface AtlasEvent {
  id: string;
  title: string;
  summary: string;
  categories: CategoryId[];
  family: FamilyId;
  tags: string[];
  startDate: HistoricalDate;
  endDate: HistoricalDate | null;
  ongoing: boolean;
  datePrecision: DatePrecision;
  dateCirca: boolean;
  start: number;
  end: number;
  points: AtlasPoint[];
  subregions: SubregionId[];
  continents: ContinentId[];
  countryCodes: string[];
  footprintCountryCodes: string[];
  hasGlobalFootprint: boolean;
  evidenceStatus: EvidenceStatus;
  sizeMetrics: Partial<Record<MetricTypeId, ReferenceValue>>;
  metricTypes: MetricTypeId[];
  relationCount: number;
  placeNames: string[];
}

/** Envelope (lowest low, highest high) across all estimates of one metric type. */
export function metricBounds(m: Metric): { low: number; high: number } | null {
  const candidates = [m.minEstimate, m.value, m.maxEstimate].filter((v): v is number => typeof v === "number");
  if (candidates.length === 0) return null;
  return { low: Math.min(...candidates), high: Math.max(...candidates) };
}

/**
 * Reference value of a metric: the explicit value, else the midpoint of a
 * closed range, else the single bound available (flagged as approximate).
 */
export function metricReferenceValue(m: Metric): { value: number; approx: boolean } | null {
  if (typeof m.value === "number") return { value: m.value, approx: false };
  if (typeof m.minEstimate === "number" && typeof m.maxEstimate === "number")
    return { value: (m.minEstimate + m.maxEstimate) / 2, approx: true };
  if (typeof m.minEstimate === "number") return { value: m.minEstimate, approx: true };
  if (typeof m.maxEstimate === "number") return { value: m.maxEstimate, approx: true };
  return null;
}

/** Picks the reference metric of a type for an event (isReference first). */
export function referenceMetric(metrics: Metric[], type: MetricTypeId): Metric | undefined {
  const ofType = metrics.filter((m) => m.metricType === type);
  return ofType.find((m) => m.isReference) ?? ofType[0];
}

export function referenceValueFor(metrics: Metric[], type: MetricTypeId): ReferenceValue | null {
  const ref = referenceMetric(metrics, type);
  if (!ref) return null;
  const rv = metricReferenceValue(ref);
  if (!rv) return null;
  const all = metrics.filter((m) => m.metricType === type).map(metricBounds).filter((b): b is { low: number; high: number } => !!b);
  return {
    value: rv.value,
    approx: rv.approx,
    low: Math.min(...all.map((b) => b.low)),
    high: Math.max(...all.map((b) => b.high)),
    metricId: ref.id,
  };
}

export function buildAtlasIndex(dataset: Dataset): AtlasEvent[] {
  const placeById = new Map(dataset.places.map((p) => [p.id, p]));
  const relationCount = new Map<string, number>();
  for (const r of dataset.relations) {
    relationCount.set(r.from, (relationCount.get(r.from) ?? 0) + 1);
    relationCount.set(r.to, (relationCount.get(r.to) ?? 0) + 1);
  }

  return dataset.events
    .map((e) => {
      const points: AtlasPoint[] = [];
      const subregions = new Set<SubregionId>();
      const countryCodes = new Set<string>();
      const placeNames: string[] = [];
      for (const loc of e.locations) {
        const place = placeById.get(loc.placeId);
        if (!place) continue;
        placeNames.push(place.name);
        subregions.add(place.subregion);
        place.countryCodes.forEach((c) => countryCodes.add(c));
        if (place.coordinates)
          points.push({ placeId: place.id, name: place.name, lat: place.coordinates.lat, lon: place.coordinates.lon, precision: place.precision, role: loc.role });
      }
      const footprintCountryCodes = [...new Set(e.geographicFootprints.flatMap((f) => f.countryCodes))];
      footprintCountryCodes.forEach((c) => countryCodes.add(c));

      const sizeMetrics: Partial<Record<MetricTypeId, ReferenceValue>> = {};
      const metricTypes = [...new Set(e.quantitativeMetrics.map((m) => m.metricType))];
      for (const type of metricTypes) {
        const rv = referenceValueFor(e.quantitativeMetrics, type);
        if (rv) sizeMetrics[type] = rv;
      }

      const extent = temporalExtent(e.startDate, e.ongoing ? { year: PRESENT_YEAR } : e.endDate);
      const primary = e.categories[0]!;
      return {
        id: e.id,
        title: e.title,
        summary: e.summary,
        categories: e.categories,
        family: familyOf(primary).id,
        tags: e.tags,
        startDate: e.startDate,
        endDate: e.endDate ?? null,
        ongoing: e.ongoing,
        datePrecision: e.datePrecision,
        dateCirca: e.dateCirca,
        start: extent.start,
        end: extent.end,
        points,
        subregions: [...subregions],
        continents: [...new Set([...subregions].map((s) => SUBREGIONS[s].continent))],
        countryCodes: [...countryCodes],
        footprintCountryCodes,
        hasGlobalFootprint: e.geographicFootprints.some((f) => f.kind === "global"),
        evidenceStatus: e.evidenceStatus,
        sizeMetrics,
        metricTypes,
        relationCount: relationCount.get(e.id) ?? 0,
        placeNames,
      } satisfies AtlasEvent;
    })
    .sort((a, b) => a.start - b.start);
}

export interface RelationSummary {
  id: string;
  from: string;
  to: string;
  type: Relation["type"];
  basis: Relation["basis"];
  description: string;
}

export function summarizeRelations(relations: Relation[]): RelationSummary[] {
  return relations.map(({ id, from, to, type, basis, description }) => ({ id, from, to, type, basis, description }));
}

export const SIZABLE_METRICS: MetricTypeId[] = (Object.keys(METRIC_TYPES) as MetricTypeId[]).filter((k) => METRIC_TYPES[k].mapSizable);
