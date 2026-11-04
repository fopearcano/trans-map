/**
 * Assisted import (Phase 4 pipeline, optional): creates a DRAFT event from a
 * Wikidata item. Drafts are stored with origin "imported" and status "draft",
 * shown with a badge, and must be completed and verified by an editor.
 *
 *   npm run import:wikidata -- Q123 --category disasters-accidents --subregion southern-europe [--dry-run]
 */
import { eq } from "drizzle-orm";
import { isCategoryId } from "../src/domain/categories";
import { SUBREGION_IDS, type SubregionId } from "../src/domain/regions";
import { EventSchema, PlaceSchema, SourceSchema } from "../src/domain/schemas";
import { openDatabase, resolveDbPath } from "../src/server/db/client";
import * as t from "../src/server/db/schema";
import { writeEvent } from "../src/server/db/write";
import { SourceError } from "../src/server/sources/http";
import { fetchWikidataEntity, toDraftEvent } from "../src/server/sources/wikidata";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const qid = process.argv.slice(2).find((a) => /^Q\d+$/.test(a));
  const category = arg("category");
  const subregion = arg("subregion");
  if (!qid || !category || !isCategoryId(category) || !subregion || !(SUBREGION_IDS as readonly string[]).includes(subregion)) {
    console.error("Uso: npm run import:wikidata -- Q123 --category <categoria> --subregion <sotto-regione M49> [--dry-run]");
    process.exit(2);
  }
  const accessedAt = new Date().toISOString().slice(0, 10);
  const entity = await fetchWikidataEntity(qid);
  const draft = toDraftEvent(entity, { category, subregion: subregion as SubregionId, accessedAt });

  const event = EventSchema.parse(draft.event);
  const source = SourceSchema.parse(draft.source);
  const place = draft.place ? PlaceSchema.parse(draft.place) : null;

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ event, source, place }, null, 2));
    return;
  }

  const { db, sqlite } = openDatabase(resolveDbPath());
  try {
    const existing = db.select().from(t.events).where(eq(t.events.id, event.id)).get();
    if (existing && existing.origin === "curated") throw new Error(`L'evento ${event.id} è curato: importazione rifiutata.`);
    db.transaction((tx) => {
      const s = { id: source.id, type: source.type, title: source.title, url: source.url ?? null, accessedAt: source.accessedAt ?? null, reliability: source.reliability, license: source.license ?? null };
      tx.insert(t.sources).values(s).onConflictDoUpdate({ target: t.sources.id, set: s }).run();
      if (place) {
        const p = { id: place.id, name: place.name, lat: place.coordinates?.lat ?? null, lon: place.coordinates?.lon ?? null, precision: place.precision, subregion: place.subregion, countryCodesJson: "[]", wikidataId: place.wikidataId ?? null, note: "Importato da Wikidata" };
        tx.insert(t.places).values(p).onConflictDoUpdate({ target: t.places.id, set: p }).run();
        tx.insert(t.placeSources).values({ placeId: place.id, sourceId: source.id }).onConflictDoNothing().run();
      }
      writeEvent(tx as never, event, "imported");
      tx.insert(t.editorialLog).values({ eventId: event.id, status: "draft", actor: "import:wikidata", note: `Importato da ${qid}`, createdAt: new Date().toISOString() }).run();
    });
    console.log(`Bozza ${event.id} importata (stato: draft). Va completata e verificata prima della pubblicazione.`);
  } finally {
    sqlite.close();
  }
}

main().catch((err) => {
  if (err instanceof SourceError) console.error(`Fonte esterna non disponibile (${err.source}): ${err.message}`);
  else console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
