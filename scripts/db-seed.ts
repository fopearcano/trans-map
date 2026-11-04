/**
 * Seeds the database with the curated dataset after validating it.
 * Refuses to write anything if the dataset has integrity errors.
 */
import { rawSeed } from "../data/seed";
import { validateDataset } from "../src/domain/dataset";
import { openDatabase, resolveDbPath } from "../src/server/db/client";
import { writeDataset } from "../src/server/db/write";

const { dataset, issues } = validateDataset(rawSeed);
const errors = issues.filter((i) => i.level === "error");
if (errors.length > 0) {
  for (const e of errors) console.error(`[error] ${e.path}: ${e.message}`);
  console.error(`Seed annullato: ${errors.length} errori di validazione.`);
  process.exit(1);
}

const file = resolveDbPath();
const { db, sqlite } = openDatabase(file);
const result = writeDataset(db, dataset);
sqlite.close();
console.log(`Seed completato: ${result.events} eventi curati scritti in ${file}`);
