"use client";
/**
 * SVG world map: fallback renderer used when WebGL is not available (GPU
 * blocklisted, hardware acceleration disabled, remote/virtual desktops,
 * privacy-hardened browsers) or when the WebGL context is lost.
 *
 * It keeps the atlas fully usable: Natural Earth basemap, family shapes and
 * colours, hollow symbols for approximate positions, metric-driven sizes,
 * selection and comparison rings, impact footprints, links between places,
 * tooltips, pan/zoom with mouse, touch, wheel and keyboard. It does not offer
 * clustering or the detailed online basemap.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { FeatureCollection, Position } from "geojson";
import type { AtlasEvent, AtlasPoint } from "@/domain/atlas";
import { FAMILIES } from "@/domain/categories";
import { formatDateRange } from "@/domain/dates";
import { useI18n } from "@/i18n/client";
import { Button, Icon } from "@/components/ui/primitives";
import { isApproximate, loadCountries, NO_DATA_DIAMETER, sizeFor, UNIFORM_DIAMETER, type MapViewProps } from "./mapShared";

const WORLD = 1024;
const MAX_LAT = 85.0511;

export function project(lon: number, lat: number): [number, number] {
  const clamped = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
  const s = Math.sin((clamped * Math.PI) / 180);
  return [((lon + 180) / 360) * WORLD, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD];
}

function ringPath(ring: Position[]): string {
  let d = "";
  ring.forEach((pos, i) => {
    const [x, y] = project(pos[0]!, pos[1]!);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `${d}Z`;
}

function countryPaths(fc: FeatureCollection): { iso: string; d: string }[] {
  return fc.features.map((f) => {
    const g = f.geometry;
    const polys = g?.type === "Polygon" ? [g.coordinates] : g?.type === "MultiPolygon" ? g.coordinates : [];
    return { iso: String(f.properties?.iso ?? ""), d: polys.map((poly) => poly.map(ringPath).join("")).join("") };
  });
}

interface View {
  k: number;
  tx: number;
  ty: number;
}

interface Marker {
  key: string;
  event: AtlasEvent;
  point: AtlasPoint;
  x: number;
  y: number;
  d: number;
  hollow: boolean;
  dim: boolean;
}

function Shape({ shape, d, hollow, color }: { shape: "circle" | "square" | "triangle"; d: number; hollow: boolean; color: string }) {
  const paint = hollow ? { fill: "none", stroke: color, strokeWidth: 2 } : { fill: color, stroke: "var(--map-ring)", strokeWidth: 1.5 };
  const r = d / 2;
  if (shape === "circle") return <circle r={r} {...paint} />;
  if (shape === "square") return <rect x={-r * 0.9} y={-r * 0.9} width={r * 1.8} height={r * 1.8} rx={Math.min(3, r / 4)} {...paint} />;
  const h = r * 1.15;
  return <polygon points={`0,${-h} ${h * 0.95},${h * 0.7} ${-h * 0.95},${h * 0.7}`} {...paint} />;
}

export function SvgMap(props: MapViewProps) {
  const { t, locale } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [countries, setCountries] = useState<FeatureCollection | null>(null);
  // Detailed 1:50m outlines are loaded lazily once the user zooms in.
  const [detailed, setDetailed] = useState<FeatureCollection | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const [hover, setHover] = useState<Marker | null>(null);
  const viewRef = useRef<View | null>(null);
  viewRef.current = view;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadCountries("110m")
      .then((fc) => {
        if (cancelled) return;
        setCountries(fc);
        setStatus("ready");
        (window as unknown as { __TRANSMAP_RENDERER__?: string }).__TRANSMAP_RENDERER__ = "svg";
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMessage(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitK = size.w > 0 ? size.w / WORLD : 1;
  const initialView = useCallback((): View => {
    const k = fitK * 1.05;
    const [cx, cy] = project(20, 22);
    return { k, tx: size.w / 2 - cx * k, ty: size.h / 2 - cy * k };
  }, [fitK, size.w, size.h]);

  useEffect(() => {
    if (size.w > 0 && !viewRef.current) setView(initialView());
  }, [size.w, initialView]);

  const clampK = useCallback((k: number) => Math.max(fitK * 0.6, Math.min(fitK * 300, k)), [fitK]);

  const zoomAt = useCallback(
    (factor: number, px: number, py: number) => {
      setView((v) => {
        if (!v) return v;
        const k = clampK(v.k * factor);
        const ratio = k / v.k;
        return { k, tx: px - (px - v.tx) * ratio, ty: py - (py - v.ty) * ratio };
      });
    },
    [clampK],
  );

  // Animated transition (skipped when the user prefers reduced motion).
  const animRef = useRef<number | null>(null);
  const animateTo = useCallback((target: View) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const from = viewRef.current;
    if (!from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setView(target);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 500);
      const e = 1 - (1 - p) ** 3;
      setView({ k: from.k + (target.k - from.k) * e, tx: from.tx + (target.tx - from.tx) * e, ty: from.ty + (target.ty - from.ty) * e });
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  // Wheel zoom (native listener: React's wheel handlers are passive).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAt, status]);

  // Pointer pan and pinch zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ startView: View; startPts: { x: number; y: number }[]; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const local = (e: { clientX: number; clientY: number }) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const resetGesture = () => {
    if (!viewRef.current) return;
    gesture.current = { startView: viewRef.current, startPts: [...pointers.current.values()], moved: false };
  };
  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, local(e));
    dragged.current = false;
    resetGesture();
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length === 1 && g.startPts.length === 1) {
      const dx = pts[0]!.x - g.startPts[0]!.x;
      const dy = pts[0]!.y - g.startPts[0]!.y;
      if (!g.moved && Math.hypot(dx, dy) < 4) return;
      if (!g.moved) {
        g.moved = true;
        dragged.current = true;
        // Capture only once a drag starts, so clicks on markers still reach them.
        svgRef.current?.setPointerCapture(e.pointerId);
      }
      setView({ ...g.startView, tx: g.startView.tx + dx, ty: g.startView.ty + dy });
    } else if (pts.length >= 2 && g.startPts.length >= 2) {
      const [a, b] = pts;
      const [a0, b0] = g.startPts;
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const dist0 = Math.hypot(a0!.x - b0!.x, a0!.y - b0!.y) || 1;
      const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      const mid0 = { x: (a0!.x + b0!.x) / 2, y: (a0!.y + b0!.y) / 2 };
      const k = clampK(g.startView.k * (dist / dist0));
      const ratio = k / g.startView.k;
      g.moved = true;
      dragged.current = true;
      setView({ k, tx: mid.x - (mid0.x - g.startView.tx) * ratio, ty: mid.y - (mid0.y - g.startView.ty) * ratio });
    }
  };
  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (pointers.current.size > 0) resetGesture();
    else gesture.current = null;
  };

  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if (e.target !== svgRef.current) return;
    const step = 80;
    const center = { x: size.w / 2, y: size.h / 2 };
    const pan = (dx: number, dy: number) => setView((v) => (v ? { ...v, tx: v.tx + dx, ty: v.ty + dy } : v));
    const handled: Record<string, () => void> = {
      ArrowLeft: () => pan(step, 0),
      ArrowRight: () => pan(-step, 0),
      ArrowUp: () => pan(0, step),
      ArrowDown: () => pan(0, -step),
      "+": () => zoomAt(1.5, center.x, center.y),
      "=": () => zoomAt(1.5, center.x, center.y),
      "-": () => zoomAt(1 / 1.5, center.x, center.y),
      "0": () => animateTo(initialView()),
    };
    const fn = handled[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  // Focus requests from the list, search and detail panel.
  useEffect(() => {
    if (!props.focusRequest || !view || size.w === 0) return;
    const ev = props.events.find((e) => e.id === props.focusRequest!.id);
    if (!ev || ev.points.length === 0) return;
    const pts = ev.points.map((p) => project(p.lon, p.lat));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = 80;
    const kFit = pts.length > 1 ? Math.min((size.w - 2 * pad) / Math.max(1, maxX - minX), (size.h - 2 * pad) / Math.max(1, maxY - minY)) : Infinity;
    const k = clampK(Math.min(Math.max(viewRef.current!.k, fitK * 16), kFit, fitK * 64));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    animateTo({ k, tx: size.w / 2 - cx * k, ty: size.h / 2 - cy * k });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focusRequest, status, size.w > 0 && view !== null]);

  const zoomedIn = !!view && view.k > fitK * 5;
  useEffect(() => {
    if (!zoomedIn || detailed) return;
    let cancelled = false;
    loadCountries("50m")
      .then((fc) => !cancelled && setDetailed(fc))
      .catch(() => {
        /* keep the 1:110m outlines if the detailed file cannot be loaded */
      });
    return () => {
      cancelled = true;
    };
  }, [zoomedIn, detailed]);
  const coarsePaths = useMemo(() => (countries ? countryPaths(countries) : []), [countries]);
  const detailedPaths = useMemo(() => (detailed ? countryPaths(detailed) : null), [detailed]);
  const paths = zoomedIn && detailedPaths ? detailedPaths : coarsePaths;
  const selected = props.events.find((e) => e.id === props.selectedId);
  const footprint = new Set(props.showFootprints && selected ? selected.footprintCountryCodes : []);
  const footprintColor = selected ? `var(--family-${selected.family})` : "var(--accent)";

  const markers = useMemo<Marker[]>(() => {
    const sizes = sizeFor(props.events, props.sizeMetric, props.sizeScale);
    const out: Marker[] = [];
    for (const e of props.events) {
      const d = sizes.get(e.id);
      const hasMetric = !props.sizeMetric || d !== undefined;
      e.points.forEach((p, i) => {
        const [x, y] = project(p.lon, p.lat);
        out.push({
          key: `${e.id}#${i}`,
          event: e,
          point: p,
          x,
          y,
          d: props.sizeMetric ? (d ?? NO_DATA_DIAMETER) : UNIFORM_DIAMETER,
          hollow: isApproximate(p) || !hasMetric,
          dim: !hasMetric,
        });
      });
    }
    return out.sort((a, b) => b.d - a.d);
  }, [props.events, props.sizeMetric, props.sizeScale]);

  const v = view;
  const toScreen = (m: { x: number; y: number }) => (v ? { sx: m.x * v.k + v.tx, sy: m.y * v.k + v.ty } : { sx: 0, sy: 0 });
  const focusable = markers.length <= 300;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden" style={{ background: "var(--map-ocean)" }} data-testid="svg-map">
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
      {status === "ready" && v && (
        <svg
          ref={svgRef}
          width={size.w}
          height={size.h}
          tabIndex={0}
          role="group"
          aria-label={`${t.map.svgLabel}. ${t.map.instructions}`}
          aria-roledescription={t.map.label}
          className="block touch-none select-none"
          style={{ cursor: gesture.current?.moved ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <g transform={`translate(${v.tx} ${v.ty}) scale(${v.k})`} data-testid="svg-world" data-resolution={paths === detailedPaths ? "50m" : "110m"}>
            {paths.map((p, i) => {
              const hit = footprint.has(p.iso);
              return (
                <path
                  key={`${p.iso}-${i}`}
                  d={p.d}
                  fill={hit ? footprintColor : "var(--map-land)"}
                  fillOpacity={hit ? 0.3 : 1}
                  stroke={hit ? footprintColor : "var(--map-border)"}
                  strokeWidth={hit ? 1.2 : 0.6}
                  vectorEffect="non-scaling-stroke"
                  data-iso={p.iso}
                  data-footprint={hit ? "true" : undefined}
                />
              );
            })}
          </g>
          {selected && selected.points.length > 1 && (
            <g stroke="var(--text-primary)" strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} aria-hidden>
              {selected.points.slice(1).map((p, i) => {
                const a = toScreen({ x: project(selected.points[0]!.lon, selected.points[0]!.lat)[0], y: project(selected.points[0]!.lon, selected.points[0]!.lat)[1] });
                const [bx, by] = project(p.lon, p.lat);
                const b = toScreen({ x: bx, y: by });
                return <line key={i} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />;
              })}
            </g>
          )}
          <g>
            {markers.map((m) => {
              const { sx, sy } = toScreen(m);
              if (sx < -60 || sy < -60 || sx > size.w + 60 || sy > size.h + 60) return null;
              const color = `var(--family-${m.event.family})`;
              const isSelected = m.event.id === props.selectedId;
              const inCompare = props.compareIds.includes(m.event.id);
              const activate = () => {
                if (dragged.current) return;
                props.onSelect(m.event.id);
              };
              return (
                <g
                  key={m.key}
                  transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}
                  opacity={m.dim ? 0.55 : 1}
                  role="button"
                  tabIndex={focusable ? 0 : -1}
                  aria-label={`${m.event.title} — ${m.point.name}`}
                  data-testid={`svg-marker-${m.event.id}`}
                  className="cursor-pointer outline-none focus-visible:[&>circle:first-child]:stroke-[var(--focus)]"
                  onClick={activate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      props.onSelect(m.event.id);
                    }
                  }}
                  onPointerEnter={() => setHover(m)}
                  onPointerLeave={() => setHover((h) => (h?.key === m.key ? null : h))}
                  onFocus={() => setHover(m)}
                  onBlur={() => setHover((h) => (h?.key === m.key ? null : h))}
                >
                  <circle r={Math.max(m.d / 2 + 5, 11)} fill="transparent" stroke="transparent" strokeWidth={2} />
                  {inCompare && <circle r={m.d / 2 + 7} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} opacity={0.8} />}
                  {isSelected && <circle r={m.d / 2 + 5} fill="none" stroke="var(--accent)" strokeWidth={3} />}
                  <Shape shape={FAMILIES[m.event.family].shape} d={m.d} hollow={m.hollow} color={color} />
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {hover && v && (
        <div
          className="pointer-events-none absolute z-20 max-w-[280px] rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm shadow-xl"
          style={{ left: Math.min(toScreen(hover).sx + 14, Math.max(0, size.w - 290)), top: Math.max(4, toScreen(hover).sy - 12) }}
          role="tooltip"
        >
          <div className="font-semibold text-ink">{hover.event.title}</div>
          <div className="text-xs text-ink-2">
            {formatDateRange(hover.event.startDate, hover.event.endDate ?? undefined, locale, { circa: hover.event.dateCirca, precision: hover.event.datePrecision })} · {hover.point.name}
            {isApproximate(hover.point) ? ` · ${t.map.approximate}` : ""}
          </div>
          <div className="text-xs text-muted">{hover.event.categories.map((c) => t.categories[c]).join(" · ")}</div>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-md border border-line-strong bg-surface shadow">
            <button type="button" className="p-2 text-ink hover:bg-surface-2" aria-label={t.map.zoomIn} onClick={() => zoomAt(1.6, size.w / 2, size.h / 2)}>
              <Icon name="plus" />
            </button>
            <button type="button" className="border-t border-line p-2 text-ink hover:bg-surface-2" aria-label={t.map.zoomOut} onClick={() => zoomAt(1 / 1.6, size.w / 2, size.h / 2)}>
              <Icon name="minus" />
            </button>
            <button type="button" className="border-t border-line p-2 text-ink hover:bg-surface-2" aria-label={t.map.resetView} onClick={() => animateTo(initialView())}>
              <Icon name="globe" />
            </button>
          </div>
          <p className="absolute bottom-1 right-2 z-10 rounded bg-surface/85 px-1.5 py-0.5 text-[11px] text-ink-2">Natural Earth (public domain) via world-atlas</p>
        </>
      )}
    </div>
  );
}
