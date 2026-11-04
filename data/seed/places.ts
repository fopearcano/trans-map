/**
 * Places. Every coordinate comes from Wikidata property P625 of the cited
 * item (retrieved 2026-11-04). Precision states what the point means:
 * - exact: the site itself
 * - settlement: a town/city in which the event took place
 * - approximate: a nearby reference point (see note)
 * - region: indicative point of a wider area (never a precise location)
 * - disputed: location contested in the literature
 * Country codes are ISO 3166-1 numeric codes of present-day states, used only
 * as a modern geographic reference — never as an anachronistic political claim.
 */
import type { z } from "zod";
import type { PlaceSchema } from "@/domain/schemas";

type PlaceInput = z.input<typeof PlaceSchema>;

const p = (
  id: string,
  name: string,
  lat: number,
  lon: number,
  qid: string,
  precision: PlaceInput["precision"],
  subregion: PlaceInput["subregion"],
  countryCodes: string[],
  note?: string,
): PlaceInput => ({
  id,
  name,
  coordinates: { lat, lon },
  precision,
  subregion,
  countryCodes,
  wikidataId: qid,
  coordinateSourceIds: [`wikidata-${qid.toLowerCase()}`],
  note,
});

export const places: PlaceInput[] = [
  p("vajont", "Diga del Vajont (Erto e Casso / Longarone)", 46.2672, 12.3289, "Q3709251", "exact", "southern-europe", ["380"]),
  p("banqiao-dam", "Diga di Banqiao (Henan)", 32.9828, 113.6233, "Q595288", "exact", "eastern-asia", ["156"]),
  p("blombos-cave", "Grotta di Blombos (Capo Occidentale)", -34.4144, 21.2225, "Q884971", "exact", "southern-africa", ["710"]),
  p("great-zimbabwe", "Grande Zimbabwe (Masvingo)", -20.27, 30.933, "Q209217", "exact", "eastern-africa", ["716"]),
  p("cairo", "Il Cairo", 30.0444, 31.2358, "Q85", "settlement", "northern-africa", ["818"]),
  p("mecca", "La Mecca", 21.4225, 39.8261, "Q5806", "settlement", "western-asia", ["682"]),
  p("medina", "Medina (Yathrib)", 24.47, 39.61, "Q35484", "settlement", "western-asia", ["682"]),
  p("timbuktu", "Timbuctù", 16.7733, -2.9994, "Q9427", "settlement", "western-africa", ["466"]),
  p("frenda", "Qal'at Ibn Salama (presso Frenda)", 35.0667, 1.05, "Q2215495", "approximate", "northern-africa", ["012"],
    "La fortezza di Qal'at Ibn Salama si trova nei pressi di Frenda: si usano le coordinate del comune moderno come approssimazione."),
  p("merca", "Merca", 1.7156, 44.7703, "Q657428", "settlement", "eastern-africa", ["706"]),
  p("kinshasa", "Kinshasa (già Léopoldville)", -4.3219, 15.3119, "Q3838", "settlement", "middle-africa", ["180"]),
  p("nairobi", "Nairobi", -1.2864, 36.8172, "Q3870", "settlement", "eastern-africa", ["404"]),
  p("ouidah", "Ouidah", 6.3667, 2.0833, "Q850031", "settlement", "western-africa", ["204"]),
  p("luoyang", "Luoyang", 34.6587, 112.4245, "Q187136", "settlement", "eastern-asia", ["156"]),
  p("heungdeoksa", "Sito del tempio Heungdeok (Cheongju)", 36.6439, 127.4719, "Q12485627", "exact", "eastern-asia", ["410"]),
  p("kyoto", "Kyoto (Heian-kyō)", 35.0116, 135.7681, "Q34600", "settlement", "eastern-asia", ["392"]),
  p("china-region", "Cina (punto indicativo)", 35.8447, 103.4519, "Q148", "region", "eastern-asia", ["156"],
    "Punto indicativo dell'intero territorio nazionale (coordinata Wikidata del Paese), non un luogo puntuale."),
  p("beijing", "Pechino", 39.904, 116.4075, "Q956", "settlement", "eastern-asia", ["156"]),
  p("bhinmal", "Bhinmal (Bhillamala)", 25.0, 72.25, "Q797437", "settlement", "southern-asia", ["356"]),
  p("pataliputra", "Pataliputra (Patna)", 25.611, 85.144, "Q389755", "settlement", "southern-asia", ["356"]),
  p("kandahar", "Kandahar", 31.6207, 65.7159, "Q45604", "settlement", "southern-asia", ["004"]),
  p("bhopal", "Stabilimento Union Carbide, Bhopal", 23.2808, 77.4106, "Q129029", "exact", "southern-asia", ["356"]),
  p("punjab", "Punjab (regione)", 31.0, 74.0, "Q169132", "region", "southern-asia", ["356", "586"],
    "Punto indicativo della regione storica divisa nel 1947."),
  p("bengal", "Bengala (regione)", 23.9888, 88.7311, "Q80338", "region", "southern-asia", ["356", "050"],
    "Punto indicativo della regione storica divisa nel 1947."),
  p("icddrb-dhaka", "Cholera Research Laboratory / icddr,b, Dhaka", 23.7764, 90.3998, "Q2945843", "exact", "southern-asia", ["050"]),
  p("kolkata", "Calcutta (Kolkata)", 22.5675, 88.37, "Q1348", "settlement", "southern-asia", ["356"]),
  p("bhola-island", "Isola di Bhola", 22.4967, 90.7564, "Q368807", "region", "southern-asia", ["050"]),
  p("gobekli-tepe", "Göbekli Tepe (Şanlıurfa)", 37.2231, 38.9225, "Q214944", "exact", "western-asia", ["792"]),
  p("uruk", "Uruk (Warka)", 31.3259, 45.6374, "Q168518", "exact", "western-asia", ["368"]),
  p("baghdad", "Baghdad", 33.3153, 44.3661, "Q1530", "settlement", "western-asia", ["368"]),
  p("aral-sea", "Lago d'Aral (punto indicativo)", 45.0, 60.0, "Q35883", "region", "central-asia", ["398", "860"],
    "Punto indicativo del bacino originario del lago."),
  p("baikonur-site1", "Baikonur, rampa 1/5", 45.9203, 63.3422, "Q2580456", "exact", "central-asia", ["398"]),
  p("tambora", "Vulcano Tambora (Sumbawa)", -8.2453, 117.9928, "Q168714", "exact", "south-eastern-asia", ["360"]),
  p("sumatra-epicentre", "Epicentro al largo di Sumatra", 3.295, 95.982, "Q130754", "exact", "south-eastern-asia", ["360"]),
  p("banda-aceh", "Banda Aceh", 5.55, 95.3175, "Q5779", "settlement", "south-eastern-asia", ["360"]),
  p("wairau-bar", "Wairau Bar (Marlborough)", -41.53, 174.09, "Q7960320", "exact", "australia-new-zealand", ["554"]),
  p("wellington", "Wellington", -41.2889, 174.7772, "Q23661", "settlement", "australia-new-zealand", ["554"]),
  p("caral", "Caral (valle del Supe)", -10.8936, -77.5203, "Q219279", "exact", "south-america", ["604"]),
  p("cahokia", "Cahokia (Illinois)", 38.6539, -90.0644, "Q333661", "exact", "northern-america", ["840"]),
  p("cerro-rico", "Cerro Rico, Potosí", -19.6189, -65.7497, "Q1055970", "exact", "south-america", ["068"]),
  p("bois-caiman", "Bois Caïman (luogo tradizionale)", 19.723, -72.273, "Q3010371", "approximate", "caribbean", ["332"],
    "Luogo tradizionalmente associato alla cerimonia del 1791; la localizzazione e i dettagli della cerimonia sono discussi."),
  p("cap-haitien", "Cap-Haïtien (Cap-Français)", 19.75, -72.2, "Q216835", "settlement", "caribbean", ["332"]),
  p("ucla", "UCLA, Los Angeles", 34.0722, -118.4428, "Q174710", "exact", "northern-america", ["840"]),
  p("menlo-park", "Menlo Park (Stanford Research Institute)", 37.4542, -122.1786, "Q74195", "settlement", "northern-america", ["840"]),
  p("feodosia", "Caffa (Feodosia), Crimea", 45.0489, 35.3792, "Q158491", "settlement", "eastern-europe", ["804"],
    "Crimea: codice paese secondo il riconoscimento internazionale prevalente."),
  p("sicily", "Sicilia", 37.6, 14.0167, "Q1460", "region", "southern-europe", ["380"]),
  p("mainz", "Magonza", 49.9994, 8.2736, "Q1720", "settlement", "western-europe", ["276"]),
  p("manchester", "Manchester", 53.4794, -2.2453, "Q18125", "settlement", "northern-europe", ["826"]),
  p("ironbridge", "Ironbridge Gorge (Shropshire)", 52.6264, -2.4728, "Q647958", "exact", "northern-europe", ["826"]),
  p("karlsruhe", "Karlsruhe (Technische Hochschule)", 49.0996, 8.4319, "Q309988", "settlement", "western-europe", ["276"]),
  p("oppau", "Oppau (BASF), Ludwigshafen", 49.52, 8.4019, "Q212334", "settlement", "western-europe", ["276"]),
  p("chernobyl", "Centrale nucleare di Černobyl'", 51.3894, 30.0992, "Q486", "exact", "eastern-europe", ["804"]),
  p("halley", "Stazione Halley (piattaforma di Brunt)", -75.5735, -25.467, "Q1571679", "approximate", "antarctica", ["010"],
    "Coordinate della stazione attuale: la base si è spostata più volte sulla piattaforma di ghiaccio, la posizione del 1985 non coincide."),
];
