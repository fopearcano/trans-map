"use client";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { FAMILIES, type FamilyId } from "@/domain/categories";
import type { EvidenceStatus } from "@/domain/schemas";
import { useI18n } from "@/i18n/client";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Shape + colour glyph of a disciplinary family (identity is never colour-only). */
export function FamilyIcon({ family, size = 12, hollow = false, title }: { family: FamilyId; size?: number; hollow?: boolean; title?: string }) {
  const shape = FAMILIES[family].shape;
  const color = `var(--family-${family})`;
  const sw = 2;
  const common = hollow ? { fill: "none", stroke: color, strokeWidth: sw } : { fill: color, stroke: "var(--surface-1)", strokeWidth: 1 };
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} className="shrink-0">
      {title ? <title>{title}</title> : null}
      {shape === "circle" && <circle cx="6" cy="6" r={hollow ? 4.5 : 5} {...common} />}
      {shape === "square" && <rect x={hollow ? 1.5 : 1} y={hollow ? 1.5 : 1} width={hollow ? 9 : 10} height={hollow ? 9 : 10} rx="1.5" {...common} />}
      {shape === "triangle" && <polygon points={hollow ? "6,1.8 10.6,10.2 1.4,10.2" : "6,0.8 11.4,10.8 0.6,10.8"} {...common} />}
    </svg>
  );
}

const STATUS_STYLE: Record<EvidenceStatus, { color: string; icon: ReactNode }> = {
  verified: {
    color: "var(--status-good)",
    icon: <path d="M2.5 6.5l2.2 2.2L9.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  disputed: {
    color: "var(--status-serious)",
    icon: (
      <>
        <path d="M6 2.2v4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="6" cy="9.3" r="1" fill="currentColor" />
      </>
    ),
  },
  "needs-review": {
    color: "var(--status-warning)",
    icon: <path d="M6 3v3.4l2 1.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />,
  },
  draft: {
    color: "var(--text-muted)",
    icon: <path d="M3 9l1-3 4-4 2 2-4 4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />,
  },
};

export function EvidenceBadge({ status, compact = false }: { status: EvidenceStatus; compact?: boolean }) {
  const { t } = useI18n();
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-ink-2"
      title={t.evidence[`${status}Help` as keyof typeof t.evidence] as string}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden style={{ color: s.color }}>
        {s.icon}
      </svg>
      {compact ? null : <span>{t.evidence[status]}</span>}
      {compact ? <span className="sr-only">{t.evidence[status]}</span> : null}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs text-ink-2", className)}>{children}</span>;
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm",
        variant === "primary" && "bg-accent text-white hover:brightness-110",
        variant === "secondary" && "border border-line-strong bg-surface-2 text-ink hover:bg-surface-3",
        variant === "ghost" && "text-ink-2 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    />
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h3 id={id} className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </h3>
  );
}

export function Icon({ name, size = 16 }: { name: "close" | "search" | "filter" | "list" | "compare" | "compass" | "sun" | "moon" | "plus" | "minus" | "globe" | "link" | "target" | "chart" | "info" | "warning" | "clock" | "chevron"; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    close: <path d="M5 5l10 10M15 5L5 15" {...p} />,
    search: (
      <>
        <circle cx="9" cy="9" r="5.5" {...p} />
        <path d="M13.2 13.2L17 17" {...p} />
      </>
    ),
    filter: <path d="M3 5h14M6 10h8M8.5 15h3" {...p} />,
    list: <path d="M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01" {...p} />,
    compare: <path d="M6 3v14M14 3v14M3 7h6M11 12h6" {...p} />,
    compass: (
      <>
        <circle cx="10" cy="10" r="7" {...p} />
        <path d="M12.8 7.2l-1.7 3.9-3.9 1.7 1.7-3.9z" {...p} />
      </>
    ),
    sun: (
      <>
        <circle cx="10" cy="10" r="3.2" {...p} />
        <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3L6 14M14 6l1.3-1.3" {...p} />
      </>
    ),
    moon: <path d="M15.5 12.5A6.5 6.5 0 017.5 4.5a6.5 6.5 0 108 8z" {...p} />,
    plus: <path d="M10 4v12M4 10h12" {...p} />,
    minus: <path d="M4 10h12" {...p} />,
    globe: (
      <>
        <circle cx="10" cy="10" r="7" {...p} />
        <path d="M3 10h14M10 3c2 2.2 2.8 4.5 2.8 7s-.8 4.8-2.8 7c-2-2.2-2.8-4.5-2.8-7S8 5.2 10 3z" {...p} />
      </>
    ),
    link: <path d="M8.5 11.5l3-3M7 9l-1.8 1.8a2.6 2.6 0 003.7 3.7L10.7 13M13 11l1.8-1.8a2.6 2.6 0 00-3.7-3.7L9.3 7" {...p} />,
    target: (
      <>
        <circle cx="10" cy="10" r="6" {...p} />
        <circle cx="10" cy="10" r="2" {...p} />
      </>
    ),
    chart: <path d="M4 16V9M10 16V4M16 16v-5M3 16.5h14" {...p} />,
    info: (
      <>
        <circle cx="10" cy="10" r="7" {...p} />
        <path d="M10 9v4.5M10 6.5h.01" {...p} />
      </>
    ),
    warning: (
      <>
        <path d="M10 3.5l7 12.5H3z" {...p} />
        <path d="M10 8.5v3.5M10 14.2h.01" {...p} />
      </>
    ),
    clock: (
      <>
        <circle cx="10" cy="10" r="7" {...p} />
        <path d="M10 6v4l2.5 1.5" {...p} />
      </>
    ),
    chevron: <path d="M7 8l3 3 3-3" {...p} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      {paths[name]}
    </svg>
  );
}
