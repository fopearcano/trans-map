/** Science, mathematics, technology, philosophy, arts and literature. */
import { d, VERIFIED_AT, type SeedEvent } from "../helpers";

export const knowledgeEvents: SeedEvent[] = [
  {
    id: "brahmasphutasiddhanta-zero",
    title: "Lo zero come numero: il Brāhmasphuṭasiddhānta",
    summary:
      "Nel 628 il matematico e astronomo Brahmagupta compose a Bhillamala (oggi Bhinmal, Rajasthan) il Brāhmasphuṭasiddhānta, il primo testo noto che fornisce regole aritmetiche per lo zero e per i numeri negativi.",
    detailedDescription:
      "Il trattato tratta lo zero come numero a pieno titolo e stabilisce regole per operare con zero e numeri negativi. Sulla divisione Brahmagupta afferma che 0/0 = 0 e non si pronuncia su a/0: una trattazione diversa da quella moderna, in cui la divisione per zero non è definita.",
    context:
      "Brahmagupta compose l'opera a 30 anni. I suoi testi furono tradotti in arabo da Muḥammad ibn Ibrāhīm al-Fazārī alla corte del califfo al-Manṣūr (754–775), con i titoli Sindhind e Arakhand.",
    categories: ["science-mathematics"],
    tags: ["mathematics", "translation-transmission"],
    startDate: d(628),
    datePrecision: "year",
    locations: [{ placeId: "bhinmal", role: "Bhillamala, città di Brahmagupta" }],
    causes: ["Tradizione astronomica e matematica dell'India del primo millennio"],
    consequences: [
      { kind: "indirect", text: "Traduzione araba alla corte abbaside nella seconda metà dell'VIII secolo.", sourceIds: ["wp-brahmagupta"] },
    ],
    interpretations: [
      { text: "Il testo è considerato la prima trattazione nota dello zero come numero con regole di calcolo proprie; la sua regola 0/0 = 0 differisce dalla matematica moderna.", sourceIds: ["wp-brahmagupta"] },
    ],
    sources: ["wp-brahmagupta", "wikidata-q797437"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q1290001",
  },
  {
    id: "al-jabr",
    title: "Al-Khwārizmī e la nascita dell'algebra",
    summary:
      "Intorno all'820, a Baghdad, Muḥammad ibn Mūsā al-Khwārizmī scrisse il trattato da cui deriva la parola «algebra». Tradotto in latino da Roberto di Chester nel 1145, ebbe grande influenza sulla matematica successiva.",
    detailedDescription:
      "Il «Libro compendioso sul calcolo per completamento e bilanciamento» sistematizza la risoluzione delle equazioni di primo e secondo grado. Il termine «algebra» deriva dal nome di una delle operazioni fondamentali descritte nel libro, al-jabr («completamento»).",
    context:
      "Baghdad era la capitale del califfato abbaside e un centro di traduzione e studio di testi scientifici di diverse tradizioni.",
    categories: ["science-mathematics"],
    tags: ["mathematics", "translation-transmission"],
    startDate: d(820),
    datePrecision: "decade",
    dateCirca: true,
    locations: [{ placeId: "baghdad", role: "Baghdad abbaside" }],
    causes: ["Esigenze di calcolo pratico (eredità, commercio, misurazioni) e sintesi di tradizioni matematiche diverse"],
    consequences: [
      { kind: "long-term", text: "Traduzione latina di Roberto di Chester (1145) e diffusione del termine «algebra».", sourceIds: ["wp-al-jabr"] },
    ],
    sources: ["wp-al-jabr", "wikidata-q1530"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q135901116",
  },
  {
    id: "muqaddimah",
    title: "La Muqaddima di Ibn Khaldūn",
    summary:
      "Nel 1377, nella fortezza di Qal'at Ibn Salama (nell'attuale Algeria), Ibn Khaldūn completò la prima stesura della Muqaddima, introduzione alla sua storia universale: un'analisi della coesione sociale, dell'ascesa e del declino delle dinastie, dell'economia e della fiscalità.",
    detailedDescription:
      "Ibn Khaldūn sostiene che le dinastie nascano ai margini dei grandi imperi grazie alla ʿaṣabiyya — solidarietà di gruppo o coesione sociale — e decadano quando i lussi della vita sedentaria la indeboliscono, lasciando spazio a una nuova ʿaṣabiyya. Osserva inoltre che aliquote fiscali troppo elevate finiscono per ridurre le entrate, perché scoraggiano i produttori.",
    context:
      "Ibn Khaldūn era uno storico e uomo politico del Maghreb del XIV secolo. L'opera nacque come introduzione al Kitāb al-ʿIbar, una storia universale.",
    categories: ["philosophy-thought", "society-demography", "economy-trade"],
    tags: ["historiography"],
    startDate: d(1377),
    datePrecision: "year",
    locations: [{ placeId: "frenda", role: "Qal'at Ibn Salama, luogo di stesura" }],
    interpretations: [
      { text: "Alcuni studiosi moderni la considerano la prima opera di scienze sociali e un precursore della sociologia e della filosofia della storia.", heldBy: "Studiosi moderni citati nella voce", sourceIds: ["wp-muqaddimah"] },
      { text: "L'accostamento tra le sue osservazioni fiscali e la moderna «curva di Laffer» è una lettura retrospettiva.", sourceIds: ["wp-muqaddimah"] },
    ],
    causes: ["Esperienza diretta dell'instabilità politica degli Stati del Maghreb"],
    consequences: [
      { kind: "long-term", text: "Riferimento per la storiografia e le scienze sociali, con letture che ne fanno un precursore della sociologia.", sourceIds: ["wp-muqaddimah"] },
    ],
    sources: ["wp-muqaddimah", "wikidata-q2215495"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q1259616",
  },
  {
    id: "tale-of-genji",
    title: "Il Genji monogatari",
    summary:
      "All'inizio dell'XI secolo la dama di corte Murasaki Shikibu scrisse il Genji monogatari, opera in 54 capitoli spesso definita «il primo romanzo» — una definizione discussa. Il suo diario vi fa riferimento in una voce datata al 1008.",
    detailedDescription:
      "Ambientato nella corte imperiale del periodo Heian, il racconto segue la vita del principe Hikaru Genji e delle generazioni successive. Si ritiene che l'opera fosse completa nella forma attuale entro il 1021.",
    context:
      "Murasaki Shikibu, poetessa e dama di compagnia, visse all'apice del potere del clan Fujiwara.",
    categories: ["arts-culture"],
    tags: ["literature"],
    startDate: d(1008),
    endDate: d(1021),
    datePrecision: "year",
    dateCirca: true,
    dateNote: "1008: menzione nel diario dell'autrice; 1021: termine entro cui l'opera è ritenuta completa.",
    locations: [{ placeId: "kyoto", role: "Corte di Heian-kyō" }],
    interpretations: [
      { text: "Il primato di «primo romanzo» è dibattuto: sono stati proposti testi come il sanscrito Kādambarī, i romanzi greci e latini o l'Ochikubo monogatari.", sourceIds: ["wp-genji"] },
    ],
    consequences: [
      { kind: "long-term", text: "La prima traduzione inglese completa è di Edward Seidensticker (1976); quella di Arthur Waley (1925–1933) ne omette un capitolo.", sourceIds: ["wp-genji"] },
    ],
    sources: ["wp-genji", "wikidata-q34600"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q8269",
  },
  {
    id: "papermaking-cai-lun",
    title: "Cai Lun e la fabbricazione della carta",
    summary:
      "Nel 105 d.C., alla corte Han di Luoyang, il funzionario Cai Lun presentò un nuovo procedimento per fabbricare la carta da corteccia, canapa, stracci e reti da pesca. Forme di carta esistevano però già nel III secolo a.C.: più che un'invenzione, un perfezionamento decisivo.",
    detailedDescription:
      "Secondo lo Hou Hanshu, nel primo anno dell'era Yuanxing (105) Cai Lun dichiarò pubblicamente di aver ideato una nuova composizione per la carta. A lui si attribuisce il primo uso noto della corteccia d'albero (probabilmente gelso) e della canapa come materie prime.",
    context: "Cai Lun era giunto alla corte imperiale di Luoyang entro il 75 d.C.",
    categories: ["technology-inventions", "arts-culture"],
    tags: ["writing", "printing"],
    startDate: d(105),
    datePrecision: "year",
    locations: [{ placeId: "luoyang", role: "Corte degli Han orientali" }],
    interpretations: [
      { text: "Una tradizione attribuisce la trasmissione della tecnica al mondo arabo a prigionieri cinesi catturati nella battaglia del Talas (751); la ricostruzione è oggetto di discussione.", sourceIds: ["wp-cai-lun"] },
      { text: "L'attribuzione dell'«invenzione» a una singola persona è una semplificazione: i reperti archeologici documentano forme di carta più antiche.", sourceIds: ["wp-cai-lun"] },
    ],
    consequences: [
      { kind: "long-term", text: "La carta divenne il supporto principale della scrittura e, secoli dopo, della stampa.", sourceIds: ["wp-cai-lun"] },
    ],
    sources: ["wp-cai-lun", "wikidata-q187136"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q229235",
  },
  {
    id: "jikji",
    title: "Jikji, il più antico libro esistente a caratteri mobili metallici",
    summary:
      "Nel luglio 1377, nel tempio Heungdeok di Cheongju (Corea), fu stampato con caratteri mobili in metallo il Jikji, antologia di insegnamenti buddhisti: è il più antico libro esistente stampato con questa tecnica, 78 anni prima della Bibbia di Gutenberg.",
    detailedDescription:
      "Il colophon indica la stampa «nel terzo anno del re U (luglio 1377), con caratteri metallici, al tempio Heungdeok di Cheongju». Sopravvive solo il secondo volume, conservato nella divisione Manoscritti orientali della Bibliothèque nationale de France.",
    context:
      "Il volume fu acquistato a Seul dal diplomatico Victor Collin de Plancy, passò poi a Henri Véver (1911) e fu donato alla biblioteca francese. In Cina la stampa a caratteri mobili era già stata realizzata nell'XI secolo da Bi Sheng.",
    categories: ["technology-inventions", "religions-cultural-change", "arts-culture"],
    tags: ["printing", "buddhism"],
    startDate: d(1377, 7),
    datePrecision: "month",
    locations: [{ placeId: "heungdeoksa", role: "Tempio Heungdeok, luogo di stampa" }],
    consequences: [
      { kind: "long-term", text: "Iscritto nel Registro della Memoria del Mondo dell'UNESCO il 4 settembre 2001.", sourceIds: ["wp-jikji"] },
    ],
    sources: ["wp-jikji", "wikidata-q12485627", "wikidata-q200662"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q494611",
  },
  {
    id: "gutenberg-bible",
    title: "La Bibbia di Gutenberg",
    summary:
      "A Magonza, nei primi anni 1450, Johannes Gutenberg stampò la Bibbia a 42 linee, il primo grande libro prodotto in Europa con caratteri mobili metallici fusi in serie. Le prime copie complete apparvero nel 1454 o 1455.",
    detailedDescription:
      "La preparazione iniziò probabilmente poco dopo il 1450. Ne furono stampate tra circa 160 e 185 copie; una lettera del marzo 1455 parla di 158 o 180. Ne sopravvivono 49 almeno in parte consistente.",
    context:
      "La più antica stampa datata di Gutenberg è un'indulgenza a 31 linee, esistente entro il 22 ottobre 1454.",
    categories: ["technology-inventions", "religions-cultural-change", "arts-culture"],
    tags: ["printing"],
    startDate: d(1450),
    endDate: d(1455),
    datePrecision: "year",
    dateCirca: true,
    locations: [{ placeId: "mainz", role: "Bottega di Gutenberg" }],
    consequences: [
      { kind: "long-term", text: "Avvio della stampa a caratteri mobili su scala industriale in Europa.", sourceIds: ["wp-gutenberg-bible"] },
    ],
    sources: ["wp-gutenberg-bible", "wikidata-q1720"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q158075",
  },
  {
    id: "haber-bosch",
    title: "Sintesi dell'ammoniaca (processo Haber-Bosch)",
    summary:
      "Nel 1909 Fritz Haber dimostrò la sintesi dell'ammoniaca dall'azoto dell'aria; nel 1913 la BASF avviò a Oppau la produzione industriale. Secondo Erisman et al. (2008), nel 2008 i fertilizzanti azotati sostenevano circa il 48% della popolazione mondiale.",
    detailedDescription:
      "Nell'estate del 1909 Haber e i suoi collaboratori produssero ammoniaca dall'aria «goccia a goccia». Nel 2018 il processo produceva circa 230 milioni di tonnellate di ammoniaca, consumando il 3–5% del gas naturale mondiale e l'1–2% dell'energia globale. Quasi metà dell'azoto presente nei tessuti umani proviene da questo processo.",
    context:
      "Durante la prima guerra mondiale la Germania usò il processo per produrre l'acido nitrico necessario agli esplosivi, non potendo più importare nitrati a causa del blocco alleato.",
    categories: ["science-mathematics", "technology-inventions", "economy-trade"],
    tags: ["chemistry", "agriculture", "industrialization"],
    startDate: d(1909),
    endDate: d(1913),
    datePrecision: "year",
    locations: [
      { placeId: "karlsruhe", role: "Dimostrazione di laboratorio (1909)", note: "Haber lavorava alla Technische Hochschule di Karlsruhe." },
      { placeId: "oppau", role: "Primo impianto industriale BASF (1913)" },
    ],
    geographicFootprints: [
      { id: "haber-global", kind: "global", label: "Diffusione mondiale dei fertilizzanti azotati", approximation: "Effetto globale sull'agricoltura: nessun poligono rappresentativo.", sourceIds: ["erisman-2008"] },
    ],
    quantitativeMetrics: [
      {
        id: "haber-population-2008",
        metricType: "population_supported_share",
        value: 48,
        unit: "percent",
        estimateKind: "model-estimate",
        attributedTo: "Erisman et al. (2008)",
        measurementPeriod: "2008",
        sourceIds: ["erisman-2008", "owid-fertilizer"],
        uncertainty: "high",
        isReference: true,
      },
      {
        id: "haber-population-2000",
        metricType: "population_supported_share",
        value: 44,
        unit: "percent",
        estimateKind: "model-estimate",
        attributedTo: "Erisman et al. (2008)",
        measurementPeriod: "2000",
        sourceIds: ["owid-fertilizer"],
        uncertainty: "high",
      },
      {
        id: "haber-population-consensus",
        metricType: "population_supported_share",
        minEstimate: 40,
        maxEstimate: 50,
        unit: "percent",
        estimateKind: "scholarly-estimate",
        attributedTo: "Convergenza delle stime secondo Our World in Data",
        sourceIds: ["owid-fertilizer"],
        uncertainty: "high",
      },
    ],
    causes: ["Ricerca sulla fissazione dell'azoto atmosferico", "Domanda crescente di fertilizzanti e, in guerra, di esplosivi"],
    consequences: [
      { kind: "direct", text: "Produzione industriale di ammoniaca dal 1913.", sourceIds: ["wp-haber"] },
      { kind: "long-term", text: "Secondo le stime, circa metà della popolazione mondiale attuale dipende per l'alimentazione dai fertilizzanti azotati di sintesi.", sourceIds: ["owid-fertilizer"] },
    ],
    interpretations: [
      { text: "Le stime della popolazione «sostenuta» dai fertilizzanti sono difficili da derivare con precisione; convergono su un 40–50%.", sourceIds: ["owid-fertilizer"] },
    ],
    sources: ["wp-haber", "erisman-2008", "owid-fertilizer", "wikidata-q309988", "wikidata-q212334"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q213669",
  },
  {
    id: "sputnik-1",
    title: "Lancio dello Sputnik 1",
    summary:
      "Il 4 ottobre 1957 l'Unione Sovietica lanciò da Baikonur lo Sputnik 1 (83,6 kg), primo satellite artificiale. Negli Stati Uniti la «crisi dello Sputnik» portò alla creazione dell'ARPA (febbraio 1958) e della NASA.",
    detailedDescription:
      "Il satellite trasmise segnali radio per tre settimane, fino all'esaurimento delle batterie, e restò in orbita tre mesi, rientrando il 4 gennaio 1958 dopo 1.440 orbite. Il lancio avvenne durante l'Anno geofisico internazionale.",
    context:
      "Nel 1958 il Congresso statunitense approvò anche il National Defense Education Act, con prestiti agevolati per gli studenti di matematica e scienze.",
    categories: ["technology-inventions", "science-mathematics", "history-geopolitics"],
    tags: ["space", "cold-war"],
    startDate: d(1957, 10, 4),
    datePrecision: "day",
    locations: [{ placeId: "baikonur-site1", role: "Rampa di lancio 1/5" }],
    consequences: [
      { kind: "direct", text: "Avvio della corsa allo spazio.", sourceIds: ["wp-sputnik"] },
      { kind: "indirect", text: "Creazione dell'Advanced Research Projects Agency (ARPA) nel febbraio 1958 e della NASA.", sourceIds: ["wp-sputnik"] },
    ],
    sources: ["wp-sputnik", "wikidata-q2580456"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q80811",
  },
  {
    id: "arpanet-first-message",
    title: "Il primo collegamento ARPANET",
    summary:
      "Alle 22:30 del 29 ottobre 1969 un computer dell'UCLA trasmise i primi caratteri («lo») a un computer dello Stanford Research Institute: il sistema ricevente si bloccò dopo due lettere di «login». Entro il 5 dicembre 1969 la rete contava quattro nodi.",
    detailedDescription:
      "Fu il primo collegamento host-to-host della rete finanziata dall'agenzia statunitense ARPA. Il 1° gennaio 1983, il cosiddetto «flag day», ARPANET adottò i protocolli TCP/IP, alla base dell'attuale Internet. La rete fu dismessa nel 1990.",
    context: "L'ARPA era stata creata nel 1958, in risposta allo Sputnik.",
    categories: ["technology-inventions", "science-mathematics"],
    tags: ["computing"],
    startDate: d(1969, 10, 29),
    datePrecision: "day",
    locations: [
      { placeId: "ucla", role: "Nodo mittente (UCLA)" },
      { placeId: "menlo-park", role: "Nodo ricevente (Stanford Research Institute)" },
    ],
    consequences: [
      { kind: "long-term", text: "Adozione di TCP/IP (1983), base tecnica di Internet.", sourceIds: ["wp-arpanet"] },
    ],
    sources: ["wp-arpanet", "wp-sputnik", "wikidata-q174710", "wikidata-q74195"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q177524",
  },
  {
    id: "m-pesa",
    title: "M-Pesa e il denaro mobile in Kenya",
    summary:
      "Lanciato commercialmente nel marzo 2007 da Safaricom e Vodafone, M-Pesa permette di conservare e trasferire denaro tramite telefono cellulare. Secondo Suri e Jack (2016) ha fatto uscire dalla povertà circa 194.000 famiglie keniane (2%); il risultato è stato contestato.",
    detailedDescription:
      "Il progetto pilota, avviato nel 2005, fu sostenuto da una sovvenzione del Dipartimento britannico per lo sviluppo internazionale (DFID) a Vodafone. Nel dicembre 2011 il servizio contava 17 milioni di utenti nel solo Kenya; è stato esteso a Tanzania, Mozambico, RD Congo, Lesotho, Ghana, Egitto ed Etiopia.",
    context:
      "Secondo Suri e Jack gli effetti erano più marcati per le famiglie con capofamiglia donna e passavano per maggiore risparmio, resilienza finanziaria e scelte occupazionali, con donne che lasciavano l'agricoltura per il commercio.",
    categories: ["economy-trade", "technology-inventions", "society-demography"],
    tags: ["digital-finance", "poverty", "low-cost-innovation"],
    startDate: d(2007, 3),
    datePrecision: "month",
    locations: [{ placeId: "nairobi", role: "Capitale del Paese di lancio (punto di riferimento nazionale)" }],
    quantitativeMetrics: [
      {
        id: "mpesa-households-poverty",
        metricType: "households_out_of_poverty",
        value: 194_000,
        unit: "households",
        estimateKind: "scholarly-estimate",
        attributedTo: "Suri e Jack (2016)",
        scope: "Kenya (pari al 2% delle famiglie)",
        sourceIds: ["suri-jack-2016"],
        uncertainty: "high",
        isReference: true,
      },
    ],
    consequences: [
      { kind: "direct", text: "Diffusione di massa dei trasferimenti di denaro via telefono in Kenya.", sourceIds: ["wp-mpesa"] },
      { kind: "long-term", text: "Modello replicato in altri Paesi africani; alcune estensioni (India, Romania, Albania) sono state chiuse.", sourceIds: ["wp-mpesa"] },
    ],
    controversies: [
      { text: "Bateman et al. (2019) contestano le conclusioni di Suri e Jack sull'effetto di riduzione della povertà.", sourceIds: ["wp-mpesa"] },
    ],
    sources: ["wp-mpesa", "suri-jack-2016", "wikidata-q3870"],
    evidenceStatus: "verified",
    lastVerifiedAt: VERIFIED_AT,
    wikidataId: "Q252382",
  },
];
