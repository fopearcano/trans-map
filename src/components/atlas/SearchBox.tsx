"use client";
import { useId, useMemo, useRef, useState } from "react";
import type { AtlasEvent } from "@/domain/atlas";
import { formatYear } from "@/domain/dates";
import { search, type SearchDocument } from "@/engine/search";
import { useI18n } from "@/i18n/client";
import { FamilyIcon, Icon, cx } from "@/components/ui/primitives";

/**
 * Accessible combobox: typing filters the atlas (debounced by the parent),
 * the listbox offers direct jumps to matching events.
 */
export function SearchBox({
  value,
  onChange,
  onPick,
  index,
  events,
  placeholder,
  label,
  autoFocus,
  exclude = [],
  testId = "search",
}: {
  value: string;
  onChange: (q: string) => void;
  onPick: (id: string) => void;
  index: SearchDocument[];
  events: AtlasEvent[];
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  exclude?: string[];
  testId?: string;
}) {
  const { t, locale, fmt } = useI18n();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const byId = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const hits = useMemo(
    () =>
      value.trim()
        ? search(index, value)
            .filter((h) => !exclude.includes(h.id))
            .slice(0, 8)
            .map((h) => byId.get(h.id))
            .filter((e): e is AtlasEvent => !!e)
        : [],
    [value, index, byId, exclude],
  );

  const pick = (e: AtlasEvent) => {
    onPick(e.id);
    setOpen(false);
  };

  return (
    <div className="relative w-full" data-testid={testId}>
      <label htmlFor={id} className="sr-only">
        {label ?? t.search.label}
      </label>
      <div className="flex h-9 items-center gap-2 rounded-md border border-line-strong bg-surface-2 px-2 focus-within:border-accent">
        <Icon name="search" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && hits[active] ? `${id}-opt-${hits[active].id}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder ?? t.search.placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && hits[active]) {
              e.preventDefault();
              pick(hits[active]);
            } else if (e.key === "Escape") {
              if (open) setOpen(false);
              else onChange("");
            }
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
        />
        {value && (
          <button type="button" aria-label={t.search.clear} className="text-muted hover:text-ink" onClick={() => onChange("")}>
            <Icon name="close" size={14} />
          </button>
        )}
      </div>
      {open && value.trim() && (
        <ul id={`${id}-list`} role="listbox" aria-label={label ?? t.search.label} className="absolute left-0 right-0 top-10 z-50 max-h-80 overflow-auto rounded-md border border-line-strong bg-surface py-1 shadow-xl">
          {hits.length === 0 && <li className="px-3 py-2 text-sm text-muted">{t.search.noResults}</li>}
          {hits.map((e, i) => (
            <li
              key={e.id}
              id={`${id}-opt-${e.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(ev) => {
                ev.preventDefault();
                pick(e);
              }}
              onMouseEnter={() => setActive(i)}
              className={cx("flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm", i === active ? "bg-surface-3 text-ink" : "text-ink-2")}
            >
              <FamilyIcon family={e.family} size={11} hollow={e.points.length === 0} />
              <span className="min-w-0 flex-1 truncate">{e.title}</span>
              <span className="tabular shrink-0 text-xs text-muted">{formatYear(e.startDate.year, locale, { circa: e.dateCirca })}</span>
            </li>
          ))}
          {hits.length > 0 && <li className="px-3 pt-1 text-[11px] text-muted">{fmt(t.search.results, { n: hits.length })}</li>}
        </ul>
      )}
    </div>
  );
}
