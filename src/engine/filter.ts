/**
 * Filtering engine: categories, tags, time range, evidence status, regions
 * and text query. Pure function, shared by the client and the API.
 */
import type { AtlasEvent } from "@/domain/atlas";
import type { CategoryId } from "@/domain/categories";
import { centuryRange, dateEndValue, overlaps, PERIODS, PRESENT_YEAR, TIMELINE_MIN_YEAR, toAstronomical } from "@/domain/dates";
import type { ContinentId } from "@/domain/regions";
import type { EvidenceStatus } from "@/domain/schemas";
import { search, type SearchDocument } from "./search";

export type TimeSelection =
  | { mode: "all" }
  | { mode: "year"; year: number }
  | { mode: "range"; from: number; to: number }
  | { mode: "century"; century: number }
  | { mode: "period"; periodId: string };

export interface FilterCriteria {
  query?: string;
  categories?: CategoryId[];
  tags?: string[];
  time?: TimeSelection;
  evidence?: EvidenceStatus[];
  continents?: ContinentId[];
  requireCoordinates?: boolean;
}

/** Converts a timeline selection into an inclusive range of historical years. */
export function timeSelectionToYears(sel: TimeSelection | undefined): { from: number; to: number } {
  if (!sel || sel.mode === "all") return { from: TIMELINE_MIN_YEAR, to: PRESENT_YEAR };
  switch (sel.mode) {
    case "year":
      return { from: sel.year, to: sel.year };
    case "range":
      return sel.from <= sel.to ? { from: sel.from, to: sel.to } : { from: sel.to, to: sel.from };
    case "century":
      return centuryRange(sel.century);
    case "period": {
      const p = PERIODS.find((x) => x.id === sel.periodId);
      return p ? { from: p.from, to: p.to } : { from: TIMELINE_MIN_YEAR, to: PRESENT_YEAR };
    }
  }
}

export function yearsToExtent(from: number, to: number) {
  return { start: toAstronomical(from), end: dateEndValue({ year: to }) };
}

export function matchesTime(event: Pick<AtlasEvent, "start" | "end">, sel: TimeSelection | undefined): boolean {
  if (!sel || sel.mode === "all") return true;
  const { from, to } = timeSelectionToYears(sel);
  return overlaps({ start: event.start, end: event.end }, yearsToExtent(from, to));
}

export interface FilterResult {
  events: AtlasEvent[];
  /** Matching events that cannot be drawn on the map (no coordinates). */
  unlocated: AtlasEvent[];
  scores: Map<string, number>;
}

export function filterEvents(events: AtlasEvent[], criteria: FilterCriteria, searchIndex?: SearchDocument[]): FilterResult {
  let scores = new Map<string, number>();
  let pool = events;

  if (criteria.query && criteria.query.trim()) {
    if (!searchIndex) throw new Error("searchIndex required for text queries");
    const hits = search(searchIndex, criteria.query);
    scores = new Map(hits.map((h) => [h.id, h.score]));
    pool = events.filter((e) => scores.has(e.id));
  }

  const cats = criteria.categories && criteria.categories.length > 0 ? new Set(criteria.categories) : null;
  const tags = criteria.tags && criteria.tags.length > 0 ? new Set(criteria.tags) : null;
  const evidence = criteria.evidence && criteria.evidence.length > 0 ? new Set(criteria.evidence) : null;
  const continents = criteria.continents && criteria.continents.length > 0 ? new Set(criteria.continents) : null;

  const out = pool.filter((e) => {
    if (cats && !e.categories.some((c) => cats.has(c))) return false;
    if (tags && !e.tags.some((t) => tags.has(t))) return false;
    if (evidence && !evidence.has(e.evidenceStatus)) return false;
    if (continents && !e.continents.some((c) => continents.has(c))) return false;
    if (criteria.requireCoordinates && e.points.length === 0) return false;
    return matchesTime(e, criteria.time);
  });

  if (scores.size > 0) out.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
  return { events: out, unlocated: out.filter((e) => e.points.length === 0), scores };
}
