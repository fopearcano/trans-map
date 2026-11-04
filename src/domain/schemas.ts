/**
 * Data contracts (Zod). These schemas validate the curated seed data, the
 * API payloads and anything produced by source adapters before it can reach
 * the database. Unknown values are *absent*, never zero.
 */
import { z } from "zod";
import { CATEGORY_IDS } from "./categories";
import { SUBREGION_IDS } from "./regions";
import { ESTIMATE_KINDS, METRIC_TYPE_IDS, METRIC_TYPES, UNCERTAINTY_LEVELS, UNIT_IDS } from "./metrics";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data ISO attesa (YYYY-MM-DD)");
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug non valido");
const wikidataId = z.string().regex(/^Q\d+$/, "Identificativo Wikidata non valido");

export const HistoricalDateSchema = z
  .object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
  })
  .refine((d) => d.year !== 0, { message: "L'anno 0 non esiste nel calendario storico" })
  .refine((d) => d.day === undefined || d.month !== undefined, { message: "Il giorno richiede il mese" });

export const DatePrecisionSchema = z.enum(["day", "month", "year", "decade", "century", "millennium", "millennia"]);

export const SourceTypeSchema = z.enum([
  "encyclopedia",
  "academic",
  "book",
  "institutional",
  "database",
  "primary",
  "news",
]);

export const ReliabilitySchema = z.enum(["high", "medium", "low"]);

export const SourceSchema = z
  .object({
    id: slug,
    type: SourceTypeSchema,
    title: z.string().min(3),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    year: z.number().int().optional(),
    url: z.url().optional(),
    doi: z.string().regex(/^10\.\d{4,9}\/\S+$/).optional(),
    accessedAt: isoDate.optional(),
    reliability: ReliabilitySchema,
    license: z.string().optional(),
    note: z.string().optional(),
  })
  .refine((s) => s.url || s.doi, { message: "Ogni fonte deve essere consultabile (url o DOI)" });

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const LocationPrecisionSchema = z.enum(["exact", "settlement", "approximate", "region", "disputed"]);

export const PlaceSchema = z
  .object({
    id: slug,
    name: z.string().min(2),
    coordinates: CoordinatesSchema.nullable(),
    precision: LocationPrecisionSchema,
    subregion: z.enum(SUBREGION_IDS),
    /** ISO 3166-1 numeric codes of the *present-day* countries. */
    countryCodes: z.array(z.string().regex(/^\d{3}$/)).default([]),
    wikidataId: wikidataId.optional(),
    coordinateSourceIds: z.array(slug).default([]),
    note: z.string().optional(),
  })
  .refine((p) => p.coordinates === null || p.coordinateSourceIds.length > 0, {
    message: "Coordinate senza fonte: indicare coordinateSourceIds",
  });

export const EventLocationSchema = z.object({
  placeId: slug,
  role: z.string().min(2),
  note: z.string().optional(),
});

export const FootprintSchema = z
  .object({
    id: slug,
    /** countries: highlight present-day countries; global: worldwide, no polygon drawn. */
    kind: z.enum(["countries", "global"]),
    label: z.string().min(3),
    countryCodes: z.array(z.string().regex(/^\d{3}$/)).default([]),
    approximation: z.string().min(10),
    sourceIds: z.array(slug).min(1),
  })
  .refine((f) => f.kind === "global" || f.countryCodes.length > 0, { message: "Impronta per Paesi senza Paesi" });

export const PopulationDenominatorSchema = z.object({
  kind: z.enum(["national-population", "affected-area-population", "regional-population", "world-population", "study-population"]),
  value: z.number().positive(),
  year: z.number().int(),
  description: z.string().min(5),
  sourceIds: z.array(slug).min(1),
});

export const MetricSchema = z
  .object({
    id: slug,
    metricType: z.enum(METRIC_TYPE_IDS),
    value: z.number().optional(),
    minEstimate: z.number().optional(),
    maxEstimate: z.number().optional(),
    unit: z.enum(UNIT_IDS),
    estimateKind: z.enum(ESTIMATE_KINDS),
    /** Who produced the figure (government, scholar, agency…). */
    attributedTo: z.string().min(2),
    scope: z.string().optional(),
    measurementPeriod: z.string().optional(),
    populationDenominators: z.array(PopulationDenominatorSchema).default([]),
    methodology: z.string().optional(),
    sourceIds: z.array(slug).min(1, "Ogni metrica richiede almeno una fonte"),
    uncertainty: z.enum(UNCERTAINTY_LEVELS),
    /** Marks the figure used as reference value when several estimates exist. */
    isReference: z.boolean().default(false),
    /** A value of exactly zero is allowed only when explicitly documented. */
    documentedZero: z.boolean().default(false),
    note: z.string().optional(),
  })
  .refine((m) => m.value !== undefined || m.minEstimate !== undefined || m.maxEstimate !== undefined, {
    message: "Una metrica deve avere un valore o un intervallo; i dati sconosciuti vanno omessi",
  })
  .refine((m) => m.minEstimate === undefined || m.maxEstimate === undefined || m.minEstimate <= m.maxEstimate, {
    message: "minEstimate > maxEstimate",
  })
  .refine((m) => (m.value !== 0 && m.minEstimate !== 0 && m.maxEstimate !== 0) || m.documentedZero, {
    message: "Lo zero non può indicare un dato sconosciuto: usare documentedZero solo per zeri documentati",
  })
  .refine((m) => METRIC_TYPES[m.metricType].unit === m.unit, {
    message: "Unità incoerente con il tipo di metrica",
  })
  .refine(
    (m) => METRIC_TYPES[m.metricType].allowsNegative || [m.value, m.minEstimate, m.maxEstimate].every((v) => v === undefined || v >= 0),
    { message: "Valori negativi ammessi solo per metriche di variazione" },
  );

export const QualitativeImpactSchema = z.object({
  domain: z.enum(["environmental", "economic", "social", "political", "cultural", "scientific", "health", "technological"]),
  scale: z.enum(["local", "regional", "global"]),
  text: z.string().min(10),
  duration: z.string().optional(),
  sourceIds: z.array(slug).default([]),
});

export const ConsequenceSchema = z.object({
  kind: z.enum(["direct", "indirect", "long-term"]),
  text: z.string().min(10),
  sourceIds: z.array(slug).default([]),
});

export const InterpretationSchema = z.object({
  text: z.string().min(10),
  heldBy: z.string().optional(),
  sourceIds: z.array(slug).default([]),
});

export const EvidenceStatusSchema = z.enum(["draft", "needs-review", "verified", "disputed"]);

export const EventSchema = z
  .object({
    id: slug,
    title: z.string().min(3),
    summary: z.string().min(20).max(400),
    detailedDescription: z.string().min(40),
    context: z.string().min(20),
    categories: z.array(z.enum(CATEGORY_IDS)).min(1),
    tags: z.array(slug).default([]),
    startDate: HistoricalDateSchema,
    endDate: HistoricalDateSchema.optional(),
    /** The phenomenon is still in progress (extent runs to the present). */
    ongoing: z.boolean().default(false),
    datePrecision: DatePrecisionSchema,
    dateCirca: z.boolean().default(false),
    dateNote: z.string().optional(),
    locations: z.array(EventLocationSchema).default([]),
    locationNote: z.string().optional(),
    geographicFootprints: z.array(FootprintSchema).default([]),
    peopleOrRegionsAffected: z.array(z.string()).default([]),
    quantitativeMetrics: z.array(MetricSchema).default([]),
    qualitativeImpacts: z.array(QualitativeImpactSchema).default([]),
    causes: z.array(z.string().min(5)).default([]),
    consequences: z.array(ConsequenceSchema).default([]),
    interpretations: z.array(InterpretationSchema).default([]),
    controversies: z.array(InterpretationSchema).default([]),
    knownGaps: z.array(z.string()).default([]),
    sources: z.array(slug).min(1, "Ogni evento richiede almeno una fonte"),
    evidenceStatus: EvidenceStatusSchema,
    lastVerifiedAt: isoDate,
    wikidataId: wikidataId.optional(),
  })
  .refine((e) => !e.endDate || e.endDate.year >= e.startDate.year, { message: "endDate precede startDate" })
  .refine((e) => e.locations.length > 0 || !!e.locationNote, {
    message: "Un evento senza luoghi deve spiegare perché (locationNote)",
  });

export const RelationTypeSchema = z.enum([
  "causal",
  "influence",
  "precondition",
  "response",
  "analogy",
  "scale-contrast",
  "same-place",
  "context",
]);

export const RelationSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-{1,2}[a-z0-9]+)*$/, "Identificativo di relazione non valido"),
  from: slug,
  to: slug,
  type: RelationTypeSchema,
  /** documented = attested in sources; editorial = curated thematic analogy. */
  basis: z.enum(["documented", "editorial"]),
  description: z.string().min(10),
  sourceIds: z.array(slug).default([]),
}).refine((r) => r.basis === "editorial" || r.sourceIds.length > 0, {
  message: "Una relazione documentata richiede fonti",
}).refine((r) => r.from !== r.to, { message: "Relazione riflessiva" });

export const CuratedComparisonSchema = z.object({
  id: slug,
  title: z.string().min(5),
  eventIds: z.array(slug).min(2).max(4),
  question: z.string().min(10),
  methodologicalNotes: z.array(z.string().min(10)).min(1),
  sourceIds: z.array(slug).default([]),
});

export const TagSchema = z.object({
  id: slug,
  label: z.string().min(2),
});

export type Source = z.infer<typeof SourceSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type EventInput = z.input<typeof EventSchema>;
export type EventRecord = z.infer<typeof EventSchema>;
export type Metric = z.infer<typeof MetricSchema>;
export type MetricInput = z.input<typeof MetricSchema>;
export type Footprint = z.infer<typeof FootprintSchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type RelationType = z.infer<typeof RelationTypeSchema>;
export type CuratedComparison = z.infer<typeof CuratedComparisonSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;
export type QualitativeImpact = z.infer<typeof QualitativeImpactSchema>;
export type Consequence = z.infer<typeof ConsequenceSchema>;
export type Interpretation = z.infer<typeof InterpretationSchema>;
export type PopulationDenominator = z.infer<typeof PopulationDenominatorSchema>;
