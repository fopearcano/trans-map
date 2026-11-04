/**
 * Visual analytics over the *database* (not over history itself): every
 * output describes the coverage of the dataset, and the UI states so.
 */
import type { AtlasEvent, RelationSummary } from "@/domain/atlas";
import { CATEGORY_IDS, FAMILY_IDS, type CategoryId, type FamilyId } from "@/domain/categories";
import { overlaps, PERIODS } from "@/domain/dates";
import { CONTINENT_IDS, SUBREGION_IDS, type ContinentId, type SubregionId } from "@/domain/regions";
import type { EvidenceStatus } from "@/domain/schemas";
import { yearsToExtent } from "./filter";

export interface PeriodDistribution {
  periodId: string;
  counts: Record<FamilyId, number>;
  total: number;
}

export function distributionByPeriod(events: AtlasEvent[]): PeriodDistribution[] {
  return PERIODS.map((p) => {
    const ext = yearsToExtent(p.from, p.to);
    const counts = Object.fromEntries(FAMILY_IDS.map((f) => [f, 0])) as Record<FamilyId, number>;
    for (const e of events) if (overlaps({ start: e.start, end: e.end }, ext)) counts[e.family]++;
    return { periodId: p.id, counts, total: FAMILY_IDS.reduce((n, f) => n + counts[f], 0) };
  });
}

export function distributionByContinent(events: AtlasEvent[]): { continent: ContinentId | "unlocated"; counts: Record<FamilyId, number>; total: number }[] {
  const rows = [...CONTINENT_IDS, "unlocated" as const].map((continent) => {
    const counts = Object.fromEntries(FAMILY_IDS.map((f) => [f, 0])) as Record<FamilyId, number>;
    for (const e of events) {
      const match = continent === "unlocated" ? e.continents.length === 0 : e.continents.includes(continent);
      if (match) counts[e.family]++;
    }
    return { continent, counts, total: FAMILY_IDS.reduce((n, f) => n + counts[f], 0) };
  });
  return rows;
}

export function densityBySubregion(events: AtlasEvent[]): { subregion: SubregionId; count: number }[] {
  return SUBREGION_IDS.map((subregion) => ({ subregion, count: events.filter((e) => e.subregions.includes(subregion)).length })).sort(
    (a, b) => b.count - a.count,
  );
}

export function categoryCounts(events: AtlasEvent[]): { category: CategoryId; count: number }[] {
  return CATEGORY_IDS.map((category) => ({ category, count: events.filter((e) => e.categories.includes(category)).length }));
}

export interface CoverageSummary {
  total: number;
  withCoordinates: number;
  withMetrics: number;
  withFootprint: number;
  byStatus: Record<EvidenceStatus, number>;
  subregionsCovered: number;
  subregionsTotal: number;
}

export function coverage(events: AtlasEvent[]): CoverageSummary {
  const byStatus: Record<EvidenceStatus, number> = { draft: 0, "needs-review": 0, verified: 0, disputed: 0 };
  for (const e of events) byStatus[e.evidenceStatus]++;
  return {
    total: events.length,
    withCoordinates: events.filter((e) => e.points.length > 0).length,
    withMetrics: events.filter((e) => e.metricTypes.length > 0).length,
    withFootprint: events.filter((e) => e.footprintCountryCodes.length > 0 || e.hasGlobalFootprint).length,
    byStatus,
    subregionsCovered: new Set(events.flatMap((e) => e.subregions)).size,
    subregionsTotal: SUBREGION_IDS.length,
  };
}

export interface GraphData {
  nodes: { id: string; title: string; family: FamilyId; degree: number; year: number }[];
  edges: { id: string; source: string; target: string; basis: RelationSummary["basis"]; type: RelationSummary["type"]; description: string }[];
}

export function connectionsGraph(events: AtlasEvent[], relations: RelationSummary[]): GraphData {
  const ids = new Set(events.map((e) => e.id));
  const edges = relations
    .filter((r) => ids.has(r.from) && ids.has(r.to))
    .map((r) => ({ id: r.id, source: r.from, target: r.to, basis: r.basis, type: r.type, description: r.description }));
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.source, (degree.get(e.source) ?? 0) + 1);
    degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
  }
  return {
    nodes: events.map((e) => ({ id: e.id, title: e.title, family: e.family, degree: degree.get(e.id) ?? 0, year: e.startDate.year })),
    edges,
  };
}
