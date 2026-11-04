import { NextResponse } from "next/server";
import { DatabaseNotReadyError } from "./repository";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Wraps a handler: database not ready → 503, invalid input → 400, anything else → 500. */
export async function handle(fn: () => Promise<Response> | Response): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DatabaseNotReadyError) return jsonError(503, "database-not-ready", err.message);
    if (err instanceof BadRequestError) return jsonError(400, "bad-request", err.message);
    console.error(err);
    return jsonError(500, "internal-error", "Errore interno del server");
  }
}

export class BadRequestError extends Error {}

export function parseList(value: string | null): string[] {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export function parseIntParam(value: string | null, name: string): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n === 0) throw new BadRequestError(`Parametro ${name} non valido (intero ≠ 0 atteso)`);
  return n;
}
