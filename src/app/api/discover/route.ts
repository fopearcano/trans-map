import { NextResponse } from "next/server";
import { isCategoryId } from "@/domain/categories";
import { HORIZONS, SUBREGION_IDS, type SubregionId } from "@/domain/regions";
import { buildDiscoveryPath, discover } from "@/engine/discover";
import { getRepository } from "@/server/repository";
import { BadRequestError, handle, parseList } from "@/server/http";

/**
 * GET /api/discover?horizon=southern-europe&seeds=vajont-1963&categories=&limit=12&path=vajont-1963
 * `horizon` is a horizon id or a comma-separated list of M49 sub-region ids.
 */
export async function GET(request: Request) {
  return handle(() => {
    const url = new URL(request.url);
    const horizonParam = url.searchParams.get("horizon");
    if (!horizonParam) throw new BadRequestError("Parametro horizon obbligatorio");
    const preset = HORIZONS.find((h) => h.id === horizonParam);
    const subregions = preset ? preset.subregions : parseList(horizonParam);
    for (const s of subregions) if (!(SUBREGION_IDS as readonly string[]).includes(s)) throw new BadRequestError(`Sotto-regione sconosciuta: ${s}`);
    const categories = parseList(url.searchParams.get("categories"));
    for (const c of categories) if (!isCategoryId(c)) throw new BadRequestError(`Categoria sconosciuta: ${c}`);
    const repo = getRepository();
    const atlas = repo.getAtlasIndex();
    const relations = repo.getRelations();
    const limit = Number(url.searchParams.get("limit") ?? 12) || 12;
    const result = discover(atlas, relations, {
      horizon: subregions as SubregionId[],
      seeds: parseList(url.searchParams.get("seeds")),
      categories: categories as never,
      limit,
    });
    const pathStart = url.searchParams.get("path");
    const brief = (e: { id: string; title: string; startDate: unknown; continents: unknown; categories: unknown }) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate,
      continents: e.continents,
      categories: e.categories,
    });
    return NextResponse.json({
      horizon: { subregions, continents: result.horizonContinents },
      disclaimer: "Suggerimenti basati su distanza geografica e disciplinare e su relazioni curate; non misurano la notorietà degli eventi.",
      insideHorizon: result.insideHorizon.map(brief),
      suggestions: result.suggestions.map((s) => ({ event: brief(s.event), score: s.score, reasons: s.reasons })),
      bySeed: result.bySeed.map((g) => ({ seed: brief(g.seed), suggestions: g.suggestions.map((s) => ({ event: brief(s.event), score: s.score, reasons: s.reasons })) })),
      path: pathStart ? buildDiscoveryPath(pathStart, atlas, relations).map((p) => ({ event: brief(p.event), via: p.via ?? null })) : null,
    });
  });
}
