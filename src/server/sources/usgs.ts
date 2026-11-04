import { z } from "zod";
import { fetchJson, SourceParseError, type FetchOptions } from "./http";

const UsgsEvent = z.object({
  id: z.string(),
  properties: z.object({ mag: z.number().nullable(), magType: z.string().nullable().optional(), place: z.string().nullable(), time: z.number(), url: z.string() }),
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number(), z.number()]) }),
});

/** USGS FDSN event service (public domain): magnitude, origin time and hypocentre. */
export async function fetchUsgsEarthquake(eventId: string, opts: Partial<FetchOptions> = {}) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?eventid=${encodeURIComponent(eventId)}&format=geojson`;
  const parsed = UsgsEvent.safeParse(await fetchJson(url, { source: "usgs", ...opts }));
  if (!parsed.success) throw new SourceParseError("usgs: risposta non conforme", "usgs", url);
  const p = parsed.data;
  return {
    id: p.id,
    magnitude: p.properties.mag,
    magnitudeType: p.properties.magType ?? null,
    place: p.properties.place,
    time: new Date(p.properties.time).toISOString(),
    coordinates: { lon: p.geometry.coordinates[0], lat: p.geometry.coordinates[1], depthKm: p.geometry.coordinates[2] },
    url: p.properties.url,
  };
}
