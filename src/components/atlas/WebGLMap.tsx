"use client";
/**
 * WebGL world map (MapLibre GL JS). When WebGL is unavailable or lost, it
 * hands over to the SVG renderer through `onWebGLFailure`.
 *
 * - Default basemap: Natural Earth countries bundled locally (public domain),
 *   so the atlas works offline and without any SaaS account.
 * - Optional detailed basemap: OpenFreeMap vector tiles (OpenStreetMap data),
 *   with automatic fallback to the local basemap on failure.
 * - Markers: shape + colour per disciplinary family, hollow when the location
 *   is approximate/regional; size only when the user picks a metric.
 */
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, StyleSpecification, MapLayerMouseEvent, Popup as MLPopup } from "maplibre-gl";
import type { FeatureCollection, Point, LineString, Feature } from "geojson";
import type { AtlasEvent } from "@/domain/atlas";
import { FAMILIES, type FamilyId } from "@/domain/categories";
import { formatDateRange } from "@/domain/dates";
import type { MetricTypeId } from "@/domain/metrics";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/primitives";
import { buildSdfIcon, ICON_BASE_DIAMETER, ICON_PIXEL_RATIO, iconName } from "./mapIcons";
import { isApproximate, isWebGLError, loadCountries, NO_DATA_DIAMETER, sizeFor, UNIFORM_DIAMETER, type Basemap, type FallbackReason, type MapViewProps } from "./mapShared";

interface ThemeColors {
  ocean: string;
  land: string;
  border: string;
  cluster: string;
  clusterInk: string;
  ring: string;
  muted: string;
  accent: string;
  ink: string;
  family: Record<FamilyId, string>;
}

function readColors(): ThemeColors {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    ocean: v("--map-ocean"),
    land: v("--map-land"),
    border: v("--map-border"),
    cluster: v("--map-cluster"),
    clusterInk: v("--map-cluster-ink"),
    ring: v("--map-ring"),
    muted: v("--text-muted"),
    accent: v("--accent"),
    ink: v("--text-primary"),
    family: { knowledge: v("--family-knowledge"), societies: v("--family-societies"), earth: v("--family-earth") },
  };
}

function familyColorExpr(c: ThemeColors) {
  return ["match", ["get", "family"], "knowledge", c.family.knowledge, "societies", c.family.societies, "earth", c.family.earth, c.muted] as unknown as string;
}

function localStyle(c: ThemeColors, countries: FeatureCollection): StyleSpecification {
  return {
    version: 8,
    glyphs: `${window.location.origin}/glyphs/{fontstack}/{range}.pbf`,
    sources: {
      "tm-countries": { type: "geojson", data: countries, attribution: "Natural Earth (public domain) via world-atlas" },
    },
    layers: [
      { id: "tm-ocean", type: "background", paint: { "background-color": c.ocean } },
      { id: "tm-land", type: "fill", source: "tm-countries", paint: { "fill-color": c.land } },
      { id: "tm-borders", type: "line", source: "tm-countries", paint: { "line-color": c.border, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 1] } },
    ],
  };
}

async function onlineStyle(theme: "dark" | "light", countries: FeatureCollection): Promise<StyleSpecification> {
  const url = `https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "positron"}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OpenFreeMap ${res.status}`);
    const style = (await res.json()) as StyleSpecification;
    style.sources = { ...style.sources, "tm-countries": { type: "geojson", data: countries } };
    return style;
  } finally {
    clearTimeout(timer);
  }
}

function eventsGeoJSON(events: AtlasEvent[], sizes: Map<string, number>, metric: MetricTypeId | null): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];
  for (const e of events) {
    const d = sizes.get(e.id);
    const hasMetric = !metric || d !== undefined;
    e.points.forEach((p, i) => {
      const hollow = isApproximate(p) || !hasMetric;
      const diameter = metric ? (d ?? NO_DATA_DIAMETER) : UNIFORM_DIAMETER;
      features.push({
        type: "Feature",
        id: undefined,
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: {
          eid: e.id,
          key: `${e.id}#${i}`,
          title: e.title,
          family: e.family,
          icon: iconName(FAMILIES[e.family].shape, hollow),
          iconSize: diameter / ICON_BASE_DIAMETER,
          sortKey: -diameter,
          opacity: hasMetric ? 1 : 0.55,
          place: p.name,
          precision: p.precision,
        },
      });
    });
  }
  return { type: "FeatureCollection", features };
}

function linksGeoJSON(event: AtlasEvent | undefined): FeatureCollection<LineString> {
  if (!event || event.points.length < 2) return { type: "FeatureCollection", features: [] };
  const [first, ...rest] = event.points;
  return {
    type: "FeatureCollection",
    features: rest.map((p) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[first!.lon, first!.lat], [p.lon, p.lat]] },
      properties: {},
    })),
  };
}

export function WebGLMap(props: MapViewProps & { onWebGLFailure: (reason: FallbackReason) => void }) {
  const { t, locale } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<MLPopup | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [styleVersion, setStyleVersion] = useState(0);
  const countriesRef = useRef<FeatureCollection | null>(null);

  // ——— Initialise the map once ———
  useEffect(() => {
    let cancelled = false;
    let map: MLMap | null = null;
    (async () => {
      try {
        setStatus("loading");
        setErrorMessage(null);
        const [maplibre, countries] = await Promise.all([import("maplibre-gl"), loadCountries("50m")]);
        if (cancelled || !container.current) return;
        countriesRef.current = countries;
        const colors = readColors();
        map = new maplibre.Map({
          container: container.current,
          style: localStyle(colors, countries),
          center: [20, 20],
          zoom: 1.3,
          minZoom: 0.6,
          maxZoom: 12,
          renderWorldCopies: true,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-right");
        popupRef.current = new maplibre.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: "280px" });
        mapRef.current = map;
        // Exposed for diagnostics and end-to-end tests.
        (window as unknown as { __TRANSMAP_MAP__?: MLMap }).__TRANSMAP_MAP__ = map;

        const canvas = map.getCanvas();
        canvas.setAttribute("aria-label", `${t.map.label}. ${t.map.instructions}`);
        canvas.setAttribute("role", "region");

        map.on("style.load", () => {
          if (!map) return;
          installOverlay(map);
          setStyleVersion((v) => v + 1);
        });
        map.on("load", () => !cancelled && setStatus("ready"));
        // A lost GL context that is not restored quickly → switch to the SVG renderer.
        let lostTimer: ReturnType<typeof setTimeout> | null = null;
        map.on("webglcontextlost", () => {
          lostTimer = setTimeout(() => !cancelled && propsRef.current.onWebGLFailure("context-lost"), 4000);
        });
        map.on("webglcontextrestored", () => {
          if (lostTimer) clearTimeout(lostTimer);
        });
        map.on("error", (e) => {
          // Tile/style errors from the optional online basemap → fall back.
          const msg = String((e as { error?: Error }).error?.message ?? "");
          console.warn("[map]", msg);
          if (propsRef.current.basemap === "online" && /openfreemap|Failed to fetch|NetworkError|AJAXError/i.test(msg)) propsRef.current.onBasemapError();
        });

        map.on("click", "tm-events", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (f?.properties?.eid) propsRef.current.onSelect(String(f.properties.eid));
        });
        map.on("click", "tm-clusters", async (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f || !map) return;
          const src = map.getSource("tm-events") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(Number(f.properties?.cluster_id));
          map.easeTo({ center: (f.geometry as Point).coordinates as [number, number], zoom: Math.min(zoom, 8) });
        });
        const showPopup = (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f || !map) return;
          map.getCanvas().style.cursor = "pointer";
          const ev = propsRef.current.events.find((x) => x.id === f.properties?.eid);
          if (!ev) return;
          const date = formatDateRange(ev.startDate, ev.endDate ?? undefined, locale, { circa: ev.dateCirca, precision: ev.datePrecision });
          const precision = f.properties?.precision;
          const approx = precision === "approximate" || precision === "region" || precision === "disputed" ? ` · ${t.map.approximate}` : "";
          const el = document.createElement("div");
          const title = document.createElement("div");
          title.style.fontWeight = "600";
          title.textContent = ev.title;
          const meta = document.createElement("div");
          meta.style.fontSize = "12px";
          meta.style.color = "var(--text-secondary)";
          meta.textContent = `${date} · ${String(f.properties?.place ?? "")}${approx}`;
          const cats = document.createElement("div");
          cats.style.fontSize = "12px";
          cats.style.color = "var(--text-muted)";
          cats.textContent = ev.categories.map((c) => t.categories[c]).join(" · ");
          el.append(title, meta, cats);
          popupRef.current?.setLngLat((f.geometry as Point).coordinates as [number, number]).setDOMContent(el).addTo(map);
        };
        map.on("mousemove", "tm-events", showPopup);
        map.on("mouseleave", "tm-events", () => {
          if (!map) return;
          map.getCanvas().style.cursor = "";
          popupRef.current?.remove();
        });
        map.on("mouseenter", "tm-clusters", () => map && (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "tm-clusters", () => map && (map.getCanvas().style.cursor = ""));
      } catch (err) {
        if (cancelled) return;
        if (isWebGLError(err)) {
          // No usable WebGL context: the wrapper switches to the SVG renderer.
          propsRef.current.onWebGLFailure("no-webgl");
          return;
        }
        console.error("Map initialisation failed", err);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      popupRef.current?.remove();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  /** Adds icons, sources and layers on top of whichever basemap is loaded. */
  function installOverlay(map: MLMap) {
    const c = readColors();
    for (const shape of ["circle", "square", "triangle"] as const)
      for (const hollow of [false, true]) {
        const name = iconName(shape, hollow);
        if (!map.hasImage(name)) map.addImage(name, buildSdfIcon(shape, hollow), { sdf: true, pixelRatio: ICON_PIXEL_RATIO });
      }
    if (!map.getSource("tm-countries") && countriesRef.current) map.addSource("tm-countries", { type: "geojson", data: countriesRef.current });
    if (!map.getSource("tm-events"))
      map.addSource("tm-events", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 42, clusterMaxZoom: 5 });
    if (!map.getSource("tm-links")) map.addSource("tm-links", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

    const add = (layer: Parameters<MLMap["addLayer"]>[0]) => {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    };
    add({ id: "tm-footprint-fill", type: "fill", source: "tm-countries", filter: ["in", ["get", "iso"], ["literal", []]], paint: { "fill-color": c.accent, "fill-opacity": 0.22 } });
    add({ id: "tm-footprint-line", type: "line", source: "tm-countries", filter: ["in", ["get", "iso"], ["literal", []]], paint: { "line-color": c.accent, "line-width": 1.2 } });
    add({ id: "tm-links", type: "line", source: "tm-links", paint: { "line-color": c.ink, "line-width": 1.2, "line-dasharray": [2, 2], "line-opacity": 0.7 } });
    add({
      id: "tm-clusters",
      type: "circle",
      source: "tm-events",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": c.cluster,
        "circle-radius": ["step", ["get", "point_count"], 11, 5, 14, 15, 18, 50, 23],
        "circle-stroke-color": c.ring,
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });
    add({
      id: "tm-cluster-count",
      type: "symbol",
      source: "tm-events",
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true },
      paint: { "text-color": c.clusterInk },
    });
    add({
      id: "tm-events",
      type: "symbol",
      source: "tm-events",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": ["get", "icon"],
        "icon-size": ["get", "iconSize"],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": ["get", "sortKey"],
      },
      paint: {
        "icon-color": familyColorExpr(c),
        "icon-halo-color": c.ring,
        "icon-halo-width": 1.5,
        "icon-opacity": ["get", "opacity"],
      },
    });
    add({
      id: "tm-compare-ring",
      type: "circle",
      source: "tm-events",
      filter: ["in", ["get", "eid"], ["literal", []]],
      paint: { "circle-radius": ["+", ["*", ["get", "iconSize"], ICON_BASE_DIAMETER / 2], 6], "circle-color": "transparent", "circle-stroke-color": c.ink, "circle-stroke-width": 1.5, "circle-stroke-opacity": 0.8 },
    });
    add({
      id: "tm-selected-ring",
      type: "circle",
      source: "tm-events",
      filter: ["==", ["get", "eid"], ""],
      paint: { "circle-radius": ["+", ["*", ["get", "iconSize"], ICON_BASE_DIAMETER / 2], 5], "circle-color": "transparent", "circle-stroke-color": c.accent, "circle-stroke-width": 3 },
    });
  }

  // ——— Basemap switching ———
  const basemapRef = useRef<Basemap>("local");
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !countriesRef.current) return;
    if (basemapRef.current === props.basemap) return;
    basemapRef.current = props.basemap;
    const countries = countriesRef.current;
    if (props.basemap === "local") {
      map.setStyle(localStyle(readColors(), countries));
    } else {
      onlineStyle(props.theme, countries)
        .then((style) => map.setStyle(style))
        .catch(() => {
          basemapRef.current = "local";
          props.onBasemapError();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.basemap, status]);

  // ——— Theme: recolour the local basemap and overlay ———
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const frame = requestAnimationFrame(() => {
      if (!map.isStyleLoaded()) return;
      const c = readColors();
      if (basemapRef.current === "local") {
        if (map.getLayer("tm-ocean")) map.setPaintProperty("tm-ocean", "background-color", c.ocean);
        if (map.getLayer("tm-land")) map.setPaintProperty("tm-land", "fill-color", c.land);
        if (map.getLayer("tm-borders")) map.setPaintProperty("tm-borders", "line-color", c.border);
      } else {
        onlineStyle(props.theme, countriesRef.current!)
          .then((style) => map.setStyle(style))
          .catch(() => props.onBasemapError());
        return;
      }
      map.setPaintProperty("tm-events", "icon-color", familyColorExpr(c));
      map.setPaintProperty("tm-events", "icon-halo-color", c.ring);
      map.setPaintProperty("tm-clusters", "circle-color", c.cluster);
      map.setPaintProperty("tm-clusters", "circle-stroke-color", c.ring);
      map.setPaintProperty("tm-cluster-count", "text-color", c.clusterInk);
      map.setPaintProperty("tm-selected-ring", "circle-stroke-color", c.accent);
      map.setPaintProperty("tm-compare-ring", "circle-stroke-color", c.ink);
      map.setPaintProperty("tm-links", "line-color", c.ink);
    });
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.theme, status]);

  // ——— Data: events, sizes, clustering ———
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const src = map.getSource("tm-events") as GeoJSONSource | undefined;
    if (!src) return;
    const sizes = sizeFor(props.events, props.sizeMetric, props.sizeScale);
    src.setData(eventsGeoJSON(props.events, sizes, props.sizeMetric));
    // Proportional symbols must not be hidden inside clusters.
    src.setClusterOptions({ cluster: !props.sizeMetric, clusterRadius: 42, clusterMaxZoom: 5 });
  }, [props.events, props.sizeMetric, props.sizeScale, status, styleVersion]);

  // ——— Selection, comparison, footprints, links ———
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !map.getLayer("tm-selected-ring")) return;
    const selected = props.events.find((e) => e.id === props.selectedId);
    map.setFilter("tm-selected-ring", ["==", ["get", "eid"], props.selectedId ?? ""]);
    map.setFilter("tm-compare-ring", ["in", ["get", "eid"], ["literal", props.compareIds]]);
    const codes = props.showFootprints && selected ? selected.footprintCountryCodes : [];
    const color = selected ? readColors().family[selected.family] : readColors().accent;
    map.setFilter("tm-footprint-fill", ["in", ["get", "iso"], ["literal", codes]]);
    map.setFilter("tm-footprint-line", ["in", ["get", "iso"], ["literal", codes]]);
    map.setPaintProperty("tm-footprint-fill", "fill-color", color);
    map.setPaintProperty("tm-footprint-line", "line-color", color);
    (map.getSource("tm-links") as GeoJSONSource | undefined)?.setData(linksGeoJSON(selected));
  }, [props.selectedId, props.compareIds, props.showFootprints, props.events, status, styleVersion]);

  // ——— Focus requests (from list, search, detail panel) ———
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !props.focusRequest) return;
    const ev = props.events.find((e) => e.id === props.focusRequest!.id);
    if (!ev || ev.points.length === 0) return;
    if (ev.points.length === 1) {
      map.flyTo({ center: [ev.points[0]!.lon, ev.points[0]!.lat], zoom: Math.max(map.getZoom(), 4), essential: false, duration: 900 });
    } else {
      const lons = ev.points.map((p) => p.lon);
      const lats = ev.points.map((p) => p.lat);
      map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 80, maxZoom: 6, duration: 900 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focusRequest, status]);

  return (
    <div className="relative h-full w-full">
      {/* Inline positioning: maplibre-gl.css (unlayered) would override Tailwind's layered utilities. */}
      <div ref={container} style={{ position: "absolute", inset: 0 }} />
      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted" role="status">
          {t.map.loading}
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-2" role="alert">
          <p>{t.map.dataError}</p>
          {errorMessage && <p className="text-xs text-muted">{errorMessage}</p>}
          <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
            {t.map.retry}
          </Button>
        </div>
      )}
    </div>
  );
}
