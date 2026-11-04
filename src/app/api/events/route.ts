import { NextResponse } from "next/server";
import { isCategoryId } from "@/domain/categories";
import { CONTINENT_IDS, type ContinentId } from "@/domain/regions";
import type { EvidenceStatus } from "@/domain/schemas";
import { filterEvents, type TimeSelection } from "@/engine/filter";
import { buildSearchIndex } from "@/engine/search";
import { getRepository } from "@/server/repository";
import { BadRequestError, handle, parseIntParam, parseList } from "@/server/http";
import { searchLabels } from "@/server/labels";

const STATUSES: EvidenceStatus[] = ["draft", "needs-review", "verified", "disputed"];

/**
 * GET /api/events?q=&categories=a,b&from=-3000&to=1500&century=20&year=1963&period=1945-today
 *   &continents=africa,asia&status=verified&limit=
 */
export async function GET(request: Request) {
  return handle(() => {
    const url = new URL(request.url);
    const repo = getRepository();
    const atlas = repo.getAtlasIndex();
    const categories = parseList(url.searchParams.get("categories"));
    for (const c of categories) if (!isCategoryId(c)) throw new BadRequestError(`Categoria sconosciuta: ${c}`);
    const continents = parseList(url.searchParams.get("continents"));
    for (const c of continents) if (!(CONTINENT_IDS as readonly string[]).includes(c)) throw new BadRequestError(`Continente sconosciuto: ${c}`);
    const status = parseList(url.searchParams.get("status"));
    for (const s of status) if (!STATUSES.includes(s as EvidenceStatus)) throw new BadRequestError(`Stato sconosciuto: ${s}`);

    let time: TimeSelection = { mode: "all" };
    const year = parseIntParam(url.searchParams.get("year"), "year");
    const century = parseIntParam(url.searchParams.get("century"), "century");
    const from = parseIntParam(url.searchParams.get("from"), "from");
    const to = parseIntParam(url.searchParams.get("to"), "to");
    const period = url.searchParams.get("period");
    if (year !== undefined) time = { mode: "year", year };
    else if (century !== undefined) time = { mode: "century", century };
    else if (period) time = { mode: "period", periodId: period };
    else if (from !== undefined || to !== undefined) time = { mode: "range", from: from ?? -3_300_000, to: to ?? 2026 };

    const q = url.searchParams.get("q") ?? undefined;
    const index = q ? buildSearchIndex(atlas, searchLabels("it", repo.getDataset().tags)) : undefined;
    const result = filterEvents(
      atlas,
      { query: q, categories: categories as never, continents: continents as ContinentId[], evidence: status as EvidenceStatus[], time },
      index,
    );
    const limit = parseIntParam(url.searchParams.get("limit"), "limit");
    const events = limit ? result.events.slice(0, Math.max(1, limit)) : result.events;
    return NextResponse.json({
      total: result.events.length,
      unlocated: result.unlocated.map((e) => e.id),
      events,
    });
  });
}
