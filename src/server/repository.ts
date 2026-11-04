/**
 * Event repository. The interface is storage-agnostic so that a PostgreSQL /
 * PostGIS implementation can replace the SQLite one without touching the UI
 * or the engines.
 */
import fs from "node:fs";
import { buildAtlasIndex, summarizeRelations, type AtlasEvent, type RelationSummary } from "@/domain/atlas";
import type { Dataset } from "@/domain/dataset";
import type { CuratedComparison, EventRecord, Place, Relation, Source } from "@/domain/schemas";
import { openDatabase, resolveDbPath } from "./db/client";
import { loadDataset } from "./db/read";

export interface ResolvedLocation {
  place: Place;
  role: string;
  note?: string;
}

export interface RelatedEventRef {
  relation: Relation;
  direction: "outgoing" | "incoming";
  event: { id: string; title: string; startYear: number; categories: string[] };
}

export interface EventDetail {
  event: EventRecord;
  origin: string;
  locations: ResolvedLocation[];
  sources: Source[];
  related: RelatedEventRef[];
  comparisons: CuratedComparison[];
}

export interface EventRepository {
  getDataset(): Dataset;
  getAtlasIndex(): AtlasEvent[];
  getRelations(): RelationSummary[];
  getEvent(id: string): EventRecord | null;
  getEventDetail(id: string): EventDetail | null;
  getEvents(ids: string[]): EventRecord[];
  getComparisons(): CuratedComparison[];
  getSourcesByIds(ids: string[]): Source[];
}

interface Snapshot {
  mtimeMs: number;
  dataset: Dataset;
  origins: Map<string, string>;
  atlas: AtlasEvent[];
  relations: RelationSummary[];
  eventsById: Map<string, EventRecord>;
  sourcesById: Map<string, Source>;
  placesById: Map<string, Place>;
}

export class DatabaseNotReadyError extends Error {
  constructor(file: string) {
    super(`Database non trovato in ${file}. Eseguire \`npm run db:setup\`.`);
    this.name = "DatabaseNotReadyError";
  }
}

export class SqliteEventRepository implements EventRepository {
  private snapshot: Snapshot | null = null;

  constructor(private readonly file: string = resolveDbPath()) {}

  /** Reloads automatically when the database file changes (e.g. after a re-seed). */
  private load(): Snapshot {
    if (!fs.existsSync(this.file)) throw new DatabaseNotReadyError(this.file);
    const mtimeMs = Math.max(fs.statSync(this.file).mtimeMs, fs.existsSync(`${this.file}-wal`) ? fs.statSync(`${this.file}-wal`).mtimeMs : 0);
    if (this.snapshot && this.snapshot.mtimeMs === mtimeMs) return this.snapshot;
    const { db, sqlite } = openDatabase(this.file);
    try {
      const { origins, ...dataset } = loadDataset(db);
      this.snapshot = {
        mtimeMs,
        dataset,
        origins,
        atlas: buildAtlasIndex(dataset),
        relations: summarizeRelations(dataset.relations),
        eventsById: new Map(dataset.events.map((e) => [e.id, e])),
        sourcesById: new Map(dataset.sources.map((s) => [s.id, s])),
        placesById: new Map(dataset.places.map((p) => [p.id, p])),
      };
      return this.snapshot;
    } finally {
      sqlite.close();
    }
  }

  getDataset(): Dataset {
    return this.load().dataset;
  }

  getAtlasIndex(): AtlasEvent[] {
    return this.load().atlas;
  }

  getRelations(): RelationSummary[] {
    return this.load().relations;
  }

  getEvent(id: string): EventRecord | null {
    return this.load().eventsById.get(id) ?? null;
  }

  getEvents(ids: string[]): EventRecord[] {
    const s = this.load();
    return ids.map((id) => s.eventsById.get(id)).filter((e): e is EventRecord => !!e);
  }

  getComparisons(): CuratedComparison[] {
    return this.load().dataset.comparisons;
  }

  getSourcesByIds(ids: string[]): Source[] {
    const s = this.load();
    return ids.map((id) => s.sourcesById.get(id)).filter((x): x is Source => !!x);
  }

  getEventDetail(id: string): EventDetail | null {
    const s = this.load();
    const event = s.eventsById.get(id);
    if (!event) return null;

    const locations: ResolvedLocation[] = event.locations
      .map((l) => ({ place: s.placesById.get(l.placeId)!, role: l.role, note: l.note }))
      .filter((l) => !!l.place);

    // Collect every source cited anywhere in the event (bibliography first).
    const cited = new Set<string>(event.sources);
    for (const m of event.quantitativeMetrics) {
      m.sourceIds.forEach((x) => cited.add(x));
      m.populationDenominators.forEach((d) => d.sourceIds.forEach((x) => cited.add(x)));
    }
    for (const st of [...event.consequences, ...event.interpretations, ...event.controversies, ...event.qualitativeImpacts])
      st.sourceIds.forEach((x) => cited.add(x));
    for (const l of locations) l.place.coordinateSourceIds.forEach((x) => cited.add(x));
    for (const f of event.geographicFootprints) f.sourceIds.forEach((x) => cited.add(x));

    const related: RelatedEventRef[] = [];
    for (const r of s.dataset.relations) {
      if (r.from !== id && r.to !== id) continue;
      const otherId = r.from === id ? r.to : r.from;
      const other = s.eventsById.get(otherId);
      if (!other) continue;
      related.push({
        relation: r,
        direction: r.from === id ? "outgoing" : "incoming",
        event: { id: other.id, title: other.title, startYear: other.startDate.year, categories: other.categories },
      });
    }
    related.sort((a, b) => (a.relation.basis === b.relation.basis ? 0 : a.relation.basis === "documented" ? -1 : 1));

    return {
      event,
      origin: s.origins.get(id) ?? "curated",
      locations,
      sources: [...cited].map((x) => s.sourcesById.get(x)).filter((x): x is Source => !!x),
      related,
      comparisons: s.dataset.comparisons.filter((c) => c.eventIds.includes(id)),
    };
  }
}

let singleton: EventRepository | null = null;

export function getRepository(): EventRepository {
  singleton ??= new SqliteEventRepository();
  return singleton;
}
