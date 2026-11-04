"use client";
import { useCallback, useEffect, useState } from "react";
import type { AtlasEvent } from "@/domain/atlas";
import { useI18n } from "@/i18n/client";
import type { EventDetail } from "@/server/repository";
import { Button } from "@/components/ui/primitives";
import { EventDetailView, type EventActions } from "./EventDetailView";

const cache = new Map<string, EventDetail>();

export function EventPanel({ id, atlas, actions }: { id: string; atlas: AtlasEvent[]; actions: EventActions }) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<EventDetail | null>(cache.get(id) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) => {
      if (cache.has(id)) {
        setDetail(cache.get(id)!);
        return;
      }
      setDetail(null);
      setError(null);
      fetch(`/api/events/${encodeURIComponent(id)}`, { signal })
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json().catch(() => null))?.error?.message ?? `HTTP ${r.status}`);
          return r.json() as Promise<EventDetail>;
        })
        .then((d) => {
          cache.set(id, d);
          setDetail(d);
        })
        .catch((err: Error) => err.name !== "AbortError" && setError(err.message));
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load, attempt]);

  if (error)
    return (
      <div role="alert" className="text-sm">
        <p style={{ color: "var(--status-critical)" }}>
          {t.event.error} {error}
        </p>
        <Button size="sm" className="mt-2" onClick={() => setAttempt((a) => a + 1)}>
          {t.event.retry}
        </Button>
      </div>
    );
  if (!detail || detail.event.id !== id)
    return (
      <p role="status" className="text-sm text-muted">
        {t.event.loading}
      </p>
    );
  return <EventDetailView detail={detail} atlas={atlas} actions={actions} />;
}
