"use client";
import type { AtlasEvent } from "@/domain/atlas";
import { formatDateRange } from "@/domain/dates";
import { useI18n } from "@/i18n/client";
import { EvidenceBadge, FamilyIcon, Icon, cx } from "@/components/ui/primitives";

/** Accessible, keyboard-navigable equivalent of the map. */
export function EventList({
  events,
  selectedId,
  compareIds,
  onSelect,
  onToggleCompare,
}: {
  events: AtlasEvent[];
  selectedId: string | null;
  compareIds: string[];
  onSelect: (id: string) => void;
  onToggleCompare: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const located = events.filter((e) => e.points.length > 0);
  const unlocated = events.filter((e) => e.points.length === 0);

  const item = (e: AtlasEvent) => {
    const inCompare = compareIds.includes(e.id);
    return (
      <li key={e.id} className={cx("group flex items-start gap-2 rounded-md px-2 py-1.5", e.id === selectedId ? "bg-surface-3" : "hover:bg-surface-2")}>
        <span className="mt-1">
          <FamilyIcon family={e.family} size={11} hollow={e.points.length === 0} />
        </span>
        <button type="button" onClick={() => onSelect(e.id)} className="min-w-0 flex-1 text-left" aria-current={e.id === selectedId ? "true" : undefined} data-testid={`list-item-${e.id}`}>
          <span className="block text-sm font-medium text-ink">{e.title}</span>
          <span className="tabular block text-xs text-muted">
            {formatDateRange(e.startDate, e.endDate ?? undefined, locale, { circa: e.dateCirca, precision: e.datePrecision })}
            {e.placeNames[0] ? ` · ${e.placeNames[0]}` : ""}
          </span>
        </button>
        <span className="mt-0.5 flex shrink-0 items-center gap-1">
          {e.evidenceStatus !== "verified" && <EvidenceBadge status={e.evidenceStatus} compact />}
          <button
            type="button"
            onClick={() => onToggleCompare(e.id)}
            aria-pressed={inCompare}
            aria-label={`${inCompare ? t.list.removeCompare : t.list.addCompare}: ${e.title}`}
            title={inCompare ? t.list.removeCompare : t.list.addCompare}
            className={cx("rounded p-1", inCompare ? "text-accent-ink" : "text-muted opacity-70 hover:text-ink group-hover:opacity-100")}
          >
            <Icon name="compare" size={15} />
          </button>
        </span>
      </li>
    );
  };

  return (
    <div data-testid="event-list">
      <h2 className="sr-only" id="event-list-title">
        {t.list.title}
      </h2>
      {events.length === 0 && <p className="p-2 text-sm text-muted">{t.list.empty}</p>}
      <ul aria-labelledby="event-list-title" className="space-y-0.5">
        {located.map(item)}
      </ul>
      {unlocated.length > 0 && (
        <section className="mt-4 border-t border-line pt-3" aria-labelledby="unlocated-title">
          <h3 id="unlocated-title" className="px-2 text-xs font-semibold uppercase tracking-wider text-muted">
            {t.list.unlocatedTitle}
          </h3>
          <p className="px-2 pb-1 text-xs text-muted">{t.list.unlocatedHelp}</p>
          <ul className="space-y-0.5">{unlocated.map(item)}</ul>
        </section>
      )}
    </div>
  );
}
