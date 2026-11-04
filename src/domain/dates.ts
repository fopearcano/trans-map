/**
 * Historical dates.
 *
 * Years follow the historical convention used by historians: there is no
 * year 0, so 1 BCE (year -1) is immediately followed by 1 CE (year 1).
 * Internally every computation uses a continuous "astronomical" value where
 * 1 BCE = 0, 2 BCE = -1, … plus a fractional part for month/day.
 */

export type DatePrecision = "day" | "month" | "year" | "decade" | "century" | "millennium" | "millennia";

export interface HistoricalDate {
  /** Historical year: negative = BCE, positive = CE, never 0. */
  year: number;
  month?: number;
  day?: number;
}

export type Locale = "it" | "en";

/** Reference "present" for relative expressions (years ago) and the timeline. */
export const PRESENT_YEAR = 2026;
/** Lower bound of the timeline: 3.3 million years ago (earliest known stone tools). */
export const TIMELINE_MIN_YEAR = -3_300_000;

export function toAstronomical(year: number): number {
  if (year === 0) throw new Error("Year 0 does not exist in the historical calendar");
  return year > 0 ? year : year + 1;
}

export function fromAstronomical(astro: number): number {
  const y = Math.round(astro);
  return y > 0 ? y : y - 1;
}

/** Continuous value used for sorting and range overlap. */
export function dateValue(date: HistoricalDate): number {
  const astro = toAstronomical(date.year);
  const m = date.month ? (date.month - 1) / 12 : 0;
  const d = date.day ? (date.day - 1) / 365 : 0;
  return astro + m + d;
}

/** Value of the *end* of a date at its precision (e.g. year 1963 → end of 1963). */
export function dateEndValue(date: HistoricalDate): number {
  const astro = toAstronomical(date.year);
  if (date.day && date.month) return astro + (date.month - 1) / 12 + date.day / 365;
  if (date.month) return astro + date.month / 12;
  return astro + 0.9999;
}

export interface TemporalExtent {
  start: number;
  end: number;
}

export function temporalExtent(start: HistoricalDate, end?: HistoricalDate | null): TemporalExtent {
  const s = dateValue(start);
  const e = end ? dateEndValue(end) : dateEndValue(start);
  return { start: Math.min(s, e), end: Math.max(s, e) };
}

/** Does [aStart, aEnd] overlap [bStart, bEnd]? (inclusive) */
export function overlaps(a: TemporalExtent, b: TemporalExtent): boolean {
  return a.start <= b.end && b.start <= a.end;
}

const MONTHS: Record<Locale, string[]> = {
  it: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

function groupThousands(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 0 }).format(n);
}

/** Format a bare historical year: "1963", "3200 a.C.", "c. 73.000 anni fa". */
export function formatYear(year: number, locale: Locale = "it", opts: { circa?: boolean } = {}): string {
  const circa = opts.circa ? "c. " : "";
  if (year < -10_000) {
    // Deep time: express as years before present, rounded to the thousand.
    const ago = PRESENT_YEAR - toAstronomical(year);
    const rounded = Math.round(ago / 1000) * 1000;
    return locale === "it"
      ? `${circa}${groupThousands(rounded, locale)} anni fa`
      : `${circa}${groupThousands(rounded, locale)} years ago`;
  }
  if (year < 0) {
    const abs = Math.abs(year);
    const num = abs >= 10_000 ? groupThousands(abs, locale) : String(abs);
    return `${circa}${num} ${locale === "it" ? "a.C." : "BCE"}`;
  }
  return `${circa}${year}`;
}

export function formatHistoricalDate(
  date: HistoricalDate,
  locale: Locale = "it",
  opts: { circa?: boolean; precision?: DatePrecision } = {},
): string {
  const precision = opts.precision ?? (date.day ? "day" : date.month ? "month" : "year");
  if (precision === "century") return (opts.circa ? "c. " : "") + formatCentury(centuryOf(date.year), locale);
  const yearText = formatYear(date.year, locale, { circa: opts.circa });
  if (precision === "day" && date.day && date.month) {
    const month = MONTHS[locale][date.month - 1];
    return locale === "it" ? `${date.day} ${month} ${yearText}` : `${date.day} ${month} ${yearText}`;
  }
  if ((precision === "day" || precision === "month") && date.month) {
    return `${MONTHS[locale][date.month - 1]} ${yearText}`;
  }
  return yearText;
}

export function formatDateRange(
  start: HistoricalDate,
  end: HistoricalDate | null | undefined,
  locale: Locale = "it",
  opts: { circa?: boolean; precision?: DatePrecision } = {},
): string {
  const a = formatHistoricalDate(start, locale, opts);
  if (!end) return a;
  const sameYear = end.year === start.year;
  if (sameYear && (opts.precision === "year" || !end.month)) return a;
  const b = formatHistoricalDate(end, locale, { precision: opts.precision, circa: false });
  // Drop the era suffix duplication for BCE→BCE ranges in the same deep-time band.
  return `${a} – ${b}`;
}

/** Century number: positive for CE (1 = years 1–100), negative for BCE (-1 = 100–1 BCE). */
export function centuryOf(year: number): number {
  if (year > 0) return Math.ceil(year / 100);
  return -Math.ceil(Math.abs(year) / 100);
}

export function centuryRange(century: number): { from: number; to: number } {
  if (century > 0) return { from: (century - 1) * 100 + 1, to: century * 100 };
  const c = Math.abs(century);
  return { from: -(c * 100), to: -((c - 1) * 100 + 1) };
}

export function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let rest = n;
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

export function formatCentury(century: number, locale: Locale = "it"): string {
  const abs = Math.abs(century);
  if (locale === "it") return `${toRoman(abs)} secolo${century < 0 ? " a.C." : ""}`;
  const suffix = abs % 10 === 1 && abs % 100 !== 11 ? "st" : abs % 10 === 2 && abs % 100 !== 12 ? "nd" : abs % 10 === 3 && abs % 100 !== 13 ? "rd" : "th";
  return `${abs}${suffix} century${century < 0 ? " BCE" : ""}`;
}

/**
 * Conventional numeric periods. Labels deliberately avoid region-specific
 * periodisations ("Middle Ages", "Renaissance"…) that only fit European
 * historiography.
 */
export interface HistoricalPeriod {
  id: string;
  from: number; // historical year (inclusive)
  to: number; // historical year (inclusive)
  label: Record<Locale, string>;
}

export const PERIODS: HistoricalPeriod[] = [
  { id: "deep-past", from: TIMELINE_MIN_YEAR, to: -10_001, label: { it: "Prima del 10.000 a.C.", en: "Before 10,000 BCE" } },
  { id: "early-settlements", from: -10_000, to: -3001, label: { it: "10.000 – 3000 a.C.", en: "10,000 – 3000 BCE" } },
  { id: "early-states", from: -3000, to: -501, label: { it: "3000 – 500 a.C.", en: "3000 – 500 BCE" } },
  { id: "classical", from: -500, to: 500, label: { it: "500 a.C. – 500 d.C.", en: "500 BCE – 500 CE" } },
  { id: "500-1500", from: 501, to: 1500, label: { it: "500 – 1500", en: "500 – 1500" } },
  { id: "1500-1800", from: 1501, to: 1800, label: { it: "1500 – 1800", en: "1500 – 1800" } },
  { id: "1800-1914", from: 1801, to: 1914, label: { it: "1800 – 1914", en: "1800 – 1914" } },
  { id: "1914-1945", from: 1915, to: 1945, label: { it: "1914 – 1945", en: "1914 – 1945" } },
  { id: "1945-today", from: 1946, to: PRESENT_YEAR, label: { it: "1945 – oggi", en: "1945 – today" } },
];

/**
 * Deep-time timeline scale. Position 0 = TIMELINE_MIN_YEAR, 1 = PRESENT.
 * Uses log(years before present) so that millennia of prehistory and the
 * dense recent centuries are both readable. The scale is stated in the UI.
 */
const SCALE_OFFSET = 10; // years; avoids log(0) and keeps the last decade visible
const LOG_SPAN = Math.log(PRESENT_YEAR - toAstronomical(TIMELINE_MIN_YEAR) + SCALE_OFFSET) - Math.log(SCALE_OFFSET);

export function yearToPosition(year: number): number {
  const astro = toAstronomical(Math.max(TIMELINE_MIN_YEAR, Math.min(PRESENT_YEAR, year)));
  const bp = PRESENT_YEAR - astro + SCALE_OFFSET;
  return 1 - (Math.log(bp) - Math.log(SCALE_OFFSET)) / LOG_SPAN;
}

export function positionToYear(position: number): number {
  const p = Math.max(0, Math.min(1, position));
  const bp = Math.exp((1 - p) * LOG_SPAN + Math.log(SCALE_OFFSET)) - SCALE_OFFSET;
  const astro = PRESENT_YEAR - bp;
  return fromAstronomical(niceRound(astro));
}

/** Round to a granularity proportional to distance from the present. */
function niceRound(astro: number): number {
  const distance = PRESENT_YEAR - astro;
  const step = distance > 100_000 ? 10_000 : distance > 20_000 ? 1000 : distance > 3000 ? 100 : distance > 600 ? 10 : 1;
  return Math.round(astro / step) * step;
}
