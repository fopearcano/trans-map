import { NextResponse } from "next/server";
import { categoryCounts, connectionsGraph, coverage, densityBySubregion, distributionByContinent, distributionByPeriod } from "@/engine/analytics";
import { getRepository } from "@/server/repository";
import { handle } from "@/server/http";

export async function GET() {
  return handle(() => {
    const repo = getRepository();
    const atlas = repo.getAtlasIndex();
    return NextResponse.json({
      caveat: "Le distribuzioni descrivono il contenuto del database, non la densità reale degli eventi storici.",
      coverage: coverage(atlas),
      byPeriod: distributionByPeriod(atlas),
      byContinent: distributionByContinent(atlas),
      density: densityBySubregion(atlas),
      categories: categoryCounts(atlas),
      graph: connectionsGraph(atlas, repo.getRelations()),
    });
  });
}
