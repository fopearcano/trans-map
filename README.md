# TRANS-MAP — The Atlas of Human Significance

> *«Quanto della nostra visione del mondo dipende dal mondo stesso, e quanto dai confini della nostra conoscenza?»*

TRANS-MAP è un'applicazione web che rappresenta geograficamente e cronologicamente eventi significativi della storia umana, in tutte le discipline, per far emergere gli squilibri tra la rilevanza percepita di un evento e le sue dimensioni documentabili. Conosci il Vajont? Esplora Banqiao.

Non assegna un punteggio di «importanza»: offre una mappa, una linea del tempo, schede con fonti e incertezze, un motore di confronto metodologicamente vincolato e un motore di scoperta «oltre l'orizzonte».

---

## Avvio rapido

Requisiti: **Node.js ≥ 22** (testato con 22.23). Nessun servizio esterno o abbonamento è necessario: la mappa di base, i caratteri e il database sono locali.

```bash
npm install
```

```bash
npm run dev
```

Apri <http://localhost:3000>. `npm run dev` applica le migrazioni e carica il dataset curato in `data/trans-map.db` (SQLite) prima di avviare Next.js.

Produzione:

```bash
npm run build
```

```bash
npm run start
```

Test:

```bash
npm run check
```

```bash
npm run test:e2e
```

`npm run check` esegue type-check, validazione del dataset e test unitari (Vitest, 58 test). `npm run test:e2e` avvia il server di produzione (serve una `npm run build` precedente) ed esegue 17 test Playwright su desktop, mobile, API e browser senza WebGL. Se il progetto usa un Chromium già installato altrove, impostare `PW_CHROMIUM_PATH`.

Altri comandi:

| Comando | Effetto |
|---|---|
| `npm run data:validate` | Valida schemi e integrità referenziale del dataset e stampa la copertura |
| `npm run db:setup` | Migrazioni + seed idempotente |
| `npm run db:reset` | Ricrea il database da zero |
| `npm run db:generate` | Genera una nuova migrazione dallo schema Drizzle |
| `npm run import:wikidata -- Q123 --category <id> --subregion <id> [--dry-run]` | Importa una **bozza** da Wikidata |

---

## Che cosa funziona (stato reale)

### Fase 1 — Atlante interattivo ✅
- **Mappa che funziona in ogni browser**: con WebGL usa MapLibre GL JS; se WebGL manca (accelerazione hardware disattivata, GPU in blocklist, desktop remoti, browser con protezioni anti-fingerprinting) o il contesto grafico viene perso, passa automaticamente a un renderer **SVG** con le stesse funzioni essenziali (selezione, confronto, aree di impatto, dimensioni per metrica, zoom/pan con mouse, touch, rotella e tastiera) e un avviso esplicito. Il renderer SVG si può forzare con `?renderer=svg`.
- Mappa mondiale vettoriale (MapLibre GL JS) con pan/zoom, cluster dinamici, simboli distinti per famiglia disciplinare (forma **e** colore, palette verificata per il daltonismo), simboli vuoti per localizzazioni approssimate o regionali, eventi con più luoghi collegati da linee, aree di impatto per Stati, vista globale e regionale.
- Dimensione dei simboli **solo su richiesta** e solo per la metrica scelta (area proporzionale o ordini di grandezza); senza metrica i simboli sono uniformi.
- Linea del tempo su scala logaritmica del tempo profondo (da 3,3 milioni di anni fa a oggi) con istogramma, doppio cursore e modalità: tutta la storia, periodo (numerico, non eurocentrico), secolo (a.C./d.C.), anno, intervallo. Nessun anno zero.
- Filtri per discipline (selezione multipla, 12 categorie in 3 famiglie), continenti, stato delle prove; temi trasversali (tag) indicizzati nella ricerca.
- Ricerca testuale insensibile agli accenti, con prefissi e suggerimenti (combobox accessibile).
- Schede evento sintetiche e approfondibili: identificazione, descrizione, contesto, cause, conseguenze dirette/indirette/di lungo periodo, metriche con tutte le stime, luoghi con precisione e fonte delle coordinate, interpretazioni e controversie distinte dai fatti, eventi collegati, fonti numerate con affidabilità e data di consultazione, lacune documentarie.
- Elenco eventi accessibile da tastiera (alternativa equivalente alla mappa); eventi senza coordinate mai posizionati arbitrariamente.
- Interfaccia responsive (desktop: pannelli laterali; mobile: mappa a tutto schermo e fogli a scorrimento), tema scuro predefinito e tema chiaro, italiano e inglese, stato condivisibile via URL.
- Persistenza: SQLite con migrazioni (Drizzle ORM); preferenze e cronologia di esplorazione nel browser.

### Fase 2 — Comparison Engine ✅
- Selezione di 2–4 eventi (dalla mappa, dall'elenco, dalla scheda o con ricerca nel pannello), con workspace che non nasconde la mappa.
- Profilo affiancato: localizzazione, data e durata, tipologia, persone coinvolte, stato delle prove.
- Metriche **della stessa definizione** confrontate con grafico a barre e intervalli di tutte le stime, rapporto sul valore di riferimento e **intervallo dei rapporti** su tutte le stime.
- Proporzioni sulla popolazione confrontate **solo con denominatori dello stesso tipo** (es. popolazione nazionale con popolazione nazionale).
- Confronti tra definizioni diverse (es. morti dirette vs complessive) in una sezione separata con avviso esplicito.
- Avvisi automatici: tipi di stima diversi, valori di riferimento approssimati, ambiti diversi, incertezza molto alta, stime molto divergenti, scale non proporzionali.
- Dati presenti per un solo evento indicati come «non documentati» per gli altri (mai come zero); dimensioni qualitative affiancate e mai convertite in punteggi; confronti curati con note metodologiche.

**Caso dimostrativo — Vajont e Banqiao** (`/?cmp=vajont-1963,banqiao-1975&panel=compare`): morti dirette secondo i dati ufficiali 1.917 contro 26.000, quindi Banqiao ≈ 13,6× Vajont (intervallo fra tutte le stime registrate: 10,4×–44,7×). In proporzione alla popolazione nazionale dell'epoca (OWID), però, il rapporto quasi si inverte: 37,9 morti per milione di abitanti in Italia contro 28,4 in Cina (Vajont ≈ 1,34×). Le stime di 230.000–240.000 per Banqiao comprendono le morti per epidemie e carestia e vengono da fonti non accademiche: compaiono solo nella sezione «definizioni diverse», con avviso.

### Fase 3 — Discovery Engine ✅
- Modalità «Oltre l'orizzonte»: l'utente sceglie un orizzonte (sotto-regioni UN M49 o raggruppamenti dichiarati). Non c'è geolocalizzazione e nessuna cultura viene attribuita automaticamente.
- Suggerimenti deterministici basati su relazioni curate (documentate o editoriali, sempre etichettate), discipline e temi comuni, contrasti di ordine di grandezza fra metriche compatibili e distanza geografica; ogni suggerimento mostra le proprie ragioni.
- Schede «Conosci X? Esplora Y» a partire dagli eventi dell'orizzonte, da quelli già aperti o dall'evento selezionato; percorsi di scoperta navigabili sul grafo delle relazioni.
- Avvertenza esplicita: il sistema non misura ciò che le persone conoscono.

### Visual Analytics ✅ (`/analisi`)
Distribuzione per periodo e famiglia, per continente, copertura per sotto-regione (barre, **non** heatmap, con elenco delle sotto-regioni scoperte), confronto numerico per metrica con intervalli e scala logaritmica, grafo delle connessioni (documentate vs editoriali), elenco delle aree di impatto. I grafici a barre hanno una tabella equivalente, il confronto numerico riporta i valori in chiaro, e la pagina dichiara che la densità del database non coincide con quella storica.

### Fase 4 — Espansione (predisposta, non obbligatoria)
- Adattatori per fonti esterne con timeout, retry con backoff, gestione di 429/5xx/404 ed errori tipizzati: **Wikidata** (entità, date, coordinate), **Our World in Data** (popolazione storica), **USGS** (terremoti), **OMS GHO** (indicatori sanitari). EM-DAT è documentato ma volutamente senza adattatore per vincoli di licenza.
- Pipeline editoriale: stati `draft`, `needs-review`, `verified`, `disputed`; origine `curated`/`imported`; registro editoriale; importazione assistita da Wikidata che produce solo bozze.
- Tabella `event_translations` pronta per contenuti in altre lingue.

### Non ancora implementato
Esportazione di mappe e confronti, collezioni personali e percorsi di apprendimento salvati, interfaccia editoriale web, grafi causali estesi, integrazione LLM/LM Studio, mappe di diffusione storica (es. peste nera), traduzione inglese dei contenuti degli eventi.

---

### Risoluzione dei problemi
- **«Modalità compatibile» sulla mappa**: il browser non offre WebGL. La mappa resta utilizzabile in SVG; per la vista completa (cluster, base dettagliata online) attivare l'accelerazione hardware (Chrome/Edge: *Impostazioni → Sistema → Usa l'accelerazione grafica*; Firefox: *Impostazioni → Prestazioni*) e verificare su `chrome://gpu` che WebGL sia «Hardware accelerated».
- **Il dev server ricarica la pagina in continuo** («HMR hash mismatch»): la cache di sviluppo di Turbopack è corrotta (ad esempio dopo un'interruzione forzata). Fermare il server, cancellare `.next/dev` e riavviare `npm run dev`.

## Architettura

```
src/
  domain/      Contratti dati (Zod), date storiche, categorie, regioni M49, metriche, indice dell'atlante, validazione del dataset
  engine/      Motori puri, condivisi da client e API: search, filter, compare, discover, analytics
  server/
    db/        Schema Drizzle, client SQLite, scrittura idempotente, lettura
    sources/   Adattatori per fonti esterne + client HTTP resiliente
    repository.ts  Interfaccia EventRepository (implementazione SQLite)
  app/         Next.js App Router: atlante (/), /analisi, /metodo, /eventi/[id], API /api/*
  components/  UI: atlas (mappa WebGL + fallback SVG, timeline, filtri, elenco, ricerca), event, compare, horizon, analytics, charts
  i18n/        Dizionari IT/EN
data/seed/     Dataset curato (TypeScript tipizzato e validato): eventi, fonti, luoghi, tag, relazioni, confronti
drizzle/       Migrazioni SQL
scripts/       migrate, seed, validate-data, import-wikidata
tests/unit     Vitest  ·  tests/e2e  Playwright
```

Flusso dei dati: `data/seed` → validazione Zod + integrità referenziale → SQLite (tabelle normalizzate, relazioni molti-a-molti fra eventi, categorie, tag, luoghi, fonti, metriche e confronti) → repository → indice leggero dell'atlante inviato al client → filtri, ricerca e scoperta in memoria (anche con migliaia di eventi; un test verifica il filtraggio di 1.800 eventi in meno di 200 ms). Schede e confronti sono serviti dalle API.

**Verso PostgreSQL/PostGIS.** Lo schema è normalizzato e privo di funzioni specifiche di SQLite: le coordinate (`lat`, `lon`) diventano una colonna `geography(Point)`, i campi JSON diventano `jsonb`, e una nuova implementazione di `EventRepository` sostituisce quella SQLite senza toccare UI e motori.

### API interne

| Endpoint | Descrizione |
|---|---|
| `GET /api/events?q=&categories=&continents=&status=&year=&century=&period=&from=&to=&limit=` | Ricerca e filtraggio |
| `GET /api/events/{id}` | Scheda completa con luoghi, fonti, relazioni e confronti curati |
| `GET /api/compare?ids=a,b[,c,d]` | Confronto (2–4 eventi) |
| `GET /api/discover?horizon=&seeds=&categories=&limit=&path=` | Suggerimenti «oltre l'orizzonte» e percorso di scoperta |
| `GET /api/analytics` | Distribuzioni, copertura e grafo |
| `GET /api/health` | Stato del database |

Input non validi → 400; eventi inesistenti → 404; database non inizializzato → 503 con istruzioni.

---

## Modello dei dati

**Event**: `id`, `title`, `summary`, `detailedDescription`, `context`, `categories[]` (la prima è la principale), `tags[]`, `startDate`, `endDate`, `ongoing`, `datePrecision`, `dateCirca`, `dateNote`, `locations[]` (luogo + ruolo), `locationNote`, `geographicFootprints[]`, `peopleOrRegionsAffected[]`, `quantitativeMetrics[]`, `qualitativeImpacts[]`, `causes[]`, `consequences[]` (dirette/indirette/lungo periodo), `interpretations[]`, `controversies[]`, `knownGaps[]`, `sources[]`, `evidenceStatus`, `lastVerifiedAt`, `wikidataId`. Le relazioni (`relatedEvents`) e i confronti curati sono entità separate.

**Metric**: `metricType` (vocabolario controllato con definizione, unità e famiglia), `value`, `minEstimate`, `maxEstimate`, `unit`, `estimateKind` (ufficiale, conteggio documentato, stima accademica, modello, rapporto preliminare, ONG, divulgativa), `attributedTo`, `scope`, `measurementPeriod`, `populationDenominators[]` (tipo, valore, anno, fonte), `methodology`, `sourceIds[]`, `uncertainty`, `isReference`, `documentedZero`, `note`.

Regole di validazione (fallisce il seed se violate): ogni evento e ogni metrica hanno fonti esistenti; lo zero non può indicare un dato sconosciuto; unità coerente con il tipo di metrica; niente anno zero; coordinate solo con fonte; un evento senza luoghi deve spiegare perché; un solo valore di riferimento per tipo di metrica; relazioni «documentate» solo con fonti.

**Date**: anni storici (negativi = a.C., senza anno zero) convertiti internamente in valori astronomici continui; precisione da giorno a millenni; date «circa»; eventi in corso.

**Luoghi**: coordinate dalla proprietà P625 di Wikidata, precisione dichiarata (`exact`, `settlement`, `approximate`, `region`, `disputed`), sotto-regione M49, codici ISO dei Paesi attuali (solo come riferimento geografico).

---

## Dataset iniziale

45 eventi reali, 119 fonti, 53 luoghi, 92 metriche, 45 relazioni, 5 confronti curati.

- **Continenti**: Asia 22 · Africa 8 · Europa 6 · Americhe 6 · Oceania 2 · Antartide 1 · senza luogo definibile 2 (pandemia influenzale del 1918; collasso demografico delle Americhe, rappresentato come area).
- **Discipline**: tutte le 12 categorie; i disastri sono 7 su 45.
- **Esempi**: disegno di Blombos, Göbekli Tepe, proto-cuneiforme di Uruk, Caral, editti di Aśoka, carta di Cai Lun, zero di Brahmagupta, Egira, al-Khwārizmī, Genji monogatari, Cahokia, Grande Zimbabwe, pellegrinaggio di Mansa Musa, Jikji, Muqaddima, Bibbia di Gutenberg, peste nera, Potosí, tratta atlantica, Rivoluzione haitiana, Tambora, Meiji, voto alle donne in Nuova Zelanda, Haber-Bosch, influenza del 1918, Partizione dell'India, Sputnik, ARPANET, grande carestia cinese, Vajont, Bhola, artemisinina, reidratazione orale, Banqiao, eradicazione del vaiolo, Bhopal, buco dell'ozono, Černobyl', tsunami del 2004, M-Pesa, lago d'Aral, HIV/AIDS.
- **Stato**: 40 verificati, 5 contestati (Banqiao, Bhopal, Černobyl', Partizione, grande carestia cinese).

**Come è stato costruito.** Il dataset è stato compilato con l'assistenza di un modello linguistico e ogni cifra è stata confrontata con le fonti citate il 4 novembre 2026: abstract di articoli scientifici (DOI verificati tramite Crossref/OpenAlex), UNAIDS, Our World in Data, coordinate da Wikidata e, come fonte introduttiva, voci di Wikipedia, con ogni valore attribuito all'autore originario citato nella voce. Il modello linguistico non è considerato una fonte. Prima di un uso pubblico serve una **revisione editoriale umana**: «verificato» significa «controllato sulle fonti citate alla data indicata», non «certificato».

### Aggiungere o correggere un evento
1. Aggiungere fonti in `data/seed/sources.ts` e luoghi (con fonte delle coordinate) in `data/seed/places.ts`.
2. Aggiungere l'evento nel file della famiglia in `data/seed/events/`, con metriche strutturate e fonti.
3. Eventuali relazioni in `data/seed/relations.ts` (`documented` solo con fonti; altrimenti `editorial`).
4. `npm run data:validate`, poi `npm run db:seed`.

---

## Scelte tecniche e versioni

| Componente | Versione | Note |
|---|---|---|
| Next.js (App Router, Turbopack) | 16.4.5 | `allowedDevOrigins` include `127.0.0.1`; `agentRules: false` |
| React | 19.3.1 | |
| TypeScript | 5.9.3 | La 7.x non è ancora usata per prudenza sulla compatibilità del type-check di Next |
| MapLibre GL JS | 5.24.0 | La 6.x distribuisce solo ESM con worker caricato da URL dinamico, fragile con il bundler di Next; la 5.x include il worker nel bundle. Migrazione alla 6 possibile servendo `maplibre-gl-worker.mjs` da `public/` e chiamando `setWorkerUrl` |
| Tailwind CSS | 4.3.4 | Token di design come variabili CSS (tema scuro/chiaro) |
| Drizzle ORM + better-sqlite3 | 0.45.4 + 13.0.3 | Journal di rollback (non WAL): le letture non toccano file ausiliari |
| Zod | 4.6.7 | Contratti dati, validazione di seed e risposte delle fonti |
| Apache ECharts | 6.1.0 | Caricato solo nella pagina di analisi, renderer SVG |
| Vitest / Playwright | 5.1.0 / 1.63.0 | Playwright allineato al Chromium preinstallato |

`npm audit` segnala vulnerabilità moderate in `esbuild` tramite `drizzle-kit` (solo strumento di sviluppo per generare migrazioni, non incluso nell'app).

### Cartografia e attribuzioni
- Confini: **Natural Earth** 1:50m (pubblico dominio) tramite **world-atlas** (ISC), inclusi in `public/basemap/`; i poligoni che attraversano l'antimeridiano o toccano il polo sono corretti al caricamento per la proiezione Web Mercator.
- Rendering: **MapLibre GL JS** (BSD-3-Clause).
- Glifi: **Noto Sans** (SIL OFL), file PBF in `public/glyphs/` ottenuti da OpenFreeMap.
- Base dettagliata opzionale: **OpenFreeMap** con dati © OpenStreetMap contributors (ODbL) / OpenMapTiles; in caso di errore si torna automaticamente alla base locale.
- Popolazioni: **Our World in Data** (CC BY 4.0). Coordinate e identificativi: **Wikidata** (CC0).
- Testi degli eventi: redazione originale; le voci di Wikipedia (CC BY-SA) sono citate come fonti, non copiate.

Accessibilità: navigazione completa da tastiera, link per saltare alla mappa e all'elenco, elenco equivalente alla mappa, combobox ARIA, stati annunciati, identità mai affidata al solo colore, tabelle equivalenti ai grafici, `prefers-reduced-motion` rispettato.

---

## Limiti noti dei dati

- 45 eventi sono una selezione editoriale: le distribuzioni descrivono il database, non la storia.
- Le aree di impatto sono per Stati attuali (anacronistiche per eventi antichi) o «globali»; mancano poligoni storici.
- Alcune cifre provengono da Wikipedia attribuite agli autori citati: andrebbero controllate sulle pubblicazioni primarie (in particolare Banqiao, Bhola, Černobyl', Tambora).
- La tratta atlantica usa la stima di D. Eltis riportata da Wikipedia, perché la banca dati SlaveVoyages non è stata consultabile automaticamente.
- I denominatori di popolazione sono stime OWID entro i confini attuali.
- I contenuti degli eventi sono solo in italiano.

## Roadmap

1. Revisione editoriale umana del dataset e interfaccia editoriale (stati, registro, confronto tra versioni).
2. Ampliamento del dataset per sotto-regioni scoperte (Micronesia, Melanesia, Polinesia, Europa settentrionale…) e per discipline poco rappresentate (filosofia, arti).
3. Poligoni storici e mappe di diffusione con fonti.
4. Esportazione (PNG/SVG/CSV) di mappe e confronti; collezioni e percorsi personali.
5. Indicatori di notorietà basati su dati empirici (programmi scolastici, lingue delle fonti, pageview) per affinare «Oltre l'orizzonte».
6. Integrazione opzionale con LLM (anche locali, es. LM Studio) per classificazione e sintesi di documenti, mai come fonte dei fatti.
7. Implementazione PostgreSQL/PostGIS del repository.

## Licenza

La licenza del codice non è ancora stata scelta (`UNLICENSED` in `package.json`). I dati di terze parti mantengono le rispettive licenze indicate sopra.
