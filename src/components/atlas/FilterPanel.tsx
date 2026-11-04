"use client";
import { CATEGORY_FAMILY, CATEGORY_IDS, FAMILY_IDS, type CategoryId } from "@/domain/categories";
import { SIZABLE_METRICS } from "@/domain/atlas";
import { METRIC_TYPES, type MetricTypeId } from "@/domain/metrics";
import { CONTINENT_IDS, CONTINENT_LABELS, type ContinentId } from "@/domain/regions";
import type { EvidenceStatus } from "@/domain/schemas";
import { useI18n } from "@/i18n/client";
import { Button, EvidenceBadge, FamilyIcon } from "@/components/ui/primitives";
import type { Basemap, SizeScale } from "./MapView";

const STATUSES: EvidenceStatus[] = ["verified", "disputed", "needs-review", "draft"];

export interface FilterState {
  categories: CategoryId[];
  evidence: EvidenceStatus[];
  continents: ContinentId[];
  sizeMetric: MetricTypeId | null;
  sizeScale: SizeScale;
  showFootprints: boolean;
  basemap: Basemap;
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function FilterPanel({
  state,
  onChange,
  counts,
  availableMetrics,
  shown,
  total,
  unlocated,
  basemapError,
}: {
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  counts: Record<CategoryId, number>;
  availableMetrics: MetricTypeId[];
  shown: number;
  total: number;
  unlocated: number;
  basemapError: boolean;
}) {
  const { t, locale, fmt } = useI18n();
  const metrics = SIZABLE_METRICS.filter((m) => availableMetrics.includes(m));

  return (
    <div className="space-y-5 text-sm" data-testid="filters">
      <p className="text-xs text-ink-2" aria-live="polite" data-testid="filter-count">
        {fmt(t.filters.showing, { shown, total })}
        {unlocated > 0 && <span className="block text-muted">{fmt(t.filters.unlocated, { n: unlocated })}</span>}
      </p>

      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          <span>{t.filters.categories}</span>
          <span className="flex gap-2 normal-case tracking-normal">
            <button type="button" className="text-accent-ink hover:underline" onClick={() => onChange({ categories: [] })}>
              {t.filters.allCategories}
            </button>
          </span>
        </legend>
        {FAMILY_IDS.map((family) => (
          <div key={family} className="mb-2">
            <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-2">
              <FamilyIcon family={family} size={11} />
              {t.families[family]}
            </p>
            <ul className="space-y-0.5">
              {CATEGORY_IDS.filter((c) => CATEGORY_FAMILY[c] === family).map((c) => {
                const checked = state.categories.includes(c);
                return (
                  <li key={c}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onChange({ categories: toggle(state.categories, c) })}
                        className="h-4 w-4 accent-[var(--accent)]"
                      />
                      <span className="flex-1 text-ink">{t.categories[c]}</span>
                      <span className="tabular text-xs text-muted">{counts[c]}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {state.categories.length === 0 && <p className="text-xs text-muted">{t.filters.allCategories}</p>}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t.filters.continents}</legend>
        <div className="flex flex-wrap gap-1.5">
          {CONTINENT_IDS.map((c) => {
            const on = state.continents.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ continents: toggle(state.continents, c) })}
                className={on ? "rounded-full bg-accent px-2.5 py-0.5 text-xs text-white" : "rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2 hover:bg-surface-2"}
              >
                {CONTINENT_LABELS[c][locale]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t.filters.evidence}</legend>
        <ul className="space-y-1">
          {STATUSES.map((s) => (
            <li key={s}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={state.evidence.length === 0 || state.evidence.includes(s)}
                  onChange={() => {
                    const current = state.evidence.length === 0 ? [...STATUSES] : state.evidence;
                    const next = toggle(current, s);
                    onChange({ evidence: next.length === STATUSES.length ? [] : next });
                  }}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <EvidenceBadge status={s} />
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{t.filters.markerSize}</legend>
        <select
          aria-label={t.filters.markerSize}
          value={state.sizeMetric ?? ""}
          onChange={(e) => onChange({ sizeMetric: (e.target.value || null) as MetricTypeId | null })}
          className="h-9 w-full rounded-md border border-line-strong bg-surface-2 px-2 text-sm text-ink"
          data-testid="size-metric"
        >
          <option value="">{t.filters.sizeNone}</option>
          {metrics.map((m) => (
            <option key={m} value={m}>
              {METRIC_TYPES[m].label[locale]}
            </option>
          ))}
        </select>
        {state.sizeMetric && (
          <div className="mt-2 space-y-1" role="radiogroup" aria-label={t.filters.sizeScale}>
            {(["area", "log"] as const).map((s) => (
              <label key={s} className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
                <input type="radio" name="size-scale" checked={state.sizeScale === s} onChange={() => onChange({ sizeScale: s })} className="accent-[var(--accent)]" />
                {s === "area" ? t.filters.scaleArea : t.filters.scaleLog}
              </label>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted">{t.filters.sizeNote}</p>
      </fieldset>

      <fieldset className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={state.showFootprints} onChange={(e) => onChange({ showFootprints: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
          {t.filters.footprints}
        </label>
        <div role="radiogroup" aria-labelledby="basemap-label">
          <p id="basemap-label" className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{t.filters.basemap}</p>
          {(["local", "online"] as const).map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
              <input type="radio" name="basemap" checked={state.basemap === b} onChange={() => onChange({ basemap: b })} className="accent-[var(--accent)]" />
              {b === "local" ? t.filters.basemapLocal : t.filters.basemapOnline}
            </label>
          ))}
          {basemapError && (
            <p role="alert" className="mt-1 text-xs" style={{ color: "var(--status-serious)" }}>
              {t.filters.basemapError}
            </p>
          )}
        </div>
      </fieldset>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange({ categories: [], evidence: [], continents: [], sizeMetric: null })}
        data-testid="reset-filters"
      >
        {t.filters.reset}
      </Button>
    </div>
  );
}
