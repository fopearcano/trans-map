/**
 * Source adapters normalise external data into TRANS-MAP contracts.
 * They never write facts directly: imported records are drafts that require
 * editorial review (status "draft"), and every value keeps its provenance.
 */
export interface SourceAdapterInfo {
  id: string;
  name: string;
  homepage: string;
  license: string;
  attribution: string;
  /** Disciplines for which the source is appropriate. */
  scope: string[];
  usageNotes: string;
}

export const SOURCE_ADAPTERS: SourceAdapterInfo[] = [
  {
    id: "wikidata",
    name: "Wikidata",
    homepage: "https://www.wikidata.org/",
    license: "CC0 1.0",
    attribution: "Wikidata",
    scope: ["identificativi", "coordinate", "date", "relazioni"],
    usageNotes: "Identificativi, coordinate (P625) e metadati iniziali. Rispettare le linee guida sull'uso dell'API e un User-Agent descrittivo.",
  },
  {
    id: "owid",
    name: "Our World in Data",
    homepage: "https://ourworldindata.org/",
    license: "CC BY 4.0",
    attribution: "Our World in Data",
    scope: ["demografia", "salute", "economia", "ambiente"],
    usageNotes: "Serie statistiche (es. popolazione storica) usate come denominatori; citare la fonte originale indicata da OWID.",
  },
  {
    id: "usgs",
    name: "USGS Earthquake Hazards Program",
    homepage: "https://earthquake.usgs.gov/",
    license: "Pubblico dominio (U.S. Government)",
    attribution: "U.S. Geological Survey",
    scope: ["terremoti"],
    usageNotes: "Catalogo FDSN: magnitudo, ipocentro e tempo origine di eventi sismici.",
  },
  {
    id: "who-gho",
    name: "WHO Global Health Observatory",
    homepage: "https://www.who.int/data/gho",
    license: "CC BY-NC-SA 3.0 IGO (verificare per ciascun dataset)",
    attribution: "World Health Organization",
    scope: ["salute pubblica", "epidemiologia"],
    usageNotes: "API OData per indicatori sanitari; uso non commerciale salvo diversa indicazione.",
  },
  {
    id: "em-dat",
    name: "EM-DAT (CRED / UCLouvain)",
    homepage: "https://www.emdat.be/",
    license: "Licenza d'uso EM-DAT (registrazione, uso non commerciale, nessuna ridistribuzione dei dati grezzi)",
    attribution: "EM-DAT, CRED / UCLouvain",
    scope: ["disastri"],
    usageNotes: "Nessun adattatore automatico: la licenza non consente la ridistribuzione dei dati grezzi. Usare solo per verifiche manuali citando la fonte.",
  },
];
