/**
 * Discovery Engine — "Beyond your horizon".
 *
 * Deterministic rules over explicit, curated data: relations between events,
 * shared categories and tags, differences in order of magnitude between
 * compatible metrics, and geographic distance from a horizon the *user*
 * declares. It never claims that an event is unknown to anyone: it only
 * suggests events that are geographically or disciplinarily farther from the
 * chosen point of departure.
 */
import type { AtlasEvent, RelationSummary } from "@/domain/atlas";
import { CATEGORY_FAMILY, type CategoryId } from "@/domain/categories";
import { isRatioScale, METRIC_TYPES, type MetricTypeId } from "@/domain/metrics";
import { CONTINENT_ADJACENCY, SUBREGIONS, type ContinentId, type SubregionId } from "@/domain/regions";

export type ReasonCode =
  | "documented-relation"
  | "editorial-relation"
  | "same-category"
  | "shared-tags"
  | "scale-contrast"
  | "cross-discipline"
  | "distant-region"
  | "outside-horizon";

export interface Reason {
  code: ReasonCode;
  seedId?: string;
  relationId?: string;
  description?: string;
  categories?: CategoryId[];
  tags?: string[];
  metricType?: MetricTypeId;
  factor?: number;
  largerId?: string;
  continents?: ContinentId[];
}

export interface Suggestion {
  event: AtlasEvent;
  score: number;
  reasons: Reason[];
}

export interface DiscoveryOptions {
  horizon: SubregionId[];
  /** Events the user has explored or selected; if empty, events inside the horizon are used. */
  seeds?: string[];
  categories?: CategoryId[];
  limit?: number;
  perSeedLimit?: number;
}

export interface DiscoveryResult {
  horizonContinents: ContinentId[];
  insideHorizon: AtlasEvent[];
  seeds: AtlasEvent[];
  suggestions: Suggestion[];
  bySeed: { seed: AtlasEvent; suggestions: Suggestion[] }[];
}

export const WEIGHTS = {
  documentedRelation: 6,
  editorialRelation: 4,
  sameCategory: 2,
  sharedTag: 1.5,
  maxTagBonus: 3,
  scaleContrast: 2.5,
  crossDiscipline: 1,
  distantContinent: 1.5,
  nonAdjacentContinent: 1,
} as const;

export function isInsideHorizon(event: AtlasEvent, horizon: Set<SubregionId>): boolean {
  return event.subregions.some((s) => horizon.has(s));
}

/** Largest order-of-magnitude contrast between two events on a shared ratio-scale metric. */
export function scaleContrast(a: AtlasEvent, b: AtlasEvent): { metricType: MetricTypeId; factor: number; largerId: string } | null {
  let best: { metricType: MetricTypeId; factor: number; largerId: string } | null = null;
  for (const type of a.metricTypes) {
    if (!isRatioScale(METRIC_TYPES[type].unit)) continue;
    const va = a.sizeMetrics[type]?.value;
    const vb = b.sizeMetrics[type]?.value;
    if (!va || !vb || va <= 0 || vb <= 0) continue;
    const factor = Math.max(va, vb) / Math.min(va, vb);
    if (factor >= 10 && (!best || factor > best.factor)) best = { metricType: type, factor, largerId: va >= vb ? a.id : b.id };
  }
  return best;
}

function scorePair(seed: AtlasEvent, candidate: AtlasEvent, relations: RelationSummary[]): { score: number; reasons: Reason[]; thematic: boolean } {
  const reasons: Reason[] = [];
  let score = 0;
  let thematic = false;

  for (const r of relations) {
    const linked = (r.from === seed.id && r.to === candidate.id) || (r.to === seed.id && r.from === candidate.id);
    if (!linked) continue;
    thematic = true;
    if (r.basis === "documented") {
      score += WEIGHTS.documentedRelation;
      reasons.push({ code: "documented-relation", seedId: seed.id, relationId: r.id, description: r.description });
    } else {
      score += WEIGHTS.editorialRelation;
      reasons.push({ code: "editorial-relation", seedId: seed.id, relationId: r.id, description: r.description });
    }
  }

  const sharedCats = seed.categories.filter((c) => candidate.categories.includes(c));
  if (sharedCats.length) {
    thematic = true;
    score += WEIGHTS.sameCategory;
    reasons.push({ code: "same-category", seedId: seed.id, categories: sharedCats });
  }

  const sharedTags = seed.tags.filter((t) => candidate.tags.includes(t));
  if (sharedTags.length) {
    thematic = true;
    score += Math.min(WEIGHTS.maxTagBonus, sharedTags.length * WEIGHTS.sharedTag);
    reasons.push({ code: "shared-tags", seedId: seed.id, tags: sharedTags });
  }

  const contrast = scaleContrast(seed, candidate);
  if (contrast && thematic) {
    score += WEIGHTS.scaleContrast;
    reasons.push({ code: "scale-contrast", seedId: seed.id, ...contrast });
  }

  const seedFamily = CATEGORY_FAMILY[seed.categories[0]!];
  const candFamilies = new Set(candidate.categories.map((c) => CATEGORY_FAMILY[c]));
  if (thematic && (candFamilies.size > 1 || !candFamilies.has(seedFamily))) {
    score += WEIGHTS.crossDiscipline;
    reasons.push({ code: "cross-discipline", seedId: seed.id });
  }

  return { score, reasons, thematic };
}

function geographicBonus(candidate: AtlasEvent, horizonContinents: Set<ContinentId>): { score: number; reason?: Reason } {
  if (candidate.continents.length === 0) return { score: 0 };
  const distant = candidate.continents.every((c) => !horizonContinents.has(c));
  if (!distant) return { score: 0 };
  const nonAdjacent = candidate.continents.every((c) => [...horizonContinents].every((h) => !CONTINENT_ADJACENCY[h].includes(c)));
  return {
    score: WEIGHTS.distantContinent + (nonAdjacent ? WEIGHTS.nonAdjacentContinent : 0),
    reason: { code: "distant-region", continents: candidate.continents },
  };
}

/** Re-rank to avoid suggesting many events from the same sub-region in a row. */
function diversify(list: Suggestion[]): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Map<string, number>();
  const pool = [...list];
  while (pool.length) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    pool.forEach((s, i) => {
      const key = s.event.subregions[0] ?? "none";
      const adj = s.score - 0.75 * (seen.get(key) ?? 0);
      if (adj > bestAdj) {
        bestAdj = adj;
        bestIdx = i;
      }
    });
    const [picked] = pool.splice(bestIdx, 1);
    const key = picked!.event.subregions[0] ?? "none";
    seen.set(key, (seen.get(key) ?? 0) + 1);
    out.push(picked!);
  }
  return out;
}

export function discover(events: AtlasEvent[], relations: RelationSummary[], options: DiscoveryOptions): DiscoveryResult {
  const horizon = new Set(options.horizon);
  const horizonContinents = new Set([...horizon].map((s) => SUBREGIONS[s].continent));
  const byId = new Map(events.map((e) => [e.id, e]));
  const catFilter = options.categories && options.categories.length ? new Set(options.categories) : null;

  const insideHorizon = events.filter((e) => isInsideHorizon(e, horizon));
  const outside = events.filter((e) => !isInsideHorizon(e, horizon) && (!catFilter || e.categories.some((c) => catFilter.has(c))));

  const explicitSeeds = (options.seeds ?? []).map((id) => byId.get(id)).filter((e): e is AtlasEvent => !!e);
  const seeds = explicitSeeds.length ? explicitSeeds : insideHorizon;

  const aggregate = new Map<string, Suggestion>();
  const bySeed: DiscoveryResult["bySeed"] = [];

  for (const seed of seeds) {
    const local: Suggestion[] = [];
    for (const cand of outside) {
      if (cand.id === seed.id) continue;
      const pair = scorePair(seed, cand, relations);
      if (!pair.thematic) continue;
      const geo = geographicBonus(cand, horizonContinents);
      const reasons = geo.reason ? [...pair.reasons, geo.reason] : pair.reasons;
      const s: Suggestion = { event: cand, score: pair.score + geo.score, reasons };
      local.push(s);
      const prev = aggregate.get(cand.id);
      if (prev) {
        prev.score += pair.score;
        prev.reasons.push(...pair.reasons);
      } else aggregate.set(cand.id, { event: cand, score: s.score, reasons: [...reasons] });
    }
    local.sort((a, b) => b.score - a.score || a.event.start - b.event.start);
    if (local.length) bySeed.push({ seed, suggestions: local.slice(0, options.perSeedLimit ?? 3) });
  }

  // Without thematic matches (e.g. no seeds), fall back to a diverse sample outside the horizon.
  if (aggregate.size === 0) {
    for (const cand of outside) {
      const geo = geographicBonus(cand, horizonContinents);
      aggregate.set(cand.id, {
        event: cand,
        score: geo.score + 0.1 * cand.relationCount,
        reasons: [{ code: "outside-horizon" }, ...(geo.reason ? [geo.reason] : [])],
      });
    }
  }

  bySeed.sort((a, b) => (b.suggestions[0]?.score ?? 0) - (a.suggestions[0]?.score ?? 0));
  const ranked = diversify([...aggregate.values()].sort((a, b) => b.score - a.score || a.event.start - b.event.start));
  return {
    horizonContinents: [...horizonContinents],
    insideHorizon,
    seeds,
    suggestions: ranked.slice(0, options.limit ?? 12),
    bySeed,
  };
}

export interface PathStep {
  event: AtlasEvent;
  via?: RelationSummary;
}

/**
 * Navigable discovery path: a greedy walk on the relation graph that prefers
 * documented links and changes of continent at each step.
 */
export function buildDiscoveryPath(startId: string, events: AtlasEvent[], relations: RelationSummary[], length = 5): PathStep[] {
  const byId = new Map(events.map((e) => [e.id, e]));
  const start = byId.get(startId);
  if (!start) return [];
  const path: PathStep[] = [{ event: start }];
  const visited = new Set([startId]);
  let current = start;
  while (path.length < length) {
    const options = relations
      .filter((r) => r.from === current.id || r.to === current.id)
      .map((r) => ({ r, next: byId.get(r.from === current.id ? r.to : r.from) }))
      .filter((o): o is { r: RelationSummary; next: AtlasEvent } => !!o.next && !visited.has(o.next.id));
    if (!options.length) break;
    const cur = current;
    const scored = options.map((o) => ({
      ...o,
      score:
        (o.r.basis === "documented" ? 2 : 0) +
        (o.next.continents.some((c) => !cur.continents.includes(c)) ? 1.5 : 0) +
        (o.next.family !== cur.family ? 0.5 : 0) +
        0.1 * o.next.relationCount,
    }));
    scored.sort((a, b) => b.score - a.score || a.next.start - b.next.start);
    const chosen = scored[0]!;
    path.push({ event: chosen.next, via: chosen.r });
    visited.add(chosen.next.id);
    current = chosen.next;
  }
  return path;
}
