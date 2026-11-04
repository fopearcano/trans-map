/** Curated comparisons with explicit methodological notes. */
import type { z } from "zod";
import type { CuratedComparisonSchema } from "@/domain/schemas";

export const comparisons: z.input<typeof CuratedComparisonSchema>[] = [
  {
    id: "vajont-vs-banqiao",
    title: "Vajont e Banqiao",
    eventIds: ["vajont-1963", "banqiao-1975"],
    question: "Due disastri legati a dighe: quanto differiscono per scala, e quanto la differenza dipende dalla definizione di vittima?",
    methodologicalNotes: [
      "Per il Vajont tutte le cifre riguardano morti dirette (1.917 dato ufficiale; fino a 2.500 secondo altre stime).",
      "Per Banqiao la cifra ufficiale di 26.000 riguarda le morti per l'inondazione; le stime di 230.000–240.000 includono morti successive per epidemie e carestia e provengono da fonti non accademiche: non vanno confrontate con le morti dirette del Vajont senza dichiararlo.",
      "La popolazione dell'area colpita è documentata solo per Banqiao (10,15 milioni). Per il Vajont non è disponibile nelle fonti consultate: l'unico denominatore comune è la popolazione nazionale, che misura il peso sul Paese, non l'intensità locale.",
      "Il confronto non stabilisce quale evento sia «più importante»: mostra ordini di grandezza e limiti delle fonti.",
    ],
    sourceIds: ["wp-vajont", "wp-banqiao", "owid-population"],
  },
  {
    id: "pandemics",
    title: "Peste nera, influenza del 1918, HIV/AIDS",
    eventIds: ["black-death", "influenza-1918", "hiv-aids-pandemic"],
    question: "Che cosa significa confrontare pandemie distanti secoli e con durate molto diverse?",
    methodologicalNotes: [
      "Le stime per la peste nera derivano da fonti demografiche medievali scarse; quelle per l'HIV da modelli epidemiologici contemporanei.",
      "Le durate sono incomparabili: circa 7 anni, circa 2 anni, oltre un secolo (pandemia in corso). Un totale cumulativo non equivale a una mortalità annua.",
      "Le quote di popolazione hanno denominatori diversi (Europa del XIV secolo, popolazione mondiale del 1918).",
    ],
    sourceIds: ["wp-black-death", "wp-spanish-flu", "unaids-factsheet"],
  },
  {
    id: "bhopal-vs-chernobyl",
    title: "Bhopal e Černobyl'",
    eventIds: ["bhopal-1984", "chernobyl-1986"],
    question: "Come si confrontano un incidente chimico e uno nucleare quando le morti a lungo termine sono stimate con modelli?",
    methodologicalNotes: [
      "Le morti immediate sono conteggi documentati; le morti a lungo termine di Černobyl' sono stime modellistiche, quelle di Bhopal includono stime di associazioni.",
      "Le popolazioni esposte sono definite in modo diverso (quartieri attorno all'impianto contro aree di contaminazione su scala nazionale).",
    ],
    sourceIds: ["wp-bhopal", "wp-chernobyl"],
  },
  {
    id: "urban-centres",
    title: "Caral, Cahokia, Grande Zimbabwe",
    eventIds: ["caral", "cahokia", "great-zimbabwe"],
    question: "Quanto erano grandi alcuni centri urbani fuori dall'Eurasia, e quanto sappiamo davvero delle loro popolazioni?",
    methodologicalNotes: [
      "Le popolazioni al culmine sono stime archeologiche con intervalli ampi; alcune fonti indicano solo un limite inferiore o superiore.",
      "Le epoche sono diverse: Caral precede Cahokia e Grande Zimbabwe di circa 3.500 anni.",
    ],
    sourceIds: ["wp-caral", "wp-cahokia", "wp-great-zimbabwe"],
  },
  {
    id: "printing",
    title: "Jikji e Bibbia di Gutenberg",
    eventIds: ["jikji", "gutenberg-bible"],
    question: "Che cosa misura un primato tecnologico?",
    methodologicalNotes: [
      "«Più antico libro esistente» (Jikji) e «primo grande libro stampato in Europa» (Gutenberg) sono primati di natura diversa.",
      "Non esistono metriche quantitative comparabili di diffusione nel dataset: il confronto è qualitativo.",
    ],
    sourceIds: ["wp-jikji", "wp-gutenberg-bible"],
  },
];
