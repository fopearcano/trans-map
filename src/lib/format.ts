import type { Locale } from "@/domain/dates";
import { UNIT_LABELS, type UnitId } from "@/domain/metrics";

const intl = (locale: Locale) => (locale === "it" ? "it-IT" : "en-GB");

export function formatNumber(value: number, locale: Locale, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(intl(locale), { maximumFractionDigits }).format(value);
}

/** Human-friendly number: exact below 10,000, otherwise "26.000", "1,2 milioni", "44,2 milioni". */
export function formatQuantity(value: number, locale: Locale): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${formatNumber(value / 1e9, locale, 1)} ${locale === "it" ? "miliardi" : "billion"}`;
  if (abs >= 1e6) return `${formatNumber(value / 1e6, locale, abs >= 1e7 ? 1 : 2)} ${locale === "it" ? "milioni" : "million"}`;
  if (abs < 10 && !Number.isInteger(value)) return formatNumber(value, locale, 2);
  if (abs < 100 && !Number.isInteger(value)) return formatNumber(value, locale, 1);
  return formatNumber(value, locale, 0);
}

export function formatWithUnit(value: number, unit: UnitId, locale: Locale): string {
  const label = UNIT_LABELS[unit][locale];
  if (unit === "percent") return `${formatNumber(value, locale, 1)}%`;
  if (unit === "magnitude-mw") return `Mw ${formatNumber(value, locale, 1)}`;
  if (unit === "celsius") return `${value > 0 ? "+" : ""}${formatNumber(value, locale, 2)} °C`;
  if (unit === "ppm") return `${value > 0 ? "+" : ""}${formatNumber(value, locale, 1)} ppm`;
  if (unit === "usd-nominal") return `${formatQuantity(value, locale)} USD`;
  return label ? `${formatQuantity(value, locale)} ${label}` : formatQuantity(value, locale);
}

export function formatRange(low: number | undefined, high: number | undefined, unit: UnitId, locale: Locale): string {
  if (low !== undefined && high !== undefined && low !== high) {
    const special = unit === "percent" || unit === "magnitude-mw" || unit === "celsius" || unit === "ppm";
    return `${special ? formatWithUnit(low, unit, locale) : formatQuantity(low, locale)} – ${formatWithUnit(high, unit, locale)}`;
  }
  if (low !== undefined && high === undefined) return `≥ ${formatWithUnit(low, unit, locale)}`;
  if (high !== undefined && low === undefined) return `≤ ${formatWithUnit(high, unit, locale)}`;
  return formatWithUnit((low ?? high)!, unit, locale);
}

export function formatFactor(x: number, locale: Locale): string {
  if (x >= 100) return formatNumber(x, locale, 0);
  if (x >= 10) return formatNumber(x, locale, 1);
  return formatNumber(x, locale, 2);
}

export function formatIsoDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(intl(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}
