import { fetchText, SourceNotFoundError, SourceParseError, type FetchOptions } from "./http";

/** Minimal CSV parser for OWID grapher exports (quoted fields supported). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

/**
 * Historical population of a country (ISO3 code, or OWID_WRL for the world)
 * for one year, from OWID's "population" grapher (HYDE, Gapminder, UN WPP).
 */
export async function fetchOwidPopulation(code: string, year: number, opts: Partial<FetchOptions> = {}): Promise<{ value: number; year: number; entity: string; sourceUrl: string }> {
  const url = `https://ourworldindata.org/grapher/population.csv?v=1&csvType=filtered&useColumnShortNames=true&country=${encodeURIComponent(code)}`;
  const rows = parseCsv(await fetchText(url, { source: "owid", ...opts }));
  if (!rows.length) throw new SourceParseError("owid: CSV vuoto", "owid", url);
  const valueKey = Object.keys(rows[0]!).find((k) => k.startsWith("population"));
  if (!valueKey) throw new SourceParseError("owid: colonna della popolazione assente", "owid", url);
  const row = rows.find((r) => r.code === code && Number(r.year) === year);
  if (!row) throw new SourceNotFoundError(`owid: nessun dato per ${code} nel ${year}`, "owid", url);
  const value = Number(row[valueKey]);
  if (!Number.isFinite(value) || value <= 0) throw new SourceParseError("owid: valore non numerico", "owid", url);
  return { value, year, entity: row.entity ?? code, sourceUrl: "https://ourworldindata.org/grapher/population" };
}
