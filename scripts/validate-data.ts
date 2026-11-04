/**
 * Validates the curated seed dataset (schemas + referential integrity) and
 * prints coverage statistics (continents, categories, evidence status).
 */
import { rawSeed } from "../data/seed";
import { validateDataset } from "../src/domain/dataset";
import { SUBREGIONS } from "../src/domain/regions";

const { dataset, issues } = validateDataset(rawSeed);
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warning");

for (const i of issues) console[i.level === "error" ? "error" : "warn"](`[${i.level}] ${i.path}: ${i.message}`);

const placeById = new Map(dataset.places.map((p) => [p.id, p]));
const continents = new Map<string, number>();
for (const e of dataset.events) {
  const set = new Set<string>(e.locations.map((l) => SUBREGIONS[placeById.get(l.placeId)!.subregion].continent));
  if (set.size === 0) set.add("(senza luogo)");
  for (const c of set) continents.set(c, (continents.get(c) ?? 0) + 1);
}
const categories = new Map<string, number>();
for (const e of dataset.events) for (const c of e.categories) categories.set(c, (categories.get(c) ?? 0) + 1);
const status = new Map<string, number>();
for (const e of dataset.events) status.set(e.evidenceStatus, (status.get(e.evidenceStatus) ?? 0) + 1);

console.log(`\nEventi: ${dataset.events.length} · Fonti: ${dataset.sources.length} · Luoghi: ${dataset.places.length} · Relazioni: ${dataset.relations.length} · Metriche: ${dataset.events.reduce((n, e) => n + e.quantitativeMetrics.length, 0)}`);
console.log("Continenti (eventi per continente):", Object.fromEntries(continents));
console.log("Categorie:", Object.fromEntries(categories));
console.log("Stato delle prove:", Object.fromEntries(status));
console.log(`\n${errors.length} errori, ${warnings.length} avvisi`);
if (errors.length > 0) process.exit(1);
