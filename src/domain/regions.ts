/**
 * Geographic regions, based on the UN M49 standard (sub-regions), plus
 * Antarctica. Cultural horizons are *user-chosen* groupings of sub-regions:
 * the application never infers a culture from the user's position.
 */
import type { Locale } from "./dates";

export const CONTINENT_IDS = ["africa", "americas", "asia", "europe", "oceania", "antarctica"] as const;
export type ContinentId = (typeof CONTINENT_IDS)[number];

export const SUBREGION_IDS = [
  "northern-africa",
  "western-africa",
  "eastern-africa",
  "middle-africa",
  "southern-africa",
  "northern-america",
  "central-america",
  "caribbean",
  "south-america",
  "central-asia",
  "eastern-asia",
  "south-eastern-asia",
  "southern-asia",
  "western-asia",
  "eastern-europe",
  "northern-europe",
  "southern-europe",
  "western-europe",
  "australia-new-zealand",
  "melanesia",
  "micronesia",
  "polynesia",
  "antarctica",
] as const;
export type SubregionId = (typeof SUBREGION_IDS)[number];

export interface SubregionDefinition {
  id: SubregionId;
  m49: string | null;
  continent: ContinentId;
  label: Record<Locale, string>;
}

export const SUBREGIONS: Record<SubregionId, SubregionDefinition> = {
  "northern-africa": { id: "northern-africa", m49: "015", continent: "africa", label: { it: "Africa settentrionale", en: "Northern Africa" } },
  "western-africa": { id: "western-africa", m49: "011", continent: "africa", label: { it: "Africa occidentale", en: "Western Africa" } },
  "eastern-africa": { id: "eastern-africa", m49: "014", continent: "africa", label: { it: "Africa orientale", en: "Eastern Africa" } },
  "middle-africa": { id: "middle-africa", m49: "017", continent: "africa", label: { it: "Africa centrale", en: "Middle Africa" } },
  "southern-africa": { id: "southern-africa", m49: "018", continent: "africa", label: { it: "Africa australe", en: "Southern Africa" } },
  "northern-america": { id: "northern-america", m49: "021", continent: "americas", label: { it: "America settentrionale", en: "Northern America" } },
  "central-america": { id: "central-america", m49: "013", continent: "americas", label: { it: "America centrale", en: "Central America" } },
  caribbean: { id: "caribbean", m49: "029", continent: "americas", label: { it: "Caraibi", en: "Caribbean" } },
  "south-america": { id: "south-america", m49: "005", continent: "americas", label: { it: "America meridionale", en: "South America" } },
  "central-asia": { id: "central-asia", m49: "143", continent: "asia", label: { it: "Asia centrale", en: "Central Asia" } },
  "eastern-asia": { id: "eastern-asia", m49: "030", continent: "asia", label: { it: "Asia orientale", en: "Eastern Asia" } },
  "south-eastern-asia": { id: "south-eastern-asia", m49: "035", continent: "asia", label: { it: "Sud-est asiatico", en: "South-eastern Asia" } },
  "southern-asia": { id: "southern-asia", m49: "034", continent: "asia", label: { it: "Asia meridionale", en: "Southern Asia" } },
  "western-asia": { id: "western-asia", m49: "145", continent: "asia", label: { it: "Asia occidentale", en: "Western Asia" } },
  "eastern-europe": { id: "eastern-europe", m49: "151", continent: "europe", label: { it: "Europa orientale", en: "Eastern Europe" } },
  "northern-europe": { id: "northern-europe", m49: "154", continent: "europe", label: { it: "Europa settentrionale", en: "Northern Europe" } },
  "southern-europe": { id: "southern-europe", m49: "039", continent: "europe", label: { it: "Europa meridionale", en: "Southern Europe" } },
  "western-europe": { id: "western-europe", m49: "155", continent: "europe", label: { it: "Europa occidentale", en: "Western Europe" } },
  "australia-new-zealand": { id: "australia-new-zealand", m49: "053", continent: "oceania", label: { it: "Australia e Nuova Zelanda", en: "Australia and New Zealand" } },
  melanesia: { id: "melanesia", m49: "054", continent: "oceania", label: { it: "Melanesia", en: "Melanesia" } },
  micronesia: { id: "micronesia", m49: "057", continent: "oceania", label: { it: "Micronesia", en: "Micronesia" } },
  polynesia: { id: "polynesia", m49: "061", continent: "oceania", label: { it: "Polinesia", en: "Polynesia" } },
  antarctica: { id: "antarctica", m49: null, continent: "antarctica", label: { it: "Antartide", en: "Antarctica" } },
};

export const CONTINENT_LABELS: Record<ContinentId, Record<Locale, string>> = {
  africa: { it: "Africa", en: "Africa" },
  americas: { it: "Americhe", en: "Americas" },
  asia: { it: "Asia", en: "Asia" },
  europe: { it: "Europa", en: "Europe" },
  oceania: { it: "Oceania", en: "Oceania" },
  antarctica: { it: "Antartide", en: "Antarctica" },
};

/**
 * Reference horizons a user can declare ("my point of departure").
 * They are explicit, coarse, editable groupings — not claims about what any
 * population knows. A horizon is either a set of sub-regions or a continent.
 */
export interface HorizonDefinition {
  id: string;
  label: Record<Locale, string>;
  subregions: SubregionId[];
  note: Record<Locale, string>;
}

export const HORIZONS: HorizonDefinition[] = [
  {
    id: "southern-europe",
    label: { it: "Europa meridionale (es. Italia)", en: "Southern Europe (e.g. Italy)" },
    subregions: ["southern-europe"],
    note: { it: "Sotto-regione M49 039.", en: "M49 sub-region 039." },
  },
  {
    id: "europe",
    label: { it: "Europa", en: "Europe" },
    subregions: ["eastern-europe", "northern-europe", "southern-europe", "western-europe"],
    note: { it: "Tutte le sotto-regioni europee M49.", en: "All European M49 sub-regions." },
  },
  {
    id: "north-atlantic",
    label: { it: "Mondo nord-atlantico (Europa occ. e Nord America)", en: "North Atlantic (W. Europe & N. America)" },
    subregions: ["western-europe", "northern-europe", "southern-europe", "northern-america"],
    note: { it: "Raggruppamento convenzionale, non una categoria culturale definita.", en: "Conventional grouping, not a defined cultural category." },
  },
  {
    id: "east-asia",
    label: { it: "Asia orientale", en: "East Asia" },
    subregions: ["eastern-asia"],
    note: { it: "Sotto-regione M49 030.", en: "M49 sub-region 030." },
  },
  {
    id: "south-asia",
    label: { it: "Asia meridionale", en: "South Asia" },
    subregions: ["southern-asia"],
    note: { it: "Sotto-regione M49 034.", en: "M49 sub-region 034." },
  },
  {
    id: "west-asia-north-africa",
    label: { it: "Asia occidentale e Nord Africa", en: "West Asia & North Africa" },
    subregions: ["western-asia", "northern-africa"],
    note: { it: "Raggruppamento geografico; non coincide con un'unica area linguistica o religiosa.", en: "Geographic grouping; it does not coincide with a single linguistic or religious area." },
  },
  {
    id: "sub-saharan-africa",
    label: { it: "Africa subsahariana", en: "Sub-Saharan Africa" },
    subregions: ["western-africa", "eastern-africa", "middle-africa", "southern-africa"],
    note: { it: "Raggruppamento M49 intermedio 202.", en: "M49 intermediate region 202." },
  },
  {
    id: "latin-america",
    label: { it: "America latina e Caraibi", en: "Latin America & Caribbean" },
    subregions: ["central-america", "caribbean", "south-america"],
    note: { it: "Raggruppamento M49 419.", en: "M49 grouping 419." },
  },
  {
    id: "northern-america",
    label: { it: "America settentrionale", en: "Northern America" },
    subregions: ["northern-america"],
    note: { it: "Sotto-regione M49 021.", en: "M49 sub-region 021." },
  },
  {
    id: "southeast-asia-oceania",
    label: { it: "Sud-est asiatico e Oceania", en: "South-east Asia & Oceania" },
    subregions: ["south-eastern-asia", "australia-new-zealand", "melanesia", "micronesia", "polynesia"],
    note: { it: "Raggruppamento geografico convenzionale.", en: "Conventional geographic grouping." },
  },
  {
    id: "central-asia-eastern-europe",
    label: { it: "Asia centrale ed Europa orientale", en: "Central Asia & Eastern Europe" },
    subregions: ["central-asia", "eastern-europe"],
    note: { it: "Raggruppamento geografico convenzionale.", en: "Conventional geographic grouping." },
  },
];

export function continentOf(subregion: SubregionId): ContinentId {
  return SUBREGIONS[subregion].continent;
}

/** Rough geographic centroid of each continent (lon, lat) for distance heuristics. */
export const CONTINENT_ADJACENCY: Record<ContinentId, ContinentId[]> = {
  africa: ["europe", "asia"],
  americas: ["oceania"],
  asia: ["europe", "africa", "oceania"],
  europe: ["africa", "asia"],
  oceania: ["asia", "americas", "antarctica"],
  antarctica: ["oceania", "americas", "africa"],
};
