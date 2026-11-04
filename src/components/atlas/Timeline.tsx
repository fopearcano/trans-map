"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AtlasEvent } from "@/domain/atlas";
import { centuryOf, formatCentury, formatYear, fromAstronomical, PERIODS, PRESENT_YEAR, positionToYear, TIMELINE_MIN_YEAR, yearToPosition } from "@/domain/dates";
import { timeSelectionToYears, type TimeSelection } from "@/engine/filter";
import { useI18n } from "@/i18n/client";
import { cx } from "@/components/ui/primitives";

const BINS = 96;
const SLIDER_MAX = 1000;
const TICKS = [-100_000, -10_000, -3000, -1000, 1, 1000, 1500, 1800, 1900, 2000];

function tickLabel(y: number, locale: "it" | "en"): string {
  if (y === 1) return locale === "it" ? "1 d.C." : "1 CE";
  if (y < 0) return `${Math.abs(y).toLocaleString(locale === "it" ? "it-IT" : "en-GB")} ${locale === "it" ? "a.C." : "BCE"}`;
  return String(y);
}

export function describeSelection(sel: TimeSelection, locale: "it" | "en", allLabel: string): string {
  switch (sel.mode) {
    case "all":
      return allLabel;
    case "year":
      return formatYear(sel.year, locale);
    case "century":
      return formatCentury(sel.century, locale);
    case "period":
      return PERIODS.find((p) => p.id === sel.periodId)?.label[locale] ?? allLabel;
    case "range": {
      const a = formatYear(sel.from, locale);
      const b = formatYear(sel.to, locale);
      return `${a} – ${b}`;
    }
  }
}

function YearInput({ id, label, year, onChange }: { id: string; label: string; year: number; onChange: (y: number) => void }) {
  const { t } = useI18n();
  const [abs, setAbs] = useState(String(Math.abs(year)));
  const [era, setEra] = useState<"bce" | "ce">(year < 0 ? "bce" : "ce");
  useEffect(() => {
    setAbs(String(Math.abs(year)));
    setEra(year < 0 ? "bce" : "ce");
  }, [year]);
  const commit = (a: string, e: "bce" | "ce") => {
    const n = Math.max(1, Math.min(e === "bce" ? 3_300_000 : PRESENT_YEAR, Math.floor(Number(a) || 1)));
    onChange(e === "bce" ? -n : n);
  };
  return (
    <span className="inline-flex items-center gap-1">
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={1}
        inputMode="numeric"
        value={abs}
        onChange={(e) => setAbs(e.target.value)}
        onBlur={() => commit(abs, era)}
        onKeyDown={(e) => e.key === "Enter" && commit(abs, era)}
        className="tabular h-8 w-24 rounded-md border border-line-strong bg-surface-2 px-2 text-sm text-ink"
      />
      <select
        aria-label={`${label} — ${t.timeline.era}`}
        value={era}
        onChange={(e) => {
          const v = e.target.value as "bce" | "ce";
          setEra(v);
          commit(abs, v);
        }}
        className="h-8 rounded-md border border-line-strong bg-surface-2 px-1 text-sm text-ink"
      >
        <option value="ce">{t.timeline.ce}</option>
        <option value="bce">{t.timeline.bce}</option>
      </select>
    </span>
  );
}

export function Timeline({
  events,
  selection,
  onChange,
}: {
  /** Events matching all filters except time (for the histogram). */
  events: AtlasEvent[];
  selection: TimeSelection;
  onChange: (sel: TimeSelection) => void;
}) {
  const { t, locale, fmt } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bins = useMemo(() => {
    const counts = new Array<number>(BINS).fill(0);
    for (const e of events) {
      const a = Math.floor(yearToPosition(fromAstronomical(Math.floor(e.start))) * (BINS - 1));
      const b = Math.floor(yearToPosition(fromAstronomical(Math.floor(e.end))) * (BINS - 1));
      for (let i = Math.max(0, a); i <= Math.min(BINS - 1, b); i++) counts[i]!++;
    }
    return counts;
  }, [events]);
  const maxCount = Math.max(1, ...bins);

  const { from, to } = timeSelectionToYears(selection);
  const posFrom = selection.mode === "all" ? 0 : yearToPosition(from);
  const posTo = selection.mode === "all" ? 1 : yearToPosition(to);
  const sliderFrom = Math.round(posFrom * SLIDER_MAX);
  const sliderTo = Math.round(posTo * SLIDER_MAX);

  const setRange = (aPos: number, bPos: number) => {
    const fromYear = positionToYear(Math.min(aPos, bPos) / SLIDER_MAX);
    const toYear = positionToYear(Math.max(aPos, bPos) / SLIDER_MAX);
    if (Math.min(aPos, bPos) <= 0 && Math.max(aPos, bPos) >= SLIDER_MAX) onChange({ mode: "all" });
    else onChange({ mode: "range", from: fromYear, to: toYear });
  };

  const H = 44;
  const visibleTicks = TICKS.filter((_, i) => width > 640 || i % 2 === 1);
  const modes: { id: TimeSelection["mode"]; label: string }[] = [
    { id: "all", label: t.timeline.modeAll },
    { id: "period", label: t.timeline.modePeriod },
    { id: "century", label: t.timeline.modeCentury },
    { id: "year", label: t.timeline.modeYear },
    { id: "range", label: t.timeline.modeRange },
  ];

  const switchMode = (mode: TimeSelection["mode"]) => {
    if (mode === selection.mode) return;
    if (mode === "all") onChange({ mode: "all" });
    if (mode === "period") onChange({ mode: "period", periodId: "1945-today" });
    if (mode === "century") onChange({ mode: "century", century: centuryOf(selection.mode === "year" ? selection.year : 1950) });
    if (mode === "year") onChange({ mode: "year", year: selection.mode === "range" ? selection.from : 1963 });
    if (mode === "range") onChange({ mode: "range", from: selection.mode === "all" ? -3000 : from, to: selection.mode === "all" ? PRESENT_YEAR : to });
  };

  const label = describeSelection(selection, locale, t.timeline.modeAll);

  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-2" data-testid="timeline">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="timeline-title" className="text-sm font-semibold text-ink">
          {t.timeline.title}
        </h2>
        <div role="radiogroup" aria-label={t.timeline.title} className="flex flex-wrap gap-1">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selection.mode === m.id}
              onClick={() => switchMode(m.id)}
              className={cx(
                "h-7 rounded-md px-2 text-xs",
                selection.mode === m.id ? "bg-accent text-white" : "border border-line text-ink-2 hover:bg-surface-2",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selection.mode === "period" && (
            <select
              aria-label={t.timeline.period}
              value={selection.periodId}
              onChange={(e) => onChange({ mode: "period", periodId: e.target.value })}
              className="h-8 rounded-md border border-line-strong bg-surface-2 px-2 text-sm text-ink"
            >
              {PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label[locale]}
                </option>
              ))}
            </select>
          )}
          {selection.mode === "century" && (
            <span className="inline-flex items-center gap-1">
              <label htmlFor="tm-century" className="text-xs text-muted">
                {t.timeline.century}
              </label>
              <input
                id="tm-century"
                type="number"
                min={1}
                max={selection.century < 0 ? 33000 : 21}
                value={Math.abs(selection.century)}
                onChange={(e) => {
                  const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  onChange({ mode: "century", century: selection.century < 0 ? -n : Math.min(21, n) });
                }}
                className="tabular h-8 w-20 rounded-md border border-line-strong bg-surface-2 px-2 text-sm text-ink"
              />
              <select
                aria-label={`${t.timeline.century} — ${t.timeline.era}`}
                value={selection.century < 0 ? "bce" : "ce"}
                onChange={(e) => onChange({ mode: "century", century: (e.target.value === "bce" ? -1 : 1) * Math.abs(selection.century) })}
                className="h-8 rounded-md border border-line-strong bg-surface-2 px-1 text-sm text-ink"
              >
                <option value="ce">{t.timeline.ce}</option>
                <option value="bce">{t.timeline.bce}</option>
              </select>
            </span>
          )}
          {selection.mode === "year" && <YearInput id="tm-year" label={t.timeline.year} year={selection.year} onChange={(y) => onChange({ mode: "year", year: y })} />}
          {selection.mode === "range" && (
            <>
              <YearInput id="tm-from" label={t.timeline.from} year={selection.from} onChange={(y) => onChange({ mode: "range", from: y, to: selection.to })} />
              <YearInput id="tm-to" label={t.timeline.to} year={selection.to} onChange={(y) => onChange({ mode: "range", from: selection.from, to: y })} />
            </>
          )}
        </div>
        <p className="ml-auto text-xs text-ink-2" aria-live="polite" data-testid="timeline-selection">
          {fmt(t.timeline.selection, { label })}
        </p>
      </div>

      <div ref={wrapRef} className="relative">
        <svg width="100%" height={H} viewBox={`0 0 ${width} ${H}`} preserveAspectRatio="none" role="img" aria-label={t.timeline.histogram}>
          {bins.map((count, i) => {
            if (count === 0) return null;
            const x = (i / BINS) * width;
            const w = Math.max(1, width / BINS - 2);
            const h = Math.max(2, (Math.sqrt(count) / Math.sqrt(maxCount)) * (H - 4));
            const center = (i + 0.5) / BINS;
            const inRange = center >= posFrom - 0.5 / BINS && center <= posTo + 0.5 / BINS;
            return (
              <rect key={i} x={x + 1} y={H - h} width={w} height={h} rx={1.5} fill={inRange ? "var(--accent)" : "var(--text-muted)"} opacity={inRange ? 0.9 : 0.35}>
                <title>{`${formatYear(positionToYear(i / BINS), locale)} – ${formatYear(positionToYear((i + 1) / BINS), locale)}: ${count}`}</title>
              </rect>
            );
          })}
          <line x1={0} x2={width} y1={H - 0.5} y2={H - 0.5} stroke="var(--axis)" />
        </svg>
        <div className="tm-range -mt-1">
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            value={sliderFrom}
            aria-label={t.timeline.sliderStart}
            aria-valuetext={formatYear(selection.mode === "all" ? TIMELINE_MIN_YEAR : from, locale)}
            onChange={(e) => setRange(Math.min(Number(e.target.value), sliderTo - 1), sliderTo)}
          />
          <input
            type="range"
            min={0}
            max={SLIDER_MAX}
            value={sliderTo}
            aria-label={t.timeline.sliderEnd}
            aria-valuetext={formatYear(selection.mode === "all" ? PRESENT_YEAR : to, locale)}
            onChange={(e) => setRange(sliderFrom, Math.max(Number(e.target.value), sliderFrom + 1))}
          />
        </div>
        <div className="relative h-4 text-[11px] text-muted" aria-hidden>
          {visibleTicks.map((y) => (
            <span key={y} className="tabular absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${yearToPosition(y) * 100}%` }}>
              {tickLabel(y, locale)}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted">
        {t.timeline.scaleNote} {selection.mode === "period" ? t.timeline.periodNote : null}
      </p>
    </section>
  );
}
