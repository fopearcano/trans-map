import { cookies } from "next/headers";
import type { Locale } from "@/domain/dates";

export const LOCALE_COOKIE = "tm-locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "it";
}
