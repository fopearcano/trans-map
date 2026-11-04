/**
 * Controlled vocabulary of quantitative metrics.
 *
 * Every metric type belongs to a "comparability group": two values can be
 * put side by side (and divided) only when they share the same metric type
 * and unit. Types in the same *family* (e.g. different mortality
 * definitions) can be shown together but every ratio carries a warning.
 */
import type { Locale } from "./dates";

export const UNIT_IDS = [
  "people",
  "households",
  "count",
  "percent",
  "km2",
  "km3",
  "m3",
  "m",
  "megatonnes",
  "petagrams-carbon",
  "million-hectares",
  "ppm",
  "celsius",
  "usd-nominal",
  "magnitude-mw",
  "years",
] as const;
export type UnitId = (typeof UNIT_IDS)[number];

export const METRIC_FAMILIES = ["mortality", "exposure", "demography", "physical", "environmental", "economic", "diffusion"] as const;
export type MetricFamily = (typeof METRIC_FAMILIES)[number];

export const METRIC_TYPE_IDS = [
  "deaths_direct",
  "deaths_indirect",
  "deaths_total",
  "deaths_annual",
  "missing",
  "injured",
  "infections_total",
  "cases_annual",
  "people_affected",
  "people_displaced",
  "people_exposed",
  "people_forcibly_transported",
  "population_share_dead",
  "population_decline_share",
  "population_peak",
  "area_affected",
  "site_area",
  "houses_destroyed",
  "landslide_volume",
  "water_released",
  "erupted_volume",
  "sulfur_injected",
  "wave_height",
  "earthquake_magnitude",
  "lake_surface_area",
  "co2_change",
  "carbon_uptake",
  "land_reforested",
  "temperature_change",
  "economic_damage",
  "settlement_amount",
  "households_out_of_poverty",
  "population_supported_share",
  "treaty_parties",
  "mortality_rate_treated",
] as const;
export type MetricTypeId = (typeof METRIC_TYPE_IDS)[number];

export interface MetricTypeDefinition {
  id: MetricTypeId;
  family: MetricFamily;
  unit: UnitId;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
  /** Can this metric drive marker size on the map? */
  mapSizable: boolean;
  /** Signed changes (e.g. cooling, CO₂ decrease) may be negative. */
  allowsNegative?: boolean;
}

const def = (
  id: MetricTypeId,
  family: MetricFamily,
  unit: UnitId,
  it: string,
  en: string,
  dIt: string,
  dEn: string,
  mapSizable = false,
): MetricTypeDefinition => ({ id, family, unit, label: { it, en }, description: { it: dIt, en: dEn }, mapSizable });

export const METRIC_TYPES: Record<MetricTypeId, MetricTypeDefinition> = {
  deaths_direct: def("deaths_direct", "mortality", "people", "Vittime dirette/immediate", "Direct/immediate deaths",
    "Morti causate direttamente dall'evento nel suo svolgimento immediato.", "Deaths directly caused by the event as it unfolded.", true),
  deaths_indirect: def("deaths_indirect", "mortality", "people", "Vittime indirette/successive", "Indirect/subsequent deaths",
    "Morti successive attribuite a conseguenze (epidemie, carestie, malattie).", "Later deaths attributed to consequences (epidemics, famine, disease).", true),
  deaths_total: def("deaths_total", "mortality", "people", "Vittime complessive stimate", "Estimated total deaths",
    "Stima complessiva che include morti dirette e indirette, secondo la definizione della fonte.", "Overall estimate including direct and indirect deaths, as defined by the source.", true),
  deaths_annual: def("deaths_annual", "mortality", "people", "Morti in un anno", "Deaths in one year",
    "Morti registrate o stimate in un singolo anno di riferimento.", "Deaths recorded or estimated in a single reference year."),
  missing: def("missing", "mortality", "people", "Dispersi", "Missing", "Persone mai ritrovate.", "People never found."),
  injured: def("injured", "exposure", "people", "Feriti / danni alla salute", "Injured / health damage",
    "Persone con lesioni o danni alla salute riconosciuti.", "People with recognised injuries or health damage."),
  infections_total: def("infections_total", "exposure", "people", "Persone contagiate (cumulative)", "Cumulative infections",
    "Numero cumulativo di persone infettate.", "Cumulative number of people infected.", true),
  cases_annual: def("cases_annual", "exposure", "people", "Casi in un anno", "Cases in one year",
    "Casi di malattia in un singolo anno di riferimento.", "Cases of disease in a single reference year."),
  people_affected: def("people_affected", "exposure", "people", "Persone coinvolte", "People affected",
    "Persone residenti nell'area colpita o direttamente toccate, secondo la definizione della fonte.", "People living in the affected area or directly touched, as defined by the source.", true),
  people_displaced: def("people_displaced", "exposure", "people", "Persone sfollate o evacuate", "People displaced or evacuated",
    "Persone costrette a lasciare la propria abitazione.", "People forced to leave their homes.", true),
  people_exposed: def("people_exposed", "exposure", "people", "Persone esposte", "People exposed",
    "Popolazione esposta all'agente dannoso.", "Population exposed to the harmful agent."),
  people_forcibly_transported: def("people_forcibly_transported", "exposure", "people", "Persone deportate", "People forcibly transported",
    "Persone trasportate con la forza.", "People transported by force.", true),
  population_share_dead: def("population_share_dead", "mortality", "percent", "Quota della popolazione morta", "Share of population killed",
    "Percentuale della popolazione di riferimento (indicata nello scope) morta a causa dell'evento.", "Percentage of the reference population (see scope) killed by the event."),
  population_decline_share: def("population_decline_share", "mortality", "percent", "Declino della popolazione", "Population decline",
    "Riduzione percentuale della popolazione di riferimento.", "Percentage reduction of the reference population."),
  population_peak: def("population_peak", "demography", "people", "Popolazione al culmine", "Peak population",
    "Popolazione stimata di un insediamento o di un'area nel suo momento di massima estensione.", "Estimated population of a settlement or area at its peak.", true),
  site_area: def("site_area", "physical", "km2", "Superficie del sito", "Site area", "Estensione di un sito archeologico o urbano.", "Extent of an archaeological or urban site."),
  area_affected: def("area_affected", "physical", "km2", "Superficie colpita", "Area affected", "Estensione territoriale colpita.", "Territorial extent affected.", true),
  houses_destroyed: def("houses_destroyed", "physical", "count", "Abitazioni distrutte", "Houses destroyed", "Edifici abitativi crollati o distrutti.", "Dwellings collapsed or destroyed."),
  landslide_volume: def("landslide_volume", "physical", "m3", "Volume della frana", "Landslide volume", "Volume del materiale franato.", "Volume of landslide material."),
  water_released: def("water_released", "physical", "m3", "Acqua rilasciata", "Water released", "Volume d'acqua rilasciato o tracimato.", "Volume of water released or overtopping."),
  erupted_volume: def("erupted_volume", "physical", "km3", "Volume eruttato (DRE)", "Erupted volume (DRE)", "Volume di magma eruttato espresso in equivalente di roccia densa.", "Erupted magma volume as dense-rock equivalent."),
  sulfur_injected: def("sulfur_injected", "environmental", "megatonnes", "Zolfo immesso in stratosfera", "Sulfur injected into stratosphere", "Massa di zolfo immessa in stratosfera.", "Mass of sulfur injected into the stratosphere."),
  wave_height: def("wave_height", "physical", "m", "Altezza dell'onda", "Wave height", "Altezza dell'onda secondo la definizione della fonte.", "Wave height as defined by the source."),
  earthquake_magnitude: def("earthquake_magnitude", "physical", "magnitude-mw", "Magnitudo momento", "Moment magnitude", "Magnitudo momento (Mw); scala logaritmica: non dividere i valori.", "Moment magnitude (Mw); logarithmic: never divide values."),
  lake_surface_area: def("lake_surface_area", "environmental", "km2", "Superficie del lago", "Lake surface area", "Superficie del corpo idrico all'anno indicato.", "Water-body surface area in the given year."),
  co2_change: { ...def("co2_change", "environmental", "ppm", "Variazione di CO₂ atmosferica", "Atmospheric CO₂ change", "Variazione della concentrazione di CO₂ in atmosfera (negativa = diminuzione).", "Change in atmospheric CO₂ concentration (negative = decrease)."), allowsNegative: true },
  carbon_uptake: def("carbon_uptake", "environmental", "petagrams-carbon", "Carbonio sequestrato", "Carbon uptake", "Carbonio assorbito dalla vegetazione.", "Carbon absorbed by vegetation."),
  land_reforested: def("land_reforested", "environmental", "million-hectares", "Terre tornate a foresta", "Land reverting to forest", "Superficie abbandonata soggetta a successione secondaria.", "Abandoned land undergoing secondary succession."),
  temperature_change: { ...def("temperature_change", "environmental", "celsius", "Variazione di temperatura", "Temperature change", "Variazione di temperatura media secondo la fonte (negativa = raffreddamento).", "Mean temperature change per the source (negative = cooling)."), allowsNegative: true },
  economic_damage: def("economic_damage", "economic", "usd-nominal", "Danni economici (USD nominali)", "Economic damage (nominal USD)", "Danni stimati in dollari correnti dell'anno indicato; non corretti per inflazione.", "Estimated damage in current dollars of the stated year; not inflation-adjusted."),
  settlement_amount: def("settlement_amount", "economic", "usd-nominal", "Risarcimento concordato (USD nominali)", "Settlement amount (nominal USD)", "Importo di accordi giudiziari, in dollari correnti.", "Legal settlement amount, current dollars."),
  households_out_of_poverty: def("households_out_of_poverty", "diffusion", "households", "Famiglie uscite dalla povertà", "Households lifted out of poverty", "Stima causale dell'effetto sulla povertà.", "Causal estimate of the poverty effect."),
  population_supported_share: def("population_supported_share", "diffusion", "percent", "Popolazione mondiale sostenuta", "World population supported", "Quota della popolazione mondiale la cui alimentazione dipende dall'innovazione (stima).", "Share of world population whose food depends on the innovation (estimate)."),
  treaty_parties: def("treaty_parties", "diffusion", "count", "Parti aderenti", "Parties", "Numero di Stati/organizzazioni che hanno ratificato.", "Number of states/organisations that ratified."),
  mortality_rate_treated: def("mortality_rate_treated", "mortality", "percent", "Mortalità tra i trattati", "Mortality among treated", "Percentuale di decessi tra i pazienti trattati nello studio.", "Percentage of deaths among patients treated in the study."),
};

export const UNIT_LABELS: Record<UnitId, Record<Locale, string>> = {
  people: { it: "persone", en: "people" },
  households: { it: "famiglie", en: "households" },
  count: { it: "", en: "" },
  percent: { it: "%", en: "%" },
  km2: { it: "km²", en: "km²" },
  km3: { it: "km³", en: "km³" },
  m3: { it: "m³", en: "m³" },
  m: { it: "m", en: "m" },
  megatonnes: { it: "Mt", en: "Mt" },
  "petagrams-carbon": { it: "Pg C", en: "Pg C" },
  "million-hectares": { it: "Mha", en: "Mha" },
  ppm: { it: "ppm", en: "ppm" },
  celsius: { it: "°C", en: "°C" },
  "usd-nominal": { it: "USD", en: "USD" },
  "magnitude-mw": { it: "Mw", en: "Mw" },
  years: { it: "anni", en: "years" },
};

/** Units whose values are on a ratio scale (dividing them is meaningful). */
export function isRatioScale(unit: UnitId): boolean {
  return unit !== "magnitude-mw" && unit !== "celsius" && unit !== "percent";
}

export const ESTIMATE_KINDS = [
  "official",
  "documented-count",
  "scholarly-estimate",
  "model-estimate",
  "preliminary-report",
  "ngo-estimate",
  "media-report",
] as const;
export type EstimateKind = (typeof ESTIMATE_KINDS)[number];

export const ESTIMATE_KIND_LABELS: Record<EstimateKind, Record<Locale, string>> = {
  official: { it: "Dato ufficiale", en: "Official figure" },
  "documented-count": { it: "Conteggio documentato", en: "Documented count" },
  "scholarly-estimate": { it: "Stima accademica", en: "Scholarly estimate" },
  "model-estimate": { it: "Stima da modello", en: "Model-based estimate" },
  "preliminary-report": { it: "Rapporto preliminare/coevo", en: "Preliminary/contemporary report" },
  "ngo-estimate": { it: "Stima di ONG o associazioni", en: "NGO/association estimate" },
  "media-report": { it: "Cifra divulgativa/mediatica", en: "Media/popular figure" },
};

export const UNCERTAINTY_LEVELS = ["low", "medium", "high", "very-high"] as const;
export type UncertaintyLevel = (typeof UNCERTAINTY_LEVELS)[number];

export const UNCERTAINTY_LABELS: Record<UncertaintyLevel, Record<Locale, string>> = {
  low: { it: "Incertezza bassa", en: "Low uncertainty" },
  medium: { it: "Incertezza media", en: "Medium uncertainty" },
  high: { it: "Incertezza alta", en: "High uncertainty" },
  "very-high": { it: "Incertezza molto alta", en: "Very high uncertainty" },
};
