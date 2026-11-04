"use client";
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AtlasEvent, RelationSummary } from "@/domain/atlas";
import { CATEGORY_FAMILY, FAMILIES, FAMILY_IDS } from "@/domain/categories";
import { PERIODS } from "@/domain/dates";
import { isRatioScale, METRIC_TYPES, type MetricTypeId } from "@/domain/metrics";
import { CONTINENT_LABELS, SUBREGIONS } from "@/domain/regions";
import { categoryCounts, connectionsGraph, coverage, densityBySubregion, distributionByContinent, distributionByPeriod } from "@/engine/analytics";
import { useI18n } from "@/i18n/client";
import { formatNumber, formatQuantity, formatWithUnit } from "@/lib/format";
import { EChart } from "@/components/charts/EChart";
import { FamilyIcon, Icon, cx } from "@/components/ui/primitives";

function Card({ title, note, children, table, id }: { title: string; note?: string; children: ReactNode; table?: ReactNode; id: string }) {
  const { t } = useI18n();
  const [showTable, setShowTable] = useState(false);
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-line bg-surface p-4" data-testid={`card-${id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {table && (
          <button type="button" className="text-xs text-accent-ink hover:underline" aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}>
            {showTable ? t.analytics.hideTable : t.analytics.showTable}
          </button>
        )}
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-3">{children}</div>
      {showTable && <div className="mt-3 overflow-x-auto">{table}</div>}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

const axisCommon = (th: { muted: string; axis: string; grid: string }) => ({
  axisLabel: { color: th.muted, fontSize: 11 },
  axisLine: { lineStyle: { color: th.axis } },
  splitLine: { lineStyle: { color: th.grid } },
  axisTick: { show: false },
});

/** Dot (reference value) + bar (range of all estimates) for one metric across events. */
function DotRange({ events, metric, log }: { events: AtlasEvent[]; metric: MetricTypeId; log: boolean }) {
  const { locale } = useI18n();
  const unit = METRIC_TYPES[metric].unit;
  const rows = events
    .filter((e) => e.sizeMetrics[metric])
    .map((e) => ({ e, v: e.sizeMetrics[metric]! }))
    .sort((a, b) => b.v.value - a.v.value);
  const W = 720;
  const labelW = 210;
  const valueW = 120;
  const plotW = W - labelW - valueW;
  const rowH = 26;
  const H = rows.length * rowH + 24;
  const max = Math.max(...rows.map((r) => r.v.high));
  const minPos = Math.min(...rows.map((r) => Math.min(r.v.low, r.v.value)).filter((v) => v > 0));
  const lmin = Math.pow(10, Math.floor(Math.log10(minPos || 1)));
  const x = (v: number) => (log ? ((Math.log10(Math.max(v, lmin)) - Math.log10(lmin)) / (Math.log10(max) - Math.log10(lmin) || 1)) * plotW : (v / max) * plotW);
  const ticks = log ? Array.from({ length: Math.ceil(Math.log10(max / lmin)) + 1 }, (_, i) => lmin * 10 ** i).filter((v) => v <= max * 1.0001) : [0, max / 4, max / 2, (3 * max) / 4, max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={METRIC_TYPES[metric].label[locale]}>
      {ticks.map((tv, i) => (
        <g key={i}>
          <line x1={labelW + x(tv)} x2={labelW + x(tv)} y1={0} y2={H - 20} stroke="var(--grid)" />
          <text x={labelW + x(tv)} y={H - 6} fontSize="10" textAnchor="middle" fill="var(--text-muted)">
            {formatQuantity(tv, locale)}
          </text>
        </g>
      ))}
      {rows.map(({ e, v }, i) => {
        const y = i * rowH + 12;
        return (
          <g key={e.id}>
            <title>{`${e.title}: ${formatWithUnit(v.value, unit, locale)}`}</title>
            <text x={labelW - 10} y={y + 4} fontSize="12" textAnchor="end" fill="var(--text-primary)">
              {e.title.length > 30 ? `${e.title.slice(0, 29)}…` : e.title}
            </text>
            {v.high > v.low && <line x1={labelW + x(v.low)} x2={labelW + x(v.high)} y1={y} y2={y} stroke="var(--text-secondary)" strokeWidth={4} strokeLinecap="round" opacity={0.45} />}
            <circle cx={labelW + x(v.value)} cy={y} r={5} fill="var(--accent)" stroke="var(--surface-1)" strokeWidth={2} />
            <text x={labelW + plotW + 10} y={y + 4} fontSize="11" fill="var(--text-secondary)">
              {formatWithUnit(v.value, unit, locale)}
              {v.approx ? " *" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function AnalyticsView({ atlas, relations }: { atlas: AtlasEvent[]; relations: RelationSummary[] }) {
  const { t, locale, fmt } = useI18n();
  const router = useRouter();
  const cov = useMemo(() => coverage(atlas), [atlas]);
  const byPeriod = useMemo(() => distributionByPeriod(atlas), [atlas]);
  const byContinent = useMemo(() => distributionByContinent(atlas), [atlas]);
  const density = useMemo(() => densityBySubregion(atlas), [atlas]);
  const cats = useMemo(() => categoryCounts(atlas), [atlas]);
  const graph = useMemo(() => connectionsGraph(atlas, relations), [atlas, relations]);
  const comparableMetrics = useMemo(() => {
    const counts = new Map<MetricTypeId, number>();
    for (const e of atlas) for (const m of e.metricTypes) counts.set(m, (counts.get(m) ?? 0) + 1);
    return [...counts.entries()].filter(([m, n]) => n >= 2 && isRatioScale(METRIC_TYPES[m].unit)).map(([m]) => m);
  }, [atlas]);
  const [metric, setMetric] = useState<MetricTypeId>(comparableMetrics.includes("deaths_direct") ? "deaths_direct" : comparableMetrics[0]!);
  const [log, setLog] = useState(true);
  const emptySubregions = density.filter((d) => d.count === 0).map((d) => SUBREGIONS[d.subregion].label[locale]);
  const familySeries = FAMILY_IDS.map((f) => ({ id: f, name: t.families[f] }));

  const stackedTable = (rows: { label: string; counts: Record<string, number>; total: number }[]) => (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-muted">
          <th className="py-1 pr-2" />
          {familySeries.map((f) => (
            <th key={f.id} className="py-1 pr-2 font-medium">
              {f.name}
            </th>
          ))}
          <th className="py-1 font-medium">Tot.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="tabular border-t border-line text-ink-2">
            <th scope="row" className="py-1 pr-2 text-left font-normal text-ink">
              {r.label}
            </th>
            {familySeries.map((f) => (
              <td key={f.id} className="py-1 pr-2">
                {r.counts[f.id]}
              </td>
            ))}
            <td className="py-1">{r.total}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="serif text-3xl font-semibold text-ink">{t.analytics.title}</h1>
          <p className="mt-1 text-sm text-ink-2">{t.analytics.intro}</p>
        </div>
        <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-surface-2 px-3 text-sm text-ink hover:bg-surface-3">
          <Icon name="globe" size={15} />
          {t.common.back}
        </Link>
      </div>

      <p role="note" className="mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm text-ink" style={{ borderColor: "var(--status-warning)" }} data-testid="analytics-caveat">
        <span style={{ color: "var(--status-warning)" }} className="mt-0.5">
          <Icon name="warning" />
        </span>
        {t.analytics.caveat}
      </p>

      <h2 className="sr-only">{t.analytics.coverage}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label={t.analytics.events} value={String(cov.total)} />
        <Stat label={t.analytics.withCoords} value={`${cov.withCoordinates}`} />
        <Stat label={t.analytics.withMetrics} value={`${cov.withMetrics}`} />
        <Stat label={t.analytics.verified} value={`${cov.byStatus.verified}`} />
        <Stat label={t.analytics.disputed} value={`${cov.byStatus.disputed}`} />
        <Stat label={t.analytics.subregions} value={`${cov.subregionsCovered}/${cov.subregionsTotal}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          id="period"
          title={t.analytics.byPeriod}
          note={t.analytics.byPeriodNote}
          table={stackedTable(byPeriod.map((p) => ({ label: PERIODS.find((x) => x.id === p.periodId)!.label[locale], counts: p.counts, total: p.total })))}
        >
          <EChart
            label={t.analytics.byPeriod}
            deps={[locale, atlas]}
            build={(th) => ({
              grid: { left: 36, right: 12, top: 36, bottom: 64 },
              legend: { top: 0, textStyle: { color: th.ink2, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
              xAxis: { type: "category", data: byPeriod.map((p) => PERIODS.find((x) => x.id === p.periodId)!.label[locale]), ...axisCommon(th), axisLabel: { color: th.muted, fontSize: 10, rotate: 30 } },
              yAxis: { type: "value", minInterval: 1, ...axisCommon(th) },
              series: familySeries.map((f) => ({
                name: f.name,
                type: "bar",
                stack: "total",
                barMaxWidth: 28,
                itemStyle: { color: th.family[f.id], borderColor: th.surface, borderWidth: 1 },
                data: byPeriod.map((p) => p.counts[f.id]),
              })),
            })}
          />
        </Card>

        <Card
          id="continent"
          title={t.analytics.byContinent}
          table={stackedTable(byContinent.map((c) => ({ label: c.continent === "unlocated" ? t.analytics.unlocated : CONTINENT_LABELS[c.continent][locale], counts: c.counts, total: c.total })))}
        >
          <EChart
            label={t.analytics.byContinent}
            deps={[locale, atlas]}
            build={(th) => ({
              grid: { left: 36, right: 12, top: 36, bottom: 40 },
              legend: { top: 0, textStyle: { color: th.ink2, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
              tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
              xAxis: { type: "category", data: byContinent.map((c) => (c.continent === "unlocated" ? t.analytics.unlocated : CONTINENT_LABELS[c.continent][locale])), ...axisCommon(th) },
              yAxis: { type: "value", minInterval: 1, ...axisCommon(th) },
              series: familySeries.map((f) => ({
                name: f.name,
                type: "bar",
                stack: "total",
                barMaxWidth: 32,
                itemStyle: { color: th.family[f.id], borderColor: th.surface, borderWidth: 1 },
                data: byContinent.map((c) => c.counts[f.id]),
              })),
            })}
          />
        </Card>

        <Card
          id="density"
          title={t.analytics.density}
          note={t.analytics.densityNote}
          table={
            <table className="w-full text-xs">
              <tbody>
                {density.map((d) => (
                  <tr key={d.subregion} className="tabular border-t border-line text-ink-2">
                    <th scope="row" className="py-1 pr-2 text-left font-normal text-ink">
                      {SUBREGIONS[d.subregion].label[locale]}
                    </th>
                    <td className="py-1">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <EChart
            label={t.analytics.density}
            height={420}
            deps={[locale, atlas]}
            build={(th) => {
              const rows = density.filter((d) => d.count > 0).reverse();
              return {
                grid: { left: 150, right: 24, top: 8, bottom: 24 },
                tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
                xAxis: { type: "value", minInterval: 1, ...axisCommon(th) },
                yAxis: { type: "category", data: rows.map((d) => SUBREGIONS[d.subregion].label[locale]), ...axisCommon(th), axisLabel: { color: th.ink2, fontSize: 11 } },
                series: [{ type: "bar", name: t.analytics.count, data: rows.map((d) => d.count), barMaxWidth: 14, itemStyle: { color: th.accent, borderRadius: [0, 4, 4, 0] } }],
              };
            }}
          />
          {emptySubregions.length > 0 && <p className="mt-2 text-xs text-ink-2">{fmt(t.analytics.emptySubregions, { list: emptySubregions.join(", ") })}</p>}
        </Card>

        <Card id="categories" title={t.analytics.categories}>
          <ul className="space-y-1.5">
            {cats.map((c) => {
              const max = Math.max(...cats.map((x) => x.count));
              return (
                <li key={c.category} className="grid grid-cols-[minmax(0,13rem)_1fr_2rem] items-center gap-2 text-sm">
                  <span className="flex items-center gap-1.5 truncate text-ink">
                    <FamilyIcon family={CATEGORY_FAMILY[c.category]} size={10} />
                    {t.categories[c.category]}
                  </span>
                  <span className="h-2.5 rounded-r" style={{ width: `${(c.count / max) * 100}%`, background: `var(--family-${CATEGORY_FAMILY[c.category]})` }} aria-hidden />
                  <span className="tabular text-right text-xs text-ink-2">{c.count}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="mt-4">
        <Card id="numeric" title={t.analytics.numeric} note={t.analytics.numericNote}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-2">
              {t.analytics.metric}
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as MetricTypeId)}
                className="h-9 rounded-md border border-line-strong bg-surface-2 px-2 text-sm text-ink"
                data-testid="numeric-metric"
              >
                {comparableMetrics.map((m) => (
                  <option key={m} value={m}>
                    {METRIC_TYPES[m].label[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={log} onChange={(e) => setLog(e.target.checked)} className="accent-[var(--accent)]" />
              {t.analytics.logScale}
            </label>
          </div>
          <p className="mb-2 text-xs text-muted">{METRIC_TYPES[metric].description[locale]}</p>
          <div className="overflow-x-auto">
            <DotRange events={atlas} metric={metric} log={log} />
          </div>
          <p className="mt-2 text-xs text-muted">* {t.compare.warnings["approximate-reference"]}</p>
        </Card>
      </div>

      <div className="mt-4">
        <Card id="graph" title={t.analytics.graph} note={`${t.analytics.graphNote} ${t.analytics.graphNode}`}>
          <EChart
            label={t.analytics.graph}
            height={560}
            deps={[locale, atlas, relations]}
            onClick={(p) => {
              if (p.dataType === "node" && p.data && typeof p.data === "object" && "id" in (p.data as object)) router.push(`/?sel=${(p.data as { id: string }).id}`);
            }}
            build={(th) => ({
              tooltip: {
                formatter: (p: unknown) => {
                  const d = (p as { dataType: string; data: { name?: string; value?: string; description?: string } }).data;
                  return (p as { dataType: string }).dataType === "edge" ? (d.description ?? "") : `${d.name ?? ""}`;
                },
              },
              legend: { top: 0, data: familySeries.map((f) => f.name), textStyle: { color: th.ink2, fontSize: 11 } },
              series: [
                {
                  type: "graph",
                  layout: "force",
                  top: 48,
                  bottom: 16,
                  left: 16,
                  right: 16,
                  roam: true,
                  draggable: true,
                  force: { repulsion: 140, edgeLength: [50, 110], gravity: 0.08 },
                  categories: familySeries.map((f) => ({ name: f.name, itemStyle: { color: th.family[f.id] }, symbol: FAMILIES[f.id].shape === "square" ? "rect" : FAMILIES[f.id].shape })),
                  label: { show: true, position: "right", color: th.ink2, fontSize: 10, formatter: (p: unknown) => {
                    const n = (p as { data: { degree: number; name: string } }).data;
                    return n.degree >= 3 ? n.name : "";
                  } },
                  data: graph.nodes.map((n) => ({
                    id: n.id,
                    name: n.title,
                    degree: n.degree,
                    category: FAMILY_IDS.indexOf(n.family),
                    symbolSize: 7 + Math.sqrt(n.degree) * 4,
                    itemStyle: { borderColor: th.surface, borderWidth: 1.5 },
                  })),
                  links: graph.edges.map((e) => ({
                    source: e.source,
                    target: e.target,
                    description: e.description,
                    lineStyle: { color: th.muted, type: e.basis === "documented" ? "solid" : "dashed", width: e.basis === "documented" ? 1.8 : 1, opacity: 0.8 },
                  })),
                  emphasis: { focus: "adjacency", lineStyle: { width: 2.5 } },
                },
              ],
            })}
          />
        </Card>
      </div>

      <div className="mt-4">
        <Card id="footprints" title={t.analytics.footprints} note={t.analytics.footprintsNote}>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {atlas
              .filter((e) => e.footprintCountryCodes.length > 0 || e.hasGlobalFootprint)
              .map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <FamilyIcon family={e.family} size={10} />
                  <Link className="text-accent-ink hover:underline" href={`/?sel=${e.id}`}>
                    {e.title}
                  </Link>
                  <span className={cx("text-xs text-muted")}>{e.hasGlobalFootprint ? t.analytics.global : fmt(t.analytics.states, { n: formatNumber(e.footprintCountryCodes.length, locale) })}</span>
                </li>
              ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
