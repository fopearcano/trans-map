"use client";
/**
 * Event card. Synthetic at first sight (identification + summary), with
 * expandable sections for description, scale, comparisons and documentation.
 * Facts, estimates and interpretations are visually distinguished.
 */
import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { AtlasEvent } from "@/domain/atlas";
import { familyOf, type CategoryId } from "@/domain/categories";
import { formatDateRange } from "@/domain/dates";
import { ESTIMATE_KIND_LABELS, METRIC_TYPES, UNCERTAINTY_LABELS, type MetricTypeId } from "@/domain/metrics";
import type { Metric, Source } from "@/domain/schemas";
import { scaleContrast } from "@/engine/discover";
import { useI18n } from "@/i18n/client";
import { formatFactor, formatIsoDate, formatNumber, formatRange, formatWithUnit } from "@/lib/format";
import type { EventDetail } from "@/server/repository";
import { Button, Chip, EvidenceBadge, FamilyIcon, Icon, SectionTitle, cx } from "@/components/ui/primitives";

export interface EventActions {
  onCompare?: (id: string) => void;
  isInCompare?: boolean;
  onFocus?: (id: string) => void;
  onExplore?: (id: string) => void;
  onOpenEvent?: (id: string) => void;
  onOpenComparison?: (ids: string[]) => void;
}

function Details({ title, children, defaultOpen = false, id }: { title: string; children: ReactNode; defaultOpen?: boolean; id?: string }) {
  return (
    <details open={defaultOpen} className="group border-t border-line py-2" id={id}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-muted transition-transform group-open:rotate-180">
          <Icon name="chevron" />
        </span>
      </summary>
      <div className="pt-1 text-sm text-ink-2">{children}</div>
    </details>
  );
}

function SourceRefs({ ids, index }: { ids: string[]; index: Map<string, number> }) {
  if (!ids.length) return null;
  return (
    <span className="ml-1 whitespace-nowrap text-xs">
      {ids.map((id) => {
        const n = index.get(id);
        return n ? (
          <a key={id} href={`#src-${id}`} className="text-accent-ink hover:underline" aria-label={`fonte ${n}`}>
            [{n}]
          </a>
        ) : null;
      })}
    </span>
  );
}

function EstimateLine({ m, index }: { m: Metric; index: Map<string, number> }) {
  const { locale, t } = useI18n();
  const range = m.minEstimate !== undefined || m.maxEstimate !== undefined;
  return (
    <li className="rounded-md border border-line p-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="tabular font-semibold text-ink">
          {m.value !== undefined ? formatWithUnit(m.value, m.unit, locale) : formatRange(m.minEstimate, m.maxEstimate, m.unit, locale)}
        </span>
        {m.value !== undefined && range && <span className="tabular text-xs text-muted">({formatRange(m.minEstimate, m.maxEstimate, m.unit, locale)})</span>}
        {m.isReference && <span className="text-xs text-accent-ink">{t.event.reference}</span>}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        <Chip>{ESTIMATE_KIND_LABELS[m.estimateKind][locale]}</Chip>
        <Chip>{UNCERTAINTY_LABELS[m.uncertainty][locale]}</Chip>
        {m.measurementPeriod && <Chip>{m.measurementPeriod}</Chip>}
      </div>
      <p className="mt-1 text-xs text-ink-2">
        {m.attributedTo}
        {m.scope ? ` · ${m.scope}` : ""}
        <SourceRefs ids={m.sourceIds} index={index} />
      </p>
      {m.note && <p className="mt-0.5 text-xs text-muted">{m.note}</p>}
      {m.populationDenominators.map((d, i) => {
        const v = m.value ?? (m.minEstimate !== undefined && m.maxEstimate !== undefined ? (m.minEstimate + m.maxEstimate) / 2 : (m.minEstimate ?? m.maxEstimate));
        if (v === undefined || !["people", "households"].includes(m.unit)) return null;
        const perMillion = (v / d.value) * 1e6;
        return (
          <p key={i} className="mt-0.5 text-xs text-ink-2">
            ≈ <span className="tabular">{formatNumber(perMillion, locale, perMillion < 10 ? 2 : 1)}</span> {locale === "it" ? "per milione" : "per million"} · {d.description} (
            <span className="tabular">{formatNumber(d.value, locale)}</span>)
            <SourceRefs ids={d.sourceIds} index={index} />
          </p>
        );
      })}
    </li>
  );
}

export function EventDetailView({ detail, atlas, actions = {}, headingLevel = 2 }: { detail: EventDetail; atlas?: AtlasEvent[]; actions?: EventActions; headingLevel?: 1 | 2 }) {
  const { t, locale, fmt } = useI18n();
  const e = detail.event;
  const sourceIndex = useMemo(() => new Map(detail.sources.map((s, i) => [s.id, i + 1])), [detail.sources]);
  const metricsByType = useMemo(() => {
    const map = new Map<MetricTypeId, Metric[]>();
    for (const m of e.quantitativeMetrics) map.set(m.metricType, [...(map.get(m.metricType) ?? []), m]);
    return [...map.entries()];
  }, [e.quantitativeMetrics]);

  const scaleNeighbours = useMemo(() => {
    if (!atlas) return [];
    const self = atlas.find((x) => x.id === e.id);
    if (!self) return [];
    return atlas
      .filter((x) => x.id !== e.id && x.categories.some((c) => self.categories.includes(c)))
      .map((x) => ({ x, c: scaleContrast(self, x) }))
      .filter((p): p is { x: AtlasEvent; c: NonNullable<ReturnType<typeof scaleContrast>> } => !!p.c)
      .sort((a, b) => b.c.factor - a.c.factor)
      .slice(0, 4);
  }, [atlas, e.id]);

  const Heading = headingLevel === 1 ? "h1" : "h2";
  const date = formatDateRange(e.startDate, e.endDate, locale, { circa: e.dateCirca, precision: e.datePrecision });
  const dateText = e.ongoing ? `${date} – ${locale === "it" ? "in corso" : "ongoing"}` : date;

  const openEvent = (id: string) =>
    actions.onOpenEvent ? (
      <button type="button" className="text-left text-accent-ink hover:underline" onClick={() => actions.onOpenEvent!(id)}>
        {detail.related.find((r) => r.event.id === id)?.event.title ?? atlas?.find((a) => a.id === id)?.title ?? id}
      </button>
    ) : (
      <Link className="text-accent-ink hover:underline" href={`/eventi/${id}`}>
        {detail.related.find((r) => r.event.id === id)?.event.title ?? atlas?.find((a) => a.id === id)?.title ?? id}
      </Link>
    );

  return (
    <article aria-labelledby={`ev-title-${e.id}`} data-testid="event-detail">
      {/* Identification */}
      <div className="flex flex-wrap items-center gap-1.5">
        {e.categories.map((c: CategoryId) => (
          <Chip key={c}>
            <FamilyIcon family={familyOf(c).id} size={10} />
            {t.categories[c]}
          </Chip>
        ))}
      </div>
      <Heading id={`ev-title-${e.id}`} className="serif mt-2 text-2xl font-semibold leading-tight text-ink">
        {e.title}
      </Heading>
      <p className="tabular mt-1 text-sm text-ink-2">
        {dateText}
        {detail.locations.length > 0 && <> · {detail.locations.map((l) => l.place.name).join(" · ")}</>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EvidenceBadge status={e.evidenceStatus} />
        <span className="text-xs text-muted">{fmt(t.event.lastVerified, { date: formatIsoDate(e.lastVerifiedAt, locale) })}</span>
        {detail.origin === "imported" && <Chip>{t.event.imported}</Chip>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {actions.onCompare && (
          <Button size="sm" variant={actions.isInCompare ? "secondary" : "primary"} onClick={() => actions.onCompare!(e.id)} aria-pressed={!!actions.isInCompare}>
            <Icon name="compare" size={14} />
            {actions.isInCompare ? t.event.actions.comparing : t.event.actions.compare}
          </Button>
        )}
        {actions.onFocus && detail.locations.some((l) => l.place.coordinates) && (
          <Button size="sm" onClick={() => actions.onFocus!(e.id)}>
            <Icon name="target" size={14} />
            {t.event.actions.focus}
          </Button>
        )}
        {actions.onExplore && (
          <Button size="sm" onClick={() => actions.onExplore!(e.id)}>
            <Icon name="compass" size={14} />
            {t.event.actions.explore}
          </Button>
        )}
        {actions.onOpenEvent && (
          <Link href={`/eventi/${e.id}`} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink">
            <Icon name="link" size={14} />
            {t.event.actions.page}
          </Link>
        )}
      </div>

      <SectionTitle>{t.event.summary}</SectionTitle>
      <p className="prose-tm text-[15px] leading-relaxed text-ink">{e.summary}</p>

      <div className="mt-3">
        <Details title={t.event.whatHappened} defaultOpen>
          <p className="leading-relaxed">{e.detailedDescription}</p>
          {e.dateNote && (
            <p className="mt-2 text-xs text-muted">
              {t.event.dateNote}: {e.dateNote}
            </p>
          )}
        </Details>

        <Details title={t.event.context}>
          <p className="leading-relaxed">{e.context}</p>
          {e.causes.length > 0 && (
            <>
              <SectionTitle>{t.event.causes}</SectionTitle>
              <ul className="list-disc space-y-1 pl-5">
                {e.causes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
          {e.consequences.length > 0 && (
            <>
              <SectionTitle>{t.event.consequences}</SectionTitle>
              {(["direct", "indirect", "long-term"] as const).map((kind) => {
                const list = e.consequences.filter((c) => c.kind === kind);
                if (!list.length) return null;
                return (
                  <div key={kind} className="mb-2">
                    <p className="text-xs font-medium text-ink">{kind === "direct" ? t.event.direct : kind === "indirect" ? t.event.indirect : t.event.longTerm}</p>
                    <ul className="list-disc space-y-1 pl-5">
                      {list.map((c, i) => (
                        <li key={i}>
                          {c.text}
                          <SourceRefs ids={c.sourceIds} index={sourceIndex} />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </>
          )}
        </Details>

        <Details title={t.event.dimension} defaultOpen={e.quantitativeMetrics.length > 0}>
          {metricsByType.length === 0 && <p className="text-muted">{t.event.noMetrics}</p>}
          {metricsByType.map(([type, list]) => (
            <div key={type} className="mb-3" data-testid={`metric-${type}`}>
              <p className="text-sm font-medium text-ink" title={METRIC_TYPES[type].description[locale]}>
                {METRIC_TYPES[type].label[locale]}
              </p>
              <p className="mb-1 text-xs text-muted">{METRIC_TYPES[type].description[locale]}</p>
              <ul className="space-y-1.5">
                {list.map((m) => (
                  <EstimateLine key={m.id} m={m} index={sourceIndex} />
                ))}
              </ul>
            </div>
          ))}
          {e.qualitativeImpacts.length > 0 && (
            <>
              <SectionTitle>{t.event.impacts}</SectionTitle>
              <ul className="space-y-1">
                {e.qualitativeImpacts.map((q, i) => (
                  <li key={i}>
                    <Chip className="mr-1">{q.scale}</Chip>
                    {q.text}
                    <SourceRefs ids={q.sourceIds} index={sourceIndex} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Details>

        <Details title={t.event.places}>
          {detail.locations.length === 0 && <p className="text-muted">{e.locationNote}</p>}
          <ul className="space-y-1.5">
            {detail.locations.map((l) => (
              <li key={l.place.id}>
                <span className="font-medium text-ink">{l.place.name}</span> — {l.role}
                <div className="text-xs text-muted">
                  {t.event.precision[l.place.precision]}
                  {l.place.coordinates && (
                    <span className="tabular">
                      {" "}
                      · {l.place.coordinates.lat.toFixed(3)}, {l.place.coordinates.lon.toFixed(3)}
                    </span>
                  )}
                  <SourceRefs ids={l.place.coordinateSourceIds} index={sourceIndex} />
                  {l.place.note && <span className="block">{l.place.note}</span>}
                  {l.note && <span className="block">{l.note}</span>}
                </div>
              </li>
            ))}
          </ul>
          {e.geographicFootprints.length > 0 && (
            <>
              <SectionTitle>{t.event.footprints}</SectionTitle>
              <ul className="space-y-1">
                {e.geographicFootprints.map((f) => (
                  <li key={f.id}>
                    {f.label}
                    <SourceRefs ids={f.sourceIds} index={sourceIndex} />
                    <span className="block text-xs text-muted">{f.kind === "global" ? t.map.footprintGlobal : f.approximation}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {e.peopleOrRegionsAffected.length > 0 && (
            <>
              <SectionTitle>{t.event.affected}</SectionTitle>
              <ul className="list-disc space-y-0.5 pl-5">
                {e.peopleOrRegionsAffected.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </Details>

        {(e.interpretations.length > 0 || e.controversies.length > 0) && (
          <Details title={`${t.event.interpretation} · ${t.event.controversies}`}>
            {e.interpretations.map((x, i) => (
              <div key={`i${i}`} className="mb-2 border-l-2 border-line-strong pl-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t.event.interpretationLabel}</span>
                <p>
                  {x.text}
                  {x.heldBy && <span className="text-muted"> — {x.heldBy}</span>}
                  <SourceRefs ids={x.sourceIds} index={sourceIndex} />
                </p>
              </div>
            ))}
            {e.controversies.map((x, i) => (
              <div key={`c${i}`} className="mb-2 border-l-2 pl-3" style={{ borderColor: "var(--status-serious)" }}>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t.event.controversies}</span>
                <p>
                  {x.text}
                  <SourceRefs ids={x.sourceIds} index={sourceIndex} />
                </p>
              </div>
            ))}
          </Details>
        )}

        <Details title={t.event.comparisons} defaultOpen={detail.related.length > 0}>
          {detail.comparisons.length > 0 && (
            <>
              <SectionTitle>{t.event.curated}</SectionTitle>
              <ul className="space-y-1">
                {detail.comparisons.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{c.title}</span>
                    {actions.onOpenComparison ? (
                      <Button size="sm" onClick={() => actions.onOpenComparison!(c.eventIds)}>
                        {t.event.openComparison}
                      </Button>
                    ) : (
                      <Link className="text-xs text-accent-ink hover:underline" href={`/?cmp=${c.eventIds.join(",")}&panel=compare`}>
                        {t.event.openComparison}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {detail.related.length > 0 && (
            <>
              <SectionTitle>{t.event.related}</SectionTitle>
              <ul className="space-y-2">
                {detail.related.map((r) => (
                  <li key={r.relation.id} data-testid="related-event">
                    <div className="flex flex-wrap items-center gap-2">
                      {openEvent(r.event.id)}
                      <span
                        className={cx("rounded-full px-1.5 py-0.5 text-[11px]", r.relation.basis === "documented" ? "bg-surface-3 text-ink" : "border border-dashed border-line-strong text-muted")}
                        title={r.relation.basis === "editorial" ? t.event.editorialHelp : undefined}
                      >
                        {r.relation.basis === "documented" ? t.event.documented : t.event.editorial}
                      </span>
                    </div>
                    <p className="text-xs text-ink-2">
                      {r.relation.description}
                      <SourceRefs ids={r.relation.sourceIds} index={sourceIndex} />
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          {scaleNeighbours.length > 0 && (
            <>
              <SectionTitle>{t.event.differentScale}</SectionTitle>
              <ul className="space-y-1">
                {scaleNeighbours.map(({ x, c }) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-2">
                    {actions.onOpenEvent ? (
                      <button type="button" className="text-accent-ink hover:underline" onClick={() => actions.onOpenEvent!(x.id)}>
                        {x.title}
                      </button>
                    ) : (
                      <Link className="text-accent-ink hover:underline" href={`/eventi/${x.id}`}>
                        {x.title}
                      </Link>
                    )}
                    <span className="tabular text-xs text-muted">
                      {c.largerId === e.id ? "÷" : "×"} {fmt(t.event.timesLarger, { factor: formatFactor(c.factor, locale), metric: METRIC_TYPES[c.metricType].label[locale] })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Details>

        <Details title={t.event.documentation} id={`doc-${e.id}`}>
          {e.knownGaps.length > 0 && (
            <>
              <SectionTitle>{t.event.gaps}</SectionTitle>
              <ul className="list-disc space-y-1 pl-5">
                {e.knownGaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </>
          )}
          <SectionTitle>{t.event.sources}</SectionTitle>
          <ol className="space-y-1.5">
            {detail.sources.map((s: Source, i) => (
              <li key={s.id} id={`src-${s.id}`} className="text-xs">
                <span className="tabular text-muted">[{i + 1}] </span>
                {s.authors?.length ? <span>{s.authors.join(", ")}. </span> : null}
                <a href={s.doi ? `https://doi.org/${s.doi}` : s.url} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                  {s.title}
                </a>
                {s.publisher ? <span>. {s.publisher}</span> : null}
                {s.year ? <span> ({s.year})</span> : null}
                <span className="text-muted">
                  {" "}
                  · {t.event.sourceType[s.type]} · {t.event.reliability[s.reliability]}
                  {s.accessedAt ? ` · ${fmt(t.event.accessed, { date: formatIsoDate(s.accessedAt, locale) })}` : ""}
                  {s.license ? ` · ${s.license}` : ""}
                </span>
              </li>
            ))}
          </ol>
          {e.tags.length > 0 && (
            <>
              <SectionTitle>{t.event.tags}</SectionTitle>
              <div className="flex flex-wrap gap-1">
                {detail.tags.map((tag) => (
                  <Chip key={tag.id}>{tag.label}</Chip>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-muted">
            {t.event.status}: {t.evidence[e.evidenceStatus]} — {t.evidence[`${e.evidenceStatus}Help` as keyof typeof t.evidence]}
          </p>
        </Details>
      </div>
    </article>
  );
}
