"use client";
import { useMemo } from "react";
import type { AtlasEvent, RelationSummary } from "@/domain/atlas";
import { formatYear } from "@/domain/dates";
import { METRIC_TYPES } from "@/domain/metrics";
import { CONTINENT_LABELS, HORIZONS } from "@/domain/regions";
import { buildDiscoveryPath, discover, type Reason, type Suggestion } from "@/engine/discover";
import { useI18n } from "@/i18n/client";
import { formatFactor } from "@/lib/format";
import { FamilyIcon, Icon, SectionTitle, cx } from "@/components/ui/primitives";

export type SeedMode = "inside" | "history" | "selected";

function ReasonText({ reason, titles, tagLabel }: { reason: Reason; titles: Map<string, string>; tagLabel: (id: string) => string }) {
  const { t, locale, fmt } = useI18n();
  const tpl = t.horizon.reasons[reason.code];
  const text = fmt(tpl, {
    description: reason.description ?? "",
    categories: (reason.categories ?? []).map((c) => t.categories[c]).join(", "),
    tags: (reason.tags ?? []).map(tagLabel).join(", "),
    larger: reason.largerId ? (titles.get(reason.largerId) ?? reason.largerId) : "",
    factor: reason.factor ? formatFactor(reason.factor, locale) : "",
    metric: reason.metricType ? METRIC_TYPES[reason.metricType].label[locale] : "",
    continents: (reason.continents ?? []).map((c) => CONTINENT_LABELS[c][locale]).join(", "),
  });
  return <li className="text-xs text-ink-2">{text}</li>;
}

function SuggestionCard({ s, onOpen, titles, tagLabel, seedTitle }: { s: Suggestion; onOpen: (id: string) => void; titles: Map<string, string>; tagLabel: (id: string) => string; seedTitle?: string }) {
  const { t, locale, fmt } = useI18n();
  // Keep the reasons readable: unique codes, most informative first.
  const reasons = s.reasons.filter((r, i, arr) => arr.findIndex((x) => x.code === r.code && x.relationId === r.relationId) === i).slice(0, 4);
  return (
    <li className="rounded-lg border border-line p-3" data-testid="horizon-suggestion">
      {seedTitle && <p className="text-xs text-muted">{fmt(t.horizon.knowX, { x: seedTitle })}</p>}
      <button type="button" onClick={() => onOpen(s.event.id)} className="mt-0.5 flex w-full items-start gap-2 text-left">
        <span className="mt-1">
          <FamilyIcon family={s.event.family} size={11} hollow={s.event.points.length === 0} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink hover:underline">{seedTitle ? fmt(t.horizon.exploreY, { y: s.event.title }) : s.event.title}</span>
          <span className="tabular block text-xs text-muted">
            {formatYear(s.event.startDate.year, locale, { circa: s.event.dateCirca })}
            {s.event.placeNames[0] ? ` · ${s.event.placeNames[0]}` : ""}
          </span>
        </span>
      </button>
      <ul className="mt-1.5 space-y-0.5 border-t border-line pt-1.5">
        {reasons.map((r, i) => (
          <ReasonText key={i} reason={r} titles={titles} tagLabel={tagLabel} />
        ))}
      </ul>
    </li>
  );
}

export function HorizonPanel({
  atlas,
  relations,
  horizonId,
  onHorizonChange,
  seedMode,
  onSeedModeChange,
  history,
  selectedId,
  onOpen,
  tagLabel,
}: {
  atlas: AtlasEvent[];
  relations: RelationSummary[];
  horizonId: string | null;
  onHorizonChange: (id: string | null) => void;
  seedMode: SeedMode;
  onSeedModeChange: (m: SeedMode) => void;
  history: string[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  tagLabel: (id: string) => string;
}) {
  const { t, fmt, locale } = useI18n();
  const horizon = HORIZONS.find((h) => h.id === horizonId) ?? null;
  const titles = useMemo(() => new Map(atlas.map((e) => [e.id, e.title])), [atlas]);

  const seeds = seedMode === "history" ? history : seedMode === "selected" && selectedId ? [selectedId] : [];
  const result = useMemo(
    () => (horizon ? discover(atlas, relations, { horizon: horizon.subregions, seeds, limit: 10, perSeedLimit: 2 }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [horizon, atlas, relations, seeds.join(",")],
  );
  const path = useMemo(() => (selectedId ? buildDiscoveryPath(selectedId, atlas, relations, 5) : []), [selectedId, atlas, relations]);
  const relationLabel = (r: RelationSummary) => r.description;

  return (
    <section aria-labelledby="horizon-title" data-testid="horizon-panel">
      <h2 id="horizon-title" className="serif text-xl font-semibold text-ink">
        {t.horizon.title}
      </h2>
      <p className="mt-1 text-sm text-ink-2">{t.horizon.intro}</p>

      <label htmlFor="horizon-select" className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
        {t.horizon.choose}
      </label>
      <select
        id="horizon-select"
        value={horizonId ?? ""}
        onChange={(e) => onHorizonChange(e.target.value || null)}
        className="mt-1 h-9 w-full rounded-md border border-line-strong bg-surface-2 px-2 text-sm text-ink"
        data-testid="horizon-select"
      >
        <option value="">{t.horizon.choosePlaceholder}</option>
        {HORIZONS.map((h) => (
          <option key={h.id} value={h.id}>
            {h.label[locale]}
          </option>
        ))}
      </select>
      {horizon && <p className="mt-1 text-xs text-muted">{horizon.note[locale]}</p>}

      <fieldset className="mt-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted">{t.horizon.seeds}</legend>
        <div className="mt-1 flex flex-wrap gap-1" role="radiogroup">
          {(
            [
              ["inside", t.horizon.seedsInside],
              ["history", t.horizon.seedsHistory],
              ["selected", t.horizon.seedsSelected],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={seedMode === mode}
              disabled={(mode === "history" && history.length === 0) || (mode === "selected" && !selectedId)}
              onClick={() => onSeedModeChange(mode)}
              className={cx("rounded-md px-2 py-1 text-xs disabled:opacity-40", seedMode === mode ? "bg-accent text-white" : "border border-line text-ink-2")}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-3 flex items-start gap-1.5 rounded-md bg-surface-2 p-2 text-xs text-ink-2">
        <span className="mt-0.5 text-muted">
          <Icon name="info" size={14} />
        </span>
        {t.horizon.disclaimer}
      </p>

      {result && (
        <>
          <p className="mt-3 text-xs text-muted">{fmt(t.horizon.insideCount, { n: result.insideHorizon.length })}</p>
          {result.bySeed.length > 0 && (
            <ul className="mt-2 space-y-2">
              {result.bySeed.slice(0, 6).map((g) =>
                g.suggestions.slice(0, 1).map((s) => <SuggestionCard key={`${g.seed.id}-${s.event.id}`} s={s} onOpen={onOpen} titles={titles} tagLabel={tagLabel} seedTitle={g.seed.title} />),
              )}
            </ul>
          )}
          <SectionTitle>{t.horizon.more}</SectionTitle>
          {result.suggestions.length === 0 && <p className="text-sm text-muted">{t.horizon.none}</p>}
          <ul className="space-y-2">
            {result.suggestions.map((s) => (
              <SuggestionCard key={s.event.id} s={s} onOpen={onOpen} titles={titles} tagLabel={tagLabel} />
            ))}
          </ul>
        </>
      )}

      <SectionTitle>{t.horizon.path}</SectionTitle>
      {path.length === 0 ? (
        <p className="text-sm text-muted">{t.horizon.pathNone}</p>
      ) : (
        <>
          <p className="text-xs text-muted">{fmt(t.horizon.pathFrom, { x: path[0]!.event.title })}</p>
          <ol className="mt-2 space-y-2 border-l border-line-strong pl-3" data-testid="discovery-path">
            {path.map((step, i) => (
              <li key={step.event.id} className="relative">
                <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden />
                <button type="button" className="text-left text-sm font-medium text-ink hover:underline" onClick={() => onOpen(step.event.id)}>
                  {i + 1}. {step.event.title}
                </button>
                {step.via && (
                  <p className="text-xs text-ink-2">
                    {fmt(t.horizon.pathStep, { relation: relationLabel(step.via) })}{" "}
                    <span className="text-muted">({step.via.basis === "documented" ? t.event.documented : t.event.editorial})</span>
                  </p>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
