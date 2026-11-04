import { NextResponse } from "next/server";
import { getRepository } from "@/server/repository";
import { handle, jsonError } from "@/server/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await params;
    const detail = getRepository().getEventDetail(id);
    if (!detail) return jsonError(404, "not-found", `Evento non trovato: ${id}`);
    return NextResponse.json(detail);
  });
}
