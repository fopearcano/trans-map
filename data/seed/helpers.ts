import type { HistoricalDate } from "@/domain/dates";
import type { EventInput, PopulationDenominator } from "@/domain/schemas";

export const VERIFIED_AT = "2026-11-04";

export function d(year: number, month?: number, day?: number): HistoricalDate {
  const out: HistoricalDate = { year };
  if (month !== undefined) out.month = month;
  if (day !== undefined) out.day = day;
  return out;
}

/** Population denominator taken from the OWID "Population (historical)" dataset. */
export function owid(
  kind: PopulationDenominator["kind"],
  value: number,
  year: number,
  description: string,
): PopulationDenominator {
  return { kind, value, year, description, sourceIds: ["owid-population"] };
}

export type SeedEvent = EventInput;
