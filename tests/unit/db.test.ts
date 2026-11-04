import { describe, expect, it } from "vitest";
import { openDatabase, runMigrations } from "@/server/db/client";
import { writeDataset } from "@/server/db/write";
import { loadDataset } from "@/server/db/read";
import { validateDataset } from "@/domain/dataset";
import { EventSchema } from "@/domain/schemas";
import { loadFixture } from "./helpers";

describe("SQLite persistence", () => {
  const { dataset } = loadFixture();

  it("round-trips the curated dataset through the database", () => {
    const { db, sqlite } = openDatabase(":memory:");
    runMigrations(db);
    writeDataset(db, dataset);
    const { origins, ...loaded } = loadDataset(db);
    sqlite.close();

    expect(loaded.events).toHaveLength(dataset.events.length);
    const { issues } = validateDataset(loaded);
    expect(issues.filter((i) => i.level === "error")).toEqual([]);

    const byId = new Map(loaded.events.map((e) => [e.id, e]));
    for (const original of dataset.events) {
      const back = byId.get(original.id)!;
      // Normalise both through the schema so optional/default fields compare equally.
      const norm = (e: unknown) => JSON.parse(JSON.stringify(EventSchema.parse(e)));
      const a = norm(original);
      const b = norm(back);
      a.tags.sort(); b.tags.sort();
      expect(b).toEqual(a);
    }
    expect(origins.get("vajont-1963")).toBe("curated");
  });

  it("is idempotent when seeding twice", () => {
    const { db, sqlite } = openDatabase(":memory:");
    runMigrations(db);
    writeDataset(db, dataset);
    writeDataset(db, dataset);
    const count = sqlite.prepare("select count(*) as c from metrics").get() as { c: number };
    const loaded = loadDataset(db);
    sqlite.close();
    expect(count.c).toBe(dataset.events.reduce((n, e) => n + e.quantitativeMetrics.length, 0));
    expect(loaded.relations).toHaveLength(dataset.relations.length);
  });
});
