import type { Metadata } from "next";
import Link from "next/link";
import { getRepository } from "@/server/repository";
import { getLocale } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/domain/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).method.title };
}

type Section = { id: string; title: string; paragraphs: string[]; list?: string[] };

const CONTENT: Record<Locale, Section[]> = {
  it: [
    {
      id: "principi",
      title: "Principi",
      paragraphs: [
        "TRANS-MAP non assegna un punteggio universale di importanza agli eventi. La rilevanza è esplorabile per dimensioni separate — geografia, tempo, metriche verificabili, conseguenze, relazioni — senza ridurle a un numero.",
      ],
      list: [
        "Geografia della conoscenza: dove sono avvenuti gli eventi e quali territori hanno coinvolto.",
        "Comparazione contestuale: solo grandezze verificabili e unità coerenti.",
        "Decentramento culturale: il dataset iniziale non è dominato dall'Europa né dalle catastrofi.",
        "Multidisciplinarità: dodici discipline, tre famiglie, temi trasversali.",
        "Proporzioni e ordini di grandezza: valori assoluti, rapporti con intervalli, quote sulla popolazione.",
        "Rigorosità epistemica: fatti, stime, controversie, interpretazioni e lacune sono distinti.",
      ],
    },
    {
      id: "dati",
      title: "Modello dei dati",
      paragraphs: [
        "Ogni evento ha date storiche (senza anno zero, con precisione e incertezza esplicite), luoghi multipli con coordinate e fonte, eventuali aree di impatto, metriche strutturate, cause, conseguenze dirette/indirette/di lungo periodo, interpretazioni, controversie, lacune documentarie, fonti e stato editoriale.",
        "Le metriche sono record strutturati: tipo (con definizione e unità controllate), valore e/o intervallo, tipo di stima (ufficiale, conteggio documentato, stima accademica, modello, rapporto preliminare, ONG, divulgativa), autore della cifra, ambito, periodo, denominatori di popolazione, fonti e livello di incertezza. Un dato sconosciuto è assente: lo zero è ammesso solo se documentato.",
        "Gli eventi senza localizzazione definibile (ad esempio la pandemia influenzale del 1918) restano accessibili nell'elenco e nella linea del tempo, senza coordinate arbitrarie. I luoghi «regionali» sono disegnati con simboli vuoti.",
      ],
    },
    {
      id: "confronto",
      title: "Regole del confronto",
      paragraphs: ["Il motore comparativo applica regole deterministiche, verificate da test automatici:"],
      list: [
        "Si dividono solo metriche dello stesso tipo, quindi con la stessa definizione e unità (ad esempio morti dirette con morti dirette).",
        "Cifre di definizioni diverse (morti dirette e stime complessive) compaiono in una sezione separata, sempre con un avviso.",
        "Ogni rapporto è accompagnato dall'intervallo calcolato su tutte le stime registrate.",
        "Le proporzioni sulla popolazione si confrontano solo se il denominatore è dello stesso tipo (popolazione nazionale con popolazione nazionale).",
        "Percentuali, magnitudo e temperature non vengono divise.",
        "Le dimensioni qualitative sono mostrate separatamente e non diventano punteggi.",
      ],
    },
    {
      id: "scoperta",
      title: "Oltre l'orizzonte",
      paragraphs: [
        "L'utente sceglie un orizzonte di partenza (una sotto-regione M49 o un raggruppamento dichiarato); non c'è geolocalizzazione né attribuzione automatica di una cultura.",
        "I suggerimenti derivano da relazioni esplicite (documentate nelle fonti oppure analogie editoriali dichiarate come tali), discipline e temi comuni, differenze di ordine di grandezza tra metriche compatibili e distanza geografica. Il sistema non afferma mai che un evento sia sconosciuto a una popolazione: non misura la notorietà.",
      ],
    },
    {
      id: "fonti",
      title: "Fonti e verifica",
      paragraphs: [
        "TRANS-MAP è source-first: ogni cifra, coordinata e relazione documentata rimanda a fonti identificabili. Le coordinate provengono dalla proprietà P625 di Wikidata; le popolazioni da Our World in Data; le cifre da pubblicazioni scientifiche, istituzioni (UNAIDS, UNESCO) e, come fonte introduttiva, da Wikipedia, attribuendo ogni valore all'autore citato.",
        "Il dataset iniziale (45 eventi) è stato compilato con l'assistenza di un modello linguistico e verificato confrontando ogni cifra con le fonti citate, consultate il 4 novembre 2026. Un modello linguistico non è considerato fonte dei fatti: è richiesta una revisione editoriale umana prima di un uso pubblico. Gli stati editoriali sono: bozza, da rivedere, verificato, contestato.",
      ],
    },
    {
      id: "mappa",
      title: "Cartografia e attribuzioni",
      paragraphs: [],
      list: [
        "Confini: Natural Earth 1:50m (pubblico dominio), tramite il pacchetto world-atlas (ISC). I confini sono moderni e servono solo come riferimento geografico.",
        "Rendering: MapLibre GL JS (licenza BSD-3-Clause).",
        "Caratteri della mappa: Noto Sans (SIL Open Font License), glifi ottenuti da OpenFreeMap.",
        "Base cartografica dettagliata opzionale: OpenFreeMap, dati © OpenStreetMap contributors (ODbL) e OpenMapTiles.",
        "Popolazioni: Our World in Data (CC BY 4.0).",
      ],
    },
    {
      id: "limiti",
      title: "Limiti noti",
      paragraphs: [],
      list: [
        "Il dataset è piccolo e selettivo: le distribuzioni descrivono il database, non la storia.",
        "Le aree di impatto sono rappresentate per Stati attuali (approssimazione anacronistica per eventi antichi) o come «globali».",
        "I testi degli eventi sono in italiano; l'interfaccia è disponibile in italiano e inglese.",
        "Gli adattatori per fonti esterne (Wikidata, OWID, USGS, OMS) sono predisposti per l'importazione assistita di bozze, che richiedono revisione.",
      ],
    },
  ],
  en: [
    {
      id: "principles",
      title: "Principles",
      paragraphs: [
        "TRANS-MAP never assigns a universal importance score. Relevance can be explored along separate dimensions — geography, time, verifiable metrics, consequences, relations — without collapsing them into a number.",
      ],
      list: [
        "Geography of knowledge, contextual comparison, cultural decentring, multidisciplinarity, proportions and orders of magnitude, epistemic rigour.",
      ],
    },
    {
      id: "data",
      title: "Data model",
      paragraphs: [
        "Events have historical dates (no year zero, explicit precision and uncertainty), multiple sourced locations, optional impact areas, structured metrics, causes, consequences, interpretations, controversies, documentation gaps, sources and an editorial status. Unknown values are absent, never zero.",
      ],
    },
    {
      id: "comparison",
      title: "Comparison rules",
      paragraphs: [
        "Only metrics of the same type (same definition and unit) are divided. Figures with different definitions are shown in a separate, flagged section. Each ratio comes with the range across all estimates. Per-capita values are compared only for the same kind of denominator. Qualitative dimensions are never turned into scores.",
      ],
    },
    {
      id: "discovery",
      title: "Beyond your horizon",
      paragraphs: [
        "Users choose a point of departure; there is no geolocation. Suggestions come from explicit relations, shared disciplines and themes, differences in order of magnitude and geographic distance. The system never claims that an event is unknown to anyone.",
      ],
    },
    {
      id: "sources",
      title: "Sources and verification",
      paragraphs: [
        "Every figure, coordinate and documented relation points to identifiable sources (Wikidata P625 for coordinates, Our World in Data for populations, scholarly and institutional sources, Wikipedia as an introductory source with attributed figures). The initial dataset was compiled with the assistance of a language model and checked against the cited sources on 4 November 2026; human editorial review is required before public use.",
      ],
    },
    {
      id: "map",
      title: "Cartography and attributions",
      paragraphs: [
        "Natural Earth (public domain) via world-atlas; MapLibre GL JS (BSD-3-Clause); Noto Sans glyphs (OFL) from OpenFreeMap; optional OpenFreeMap basemap with OpenStreetMap data (ODbL); Our World in Data (CC BY 4.0).",
      ],
    },
  ],
};

export default async function MethodPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const sources = getRepository()
    .getDataset()
    .sources.slice()
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <main className="min-h-dvh bg-page">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/" className="text-sm text-accent-ink hover:underline">
          ← {t.common.back}
        </Link>
        <h1 className="serif mt-4 text-3xl font-semibold text-ink">{t.method.title}</h1>
        <p className="serif mt-2 text-lg italic text-ink-2">
          {locale === "it"
            ? "«Quanto della nostra visione del mondo dipende dal mondo stesso, e quanto dai confini della nostra conoscenza?»"
            : "“How much of our view of the world depends on the world itself, and how much on the limits of our knowledge?”"}
        </p>
        <nav aria-label="indice" className="mt-6 flex flex-wrap gap-2 text-sm">
          {CONTENT[locale].map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-line px-3 py-1 text-ink-2 hover:bg-surface-2">
              {s.title}
            </a>
          ))}
          <a href="#bibliografia" className="rounded-full border border-line px-3 py-1 text-ink-2 hover:bg-surface-2">
            {locale === "it" ? "Bibliografia" : "Bibliography"}
          </a>
        </nav>
        {CONTENT[locale].map((s) => (
          <section key={s.id} id={s.id} className="mt-8">
            <h2 className="text-xl font-semibold text-ink">{s.title}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed text-ink-2">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
                {s.list.map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section id="bibliografia" className="mt-10">
          <h2 className="text-xl font-semibold text-ink">{locale === "it" ? "Bibliografia completa" : "Full bibliography"}</h2>
          <ol className="mt-3 space-y-1.5 text-sm text-ink-2">
            {sources.map((s) => (
              <li key={s.id}>
                {s.authors?.length ? `${s.authors.join(", ")}. ` : ""}
                <a href={s.doi ? `https://doi.org/${s.doi}` : s.url} target="_blank" rel="noopener noreferrer" className="text-accent-ink hover:underline">
                  {s.title}
                </a>
                {s.publisher ? `. ${s.publisher}` : ""}
                {s.year ? ` (${s.year})` : ""}
                <span className="text-muted">
                  {" "}
                  · {t.event.sourceType[s.type]} · {t.event.reliability[s.reliability]}
                  {s.license ? ` · ${s.license}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
