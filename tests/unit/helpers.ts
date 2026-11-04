import { rawSeed } from "@data/seed";
import { buildAtlasIndex, summarizeRelations } from "@/domain/atlas";
import { validateDataset } from "@/domain/dataset";
import { buildSearchIndex } from "@/engine/search";

export function loadFixture() {
  const { dataset, issues } = validateDataset(rawSeed);
  const atlas = buildAtlasIndex(dataset);
  const relations = summarizeRelations(dataset.relations);
  const tagLabels = new Map(dataset.tags.map((t) => [t.id, t.label]));
  const searchIndex = buildSearchIndex(atlas, { categoryLabel: (id) => id, tagLabel: (id) => tagLabels.get(id) ?? id });
  const event = (id: string) => {
    const e = dataset.events.find((x) => x.id === id);
    if (!e) throw new Error(`missing ${id}`);
    return e;
  };
  return { dataset, issues, atlas, relations, searchIndex, event };
}
