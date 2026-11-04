import type { Metadata } from "next";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { getRepository } from "@/server/repository";
import { getLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).analytics.title };
}

export default function AnalyticsPage() {
  const repo = getRepository();
  return (
    <main className="min-h-dvh bg-page">
      <AnalyticsView atlas={repo.getAtlasIndex()} relations={repo.getRelations()} />
    </main>
  );
}
