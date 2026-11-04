"use client";
import { useEffect, useRef, useState } from "react";
import type { ECharts, EChartsOption } from "echarts";

export interface ChartTheme {
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
  accent: string;
  family: { knowledge: string; societies: string; earth: string };
}

export function readChartTheme(): ChartTheme {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    ink: v("--text-primary"),
    ink2: v("--text-secondary"),
    muted: v("--text-muted"),
    grid: v("--grid"),
    axis: v("--axis"),
    surface: v("--surface-1"),
    accent: v("--accent"),
    family: { knowledge: v("--family-knowledge"), societies: v("--family-societies"), earth: v("--family-earth") },
  };
}

/** Theme-aware ECharts wrapper (loaded lazily, SVG renderer, responsive). */
export function EChart({
  build,
  height = 320,
  label,
  onClick,
  deps = [],
}: {
  build: (theme: ChartTheme) => EChartsOption;
  height?: number;
  label: string;
  onClick?: (params: { dataType?: string; data?: unknown; name?: string }) => void;
  deps?: unknown[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const [themeKey, setThemeKey] = useState(0);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeKey((k) => k + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const echarts = await import("echarts");
      if (disposed || !ref.current) return;
      chartRef.current?.dispose();
      const chart = echarts.init(ref.current, null, { renderer: "svg" });
      chartRef.current = chart;
      chart.setOption({ animation: false, ...build(readChartTheme()) });
      chart.on("click", (p) => onClickRef.current?.(p as never));
      ro = new ResizeObserver(() => chart.resize());
      ro.observe(ref.current);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey, ...deps]);

  return <div ref={ref} role="img" aria-label={label} style={{ width: "100%", height }} />;
}
