import { z } from "zod";
import { fetchJson, SourceParseError, type FetchOptions } from "./http";

const GhoResponse = z.object({
  value: z.array(z.object({ SpatialDim: z.string().nullable(), TimeDim: z.number().nullable(), NumericValue: z.number().nullable(), Low: z.number().nullable().optional(), High: z.number().nullable().optional() })),
});

/** WHO Global Health Observatory OData API: values of one indicator for one country (ISO3). */
export async function fetchWhoIndicator(indicator: string, iso3: string, opts: Partial<FetchOptions> = {}) {
  if (!/^[A-Za-z0-9_]+$/.test(indicator) || !/^[A-Z]{3}$/.test(iso3)) throw new SourceParseError("who: parametri non validi", "who-gho", indicator);
  const url = `https://ghoapi.azureedge.net/api/${indicator}?$filter=SpatialDim%20eq%20'${iso3}'`;
  const parsed = GhoResponse.safeParse(await fetchJson(url, { source: "who-gho", ...opts }));
  if (!parsed.success) throw new SourceParseError("who: risposta non conforme", "who-gho", url);
  return parsed.data.value
    .filter((v) => v.TimeDim !== null && v.NumericValue !== null)
    .map((v) => ({ year: v.TimeDim!, value: v.NumericValue!, low: v.Low ?? null, high: v.High ?? null }))
    .sort((a, b) => a.year - b.year);
}
