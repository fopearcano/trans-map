/**
 * SQLite schema (Drizzle ORM). Normalised so that the same model maps onto
 * PostgreSQL/PostGIS later: coordinates are plain lat/lon columns today and
 * can become a geography column; JSON text columns become jsonb.
 */
import { sqliteTable, text, integer, real, primaryKey, index } from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  authorsJson: text("authors_json"),
  publisher: text("publisher"),
  year: integer("year"),
  url: text("url"),
  doi: text("doi"),
  accessedAt: text("accessed_at"),
  reliability: text("reliability").notNull(),
  license: text("license"),
  note: text("note"),
});

export const places = sqliteTable("places", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  lat: real("lat"),
  lon: real("lon"),
  precision: text("precision").notNull(),
  subregion: text("subregion").notNull(),
  countryCodesJson: text("country_codes_json").notNull().default("[]"),
  wikidataId: text("wikidata_id"),
  note: text("note"),
});

export const placeSources = sqliteTable(
  "place_sources",
  {
    placeId: text("place_id").notNull().references(() => places.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.placeId, t.sourceId] })],
);

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  family: text("family").notNull(),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    origin: text("origin").notNull().default("curated"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    detailedDescription: text("detailed_description").notNull(),
    context: text("context").notNull(),
    startYear: integer("start_year").notNull(),
    startMonth: integer("start_month"),
    startDay: integer("start_day"),
    endYear: integer("end_year"),
    endMonth: integer("end_month"),
    endDay: integer("end_day"),
    ongoing: integer("ongoing", { mode: "boolean" }).notNull().default(false),
    datePrecision: text("date_precision").notNull(),
    dateCirca: integer("date_circa", { mode: "boolean" }).notNull().default(false),
    dateNote: text("date_note"),
    /** Continuous astronomical values for range queries. */
    startValue: real("start_value").notNull(),
    endValue: real("end_value").notNull(),
    locationNote: text("location_note"),
    peopleAffectedJson: text("people_affected_json").notNull().default("[]"),
    causesJson: text("causes_json").notNull().default("[]"),
    knownGapsJson: text("known_gaps_json").notNull().default("[]"),
    evidenceStatus: text("evidence_status").notNull(),
    lastVerifiedAt: text("last_verified_at").notNull(),
    wikidataId: text("wikidata_id"),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("events_time_idx").on(t.startValue, t.endValue), index("events_status_idx").on(t.evidenceStatus)],
);

export const eventTranslations = sqliteTable(
  "event_translations",
  {
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    detailedDescription: text("detailed_description"),
    context: text("context"),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.locale] })],
);

export const eventCategories = sqliteTable(
  "event_categories",
  {
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    categoryId: text("category_id").notNull().references(() => categories.id),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.categoryId] }), index("event_categories_cat_idx").on(t.categoryId)],
);

export const eventTags = sqliteTable(
  "event_tags",
  {
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.tagId] })],
);

export const eventLocations = sqliteTable(
  "event_locations",
  {
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    placeId: text("place_id").notNull().references(() => places.id),
    role: text("role").notNull(),
    note: text("note"),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.placeId] })],
);

export const eventSources = sqliteTable(
  "event_sources",
  {
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => sources.id),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.sourceId] })],
);

export const footprints = sqliteTable("footprints", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  countryCodesJson: text("country_codes_json").notNull().default("[]"),
  approximation: text("approximation").notNull(),
  sourceIdsJson: text("source_ids_json").notNull().default("[]"),
});

export const metrics = sqliteTable(
  "metrics",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    metricType: text("metric_type").notNull(),
    value: real("value"),
    minEstimate: real("min_estimate"),
    maxEstimate: real("max_estimate"),
    unit: text("unit").notNull(),
    estimateKind: text("estimate_kind").notNull(),
    attributedTo: text("attributed_to").notNull(),
    scope: text("scope"),
    measurementPeriod: text("measurement_period"),
    methodology: text("methodology"),
    uncertainty: text("uncertainty").notNull(),
    isReference: integer("is_reference", { mode: "boolean" }).notNull().default(false),
    documentedZero: integer("documented_zero", { mode: "boolean" }).notNull().default(false),
    note: text("note"),
    position: integer("position").notNull(),
  },
  (t) => [index("metrics_type_idx").on(t.metricType), index("metrics_event_idx").on(t.eventId)],
);

export const metricSources = sqliteTable(
  "metric_sources",
  {
    metricId: text("metric_id").notNull().references(() => metrics.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.metricId, t.sourceId] })],
);

export const metricDenominators = sqliteTable("metric_denominators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metricId: text("metric_id").notNull().references(() => metrics.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  value: real("value").notNull(),
  year: integer("year").notNull(),
  description: text("description").notNull(),
  sourceIdsJson: text("source_ids_json").notNull().default("[]"),
});

/** Consequences, interpretations, controversies and qualitative impacts. */
export const eventStatements = sqliteTable(
  "event_statements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    subtype: text("subtype"),
    scale: text("scale"),
    duration: text("duration"),
    heldBy: text("held_by"),
    text: text("text").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [index("event_statements_event_idx").on(t.eventId)],
);

export const statementSources = sqliteTable(
  "statement_sources",
  {
    statementId: integer("statement_id").notNull().references(() => eventStatements.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.statementId, t.sourceId] })],
);

export const relations = sqliteTable(
  "relations",
  {
    id: text("id").primaryKey(),
    fromEventId: text("from_event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    toEventId: text("to_event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    basis: text("basis").notNull(),
    description: text("description").notNull(),
  },
  (t) => [index("relations_from_idx").on(t.fromEventId), index("relations_to_idx").on(t.toEventId)],
);

export const relationSources = sqliteTable(
  "relation_sources",
  {
    relationId: text("relation_id").notNull().references(() => relations.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.relationId, t.sourceId] })],
);

export const comparisons = sqliteTable("comparisons", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  question: text("question").notNull(),
  notesJson: text("notes_json").notNull().default("[]"),
});

export const comparisonEvents = sqliteTable(
  "comparison_events",
  {
    comparisonId: text("comparison_id").notNull().references(() => comparisons.id, { onDelete: "cascade" }),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.comparisonId, t.eventId] })],
);

export const comparisonSources = sqliteTable(
  "comparison_sources",
  {
    comparisonId: text("comparison_id").notNull().references(() => comparisons.id, { onDelete: "cascade" }),
    sourceId: text("source_id").notNull().references(() => sources.id),
  },
  (t) => [primaryKey({ columns: [t.comparisonId, t.sourceId] })],
);

/** Editorial pipeline: every status change is logged. */
export const editorialLog = sqliteTable("editorial_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: text("event_id").notNull(),
  status: text("status").notNull(),
  actor: text("actor").notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
});
