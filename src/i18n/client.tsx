"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/domain/dates";
import { fmt, getDictionary, type Dictionary } from "./dictionaries";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  fmt: typeof fmt;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: getDictionary(locale), fmt }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
