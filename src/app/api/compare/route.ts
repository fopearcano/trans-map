import { NextResponse } from "next/server";
import { compareEvents } from "@/engine/compare";
import { getRepository } from "@/server/repository";
import { BadRequestError, handle, jsonError, parseList } from "@/server/http";

/** GET /api/compare?ids=vajont-1963,banqiao-1975 (2–4 events) */
export async function GET(request: Request) {
  return handle(() => {
    const ids = [...new Set(parseList(new URL(request.url).searchParams.get("ids")))];
    if (ids.length < 2 || ids.length > 4) throw new BadRequestError("Servono da 2 a 4 identificativi di eventi (ids=a,b)");
    const repo = getRepository();
    const events = repo.getEvents(ids);
    const missing = ids.filter((id) => !events.some((e) => e.id === id));
    if (missing.length) return jsonError(404, "not-found", `Eventi non trovati: ${missing.join(", ")}`);
    const dataset = repo.getDataset();
    const result = compareEvents(events, dataset.relations);
    const sourceIds = new Set<string>();
    for (const row of [...result.sharedRows, ...result.crossDefinitionRows])
      for (const entry of row.entries) {
        entry.estimates.forEach((est) => est.sourceIds.forEach((s) => sourceIds.add(s)));
        entry.denominators.forEach((d) => d.sourceIds.forEach((s) => sourceIds.add(s)));
      }
    const curated = dataset.comparisons.filter((c) => c.eventIds.every((id) => ids.includes(id)) || ids.every((id) => c.eventIds.includes(id)));
    curated.forEach((c) => c.sourceIds.forEach((s) => sourceIds.add(s)));
    const places = new Map(dataset.places.map((p) => [p.id, p]));
    return NextResponse.json({
      result,
      events: events.map((e) => ({
        ...e,
        places: e.locations.map((l) => ({ ...places.get(l.placeId), role: l.role })),
      })),
      curated,
      sources: repo.getSourcesByIds([...sourceIds]),
    });
  });
}
