"use client";
import { useEffect, useMemo, useState } from "react";
import type { AtlasEvent } from "@/domain/atlas";
import { familyOf } from "@/domain/categories";
import { formatDateRange } from "@/domain/dates";
import { ESTIMATE_KIND_LABELS, isRatioScale, METRIC_TYPES, UNCERTAINTY_LABELS } from "@/domain/metrics";
import type { CuratedComparison, EventRecord, Place, Source } from "@/domain/schemas";
import type { CompareWarning, ComparisonResult, MetricEntry, MetricRow } from "@/engine/compare";
import type { SearchDocument } from "@/engine/search";
import { useI18n } from "@/i18n/client";
import { formatFactor, formatNumber, formatQuantity, formatRange, formatWithUnit } from "@/lib/format";
import { Button, Chip, EvidenceBadge, FamilyIcon, Icon, SectionTitle, cx } from "@/components/ui/primitives";
import { SearchBox } from "@/components/atlas/SearchBox";

interface CompareResponse {
  result: ComparisonResult;
  events: (EventRecord & { places: (Partial<Place> & { role: string })[] })[];
  curated: CuratedComparison[];
  sources: Source[];
}

type Scale = "linear" | "log";

function useCompare(ids: string[]) {
  const [state, setState] = useState<{ data: CompareResponse | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: false });
  const key = ids.join(",");
  useEffect(() => {
    if (ids.length < 2) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`/api/compare?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error?.message ?? `HTTP ${r.status}`);
        return r.json() as Promise<CompareResponse>;
      })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") setState({ data: null, error: err.message, loading: false });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

function WarningList({ warnings, titles }: { warnings: CompareWarning[]; titles: Map<string, string> }) {
  const { t, locale, fmt } = useI18n();
  if (!warnings.length) return null;
  return (
    <ul className="mt-2 space-y-1" aria-label="avvertenze">
      {warnings.map((w, i) => {
        let text = t.compare.warnings[w.code];
        if (w.code === "estimate-kinds-differ") text = fmt(text, { kinds: w.kinds.map((k) => ESTIMATE_KIND_LABELS[k as keyof typeof ESTIMATE_KIND_LABELS]?.[locale] ?? k).join(" / ") });
        if (w.code === "wide-ratio-range") text = fmt(text, { factor: formatFactor(w.factor, locale) });
        if (w.code === "approximate-reference" || w.code === "very-high-uncertainty") text = `${text}: ${w.eventIds.map((id) => titles.get(id) ?? id).join(", ")}`;
        return (
          <li key={i} className="flex items-start gap-1.5 text-xs" data-testid={`warning-${w.code}`}>
            <span style={{ color: "var(--status-warning)" }} className="mt-0.5">
              <Icon name="warning" size={13} />
            </span>
            <span className="text-ink-2">{text}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Horizontal bars with reference value (bar end) and range of all estimates (whisker). */
function RangeBars({ row, titles, scale, caution }: { row: MetricRow; titles: Map<string, string>; scale: Scale; caution?: boolean }) {
  const { t, locale } = useI18n();
  const W = 560;
  const labelW = 150;
  const valueW = 120;
  const plotW = W - labelW - valueW;
  const rowH = 30;
  const H = row.entries.length * rowH + 22;
  const maxV = Math.max(...row.entries.map((e) => Math.max(e.envelope.high, e.reference.value)));
  const minPos = Math.min(...row.entries.map((e) => Math.min(e.envelope.low, e.reference.value)).filter((v) => v > 0));
  const logMin = Math.pow(10, Math.floor(Math.log10(minPos || 1)));
  const x = (v: number) => {
    if (scale === "log") {
      const lv = Math.log10(Math.max(v, logMin));
      return ((lv - Math.log10(logMin)) / (Math.log10(maxV) - Math.log10(logMin) || 1)) * plotW;
    }
    return (v / maxV) * plotW;
  };
  const unit = METRIC_TYPES[row.metricType].unit;
  const ticks = scale === "log" ? Array.from({ length: Math.max(1, Math.ceil(Math.log10(maxV / logMin)) + 1) }, (_, i) => logMin * 10 ** i).filter((v) => v <= maxV * 1.0001) : [0, maxV / 2, maxV];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${METRIC_TYPES[row.metricType].label[locale]} — ${t.compare.chartLabel}`}>
      {ticks.map((tv, i) => (
        <g key={i}>
          <line x1={labelW + x(tv)} x2={labelW + x(tv)} y1={0} y2={H - 18} stroke="var(--grid)" />
          <text x={labelW + x(tv)} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--text-muted)" className="tabular">
            {formatQuantity(tv, locale)}
          </text>
        </g>
      ))}
      {row.entries.map((e: MetricEntry, i) => {
        const y = i * rowH + 6;
        const ref = x(e.reference.value);
        const lo = x(e.envelope.low);
        const hi = x(e.envelope.high);
        const title = titles.get(e.eventId) ?? e.eventId;
        return (
          <g key={`${e.eventId}-${e.metricType}`}>
            <title>{`${title}: ${formatWithUnit(e.reference.value, unit, locale)} (${t.compare.estimateRange}: ${formatRange(e.envelope.low, e.envelope.high, unit, locale)})`}</title>
            <text x={labelW - 8} y={y + 13} fontSize="12" textAnchor="end" fill="var(--text-primary)">
              {title.length > 22 ? `${title.slice(0, 21)}…` : title}
            </text>
            <rect
              x={labelW}
              y={y + 3}
              width={Math.max(2, ref)}
              height={14}
              rx={3}
              fill={caution ? "transparent" : "var(--accent)"}
              stroke={caution ? "var(--accent)" : "none"}
              strokeDasharray={caution ? "4 3" : undefined}
              opacity={e.reference.approx ? 0.6 : 0.9}
            />
            {e.envelope.high > e.envelope.low && (
              <g stroke="var(--text-primary)" strokeWidth={1.5}>
                <line x1={labelW + lo} x2={labelW + hi} y1={y + 10} y2={y + 10} />
                <line x1={labelW + lo} x2={labelW + lo} y1={y + 5} y2={y + 15} />
                <line x1={labelW + hi} x2={labelW + hi} y1={y + 5} y2={y + 15} />
              </g>
            )}
            <text x={labelW + plotW + 8} y={y + 14} fontSize="11.5" fill="var(--text-secondary)" className="tabular">
              {formatWithUnit(e.reference.value, unit, locale)}
              {e.reference.approx ? " *" : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RowTable({ row, titles }: { row: MetricRow; titles: Map<string, string> }) {
  const { t, locale } = useI18n();
  const unit = METRIC_TYPES[row.metricType].unit;
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-left text-muted">
          <th className="py-1 pr-2 font-medium">{t.compare.title}</th>
          <th className="py-1 pr-2 font-medium">{t.compare.value}</th>
          <th className="py-1 pr-2 font-medium">{t.compare.estimateRange}</th>
        </tr>
      </thead>
      <tbody>
        {row.entries.map((e) => (
          <tr key={`${e.eventId}-${e.metricType}`} className="border-t border-line align-top">
            <td className="py-1 pr-2 text-ink">
              {titles.get(e.eventId)}
              {row.comparability === "cross-definition" && <span className="block text-muted">{METRIC_TYPES[e.metricType].label[locale]}</span>}
            </td>
            <td className="tabular py-1 pr-2">
              {formatWithUnit(e.reference.value, unit, locale)}
              <span className="block text-muted">
                {ESTIMATE_KIND_LABELS[e.reference.estimateKind][locale]} · {UNCERTAINTY_LABELS[e.reference.uncertainty][locale]}
              </span>
            </td>
            <td className="tabular py-1 pr-2">
              {formatRange(e.envelope.low, e.envelope.high, unit, locale)}
              <span className="block text-muted">
                {e.estimates.length} {locale === "it" ? "stime" : "estimates"}: {e.estimates.map((s) => s.attributedTo).join("; ")}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetricRowView({ row, titles, scale, caution = false }: { row: MetricRow; titles: Map<string, string>; scale: Scale; caution?: boolean }) {
  const { t, locale, fmt } = useI18n();
  const [showTable, setShowTable] = useState(false);
  const def = METRIC_TYPES[row.metricType];
  const label = row.comparability === "cross-definition" ? [...new Set(row.entries.map((e) => METRIC_TYPES[e.metricType].label[locale]))].join(" ↔ ") : def.label[locale];
  return (
    <div className={cx("rounded-lg border p-3", caution ? "border-dashed border-line-strong" : "border-line")} data-testid={`compare-row-${row.comparability}-${row.metricType}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{label}</h4>
        <button type="button" className="text-xs text-accent-ink hover:underline" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
          {t.compare.table}
        </button>
      </div>
      <p className="text-xs text-muted">{def.description[locale]}</p>
      <div className="mt-2 overflow-x-auto">
        <RangeBars row={row} titles={titles} scale={scale} caution={caution} />
      </div>
      {showTable && <RowTable row={row} titles={titles} />}
      {row.ratios.length > 0 ? (
        <ul className="mt-2 space-y-0.5" data-testid="ratios">
          {row.ratios.map((r, i) => (
            <li key={i} className="text-sm text-ink">
              <span className="tabular font-medium">{fmt(t.compare.ratio, { a: titles.get(r.numeratorId) ?? "", b: titles.get(r.denominatorId) ?? "", factor: formatFactor(r.reference, locale) })}</span>
              <span className="tabular block text-xs text-muted">{fmt(t.compare.ratioRange, { low: formatFactor(r.low, locale), high: formatFactor(r.high, locale) })}</span>
            </li>
          ))}
        </ul>
      ) : (
        !isRatioScale(row.unit) && <p className="mt-2 text-xs text-muted">{t.compare.noRatio}</p>
      )}
      {row.perCapita.length > 0 && (
        <div className="mt-3" data-testid="per-capita">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.compare.perCapita}</p>
          {row.perCapita.map((g) => (
            <div key={g.kind} className="mt-1.5">
              <p className="text-xs text-ink-2">
                {t.compare.denominatorKinds[g.kind]} — {g.comparable ? t.compare.perCapitaComparable : t.compare.perCapitaNotComparable}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {g.entries.map((p) => (
                  <li key={`${p.eventId}-${p.denominator.year}`} className="tabular text-xs text-ink">
                    {titles.get(p.eventId)}: {formatNumber(p.perMillion, locale, p.perMillion < 10 ? 2 : 1)} {locale === "it" ? "per milione" : "per million"} ({formatNumber(p.percent, locale, 4)}%)
                    <span className="block text-muted">
                      {p.denominator.description}: {formatNumber(p.denominator.value, locale)}
                    </span>
                  </li>
                ))}
              </ul>
              {g.ratios.map((r, i) => (
                <p key={i} className="tabular mt-0.5 text-xs font-medium text-ink">
                  {fmt(t.compare.ratio, { a: titles.get(r.numeratorId) ?? "", b: titles.get(r.denominatorId) ?? "", factor: formatFactor(r.reference, locale) })}
                  <span className="font-normal text-muted"> · {fmt(t.compare.ratioRange, { low: formatFactor(r.low, locale), high: formatFactor(r.high, locale) })}</span>
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
      <WarningList warnings={row.warnings} titles={titles} />
    </div>
  );
}

export function ComparePanel({
  ids,
  atlas,
  searchIndex,
  onAdd,
  onRemove,
  onOpenEvent,
}: {
  ids: string[];
  atlas: AtlasEvent[];
  searchIndex: SearchDocument[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenEvent: (id: string) => void;
}) {
  const { t, locale, fmt } = useI18n();
  const { data, error, loading } = useCompare(ids);
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState<Scale>("linear");
  const byId = useMemo(() => new Map(atlas.map((e) => [e.id, e])), [atlas]);
  const titles = useMemo(() => new Map(ids.map((id) => [id, byId.get(id)?.title ?? id])), [ids, byId]);

  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?cmp=${ids.join(",")}&panel=compare`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };

  return (
    <section aria-labelledby="compare-title" data-testid="compare-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 id="compare-title" className="serif text-xl font-semibold text-ink">
            {t.compare.title}
          </h2>
          <p className="text-xs text-muted">{t.compare.subtitle}</p>
        </div>
        {ids.length >= 2 && (
          <Button size="sm" variant="ghost" onClick={copyLink}>
            <Icon name="link" size={14} />
            {copied ? t.event.actions.copied : t.compare.shareLink}
          </Button>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.compare.title}>
        {ids.map((id) => {
          const ev = byId.get(id);
          return (
            <li key={id}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 py-0.5 pl-2 pr-1 text-sm">
                {ev && <FamilyIcon family={ev.family} size={10} />}
                <button type="button" className="hover:underline" onClick={() => onOpenEvent(id)}>
                  {titles.get(id)}
                </button>
                <button type="button" aria-label={fmt(t.compare.remove, { title: titles.get(id) ?? id })} className="rounded-full p-0.5 text-muted hover:bg-surface-3 hover:text-ink" onClick={() => onRemove(id)}>
                  <Icon name="close" size={12} />
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      {ids.length < 4 ? (
        <div className="mt-2">
          <SearchBox
            testId="compare-search"
            value={query}
            onChange={setQuery}
            onPick={(id) => {
              onAdd(id);
              setQuery("");
            }}
            index={searchIndex}
            events={atlas}
            exclude={ids}
            label={t.compare.add}
            placeholder={t.compare.addPlaceholder}
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">{t.compare.max}</p>
      )}

      {ids.length === 0 && <p className="mt-4 text-sm text-ink-2">{t.compare.empty}</p>}
      {ids.length === 1 && <p className="mt-4 text-sm text-ink-2">{t.compare.needTwo}</p>}
      {loading && (
        <p className="mt-4 text-sm text-muted" role="status">
          {t.compare.loading}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm" role="alert" style={{ color: "var(--status-critical)" }}>
          {t.compare.error} {error}
        </p>
      )}

      {data && ids.length >= 2 && (
        <div className="mt-4 space-y-2">
          {data.curated.map((c) => (
            <div key={c.id} className="rounded-lg border border-line bg-surface-2 p-3" data-testid="curated-notes">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t.compare.curated}: {c.title}
              </p>
              <p className="mt-1 text-sm text-ink">{c.question}</p>
              <SectionTitle>{t.compare.notes}</SectionTitle>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {c.methodologicalNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))}

          <SectionTitle>{t.compare.profile}</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm" data-testid="compare-profile">
              <thead>
                <tr>
                  <th className="w-28" />
                  {data.events.map((e) => (
                    <th key={e.id} scope="col" className="px-2 pb-2 text-left align-bottom font-semibold text-ink">
                      {e.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="align-top text-ink-2">
                <tr className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left text-xs font-medium text-muted">
                    {t.compare.location}
                  </th>
                  {data.events.map((e) => (
                    <td key={e.id} className="px-2 py-1.5">
                      {e.places.length ? e.places.map((p) => p.name).join("; ") : e.locationNote}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left text-xs font-medium text-muted">
                    {t.compare.period}
                  </th>
                  {data.events.map((e) => {
                    const tp = data.result.temporal.find((x) => x.eventId === e.id)!;
                    const years = Math.round(tp.durationYears);
                    return (
                      <td key={e.id} className="tabular px-2 py-1.5">
                        {formatDateRange(e.startDate, e.endDate, locale, { circa: e.dateCirca, precision: e.datePrecision })}
                        <span className="block text-xs text-muted">
                          {tp.ongoing ? t.compare.ongoing : years < 1 ? t.compare.durationLessThanYear : fmt(t.compare.durationYears, { n: years })}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left text-xs font-medium text-muted">
                    {t.compare.type}
                  </th>
                  {data.events.map((e) => (
                    <td key={e.id} className="px-2 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {e.categories.map((c) => (
                          <Chip key={c}>
                            <FamilyIcon family={familyOf(c).id} size={9} />
                            {t.categories[c]}
                          </Chip>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left text-xs font-medium text-muted">
                    {t.compare.affected}
                  </th>
                  {data.events.map((e) => (
                    <td key={e.id} className="px-2 py-1.5 text-xs">
                      {e.peopleOrRegionsAffected.length ? e.peopleOrRegionsAffected.join("; ") : <span className="text-muted">{t.common.unknown}</span>}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left text-xs font-medium text-muted">
                    {t.event.status}
                  </th>
                  {data.events.map((e) => (
                    <td key={e.id} className="px-2 py-1.5">
                      <EvidenceBadge status={e.evidenceStatus} />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>{t.compare.shared}</SectionTitle>
            <div role="radiogroup" aria-label={t.compare.chartScale} className="flex gap-1 text-xs">
              {(["linear", "log"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={scale === s}
                  onClick={() => setScale(s)}
                  className={cx("rounded-md px-2 py-0.5", scale === s ? "bg-accent text-white" : "border border-line text-ink-2")}
                >
                  {s === "linear" ? t.compare.linear : t.compare.log}
                </button>
              ))}
            </div>
          </div>
          {data.result.sharedRows.length === 0 && <p className="text-sm text-muted">{t.compare.sharedNone}</p>}
          <div className="space-y-3">
            {data.result.sharedRows.map((row) => (
              <MetricRowView key={row.key} row={row} titles={titles} scale={scale} />
            ))}
          </div>

          {data.result.crossDefinitionRows.length > 0 && (
            <details className="mt-4 rounded-lg border border-dashed p-3" style={{ borderColor: "var(--status-warning)" }} data-testid="cross-definition">
              <summary className="cursor-pointer text-sm font-semibold text-ink">{t.compare.cross}</summary>
              <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-2">
                <span style={{ color: "var(--status-warning)" }} className="mt-0.5">
                  <Icon name="warning" size={15} />
                </span>
                {t.compare.crossWarning}
              </p>
              <div className="mt-2 space-y-3">
                {data.result.crossDefinitionRows.map((row) => (
                  <MetricRowView key={row.key} row={row} titles={titles} scale={scale} caution />
                ))}
              </div>
            </details>
          )}

          {data.result.exclusive.some((x) => x.rows.length > 0) && (
            <>
              <SectionTitle>{t.compare.exclusive}</SectionTitle>
              <ul className="space-y-1 text-sm" data-testid="compare-exclusive">
                {data.result.exclusive.flatMap((x) =>
                  x.rows.map((r) => {
                    const missing = data.result.missing.find((m) => m.metricType === r.metricType)?.missingIn ?? [];
                    return (
                      <li key={`${x.eventId}-${r.metricType}`} className="text-ink-2">
                        <span className="font-medium text-ink">{titles.get(x.eventId)}</span> — {METRIC_TYPES[r.metricType].label[locale]}:{" "}
                        <span className="tabular">{formatWithUnit(r.reference.value, METRIC_TYPES[r.metricType].unit, locale)}</span>
                        <span className="block text-xs text-muted">{fmt(t.compare.missingFor, { events: missing.map((m) => titles.get(m) ?? m).join(", ") })}</span>
                      </li>
                    );
                  }),
                )}
              </ul>
            </>
          )}

          <SectionTitle>{t.compare.qualitative}</SectionTitle>
          <p className="text-xs text-muted">{t.compare.qualitativeNote}</p>
          <div className={cx("mt-2 grid gap-3", data.events.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")} data-testid="compare-qualitative">
            {data.result.qualitative.map((q) => {
              const ev = data.events.find((e) => e.id === q.eventId)!;
              return (
                <div key={q.eventId} className="rounded-lg border border-line p-3 text-sm">
                  <p className="font-semibold text-ink">{ev.title}</p>
                  {q.causes.length > 0 && (
                    <>
                      <p className="mt-2 text-xs font-medium text-muted">{t.event.causes}</p>
                      <ul className="list-disc pl-4 text-ink-2">
                        {q.causes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {(["direct", "indirect", "long-term"] as const).map((k) =>
                    q.consequences[k].length ? (
                      <div key={k}>
                        <p className="mt-2 text-xs font-medium text-muted">
                          {t.event.consequences} · {k === "direct" ? t.event.direct : k === "indirect" ? t.event.indirect : t.event.longTerm}
                        </p>
                        <ul className="list-disc pl-4 text-ink-2">
                          {q.consequences[k].map((c, i) => (
                            <li key={i}>{c.text}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              );
            })}
          </div>

          {data.result.relationsBetween.length > 0 && (
            <>
              <SectionTitle>{t.compare.relations}</SectionTitle>
              <ul className="space-y-1 text-sm text-ink-2">
                {data.result.relationsBetween.map((r) => (
                  <li key={r.id}>
                    <span className={cx("mr-1.5 rounded-full px-1.5 py-0.5 text-[11px]", r.basis === "documented" ? "bg-surface-3 text-ink" : "border border-dashed border-line-strong text-muted")}>
                      {r.basis === "documented" ? t.event.documented : t.event.editorial}
                    </span>
                    {r.description}
                  </li>
                ))}
              </ul>
            </>
          )}

          <SectionTitle>{t.compare.sources}</SectionTitle>
          <ol className="list-decimal space-y-0.5 pl-5 text-xs text-ink-2">
            {data.sources.map((s) => (
              <li key={s.id}>
                <a href={s.doi ? `https://doi.org/${s.doi}` : s.url} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                  {s.title}
                </a>
                <span className="text-muted"> · {t.event.reliability[s.reliability]}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">{t.compare.noImportance}</p>
        </div>
      )}
    </section>
  );
}
