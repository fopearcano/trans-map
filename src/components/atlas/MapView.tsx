"use client";
/**
 * World map. Uses the WebGL renderer (MapLibre GL JS) when the browser
 * supports it and falls back to an SVG renderer otherwise, so the atlas is
 * never reduced to "map unavailable".
 *
 * `?renderer=svg` forces the SVG renderer (useful for diagnostics and tests).
 */
import { useEffect, useState } from "react";
import { FAMILIES, type FamilyId } from "@/domain/categories";
import { METRIC_TYPES } from "@/domain/metrics";
import { useI18n } from "@/i18n/client";
import { Icon } from "@/components/ui/primitives";
import { detectWebGL, type FallbackReason, type MapRenderer, type MapViewProps } from "./mapShared";
import { SvgMap } from "./SvgMap";
import { WebGLMap } from "./WebGLMap";

export type { Basemap, SizeScale, MapRenderer } from "./mapShared";

export function MapView(props: MapViewProps) {
  const { t, locale } = useI18n();
  const [renderer, setRenderer] = useState<MapRenderer | null>(null);
  const [reason, setReason] = useState<FallbackReason | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(true);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("renderer") === "svg";
    if (forced) {
      setReason("forced");
      setRenderer("svg");
    } else if (!detectWebGL()) {
      setReason("no-webgl");
      setRenderer("svg");
    } else setRenderer("webgl");
  }, []);

  useEffect(() => {
    if (renderer) props.onRendererChange?.(renderer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer]);

  const fallBack = (why: FallbackReason) => {
    setReason(why);
    setNoticeOpen(true);
    setRenderer("svg");
  };

  const sizeLabel = props.sizeMetric ? METRIC_TYPES[props.sizeMetric].label[locale] : null;
  const notice = reason === "forced" ? t.map.svgNoticeForced : reason === "context-lost" ? t.map.svgNoticeLost : t.map.svgNotice;

  return (
    <div className="relative h-full w-full" data-testid="map" data-renderer={renderer ?? "pending"}>
      {renderer === "webgl" && <WebGLMap {...props} onWebGLFailure={fallBack} />}
      {renderer === "svg" && <SvgMap {...props} />}
      {renderer === "svg" && noticeOpen && (
        <div className="absolute left-2 top-2 z-20 flex max-w-[min(440px,calc(100%-4.5rem))] items-start gap-2 rounded-md border bg-surface/95 p-2 text-xs text-ink-2 shadow" style={{ borderColor: "var(--status-warning)" }} role="status" data-testid="svg-notice">
          <span className="mt-0.5" style={{ color: "var(--status-warning)" }}>
            <Icon name="info" size={14} />
          </span>
          <p className="flex-1">{notice}</p>
          <button type="button" className="rounded p-0.5 text-muted hover:text-ink" aria-label={t.map.dismiss} onClick={() => setNoticeOpen(false)}>
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
      <MapLegend sizeLabel={sizeLabel} />
    </div>
  );
}

const LEGEND_KEY = "tm-legend-open";

/**
 * Map legend. Collapsed by default to a small chip so that it never hides
 * markers in the initial view; the user's choice is remembered. It opens
 * automatically when a metric drives symbol sizes, because sizes then need
 * explaining.
 */
function MapLegend({ sizeLabel }: { sizeLabel: string | null }) {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(LEGEND_KEY) === "1") setOpen(true);
    } catch {
      /* storage unavailable: keep the compact legend */
    }
  }, []);
  useEffect(() => {
    if (sizeLabel) setOpen(true);
  }, [sizeLabel]);
  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(LEGEND_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  const families = Object.keys(FAMILIES) as FamilyId[];

  if (!open)
    return (
      <button
        type="button"
        onClick={() => toggle(true)}
        aria-expanded={false}
        aria-label={t.map.legendOpen}
        className="absolute bottom-8 left-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-2.5 py-1 text-xs font-medium text-ink backdrop-blur-sm hover:bg-surface-2"
        data-testid="map-legend-toggle"
      >
        {families.map((f) => (
          <LegendShape key={f} family={f} />
        ))}
        <span>{t.map.legend}</span>
      </button>
    );

  return (
    <div className="absolute bottom-8 left-2 z-10 max-w-[260px] rounded-md border border-line bg-surface/90 p-2 text-xs text-ink-2 backdrop-blur-sm" data-testid="map-legend">
      <button type="button" className="flex w-full items-center justify-between gap-2 font-medium text-ink" aria-expanded={true} aria-label={t.map.legendClose} onClick={() => toggle(false)}>
        <span>{t.map.legendShapes}</span>
        <span aria-hidden>−</span>
      </button>
      <ul className="mt-1.5 space-y-1">
        {families.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <LegendShape family={f} />
            <span>{t.families[f]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <LegendShape family="knowledge" hollow />
          <span>{t.map.legendHollow}</span>
        </li>
        {sizeLabel && (
          <>
            <li className="pt-1 text-ink">{fmt(t.map.legendSize, { metric: sizeLabel })}</li>
            <li className="text-muted">{t.map.legendNoData}</li>
          </>
        )}
      </ul>
    </div>
  );
}

function LegendShape({ family, hollow = false }: { family: FamilyId; hollow?: boolean }) {
  const shape = FAMILIES[family].shape;
  const color = `var(--family-${family})`;
  const props = hollow ? { fill: "none", stroke: color, strokeWidth: 2 } : { fill: color };
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      {shape === "circle" && <circle cx="7" cy="7" r="5.5" {...props} />}
      {shape === "square" && <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" {...props} />}
      {shape === "triangle" && <polygon points="7,1.2 12.8,12.3 1.2,12.3" {...props} />}
    </svg>
  );
}

