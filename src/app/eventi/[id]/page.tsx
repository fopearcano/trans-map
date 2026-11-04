import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventDetailView } from "@/components/event/EventDetailView";
import { getRepository } from "@/server/repository";
import { getLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = getRepository().getEvent(id);
  return event ? { title: event.title, description: event.summary } : {};
}

/** Full, server-rendered event page: deep links, printing, no-JS reading. */
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const repo = getRepository();
  const detail = repo.getEventDetail(id);
  if (!detail) notFound();
  const t = getDictionary(await getLocale());
  return (
    <main className="min-h-dvh bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <nav className="mb-4 flex flex-wrap gap-3 text-sm">
          <Link href={`/?sel=${id}`} className="text-accent-ink hover:underline">
            ← {t.common.back}
          </Link>
          <Link href={`/?cmp=${id}&panel=compare`} className="text-accent-ink hover:underline">
            {t.compare.open}
          </Link>
        </nav>
        <div className="rounded-xl border border-line bg-surface p-5">
          <EventDetailView detail={detail} atlas={repo.getAtlasIndex()} headingLevel={1} />
        </div>
      </div>
    </main>
  );
}
