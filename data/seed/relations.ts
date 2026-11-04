/**
 * Explicit semantic relations between events.
 *
 * basis = "documented": the link is attested in the cited sources.
 * basis = "editorial": a curated thematic analogy or contextual link, shown in
 * the UI as an interpretation, never as a historical fact.
 * Relations of type analogy / scale-contrast / same-place are symmetric.
 */
import type { z } from "zod";
import type { RelationSchema } from "@/domain/schemas";

type RelationInput = z.input<typeof RelationSchema>;

const r = (
  from: string,
  to: string,
  type: RelationInput["type"],
  basis: RelationInput["basis"],
  description: string,
  sourceIds: string[] = [],
): RelationInput => ({ id: `${from}--${type}--${to}`, from, to, type, basis, description, sourceIds });

export const relations: RelationInput[] = [
  // Documented links
  r("sputnik-1", "arpanet-first-message", "precondition", "documented",
    "La crisi dello Sputnik portò alla creazione dell'ARPA (febbraio 1958), l'agenzia che finanziò ARPANET.", ["wp-sputnik", "wp-arpanet"]),
  r("brahmasphutasiddhanta-zero", "al-jabr", "influence", "documented",
    "Le opere di Brahmagupta furono tradotte in arabo alla corte abbaside nell'VIII secolo, nel contesto in cui operò al-Khwārizmī.", ["wp-brahmagupta"]),
  r("jikji", "gutenberg-bible", "scale-contrast", "documented",
    "Il Jikji (1377) precede di 78 anni la Bibbia di Gutenberg: due tradizioni di stampa a caratteri metallici mobili.", ["wp-jikji"]),
  r("atlantic-slave-trade", "haitian-revolution", "causal", "documented",
    "Nel 1789 Saint-Domingue contava circa 452.000 schiavi, deportati o discendenti di deportati dalla tratta: la rivolta nacque in questa società schiavista.", ["wp-haitian-revolution"]),
  r("bhola-cyclone-1970", "partition-of-india", "context", "documented",
    "Il ciclone colpì il Pakistan orientale, nato dalla Partizione del 1947; la crisi politica successiva portò all'indipendenza del Bangladesh.", ["wp-bhola", "wp-partition"]),

  // Editorial (curated) links
  r("vajont-1963", "banqiao-1975", "scale-contrast", "editorial",
    "Due disastri legati a dighe a dodici anni di distanza, con ordini di grandezza molto diversi di vittime e popolazione coinvolta."),
  r("vajont-1963", "aral-sea-desiccation", "analogy", "editorial",
    "Grandi opere idrauliche e conseguenze impreviste sul territorio."),
  r("banqiao-1975", "bhola-cyclone-1970", "analogy", "editorial",
    "Inondazioni catastrofiche nell'Asia degli anni '70 con bilanci stimati in centinaia di migliaia di vittime e forte incertezza."),
  r("bhopal-1984", "chernobyl-1986", "analogy", "editorial",
    "Incidenti tecnologici degli anni '80: morti immediate documentate e stime controverse degli effetti a lungo termine."),
  r("indian-ocean-tsunami-2004", "bhola-cyclone-1970", "analogy", "editorial",
    "Onde e mareggiate su coste densamente abitate dell'Oceano Indiano."),
  r("tambora-1815", "indian-ocean-tsunami-2004", "same-place", "editorial",
    "Due catastrofi geofisiche nell'arcipelago indonesiano, a quasi due secoli di distanza."),
  r("tambora-1815", "great-dying-americas", "analogy", "editorial",
    "Perturbazioni del clima globale con cause opposte: un'eruzione vulcanica e un collasso demografico seguito da riforestazione."),
  r("tambora-1815", "great-chinese-famine", "analogy", "editorial",
    "Carestie con cause diverse: un'anomalia climatica di origine vulcanica e politiche economiche e di ammasso."),
  r("black-death", "influenza-1918", "analogy", "editorial", "Pandemie con mortalità di decine di milioni di persone."),
  r("influenza-1918", "hiv-aids-pandemic", "analogy", "editorial", "Pandemie del XX secolo con dinamiche temporali molto diverse: due anni contro un secolo."),
  r("black-death", "great-dying-americas", "analogy", "editorial", "Collassi demografici causati da epidemie, con quote di popolazione morta molto elevate."),
  r("black-death", "muqaddimah", "context", "editorial",
    "La Muqaddima fu scritta una generazione dopo la peste nera, che colpì anche il Nord Africa."),
  r("smallpox-eradication", "hiv-aids-pandemic", "analogy", "editorial", "Malattie infettive globali e strategie di sanità pubblica a confronto."),
  r("smallpox-eradication", "oral-rehydration-therapy", "analogy", "editorial", "Interventi di sanità pubblica su scala mondiale coordinati dall'OMS tra gli anni '60 e '80."),
  r("artemisinin-discovery", "oral-rehydration-therapy", "analogy", "editorial",
    "Innovazioni mediche nate in Asia orientale e meridionale contro malattie infettive diffuse nei Paesi a basso reddito."),
  r("papermaking-cai-lun", "jikji", "precondition", "editorial", "La carta come supporto della stampa a caratteri mobili."),
  r("papermaking-cai-lun", "gutenberg-bible", "precondition", "editorial", "La carta come supporto della stampa a caratteri mobili."),
  r("papermaking-cai-lun", "tale-of-genji", "precondition", "editorial", "La carta come supporto della produzione letteraria manoscritta."),
  r("blombos-drawing", "uruk-cuneiform", "context", "editorial", "Dalle prime tracce grafiche alla scrittura: decine di millenni di storia dei segni."),
  r("gobekli-tepe", "caral", "analogy", "editorial", "Architetture monumentali precoci in continenti diversi."),
  r("caral", "uruk-cuneiform", "analogy", "editorial", "Società urbane antiche: Mesopotamia e Ande a confronto."),
  r("great-zimbabwe", "cahokia", "analogy", "editorial", "Grandi centri urbani coevi (XI–XV secolo) in Africa e Nord America."),
  r("great-zimbabwe", "mansa-musa-hajj", "analogy", "editorial", "L'oro africano nelle reti commerciali medievali."),
  r("potosi-silver", "mansa-musa-hajj", "analogy", "editorial", "Metalli preziosi e conseguenze monetarie lontano dai luoghi di estrazione."),
  r("great-dying-americas", "potosi-silver", "context", "editorial", "Il lavoro forzato indigeno a Potosí nel quadro del collasso demografico e del dominio coloniale."),
  r("great-dying-americas", "atlantic-slave-trade", "context", "editorial", "Due catastrofi demografiche intrecciate nella storia coloniale delle Americhe."),
  r("partition-of-india", "atlantic-slave-trade", "analogy", "editorial", "Migrazioni forzate di massa, con scale temporali e cause molto diverse."),
  r("british-industrial-revolution", "meiji-restoration", "analogy", "editorial", "Due percorsi di industrializzazione, uno pionieristico e uno guidato dallo Stato."),
  r("british-industrial-revolution", "haber-bosch", "context", "editorial", "Chimica industriale e agricoltura nell'era dell'industrializzazione."),
  r("haber-bosch", "great-chinese-famine", "scale-contrast", "editorial", "Produzione di cibo e fame nel XX secolo: tecnologia e politiche."),
  r("arpanet-first-message", "m-pesa", "context", "editorial", "Reti digitali: dalla commutazione di pacchetto ai pagamenti mobili."),
  r("ozone-hole-montreal", "aral-sea-desiccation", "analogy", "editorial",
    "Trasformazioni ambientali di origine umana con esiti diversi: un trattato globale da un lato, un recupero solo parziale dall'altro."),
  r("ozone-hole-montreal", "great-dying-americas", "analogy", "editorial", "Attività umane e composizione dell'atmosfera."),
  r("hijra", "ashoka-edicts", "analogy", "editorial", "Trasformazioni religiose intrecciate con nuove istituzioni politiche."),
  r("mansa-musa-hajj", "hijra", "context", "editorial", "Il pellegrinaggio alla Mecca nella tradizione islamica."),
  r("jikji", "ashoka-edicts", "analogy", "editorial", "Testi buddhisti e tecnologie di diffusione della scrittura."),
  r("nz-womens-suffrage", "aotearoa-settlement", "same-place", "editorial", "Due momenti della storia di Aotearoa/Nuova Zelanda."),
  r("nz-womens-suffrage", "haitian-revolution", "analogy", "editorial", "Estensione dei diritti politici e civili a gruppi esclusi."),
  r("al-jabr", "muqaddimah", "analogy", "editorial", "Produzione scientifica e filosofica nel mondo islamico medievale."),
  r("chernobyl-1986", "ozone-hole-montreal", "context", "editorial", "Anni '80: rischi tecnologici e ambientali diventano questioni transnazionali."),
];
