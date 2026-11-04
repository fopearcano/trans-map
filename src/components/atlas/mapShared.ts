/**
 * Logic shared by the WebGL (MapLibre) and SVG map renderers.
 */
import type { FeatureCollection, Geometry } from "geojson";
import type { AtlasEvent, AtlasPoint } from "@/domain/atlas";
import type { MetricTypeId } from "@/domain/metrics";

export type SizeScale = "area" | "log";
export type Basemap = "local" | "online";
export type MapRenderer = "webgl" | "svg";
export type FallbackReason = "no-webgl" | "context-lost" | "forced";

export interface MapViewProps {
  events: AtlasEvent[];
  selectedId: string | null;
  compareIds: string[];
  sizeMetric: MetricTypeId | null;
  sizeScale: SizeScale;
  showFootprints: boolean;
  basemap: Basemap;
  theme: "dark" | "light";
  focusRequest: { id: string; nonce: number } | null;
  onSelect: (id: string) => void;
  onBasemapError: () => void;
  onRendererChange?: (renderer: MapRenderer) => void;
}

/** Diameter (CSS px) of uniform markers when no metric is selected. */
export const UNIFORM_DIAMETER = 13;
/** Diameter of markers lacking the selected metric. */
export const NO_DATA_DIAMETER = 8;

export function isApproximate(p: Pick<AtlasPoint, "precision">): boolean {
  return p.precision === "approximate" || p.precision === "region" || p.precision === "disputed";
}

/** True when the browser can create a WebGL2 or WebGL1 context. */
export function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function isWebGLError(err: unknown): boolean {
  return /webgl/i.test(err instanceof Error ? err.message : String(err));
}

/**
 * world-atlas keeps polygons that cross the antimeridian stitched (for
 * spherical projections). For Web Mercator each ring is unwrapped so that
 * longitudes stay continuous (values beyond ±180 are valid in MapLibre);
 * rings that circle a pole (Antarctica) are closed along the pole.
 */
export function unwrapRing(ring: number[][]): number[][] {
  const out: number[][] = [];
  let offset = 0;
  let prev: number | null = null;
  for (const [lon, lat] of ring) {
    let x = lon! + offset;
    if (prev !== null) {
      if (x - prev > 180) {
        offset -= 360;
        x -= 360;
      } else if (x - prev < -180) {
        offset += 360;
        x += 360;
      }
    }
    out.push([x, lat!]);
    prev = x;
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && Math.abs(last[0]! - first[0]!) > 180) {
    const meanLat = out.reduce((n, p) => n + p[1]!, 0) / out.length;
    const pole = meanLat < 0 ? -85 : 85;
    out.push([last[0]!, pole], [first[0]!, pole], [first[0]!, first[1]!]);
  }
  return out;
}

/**
 * Polygons that touch a pole (Antarctica) are stored as a band between the
 * pole and the coast. Web Mercator cannot draw latitude ±90: keep the coast
 * ring only, unwrap it and close it along latitude ±85.
 */
export function fixPolygon(poly: number[][][]): number[][][] {
  const touchesPole = poly.some((ring) => ring.some((p) => Math.abs(p[1]!) >= 89.9));
  if (!touchesPole) return poly.map(unwrapRing);
  const coast = poly
    .map((ring) => ({ ring, polar: ring.filter((p) => Math.abs(p[1]!) >= 89.9).length }))
    .sort((a, b) => a.polar - b.polar || b.ring.length - a.ring.length)[0]!.ring.filter((p) => Math.abs(p[1]!) < 89.9);
  return [unwrapRing(coast)];
}

export function unwrapGeometry(g: Geometry): Geometry {
  if (g.type === "Polygon") return { ...g, coordinates: fixPolygon(g.coordinates) };
  if (g.type === "MultiPolygon") return { ...g, coordinates: g.coordinates.map(fixPolygon) };
  return g;
}

const countriesCache = new Map<string, Promise<FeatureCollection>>();

/** Natural Earth countries (world-atlas), unwrapped for Web Mercator. 50m for WebGL, 110m for SVG. */
export function loadCountries(resolution: "50m" | "110m" = "50m"): Promise<FeatureCollection> {
  let cached = countriesCache.get(resolution);
  if (!cached) {
    cached = Promise.all([
      fetch(`/basemap/countries-${resolution}.topo.json`).then((r) => {
        if (!r.ok) throw new Error(`basemap HTTP ${r.status}`);
        return r.json();
      }),
      import("topojson-client"),
    ]).then(([topo, topojson]) => {
      const fc = topojson.feature(topo, topo.objects.countries) as unknown as FeatureCollection;
      for (const f of fc.features) {
        f.properties = { ...(f.properties ?? {}), iso: f.id === undefined ? "" : String(f.id) };
        if (f.geometry) f.geometry = unwrapGeometry(f.geometry);
      }
      return fc;
    });
    // Do not cache failures: a retry must fetch again.
    cached.catch(() => countriesCache.delete(resolution));
    countriesCache.set(resolution, cached);
  }
  return cached;
}

export function sizeFor(events: AtlasEvent[], metric: MetricTypeId | null, scale: SizeScale): Map<string, number> {
  const out = new Map<string, number>();
  if (!metric) return out;
  const values = events.map((e) => e.sizeMetrics[metric]?.value).filter((v): v is number => typeof v === "number" && v > 0);
  if (!values.length) return out;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const MIN_D = 7;
  const MAX_D = 56;
  for (const e of events) {
    const v = e.sizeMetrics[metric]?.value;
    if (!v || v <= 0) continue;
    let d: number;
    if (scale === "area") d = MAX_D * Math.sqrt(v / max);
    else d = max === min ? (MIN_D + MAX_D) / 2 : MIN_D + ((Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))) * (MAX_D - MIN_D);
    out.set(e.id, Math.max(MIN_D, d));
  }
  return out;
}
