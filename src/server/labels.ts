import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/domain/dates";
import type { SearchLabels } from "@/engine/search";
import type { Tag } from "@/domain/schemas";
import type { CategoryId } from "@/domain/categories";

export function searchLabels(locale: Locale, tags: Tag[]): SearchLabels {
  const t = getDictionary(locale);
  const it = getDictionary("it");
  const en = getDictionary("en");
  const tagMap = new Map(tags.map((x) => [x.id, x.label]));
  return {
    // Index both languages so English queries also match category names.
    categoryLabel: (id) => `${it.categories[id as CategoryId] ?? id} ${en.categories[id as CategoryId] ?? ""} ${t.categories[id as CategoryId] ?? ""}`,
    tagLabel: (id) => tagMap.get(id) ?? id,
  };
}
