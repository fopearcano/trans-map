/**
 * Full-text search over the atlas index. Deterministic, accent-insensitive,
 * prefix-aware and weighted by field (title > places/tags/categories > summary).
 */
import type { AtlasEvent } from "@/domain/atlas";

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʿʾ'’`´]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9Ѐ-ӿ一-鿿]+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter((t) => t.length > 0);
}

interface IndexedField {
  tokens: string[];
  weight: number;
}

export interface SearchDocument {
  id: string;
  fields: IndexedField[];
}

export interface SearchLabels {
  categoryLabel: (id: string) => string;
  tagLabel: (id: string) => string;
}

export function buildSearchIndex(events: AtlasEvent[], labels: SearchLabels): SearchDocument[] {
  return events.map((e) => ({
    id: e.id,
    fields: [
      { tokens: tokenize(e.title), weight: 6 },
      { tokens: tokenize(e.placeNames.join(" ")), weight: 3 },
      { tokens: tokenize(e.tags.map(labels.tagLabel).join(" ")), weight: 2.5 },
      { tokens: tokenize(e.categories.map(labels.categoryLabel).join(" ")), weight: 2 },
      { tokens: tokenize(e.summary), weight: 1 },
      { tokens: tokenize(String(e.startDate.year)), weight: 2 },
    ],
  }));
}

export interface SearchHit {
  id: string;
  score: number;
}

/**
 * Every query token must match at least one field (AND semantics); a token
 * matches a field token exactly (full weight) or as a prefix (60%).
 */
export function search(index: SearchDocument[], query: string): SearchHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const doc of index) {
    let total = 0;
    let allMatched = true;
    for (const q of qTokens) {
      let best = 0;
      for (const field of doc.fields) {
        for (const tok of field.tokens) {
          if (tok === q) best = Math.max(best, field.weight);
          else if (q.length >= 2 && tok.startsWith(q)) best = Math.max(best, field.weight * 0.6);
        }
      }
      if (best === 0) {
        allMatched = false;
        break;
      }
      total += best;
    }
    if (allMatched) hits.push({ id: doc.id, score: total });
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
