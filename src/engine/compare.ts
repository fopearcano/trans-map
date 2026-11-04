/**
 * Comparative Engine.
 *
 * Rules:
 * 1. Only metrics with the same type (and therefore the same unit and
 *    definition) are divided by each other.
 * 2. Mortality figures with different definitions (direct vs total…) are
 *    shown in a separate "cross-definition" section, always with a warning.
 * 3. Several estimates of the same quantity are kept: ratios are given for
 *    the reference values *and* as a range across all estimates.
 * 4. Per-capita figures are compared only when denominators are of the same
 *    kind (e.g. national population vs national population).
 * 5. Unknown values are reported as missing, never as zero.
 * 6. No overall "importance" score is ever computed.
 */
import { metricBounds, metricReferenceValue, referenceMetric } from "@/domain/atlas";
import { CATEGORY_FAMILY } from "@/domain/categories";
import { PRESENT_YEAR, temporalExtent } from "@/domain/dates";
import { isRatioScale, METRIC_TYPES, type MetricFamily, type MetricTypeId, type UnitId } from "@/domain/metrics";
import type { Consequence, EventRecord, Metric, PopulationDenominator, QualitativeImpact, Relation } from "@/domain/schemas";

export interface EstimateView {
  metricId: string;
  metricType: MetricTypeId;
  value?: number;
  minEstimate?: number;
  maxEstimate?: number;
  estimateKind: Metric["estimateKind"];
  attributedTo: string;
  scope?: string;
  measurementPeriod?: string;
  uncertainty: Metric["uncertainty"];
  isReference: boolean;
  note?: string;
  sourceIds: string[];
}

export interface MetricEntry {
  eventId: string;
  metricType: MetricTypeId;
  reference: { value: number; approx: boolean; metricId: string; estimateKind: Metric["estimateKind"]; uncertainty: Metric["uncertainty"] };
  envelope: { low: number; high: number };
  estimates: EstimateView[];
  denominators: PopulationDenominator[];
}

export interface PairRatio {
  numeratorId: string;
  denominatorId: string;
  reference: number;
  low: number;
  high: number;
}

export interface PerCapitaEntry {
  eventId: string;
  denominator: PopulationDenominator;
  perMillion: number;
  perMillionLow: number;
  perMillionHigh: number;
  percent: number;
}

export interface PerCapitaGroup {
  kind: PopulationDenominator["kind"];
  entries: PerCapitaEntry[];
  /** true when at least two events share this denominator kind. */
  comparable: boolean;
  ratios: PairRatio[];
}

export type CompareWarning =
  | { code: "definitions-differ"; types: MetricTypeId[] }
  | { code: "estimate-kinds-differ"; kinds: string[] }
  | { code: "approximate-reference"; eventIds: string[] }
  | { code: "non-ratio-scale" }
  | { code: "scopes-differ" }
  | { code: "very-high-uncertainty"; eventIds: string[] }
  | { code: "wide-ratio-range"; factor: number }
  | { code: "documented-zero" };

export interface MetricRow {
  key: string;
  metricType: MetricTypeId;
  family: MetricFamily;
  unit: UnitId;
  comparability: "same-definition" | "cross-definition";
  entries: MetricEntry[];
  ratios: PairRatio[];
  perCapita: PerCapitaGroup[];
  warnings: CompareWarning[];
}

export interface MissingMetric {
  metricType: MetricTypeId;
  presentIn: string[];
  missingIn: string[];
}

export interface QualitativeProfile {
  eventId: string;
  impactsByDomain: Partial<Record<QualitativeImpact["domain"], QualitativeImpact[]>>;
  consequences: Record<Consequence["kind"], Consequence[]>;
  causes: string[];
  families: string[];
}

export interface TemporalProfile {
  eventId: string;
  start: number;
  end: number;
  durationYears: number;
  ongoing: boolean;
}

export interface ComparisonResult {
  eventIds: string[];
  sharedRows: MetricRow[];
  crossDefinitionRows: MetricRow[];
  exclusive: { eventId: string; rows: MetricEntry[] }[];
  missing: MissingMetric[];
  qualitative: QualitativeProfile[];
  temporal: TemporalProfile[];
  sharedCategories: string[];
  sharedTags: string[];
  relationsBetween: Relation[];
  crossDiscipline: boolean;
}

const MORTALITY_BREADTH: MetricTypeId[] = ["deaths_total", "deaths_direct"];

function toEstimateView(m: Metric): EstimateView {
  return {
    metricId: m.id,
    metricType: m.metricType,
    value: m.value,
    minEstimate: m.minEstimate,
    maxEstimate: m.maxEstimate,
    estimateKind: m.estimateKind,
    attributedTo: m.attributedTo,
    scope: m.scope,
    measurementPeriod: m.measurementPeriod,
    uncertainty: m.uncertainty,
    isReference: m.isReference,
    note: m.note,
    sourceIds: m.sourceIds,
  };
}

export function buildEntry(event: EventRecord, type: MetricTypeId): MetricEntry | null {
  const ofType = event.quantitativeMetrics.filter((m) => m.metricType === type);
  const ref = referenceMetric(event.quantitativeMetrics, type);
  if (!ref) return null;
  const rv = metricReferenceValue(ref);
  if (!rv) return null;
  const bounds = ofType.map(metricBounds).filter((b): b is { low: number; high: number } => !!b);
  return {
    eventId: event.id,
    metricType: type,
    reference: { value: rv.value, approx: rv.approx, metricId: ref.id, estimateKind: ref.estimateKind, uncertainty: ref.uncertainty },
    envelope: { low: Math.min(...bounds.map((b) => b.low)), high: Math.max(...bounds.map((b) => b.high)) },
    estimates: ofType.map(toEstimateView),
    denominators: ref.populationDenominators,
  };
}

export function pairRatios(entries: MetricEntry[]): PairRatio[] {
  const out: PairRatio[] = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]!;
      const b = entries[j]!;
      if (a.reference.value <= 0 || b.reference.value <= 0) continue;
      const [num, den] = a.reference.value >= b.reference.value ? [a, b] : [b, a];
      out.push({
        numeratorId: num.eventId,
        denominatorId: den.eventId,
        reference: num.reference.value / den.reference.value,
        low: num.envelope.low / den.envelope.high,
        high: num.envelope.high / Math.max(den.envelope.low, Number.EPSILON),
      });
    }
  }
  return out;
}

function perCapitaGroups(entries: MetricEntry[]): PerCapitaGroup[] {
  const byKind = new Map<PopulationDenominator["kind"], PerCapitaEntry[]>();
  for (const e of entries) {
    for (const den of e.denominators) {
      const list = byKind.get(den.kind) ?? [];
      list.push({
        eventId: e.eventId,
        denominator: den,
        perMillion: (e.reference.value / den.value) * 1e6,
        perMillionLow: (e.envelope.low / den.value) * 1e6,
        perMillionHigh: (e.envelope.high / den.value) * 1e6,
        percent: (e.reference.value / den.value) * 100,
      });
      byKind.set(den.kind, list);
    }
  }
  return [...byKind.entries()].map(([kind, list]) => {
    const comparable = new Set(list.map((x) => x.eventId)).size >= 2;
    const ratios: PairRatio[] = [];
    if (comparable) {
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]!;
          const b = list[j]!;
          if (a.eventId === b.eventId) continue;
          const [num, den] = a.perMillion >= b.perMillion ? [a, b] : [b, a];
          ratios.push({
            numeratorId: num.eventId,
            denominatorId: den.eventId,
            reference: num.perMillion / den.perMillion,
            low: num.perMillionLow / den.perMillionHigh,
            high: num.perMillionHigh / den.perMillionLow,
          });
        }
    }
    return { kind, entries: list, comparable, ratios };
  });
}

function rowWarnings(entries: MetricEntry[], unit: UnitId, crossDefinition: boolean): CompareWarning[] {
  const warnings: CompareWarning[] = [];
  if (crossDefinition) warnings.push({ code: "definitions-differ", types: [...new Set(entries.map((e) => e.metricType))] });
  const kinds = [...new Set(entries.map((e) => e.reference.estimateKind))];
  if (kinds.length > 1) warnings.push({ code: "estimate-kinds-differ", kinds });
  const approx = entries.filter((e) => e.reference.approx).map((e) => e.eventId);
  if (approx.length) warnings.push({ code: "approximate-reference", eventIds: approx });
  if (!isRatioScale(unit)) warnings.push({ code: "non-ratio-scale" });
  const scopes = new Set(entries.map((e) => e.estimates.find((x) => x.metricId === e.reference.metricId)?.scope ?? ""));
  if (scopes.size > 1 && [...scopes].some((s) => s !== "")) warnings.push({ code: "scopes-differ" });
  const vh = entries.filter((e) => e.reference.uncertainty === "very-high").map((e) => e.eventId);
  if (vh.length) warnings.push({ code: "very-high-uncertainty", eventIds: vh });
  return warnings;
}

function finalizeRow(metricType: MetricTypeId, entries: MetricEntry[], comparability: MetricRow["comparability"]): MetricRow {
  const def = METRIC_TYPES[metricType];
  const ratioScale = isRatioScale(def.unit);
  const ratios = ratioScale ? pairRatios(entries) : [];
  const warnings = rowWarnings(entries, def.unit, comparability === "cross-definition");
  for (const r of ratios) {
    if (r.low > 0 && r.high / r.low >= 10) {
      warnings.push({ code: "wide-ratio-range", factor: r.high / r.low });
      break;
    }
  }
  return {
    key: `${comparability}:${entries.map((e) => `${e.eventId}/${e.metricType}`).join("|")}`,
    metricType,
    family: def.family,
    unit: def.unit,
    comparability,
    entries,
    ratios,
    perCapita: ratioScale && comparability === "same-definition" ? perCapitaGroups(entries) : [],
    warnings,
  };
}

function groupConsequences(list: Consequence[]): Record<Consequence["kind"], Consequence[]> {
  return {
    direct: list.filter((c) => c.kind === "direct"),
    indirect: list.filter((c) => c.kind === "indirect"),
    "long-term": list.filter((c) => c.kind === "long-term"),
  };
}

export function compareEvents(events: EventRecord[], relations: Relation[] = []): ComparisonResult {
  const ids = events.map((e) => e.id);
  const allTypes = new Set<MetricTypeId>();
  for (const e of events) for (const m of e.quantitativeMetrics) allTypes.add(m.metricType);

  const sharedRows: MetricRow[] = [];
  const exclusiveMap = new Map<string, MetricEntry[]>(ids.map((id) => [id, []]));
  const missing: MissingMetric[] = [];

  for (const type of allTypes) {
    const entries = events.map((e) => buildEntry(e, type)).filter((x): x is MetricEntry => !!x);
    if (entries.length >= 2) sharedRows.push(finalizeRow(type, entries, "same-definition"));
    else if (entries.length === 1) exclusiveMap.get(entries[0]!.eventId)!.push(entries[0]!);
    if (entries.length < events.length) {
      const present = entries.map((x) => x.eventId);
      missing.push({ metricType: type, presentIn: present, missingIn: ids.filter((id) => !present.includes(id)) });
    }
  }

  // Cross-definition mortality comparison: broadest available mortality figure per event.
  const crossDefinitionRows: MetricRow[] = [];
  const broadest = events
    .map((e) => {
      for (const type of MORTALITY_BREADTH) {
        const entry = buildEntry(e, type);
        if (entry) return entry;
      }
      return null;
    })
    .filter((x): x is MetricEntry => !!x);
  if (broadest.length >= 2 && new Set(broadest.map((b) => b.metricType)).size > 1) {
    crossDefinitionRows.push(finalizeRow("deaths_total", broadest, "cross-definition"));
  }

  const familyOrder: MetricFamily[] = ["mortality", "exposure", "demography", "physical", "environmental", "economic", "diffusion"];
  sharedRows.sort((a, b) => familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family) || a.metricType.localeCompare(b.metricType));

  const qualitative: QualitativeProfile[] = events.map((e) => {
    const byDomain: QualitativeProfile["impactsByDomain"] = {};
    for (const q of e.qualitativeImpacts) (byDomain[q.domain] ??= []).push(q);
    return {
      eventId: e.id,
      impactsByDomain: byDomain,
      consequences: groupConsequences(e.consequences),
      causes: e.causes,
      families: [...new Set(e.categories.map((c) => CATEGORY_FAMILY[c]))],
    };
  });

  const temporal: TemporalProfile[] = events.map((e) => {
    const ext = temporalExtent(e.startDate, e.ongoing ? { year: PRESENT_YEAR } : e.endDate);
    return { eventId: e.id, start: ext.start, end: ext.end, durationYears: ext.end - ext.start, ongoing: e.ongoing };
  });

  const intersection = <T>(lists: T[][]): T[] => (lists.length === 0 ? [] : lists.reduce((acc, l) => acc.filter((x) => l.includes(x))));
  const families = new Set(events.map((e) => CATEGORY_FAMILY[e.categories[0]!]));
  const idSet = new Set(ids);

  return {
    eventIds: ids,
    sharedRows,
    crossDefinitionRows,
    exclusive: [...exclusiveMap.entries()].map(([eventId, rows]) => ({ eventId, rows })),
    missing,
    qualitative,
    temporal,
    sharedCategories: intersection(events.map((e) => e.categories as string[])),
    sharedTags: intersection(events.map((e) => e.tags)),
    relationsBetween: relations.filter((r) => idSet.has(r.from) && idSet.has(r.to)),
    crossDiscipline: families.size > 1,
  };
}
