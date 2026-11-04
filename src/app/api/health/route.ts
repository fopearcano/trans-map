import { NextResponse } from "next/server";
import { getRepository } from "@/server/repository";
import { handle } from "@/server/http";

export async function GET() {
  return handle(() => {
    const atlas = getRepository().getAtlasIndex();
    return NextResponse.json({ status: "ok", events: atlas.length });
  });
}
