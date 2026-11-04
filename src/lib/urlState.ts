/**
 * Atlas state <-> URL query string. Every view (filters, time selection,
 * selected event, comparison, horizon) is linkable and survives reloads.
 */
import { isCategoryId, type CategoryId } from "@/domain/categories";
import { METRIC_TYPE_IDS, type MetricTypeId } from "@/domain/metrics";
import { CONTINENT_IDS, HORIZONS, type ContinentId } from "@/domain/regions";
import type { EvidenceStatus } from "@/domain/schemas";
import { PERIODS } from "@/domain/dates";
import type { TimeSelection } from "@/engine/filter";

export type PanelId = "detail" | "compare" | "horizon" | null;

export interface AtlasUrlState {
  q: string;
  cat: CategoryId[];
  time: TimeSelection;
  st: EvidenceStatus[];
  co: ContinentId[];
  sel: string | null;
  cmp: string[];
  hz: string | null;
  size: MetricTypeId | null;
  scale: "area" | "log";
  panel: PanelId;
}

const STATUSES: EvidenceStatus[] = ["draft", "needs-review", "verified", "disputed"];
type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => first(v).split(",").map((s) => s.trim()).filter(Boolean);
const int = (s: string | undefined) => {
  const n = Number(s);
  return Number.isInteger(n) && n !== 0 ? n : null;
};

export function encodeTime(t: TimeSelection): string | null {
  switch (t.mode) {
    case "all":
      return null;
    case "year":
      return `y:${t.year}`;
    case "century":
      return `c:${t.century}`;
    case "period":
      return `p:${t.periodId}`;
    case "range":
      return `r:${t.from}:${t.to}`;
  }
}

export function decodeTime(raw: string): TimeSelection {
  const [kind, a, b] = raw.split(":");
  if (kind === "y" && int(a) !== null) return { mode: "year", year: int(a)! };
  if (kind === "c" && int(a) !== null) return { mode: "century", century: int(a)! };
  if (kind === "p" && a && PERIODS.some((p) => p.id === a)) return { mode: "period", periodId: a };
  if (kind === "r" && int(a) !== null && int(b) !== null) return { mode: "range", from: int(a)!, to: int(b)! };
  return { mode: "all" };
}

export function parseAtlasState(params: Params): AtlasUrlState {
  const panel = first(params.panel);
  const size = first(params.size);
  const hz = first(params.hz);
  return {
    q: first(params.q),
    cat: list(params.cat).filter(isCategoryId),
    time: decodeTime(first(params.t)),
    st: list(params.st).filter((s): s is EvidenceStatus => STATUSES.includes(s as EvidenceStatus)),
    co: list(params.co).filter((c): c is ContinentId => (CONTINENT_IDS as readonly string[]).includes(c)),
    sel: first(params.sel) || null,
    cmp: [...new Set(list(params.cmp))].slice(0, 4),
    hz: HORIZONS.some((h) => h.id === hz) ? hz : null,
    size: (METRIC_TYPE_IDS as readonly string[]).includes(size) ? (size as MetricTypeId) : null,
    scale: first(params.scale) === "log" ? "log" : "area",
    panel: panel === "detail" || panel === "compare" || panel === "horizon" ? panel : first(params.sel) ? "detail" : null,
  };
}

export function serializeAtlasState(s: AtlasUrlState): string {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.cat.length) p.set("cat", s.cat.join(","));
  const t = encodeTime(s.time);
  if (t) p.set("t", t);
  if (s.st.length) p.set("st", s.st.join(","));
  if (s.co.length) p.set("co", s.co.join(","));
  if (s.sel) p.set("sel", s.sel);
  if (s.cmp.length) p.set("cmp", s.cmp.join(","));
  if (s.hz) p.set("hz", s.hz);
  if (s.size) p.set("size", s.size);
  if (s.size && s.scale === "log") p.set("scale", "log");
  if (s.panel && !(s.panel === "detail" && s.sel)) p.set("panel", s.panel);
  return p.toString();
}
