"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AtlasEvent, RelationSummary } from "@/domain/atlas";
import { CATEGORY_IDS, type CategoryId } from "@/domain/categories";
import type { MetricTypeId } from "@/domain/metrics";
import type { Tag } from "@/domain/schemas";
import { filterEvents, type TimeSelection } from "@/engine/filter";
import { buildSearchIndex } from "@/engine/search";
import { getDictionary } from "@/i18n/dictionaries";
import { useI18n } from "@/i18n/client";
import { serializeAtlasState, type AtlasUrlState, type PanelId } from "@/lib/urlState";
import { Button, Icon, cx } from "@/components/ui/primitives";
import { ComparePanel } from "@/components/compare/ComparePanel";
import { EventPanel } from "@/components/event/EventPanel";
import { HorizonPanel, type SeedMode } from "@/components/horizon/HorizonPanel";
import { EventList } from "./EventList";
import { FilterPanel, type FilterState } from "./FilterPanel";
import { MapView, type Basemap } from "./MapView";
import { SearchBox } from "./SearchBox";
import { Timeline } from "./Timeline";

const HISTORY_KEY = "tm-history";
const MAX_COMPARE = 4;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode): the app keeps working without it */
  }
}

export function AtlasApp({ atlas, relations, tags, initial }: { atlas: AtlasEvent[]; relations: RelationSummary[]; tags: Tag[]; initial: AtlasUrlState }) {
  const { t, locale, fmt } = useI18n();
  const router = useRouter();

  // ——— State ———
  const [query, setQuery] = useState(initial.q);
  const [time, setTime] = useState<TimeSelection>(initial.time);
  const [filters, setFilters] = useState<FilterState>({
    categories: initial.cat,
    evidence: initial.st,
    continents: initial.co,
    sizeMetric: initial.size,
    sizeScale: initial.scale,
    showFootprints: true,
    basemap: "local",
  });
  const [selectedId, setSelectedId] = useState<string | null>(initial.sel);
  const [compareIds, setCompareIds] = useState<string[]>(initial.cmp);
  const [panel, setPanel] = useState<PanelId>(initial.panel);
  const [horizonId, setHorizonId] = useState<string | null>(initial.hz);
  const [seedMode, setSeedMode] = useState<SeedMode>("inside");
  const [history, setHistory] = useState<string[]>([]);
  const [leftOpen, setLeftOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<"filters" | "list">("filters");
  const [mobileSheet, setMobileSheet] = useState<"filters" | "list" | "timeline" | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(initial.sel ? { id: initial.sel, nonce: 0 } : null);
  const [basemapError, setBasemapError] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    setHistory(readStorage<string[]>(HISTORY_KEY, []));
  }, []);

  // ——— Derived data ———
  const tagLabels = useMemo(() => new Map(tags.map((x) => [x.id, x.label])), [tags]);
  const tagLabel = useCallback((id: string) => tagLabels.get(id) ?? id, [tagLabels]);
  const searchIndex = useMemo(() => {
    const it = getDictionary("it");
    const en = getDictionary("en");
    return buildSearchIndex(atlas, { categoryLabel: (id) => `${it.categories[id as CategoryId]} ${en.categories[id as CategoryId]}`, tagLabel });
  }, [atlas, tagLabel]);

  const baseCriteria = { query, evidence: filters.evidence, continents: filters.continents };
  const filtered = useMemo(
    () => filterEvents(atlas, { ...baseCriteria, categories: filters.categories, time }, searchIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atlas, query, filters.categories, filters.evidence, filters.continents, time, searchIndex],
  );
  const withoutTime = useMemo(
    () => filterEvents(atlas, { ...baseCriteria, categories: filters.categories }, searchIndex).events,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atlas, query, filters.categories, filters.evidence, filters.continents, searchIndex],
  );
  const categoryCounts = useMemo(() => {
    const pool = filterEvents(atlas, { ...baseCriteria, time }, searchIndex).events;
    return Object.fromEntries(CATEGORY_IDS.map((c) => [c, pool.filter((e) => e.categories.includes(c)).length])) as Record<CategoryId, number>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atlas, query, filters.evidence, filters.continents, time, searchIndex]);
  const availableMetrics = useMemo(() => [...new Set(atlas.flatMap((e) => e.metricTypes))] as MetricTypeId[], [atlas]);

  // The selected event stays visible on the map even if filters would hide it.
  const mapEvents = useMemo(() => {
    if (!selectedId || filtered.events.some((e) => e.id === selectedId)) return filtered.events;
    const sel = atlas.find((e) => e.id === selectedId);
    return sel ? [...filtered.events, sel] : filtered.events;
  }, [filtered.events, selectedId, atlas]);

  // ——— URL sync ———
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const qs = serializeAtlasState({
        q: query,
        cat: filters.categories,
        time,
        st: filters.evidence,
        co: filters.continents,
        sel: selectedId,
        cmp: compareIds,
        hz: horizonId,
        size: filters.sizeMetric,
        scale: filters.sizeScale,
        panel,
      });
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }, 250);
  }, [query, filters, time, selectedId, compareIds, horizonId, panel]);

  // ——— Actions ———
  const selectEvent = useCallback((id: string, opts: { focus?: boolean } = {}) => {
    setSelectedId(id);
    setPanel("detail");
    setMobileSheet(null);
    setHistory((h) => {
      const next = [id, ...h.filter((x) => x !== id)].slice(0, 20);
      writeStorage(HISTORY_KEY, next);
      return next;
    });
    if (opts.focus) setFocusRequest({ id, nonce: Date.now() });
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_COMPARE ? ids : [...ids, id]));
  }, []);

  const openPanel = (p: PanelId) => {
    setPanel((cur) => (cur === p ? (p === "detail" ? null : selectedId ? "detail" : null) : p));
    setMobileSheet(null);
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("tm-theme", next);
    } catch {
      /* ignore */
    }
  };

  const toggleLocale = () => {
    document.cookie = `tm-locale=${locale === "it" ? "en" : "it"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) {
        if (mobileSheet) setMobileSheet(null);
        else if (panel) setPanel(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, mobileSheet]);

  const eventActions = {
    onCompare: (id: string) => {
      toggleCompare(id);
    },
    isInCompare: selectedId ? compareIds.includes(selectedId) : false,
    onFocus: (id: string) => setFocusRequest({ id, nonce: Date.now() }),
    onExplore: (id: string) => {
      setSeedMode("selected");
      setSelectedId(id);
      if (!horizonId) setHorizonId("southern-europe");
      setPanel("horizon");
    },
    onOpenEvent: (id: string) => selectEvent(id, { focus: true }),
    onOpenComparison: (ids: string[]) => {
      setCompareIds(ids.slice(0, MAX_COMPARE));
      setPanel("compare");
    },
  };

  const rightPanel: ReactNode =
    panel === "compare" ? (
      <ComparePanel
        ids={compareIds}
        atlas={atlas}
        searchIndex={searchIndex}
        onAdd={(id) => setCompareIds((ids) => (ids.includes(id) || ids.length >= MAX_COMPARE ? ids : [...ids, id]))}
        onRemove={(id) => setCompareIds((ids) => ids.filter((x) => x !== id))}
        onOpenEvent={(id) => selectEvent(id, { focus: true })}
      />
    ) : panel === "horizon" ? (
      <HorizonPanel
        atlas={atlas}
        relations={relations}
        horizonId={horizonId}
        onHorizonChange={setHorizonId}
        seedMode={seedMode}
        onSeedModeChange={setSeedMode}
        history={history}
        selectedId={selectedId}
        onOpen={(id) => selectEvent(id, { focus: true })}
        tagLabel={tagLabel}
      />
    ) : panel === "detail" && selectedId ? (
      <EventPanel id={selectedId} atlas={atlas} actions={eventActions} />
    ) : null;

  const filterPanel = (
    <FilterPanel
      state={filters}
      onChange={(patch) => {
        setFilters((f) => ({ ...f, ...patch }));
        if (patch.basemap) setBasemapError(false);
      }}
      counts={categoryCounts}
      availableMetrics={availableMetrics}
      shown={filtered.events.length}
      total={atlas.length}
      unlocated={filtered.unlocated.length}
      basemapError={basemapError}
    />
  );
  const eventList = <EventList events={filtered.events} selectedId={selectedId} compareIds={compareIds} onSelect={(id) => selectEvent(id, { focus: true })} onToggleCompare={toggleCompare} />;
  const timeline = <Timeline events={withoutTime} selection={time} onChange={setTime} />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-page">
      <a href="#main-map" className="sr-only-focusable absolute left-2 top-2 z-[100] rounded bg-accent px-3 py-2 text-white">
        {t.nav.skip}
      </a>
      <a href="#event-list-region" className="sr-only-focusable absolute left-2 top-12 z-[100] rounded bg-accent px-3 py-2 text-white">
        {t.nav.eventList}
      </a>

      {/* ——— Top bar ——— */}
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 md:gap-3 md:px-3">
        <Link href="/" className="flex shrink-0 items-baseline gap-2" aria-label="TRANS-MAP">
          <span className="text-xs font-bold tracking-[0.12em] text-ink sm:text-sm sm:tracking-[0.18em]">TRANS-MAP</span>
          <span className="serif hidden text-xs italic text-muted lg:inline">{t.meta.tagline}</span>
        </Link>
        <div className="mx-auto min-w-0 max-w-xl flex-1">
          <SearchBox value={query} onChange={setQuery} onPick={(id) => selectEvent(id, { focus: true })} index={searchIndex} events={atlas} />
        </div>
        <nav aria-label="principale" className="hidden items-center gap-1 md:flex">
          <Button variant={panel === "horizon" ? "primary" : "ghost"} size="sm" onClick={() => openPanel("horizon")} aria-pressed={panel === "horizon"} data-testid="open-horizon">
            <Icon name="compass" size={15} />
            {t.toolbar.horizon}
          </Button>
          <Button variant={panel === "compare" ? "primary" : "ghost"} size="sm" onClick={() => openPanel("compare")} aria-pressed={panel === "compare"} data-testid="open-compare">
            <Icon name="compare" size={15} />
            {t.toolbar.compare}
            {compareIds.length > 0 && <span className="tabular rounded-full bg-surface-3 px-1.5 text-[11px] text-ink">{compareIds.length}</span>}
          </Button>
          <Link href="/analisi" className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            <Icon name="chart" size={15} />
            {t.nav.analytics}
          </Link>
          <Link href="/metodo" className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            <Icon name="info" size={15} />
            {t.nav.method}
          </Link>
        </nav>
        <button type="button" onClick={toggleTheme} className="rounded-md p-2 text-ink-2 hover:bg-surface-2" aria-label={`${t.toolbar.theme}: ${theme === "dark" ? t.toolbar.themeLight : t.toolbar.themeDark}`} data-testid="theme-toggle">
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <button type="button" onClick={toggleLocale} className="rounded-md px-2 py-1 text-xs font-semibold text-ink-2 hover:bg-surface-2" aria-label={t.toolbar.language} lang={locale === "it" ? "en" : "it"}>
          {locale === "it" ? "EN" : "IT"}
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* ——— Left panel (desktop) ——— */}
        <aside
          className={cx("z-20 hidden shrink-0 flex-col border-r border-line bg-surface md:flex", leftOpen ? "w-72 lg:w-80" : "w-10")}
          aria-label={`${t.toolbar.filters} / ${t.toolbar.list}`}
          id="event-list-region"
        >
          <div className="flex items-center gap-1 border-b border-line p-1.5">
            <button type="button" className="rounded p-1.5 text-ink-2 hover:bg-surface-2" aria-expanded={leftOpen} aria-label={leftOpen ? t.toolbar.close : t.toolbar.filters} onClick={() => setLeftOpen((o) => !o)}>
              <Icon name={leftOpen ? "close" : "filter"} size={15} />
            </button>
            {leftOpen && (
              <div role="tablist" aria-label={t.toolbar.filters} className="flex gap-1">
                {(["filters", "list"] as const).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    type="button"
                    aria-selected={leftTab === tab}
                    aria-controls={`left-${tab}`}
                    id={`left-tab-${tab}`}
                    onClick={() => setLeftTab(tab)}
                    className={cx("rounded-md px-2.5 py-1 text-xs font-medium", leftTab === tab ? "bg-surface-3 text-ink" : "text-ink-2 hover:bg-surface-2")}
                    data-testid={`tab-${tab}`}
                  >
                    {tab === "filters" ? t.toolbar.filters : `${t.toolbar.list} (${filtered.events.length})`}
                  </button>
                ))}
              </div>
            )}
          </div>
          {leftOpen && (
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3" role="tabpanel" id={`left-${leftTab}`} aria-labelledby={`left-tab-${leftTab}`}>
              {leftTab === "filters" ? filterPanel : eventList}
            </div>
          )}
        </aside>

        {/* ——— Map ——— */}
        <main id="main-map" className="relative min-w-0 flex-1" tabIndex={-1}>
          <h1 className="sr-only">{t.meta.title}</h1>
          <MapView
            events={mapEvents}
            selectedId={selectedId}
            compareIds={compareIds}
            sizeMetric={filters.sizeMetric}
            sizeScale={filters.sizeScale}
            showFootprints={filters.showFootprints}
            basemap={filters.basemap}
            theme={theme}
            focusRequest={focusRequest}
            onSelect={(id) => selectEvent(id)}
            onBasemapError={() => {
              setBasemapError(true);
              setFilters((f) => ({ ...f, basemap: "local" }));
            }}
          />
        </main>

        {/* ——— Right panel: detail / compare / horizon ——— */}
        {rightPanel && (
          <aside
            className={cx(
              "z-30 flex flex-col border-line bg-surface",
              "fixed inset-x-0 bottom-14 max-h-[72dvh] rounded-t-xl border-t shadow-2xl",
              "md:static md:max-h-none md:rounded-none md:border-l md:border-t-0 md:shadow-none",
              panel === "compare" ? "md:w-[min(760px,58vw)]" : "md:w-[420px] lg:w-[460px]",
            )}
            aria-label={panel === "compare" ? t.compare.title : panel === "horizon" ? t.horizon.title : t.event.identification}
            data-testid="right-panel"
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
              <span className="mx-auto h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
              <button type="button" onClick={() => setPanel(null)} className="ml-auto rounded p-1.5 text-ink-2 hover:bg-surface-2" aria-label={t.toolbar.close} data-testid="close-panel">
                <Icon name="close" />
              </button>
            </div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">{rightPanel}</div>
          </aside>
        )}
      </div>

      {/* ——— Timeline (desktop) ——— */}
      <footer className="z-20 hidden shrink-0 border-t border-line bg-surface px-4 py-2 md:block">{timeline}</footer>

      {/* ——— Mobile: bottom bar and sheets ——— */}
      <nav aria-label="mobile" className="z-40 flex h-14 shrink-0 items-stretch justify-around border-t border-line bg-surface md:hidden" data-testid="mobile-nav">
        {(
          [
            ["filters", "filter", t.toolbar.filters],
            ["list", "list", `${t.toolbar.list} ${filtered.events.length}`],
            ["timeline", "clock", t.toolbar.timelineShort],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMobileSheet((s) => (s === id ? null : id));
              setPanel(null);
            }}
            aria-pressed={mobileSheet === id}
            className={cx("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]", mobileSheet === id ? "text-accent-ink" : "text-ink-2")}
            data-testid={`mobile-${id}`}
          >
            <Icon name={icon} size={18} />
            {label}
          </button>
        ))}
        <button type="button" onClick={() => openPanel("horizon")} aria-pressed={panel === "horizon"} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]", panel === "horizon" ? "text-accent-ink" : "text-ink-2")} data-testid="mobile-horizon">
          <Icon name="compass" size={18} />
          {t.toolbar.horizonShort}
        </button>
        <button type="button" onClick={() => openPanel("compare")} aria-pressed={panel === "compare"} className={cx("flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px]", panel === "compare" ? "text-accent-ink" : "text-ink-2")} data-testid="mobile-compare">
          <Icon name="compare" size={18} />
          {t.toolbar.compare} {compareIds.length > 0 ? `(${compareIds.length})` : ""}
        </button>
      </nav>
      {mobileSheet && (
        <div className="fixed inset-x-0 bottom-14 z-40 max-h-[70dvh] overflow-y-auto rounded-t-xl border-t border-line bg-surface p-3 shadow-2xl md:hidden" role="dialog" aria-label={mobileSheet} data-testid={`sheet-${mobileSheet}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{mobileSheet === "filters" ? t.toolbar.filters : mobileSheet === "list" ? t.list.title : t.toolbar.timeline}</span>
            <button type="button" onClick={() => setMobileSheet(null)} aria-label={t.toolbar.close} className="rounded p-1 text-ink-2">
              <Icon name="close" />
            </button>
          </div>
          {mobileSheet === "filters" ? filterPanel : mobileSheet === "list" ? eventList : timeline}
          {mobileSheet !== "timeline" && <p className="mt-3 text-xs text-muted">{fmt(t.filters.showing, { shown: filtered.events.length, total: atlas.length })}</p>}
        </div>
      )}
    </div>
  );
}
