import type { Guide, GuideMeta } from "./guideTypes"
import { frTypo } from "./frTypo"
import { TAXI_2026_NUM, sourcesOf } from "./transit"
import type { IntlLang } from "./lang"

// Guía de Nochevieja en Barcelona (15/11/2026): una página en español (/nochevieja-barcelona) y la misma guía en
// inglés, alemán, francés e italiano (/{idioma}/guides/new-years-eve-barcelona), con hreflang entre las cinco.
//
// Todo el contenido está aquí, en un solo sitio, para que las cinco versiones digan lo mismo. Reglas:
//  - Nada sale de memoria. Cada dato lleva su fuente oficial abajo (Ajuntament, TMB, AMB), con la fecha en que se miró.
//  - El plan de 2026 todavía NO está publicado (se mira el 15/11/2026): la página separa lo CONFIRMADO para 2026
//    (solo el recargo de taxi, que está en la tarifa 2026 de AMB), lo que pasó en 2025 y lo PENDIENTE. Cuando el
//    Ajuntament/TMB publiquen el plan de 2026 hay que revisar este archivo (NYE_CHECKED y las filas de la tabla).
//  - No se citan locales ni fiestas de pago de ningún local.

export type NyeLang = IntlLang | "es"

export const NYE_SLUG = "new-years-eve-barcelona"
export const NYE_ES_PATH = "/nochevieja-barcelona"
/** Día en que se comprobaron las fuentes de esta guía. */
export const NYE_CHECKED = "2026-11-15"

type Fares = { min: string; km: string; sup: string }

type Text = {
  title: string
  h1: string
  description: string
  blurb: string
  lead: string
  /** Prefijo de las direcciones internas de cada idioma ("" en español). */
  statusH2: string
  noteTitle: string
  noteText: string
  tableHead: [string, string]
  rows: [string, string][]
  tableNote: string
  y25H2: string
  y25Intro: string
  y25: string[]
  showH2: string
  showIntro: string
  show: string[]
  homeH2: string
  home: (f: Fares) => string[]
  homeLinks: [string, string, string, string]
  safetyH2: string
  safety: string[]
  rulesLabel: string
  essH2: string
  essIntro: string
  essLinks: [string, string, string]
  faq: (f: Fares) => { q: string; a: string }[]
  src: { op: string; xmas: string; transport: string; show: string; y21: string }
  cta: string
}

// --- Español -------------------------------------------------------------------------------------------------
const ES: Text = {
  title: "Nochevieja en Barcelona 2026: metro, campanadas y volver a casa | Noctua",
  h1: "Nochevieja en Barcelona 2026: metro, campanadas y cómo volver a casa",
  description:
    "Qué está confirmado para el 31 de diciembre de 2026 y qué no: metro toda la noche cada año desde 2021, espectáculo gratuito en Montjuïc en 2025, recargo de taxi y Nitbus.",
  blurb: "Metro toda la noche, el espectáculo de Montjuïc y el recargo de taxi.",
  lead:
    "La Nochevieja de 2026 cae en jueves. El Ajuntament y TMB todavía no han publicado los planes de transporte y seguridad de este año, así que esta guía separa lo que está confirmado, lo que pasó en 2025 y lo que conviene comprobar antes de salir.",
  statusH2: "Qué está confirmado y qué falta por publicar",
  noteTitle: "Comprobado el 15 de noviembre de 2026",
  noteText:
    "Los planes oficiales de 2026 para la noche del 31 de diciembre aún no están publicados. Lo que se indica de 2021 a 2025 describe ediciones pasadas, no una promesa para este año. Antes de salir, mira las fuentes oficiales que hay al final de la página.",
  tableHead: ["Tema", "Estado a 15 de noviembre de 2026"],
  rows: [
    ["Metro toda la noche", "Sin anunciar todavía. Funcionó toda la noche cada año de 2021 a 2025."],
    ["Tranvía y trenes de FGC", "Sin anunciar todavía. Los dos funcionaron toda la noche en 2025."],
    ["Espectáculo de medianoche en la avenida de la Reina Maria Cristina", "Sin anunciar todavía. En 2025 fue gratuito y duró de 23:50 a 00:15."],
    ["Recargo de taxi", "Confirmado en la tarifa 2026 de AMB: 4,60 € de 20:00 a 08:00 del 31 de diciembre al 1 de enero."],
    ["Autobuses nocturnos (Nitbus)", "AMB indica que circulan todas las noches del año. Comprueba el horario de tu línea esa misma semana."],
  ],
  tableNote: "En 2025 el Ajuntament anunció el plan de metro el 28 de noviembre y el dispositivo de seguridad y accesos el 29 de diciembre.",
  y25H2: "Cómo fue la noche de 2025",
  y25Intro: "La última edición es la mejor pista de lo que cabe esperar. Estas son las cifras oficiales de 2025.",
  y25: [
    "Metro: 43 horas sin interrupción, desde las 05:00 del 31 de diciembre hasta la medianoche del 1 de enero, en las ocho líneas (165 estaciones).",
    "Frecuencia del metro: de 21:00 a 02:00, trenes con menos de 4 minutos de intervalo en L1 y L3 y menos de 6 en L5. De 02:00 a 05:00, menos de 10 minutos en L1, L4 y L5 y unos 11 en L2 y L3.",
    "Tranvía: toda la noche. FGC: sin interrupción en las líneas S1, S2, L6, L7, L8 y L12.",
  ],
  showH2: "El espectáculo de medianoche en la avenida de la Reina Maria Cristina",
  showIntro:
    "La celebración oficial de Barcelona es un espectáculo gratuito de música, luz y fuegos artificiales a los pies de Montjuïc, junto a la plaza de España. En 2025 fue de 23:50 a 00:15. Los detalles de 2026 aún no están publicados: esto es lo que se hizo en 2025.",
  show: [
    "Acceso: filtros de control en la calzada central, entre las dos Torres Venecianas, con detectores de metales.",
    "Prohibido entrar con botellas de vidrio, latas, patinetes eléctricos ni nada que pueda ser peligroso.",
    "Cerradas al público: la avenida de Rius i Taulet y la avenida de Francesc Ferrer i Guàrdia. Se reservaron para evacuar en una emergencia y para salir al acabar el espectáculo.",
    "Metro más cercano: Espanya (L1, L3). También Hostafrancs (L1), Tarragona (L3), Rocafort (L1) y Poble Sec (L3).",
    "Autobuses: varias líneas de TMB se desviaron o acortaron su recorrido alrededor de la plaza de España desde las 19:00.",
    "Movilidad reducida: una zona reservada en la esquina con el carrer de Rius i Taulet, con plazas limitadas y acreditación obligatoria.",
  ],
  homeH2: "Volver a casa después de medianoche",
  home: (f) => [
    "Metro: la opción más sencilla si vuelve a funcionar toda la noche. Mira los horarios en la página del metro cuando TMB los publique.",
    "Autobús nocturno: el Nitbus circula todas las noches del año, según AMB. La mayoría de las líneas N paran en plaza Catalunya.",
    `Taxi: del 31 de diciembre al 1 de enero se aplica un recargo de ${f.sup} de 20:00 a 08:00, además de la tarifa nocturna (mínimo ${f.min} y ${f.km} por km).`,
    "Camina unas calles lejos del espectáculo antes de pedir un taxi o un VTC: hay restricciones de tráfico alrededor de la plaza de España.",
  ],
  homeLinks: ["Horarios y líneas de metro", "Líneas de autobús nocturno", "Paradas y teléfonos de taxi", "Cómo volver a casa en Barcelona de noche"],
  safetyH2: "Normas y seguridad esa noche",
  safety: [
    "Beber en la calle se multa desde febrero de 2026. La guía de normas tiene los importes.",
    "En 2025 la Guardia Urbana hizo controles de alcohol y drogas a conductores en toda la ciudad.",
    "La Guardia Urbana planifica itinerarios seguros desde las zonas de ocio y desde la avenida de la Reina Maria Cristina hasta las paradas de transporte público más cercanas, para prevenir violencias sexuales y LGTBIfóbicas.",
    "Emergencias: 112. Policía local (Guardia Urbana): 092.",
  ],
  rulesLabel: "Normas, multas y seguridad al salir de noche",
  essH2: "Deja lo esencial resuelto antes de salir",
  essIntro: "Noctua lista farmacias, comida de madrugada y cajeros con su horario.",
  essLinks: ["Farmacias 24 horas", "Comida de madrugada", "Cajeros automáticos"],
  faq: (f) => [
    {
      q: "¿El metro de Barcelona funciona toda la noche en Nochevieja?",
      a: "En todas las ediciones de 2021 a 2025 sí; en 2025 funcionó 43 horas sin interrupción, desde las 05:00 del 31 de diciembre hasta la medianoche del 1 de enero. TMB todavía no ha publicado el plan de 2026, así que compruébalo en TMB antes de darlo por hecho.",
    },
    {
      q: "¿Dónde son las campanadas y los fuegos artificiales de Barcelona?",
      a: "El espectáculo oficial es en la avenida de la Reina Maria Cristina, a los pies de Montjuïc, junto a la plaza de España. En 2025 fue de 23:50 a 00:15. El programa de 2026 aún no está publicado.",
    },
    {
      q: "¿El espectáculo de Nochevieja es gratis?",
      a: "En 2025 el listado oficial indicaba entrada gratuita. Mira el programa de Navidad del Ajuntament para 2026.",
    },
    {
      q: "¿Cuánto cuesta un taxi en Nochevieja en Barcelona?",
      a: `Del 31 de diciembre al 1 de enero se aplica un recargo de ${f.sup} de 20:00 a 08:00, además de la tarifa nocturna: mínimo ${f.min} y ${f.km} por km (tarifas 2026 de AMB).`,
    },
    {
      q: "¿Hay autobuses nocturnos en Nochevieja?",
      a: "AMB indica que la red Nitbus circula todas las noches del año. Los horarios pueden cambiar en fechas especiales, así que comprueba tu línea esa misma semana.",
    },
    {
      q: "¿Cuándo se publicarán los planes de 2026?",
      a: "El Ajuntament no ha anunciado una fecha. En 2025 el plan de metro se publicó el 28 de noviembre y el dispositivo de seguridad y accesos el 29 de diciembre.",
    },
  ],
  src: {
    op: "Ajuntament de Barcelona – Operación Navidad 2025 (28 de noviembre de 2025, en catalán)",
    xmas: "Ajuntament de Barcelona – Dispositivo de Nochevieja 2025 (29 de diciembre de 2025, en catalán)",
    transport: "Barcelona Navidad – Transporte público en Navidad 2025 (en inglés)",
    show: "Barcelona Navidad – Espectáculo de Nochevieja 2025 (en inglés)",
    y21: "Ajuntament de Barcelona – Dispositivo de Navidad 2021 (en catalán)",
  },
  cta: "Planifica tu noche en la app",
}

// --- English -------------------------------------------------------------------------------------------------
const EN: Text = {
  title: "New Year's Eve in Barcelona 2026: Metro, Show & Getting Home | Noctua",
  h1: "New Year's Eve in Barcelona 2026: metro, midnight show and getting home",
  description:
    "What is confirmed for 31 December 2026 and what is not: metro all night every year since 2021, a free Montjuïc show in 2025, the taxi supplement and night buses.",
  blurb: "All-night metro, the Montjuïc show and the taxi supplement.",
  lead:
    "New Year's Eve 2026 falls on a Thursday. The city and TMB have not published this year's transport and security plans yet, so this guide separates what is confirmed, what happened in 2025 and what to check before you go out.",
  statusH2: "What is confirmed and what is still pending",
  noteTitle: "Checked on 15 November 2026",
  noteText:
    "The official 2026 plans for the night of 31 December are not published yet. Anything marked 2021 to 2025 describes past editions, not a promise for this year. Check the official sources at the bottom of this page before you travel.",
  tableHead: ["Topic", "Status on 15 November 2026"],
  rows: [
    ["Metro all night", "Not announced yet. It ran all night every year from 2021 to 2025."],
    ["Tram and FGC trains", "Not announced yet. Both ran all night in 2025."],
    ["Midnight show at Avinguda de la Reina Maria Cristina", "Not announced yet. In 2025 it was free and ran from 23:50 to 00:15."],
    ["Taxi supplement", "Confirmed in AMB's 2026 tariff: €4.60 from 20:00 to 08:00 on 31 December and 1 January."],
    ["Night buses (NitBus)", "AMB says they run every night of the year. Check your line's timetable that week."],
  ],
  tableNote: "In 2025 the city announced the metro plan on 28 November and the security and access plan on 29 December.",
  y25H2: "How the night worked in 2025",
  y25Intro: "The latest edition is the best guide to what to expect. These are the official figures from 2025.",
  y25: [
    "Metro: 43 hours without interruption, from 05:00 on 31 December to midnight on 1 January, on all eight lines (165 stations).",
    "Metro frequency: from 21:00 to 02:00, trains ran less than 4 minutes apart on L1 and L3 and less than 6 on L5. From 02:00 to 05:00, less than 10 minutes on L1, L4 and L5 and about 11 on L2 and L3.",
    "Tram: all night. FGC: non-stop on lines S1, S2, L6, L7, L8 and L12.",
  ],
  showH2: "The midnight show at Avinguda de la Reina Maria Cristina",
  showIntro:
    "Barcelona's official celebration is a free show of music, light and fireworks at the foot of Montjuïc, next to Plaça d'Espanya. In 2025 it ran from 23:50 to 00:15. The 2026 details are not published yet, so these are the 2025 arrangements.",
  show: [
    "Access: checkpoints on the central roadway between the two Venetian Towers, with metal detectors.",
    "Banned inside: glass bottles, cans, electric scooters and anything dangerous.",
    "Closed to the public: Avinguda de Rius i Taulet and Avinguda de Francesc Ferrer i Guàrdia. They were kept for emergency evacuation and for leaving after the show.",
    "Nearest metro: Espanya (L1, L3). Also Hostafrancs (L1), Tarragona (L3), Rocafort (L1) and Poble Sec (L3).",
    "Buses: several TMB lines were diverted or shortened around Plaça d'Espanya from 19:00.",
    "Reduced mobility: a reserved area at the corner with Carrer de Rius i Taulet, with limited places and ID required.",
  ],
  homeH2: "Getting home after midnight",
  home: (f) => [
    "Metro: the simplest option if it runs all night again. Check the hours on the metro page once TMB publishes them.",
    "Night bus: NitBus runs every night of the year, according to AMB. Most N-lines stop at Plaça Catalunya.",
    `Taxi: on 31 December and 1 January a ${f.sup} supplement applies from 20:00 to 08:00, on top of the night tariff (minimum fare ${f.min}, then ${f.km} per km).`,
    "Walk a few streets away from the show before you call a taxi or ride-hailing car: traffic is restricted around Plaça d'Espanya.",
  ],
  homeLinks: ["Metro hours and lines", "Night bus lines", "Taxi ranks and phone numbers", "How to get home in Barcelona at night"],
  safetyH2: "Rules and safety on the night",
  safety: [
    "Drinking in the street has been fined since February 2026. The rules guide has the amounts.",
    "In 2025 the Guàrdia Urbana ran breath and drug tests on drivers across the city.",
    "The Guàrdia Urbana plans safe routes from nightlife areas and from Avinguda de la Reina Maria Cristina to the nearest public transport stops, to prevent sexual and LGBTphobic violence.",
    "Emergencies: 112. Local police (Guàrdia Urbana): 092.",
  ],
  rulesLabel: "Rules, fines and safety on a night out",
  essH2: "Sort the essentials before you go out",
  essIntro: "Noctua lists pharmacies, late-night food and cash machines with their hours.",
  essLinks: ["24-hour pharmacies", "Late-night food", "Cash machines"],
  faq: (f) => [
    {
      q: "Does the Barcelona metro run all night on New Year's Eve?",
      a: "In every edition from 2021 to 2025 it did; in 2025 it ran 43 hours without interruption, from 05:00 on 31 December to midnight on 1 January. TMB has not published the 2026 plan yet, so check TMB before you rely on it.",
    },
    {
      q: "Where are the New Year's Eve fireworks in Barcelona?",
      a: "The official show is on Avinguda de la Reina Maria Cristina, at the foot of Montjuïc next to Plaça d'Espanya. In 2025 it ran from 23:50 to 00:15. The 2026 programme is not published yet.",
    },
    {
      q: "Is the New Year's Eve show free?",
      a: "In 2025 the official listing said entry was free. Check the city's Christmas programme for 2026.",
    },
    {
      q: "How much is a taxi on New Year's Eve in Barcelona?",
      a: `A ${f.sup} supplement applies from 20:00 to 08:00 on 31 December and 1 January, on top of the night tariff: minimum fare ${f.min}, then ${f.km} per km (AMB 2026 fares).`,
    },
    {
      q: "Do night buses run on New Year's Eve?",
      a: "AMB says the NitBus network runs every night of the year. Timetables can change on special dates, so check your line the same week.",
    },
    {
      q: "When will the 2026 plans be published?",
      a: "The city has not announced a date. In 2025 the metro plan was published on 28 November and the security and access plan on 29 December.",
    },
  ],
  src: {
    op: "Ajuntament de Barcelona – Christmas operation 2025 (28 November 2025, in Catalan)",
    xmas: "Ajuntament de Barcelona – New Year's Eve plan 2025 (29 December 2025, in Catalan)",
    transport: "Barcelona Christmas – public transport measures 2025",
    show: "Barcelona Christmas – New Year's Eve show 2025",
    y21: "Ajuntament de Barcelona – Christmas plan 2021 (in Catalan)",
  },
  cta: "Plan your night in the app",
}

// --- Deutsch -------------------------------------------------------------------------------------------------
const DE: Text = {
  title: "Silvester in Barcelona 2026: Metro, Show & Heimweg | Noctua",
  h1: "Silvester in Barcelona 2026: Metro, Mitternachtsshow und Heimweg",
  description:
    "Was für den 31. Dezember 2026 feststeht und was nicht: Metro jedes Jahr seit 2021 die ganze Nacht, 2025 kostenlose Show am Montjuïc, Taxizuschlag und Nachtbusse.",
  blurb: "Metro die ganze Nacht, die Show am Montjuïc und der Taxizuschlag.",
  lead:
    "Silvester 2026 fällt auf einen Donnerstag. Die Stadt und TMB haben die Verkehrs- und Sicherheitspläne dieses Jahres noch nicht veröffentlicht. Dieser Ratgeber trennt deshalb, was feststeht, was 2025 galt und was du vor dem Ausgehen prüfen solltest.",
  statusH2: "Was feststeht und was noch fehlt",
  noteTitle: "Geprüft am 15. November 2026",
  noteText:
    "Die offiziellen Pläne für die Nacht vom 31. Dezember 2026 sind noch nicht veröffentlicht. Angaben zu 2021 bis 2025 beschreiben frühere Ausgaben und sind kein Versprechen für dieses Jahr. Prüf vor der Fahrt die offiziellen Quellen am Ende der Seite.",
  tableHead: ["Thema", "Stand am 15. November 2026"],
  rows: [
    ["Metro die ganze Nacht", "Noch nicht angekündigt. Sie fuhr in jedem Jahr von 2021 bis 2025 die ganze Nacht."],
    ["Straßenbahn und FGC-Züge", "Noch nicht angekündigt. Beide fuhren 2025 die ganze Nacht."],
    ["Mitternachtsshow an der Avinguda de la Reina Maria Cristina", "Noch nicht angekündigt. 2025 war sie kostenlos und dauerte von 23:50 bis 00:15 Uhr."],
    ["Taxizuschlag", "Im AMB-Tarif 2026 bestätigt: 4,60 € von 20:00 bis 08:00 Uhr am 31. Dezember und 1. Januar."],
    ["Nachtbusse (NitBus)", "Laut AMB fahren sie in jeder Nacht des Jahres. Prüf den Fahrplan deiner Linie in dieser Woche."],
  ],
  tableNote: "2025 hat die Stadt den Metro-Plan am 28. November und den Sicherheits- und Zugangsplan am 29. Dezember angekündigt.",
  y25H2: "So lief die Nacht 2025",
  y25Intro: "Die letzte Ausgabe ist der beste Hinweis darauf, was dich erwartet. Das sind die offiziellen Zahlen von 2025.",
  y25: [
    "Metro: 43 Stunden ohne Unterbrechung, von 05:00 Uhr am 31. Dezember bis Mitternacht am 1. Januar, auf allen acht Linien (165 Stationen).",
    "Metro-Takt: Von 21:00 bis 02:00 Uhr fuhren die Züge auf L1 und L3 im Abstand von weniger als 4 Minuten und auf L5 von weniger als 6. Von 02:00 bis 05:00 Uhr waren es weniger als 10 Minuten auf L1, L4 und L5 und etwa 11 auf L2 und L3.",
    "Straßenbahn: die ganze Nacht. FGC: ohne Unterbrechung auf den Linien S1, S2, L6, L7, L8 und L12.",
  ],
  showH2: "Die Mitternachtsshow an der Avinguda de la Reina Maria Cristina",
  showIntro:
    "Barcelonas offizielle Feier ist eine kostenlose Show aus Musik, Licht und Feuerwerk am Fuß des Montjuïc, neben der Plaça d'Espanya. 2025 dauerte sie von 23:50 bis 00:15 Uhr. Die Einzelheiten für 2026 sind noch nicht veröffentlicht, hier steht deshalb der Ablauf von 2025.",
  show: [
    "Zugang: Kontrollen auf der mittleren Fahrbahn zwischen den beiden Venezianischen Türmen, mit Metalldetektoren.",
    "Verboten im Bereich: Glasflaschen, Dosen, E-Scooter und alles, was gefährlich sein kann.",
    "Für die Öffentlichkeit gesperrt: die Avinguda de Rius i Taulet und die Avinguda de Francesc Ferrer i Guàrdia. Sie blieben für die Evakuierung im Notfall und für den Abgang nach der Show frei.",
    "Nächste Metro: Espanya (L1, L3). Außerdem Hostafrancs (L1), Tarragona (L3), Rocafort (L1) und Poble Sec (L3).",
    "Busse: Mehrere TMB-Linien wurden ab 19:00 Uhr rund um die Plaça d'Espanya umgeleitet oder verkürzt.",
    "Eingeschränkte Mobilität: ein reservierter Bereich an der Ecke zum Carrer de Rius i Taulet, mit begrenzten Plätzen und Ausweispflicht.",
  ],
  homeH2: "Nach Mitternacht nach Hause kommen",
  home: (f) => [
    "Metro: die einfachste Möglichkeit, wenn sie wieder die ganze Nacht fährt. Die Zeiten stehen auf der Metro-Seite, sobald TMB sie veröffentlicht.",
    "Nachtbus: Der NitBus fährt laut AMB in jeder Nacht des Jahres. Die meisten N-Linien halten an der Plaça Catalunya.",
    `Taxi: Am 31. Dezember und 1. Januar gilt von 20:00 bis 08:00 Uhr ein Zuschlag von ${f.sup} zusätzlich zum Nachttarif (Mindestpreis ${f.min}, danach ${f.km} pro km).`,
    "Geh ein paar Straßen von der Show weg, bevor du ein Taxi oder einen Fahrdienst rufst: Rund um die Plaça d'Espanya ist der Verkehr eingeschränkt.",
  ],
  homeLinks: ["Metro-Zeiten und Linien", "Nachtbus-Linien", "Taxistände und Telefonnummern", "Nachts in Barcelona nach Hause kommen"],
  safetyH2: "Regeln und Sicherheit in dieser Nacht",
  safety: [
    "Trinken auf der Straße wird seit Februar 2026 mit Bußgeld belegt. Die Beträge stehen im Ratgeber zu den Regeln.",
    "2025 führte die Guàrdia Urbana in der ganzen Stadt Alkohol- und Drogenkontrollen bei Fahrern durch.",
    "Die Guàrdia Urbana plant sichere Wege von den Ausgehvierteln und von der Avinguda de la Reina Maria Cristina zu den nächsten Haltestellen, um sexuelle und LGBTQ-feindliche Gewalt zu verhindern.",
    "Notfälle: 112. Ortspolizei (Guàrdia Urbana): 092.",
  ],
  rulesLabel: "Regeln, Bußgelder und Sicherheit beim Ausgehen",
  essH2: "Das Wichtigste vor dem Ausgehen klären",
  essIntro: "Noctua listet Apotheken, Essen spät in der Nacht und Geldautomaten mit ihren Öffnungszeiten.",
  essLinks: ["Apotheken rund um die Uhr", "Essen spät in der Nacht", "Geldautomaten"],
  faq: (f) => [
    {
      q: "Fährt die Metro in Barcelona an Silvester die ganze Nacht?",
      a: "In jeder Ausgabe von 2021 bis 2025 ja; 2025 fuhr sie 43 Stunden ohne Unterbrechung, von 05:00 Uhr am 31. Dezember bis Mitternacht am 1. Januar. TMB hat den Plan für 2026 noch nicht veröffentlicht, prüf ihn also bei TMB, bevor du dich darauf verlässt.",
    },
    {
      q: "Wo ist das Silvesterfeuerwerk in Barcelona?",
      a: "Die offizielle Show findet an der Avinguda de la Reina Maria Cristina statt, am Fuß des Montjuïc neben der Plaça d'Espanya. 2025 dauerte sie von 23:50 bis 00:15 Uhr. Das Programm für 2026 ist noch nicht veröffentlicht.",
    },
    {
      q: "Ist die Silvestershow kostenlos?",
      a: "2025 nannte das offizielle Programm freien Eintritt. Prüf das Weihnachtsprogramm der Stadt für 2026.",
    },
    {
      q: "Was kostet ein Taxi an Silvester in Barcelona?",
      a: `Am 31. Dezember und 1. Januar gilt von 20:00 bis 08:00 Uhr ein Zuschlag von ${f.sup} zusätzlich zum Nachttarif: Mindestpreis ${f.min}, danach ${f.km} pro km (AMB-Tarife 2026).`,
    },
    {
      q: "Fahren an Silvester Nachtbusse?",
      a: "Laut AMB fährt das NitBus-Netz in jeder Nacht des Jahres. An besonderen Tagen können sich Fahrpläne ändern, prüf deine Linie also in derselben Woche.",
    },
    {
      q: "Wann werden die Pläne für 2026 veröffentlicht?",
      a: "Die Stadt hat kein Datum genannt. 2025 erschien der Metro-Plan am 28. November und der Sicherheits- und Zugangsplan am 29. Dezember.",
    },
  ],
  src: {
    op: "Ajuntament de Barcelona – Weihnachtseinsatz 2025 (28. November 2025, auf Katalanisch)",
    xmas: "Ajuntament de Barcelona – Silvesterplan 2025 (29. Dezember 2025, auf Katalanisch)",
    transport: "Barcelona Weihnachten – Maßnahmen im öffentlichen Verkehr 2025 (auf Englisch)",
    show: "Barcelona Weihnachten – Silvestershow 2025 (auf Englisch)",
    y21: "Ajuntament de Barcelona – Weihnachtsplan 2021 (auf Katalanisch)",
  },
  cta: "Plane deine Nacht in der App",
}

// --- Français ------------------------------------------------------------------------------------------------
const FR: Text = {
  title: "Nouvel An à Barcelone 2026 : métro, spectacle et retour | Noctua",
  h1: "Nouvel An à Barcelone 2026 : métro, spectacle de minuit et retour à la maison",
  description:
    "Confirmé ou non pour le 31 décembre 2026 : métro toute la nuit chaque année depuis 2021, spectacle gratuit à Montjuïc en 2025, supplément taxi et bus de nuit.",
  blurb: "Métro toute la nuit, le spectacle de Montjuïc et le supplément taxi.",
  lead:
    "Le réveillon 2026 tombe un jeudi. La ville et TMB n'ont pas encore publié les plans de transport et de sécurité de cette année. Ce guide sépare donc ce qui est confirmé, ce qui s'est passé en 2025 et ce qu'il faut vérifier avant de sortir.",
  statusH2: "Ce qui est confirmé et ce qui reste à publier",
  noteTitle: "Vérifié le 15 novembre 2026",
  noteText:
    "Les plans officiels de 2026 pour la nuit du 31 décembre ne sont pas encore publiés. Ce qui est indiqué pour 2021 à 2025 décrit des éditions passées, pas une promesse pour cette année. Avant de partir, consultez les sources officielles en bas de page.",
  tableHead: ["Sujet", "Situation au 15 novembre 2026"],
  rows: [
    ["Métro toute la nuit", "Pas encore annoncé. Il a circulé toute la nuit chaque année de 2021 à 2025."],
    ["Tramway et trains FGC", "Pas encore annoncé. Les deux ont circulé toute la nuit en 2025."],
    ["Spectacle de minuit sur l'avenue de la Reina Maria Cristina", "Pas encore annoncé. En 2025, il était gratuit et a eu lieu de 23 h 50 à 0 h 15."],
    ["Supplément taxi", "Confirmé dans le tarif 2026 de l'AMB : 4,60 € de 20 h à 8 h les 31 décembre et 1er janvier."],
    ["Bus de nuit (NitBus)", "L'AMB indique qu'ils circulent toutes les nuits de l'année. Vérifiez l'horaire de votre ligne cette semaine-là."],
  ],
  tableNote: "En 2025, la ville a annoncé le plan de métro le 28 novembre et le dispositif de sécurité et d'accès le 29 décembre.",
  y25H2: "Comment s'est passée la nuit en 2025",
  y25Intro: "La dernière édition est le meilleur indice de ce qui vous attend. Voici les chiffres officiels de 2025.",
  y25: [
    "Métro : 43 heures sans interruption, de 5 h le 31 décembre à minuit le 1er janvier, sur les huit lignes (165 stations).",
    "Fréquence du métro : de 21 h à 2 h, les rames passaient à moins de 4 minutes d'intervalle sur les lignes 1 et 3 et à moins de 6 sur la ligne 5. De 2 h à 5 h, à moins de 10 minutes sur les lignes 1, 4 et 5 et environ 11 sur les lignes 2 et 3.",
    "Tramway : toute la nuit. FGC : sans interruption sur les lignes S1, S2, L6, L7, L8 et L12.",
  ],
  showH2: "Le spectacle de minuit sur l'avenue de la Reina Maria Cristina",
  showIntro:
    "La célébration officielle de Barcelone est un spectacle gratuit de musique, de lumière et de feux d'artifice au pied du Montjuïc, à côté de la place d'Espagne. En 2025, il a eu lieu de 23 h 50 à 0 h 15. Les détails de 2026 ne sont pas encore publiés : voici l'organisation de 2025.",
  show: [
    "Accès : points de contrôle sur la chaussée centrale, entre les deux tours vénitiennes, avec détecteurs de métaux.",
    "Interdits à l'intérieur : bouteilles en verre, canettes, trottinettes électriques et tout objet dangereux.",
    "Fermées au public : l'avenue de Rius i Taulet et l'avenue de Francesc Ferrer i Guàrdia. Elles ont été réservées à l'évacuation en cas d'urgence et à la sortie après le spectacle.",
    "Métro le plus proche : Espanya (L1, L3). Aussi Hostafrancs (L1), Tarragona (L3), Rocafort (L1) et Poble Sec (L3).",
    "Bus : plusieurs lignes de TMB ont été déviées ou raccourcies autour de la place d'Espagne à partir de 19 h.",
    "Mobilité réduite : une zone réservée à l'angle du carrer de Rius i Taulet, avec des places limitées et une pièce d'identité obligatoire.",
  ],
  homeH2: "Rentrer après minuit",
  home: (f) => [
    "Métro : la solution la plus simple s'il circule de nouveau toute la nuit. Consultez les horaires sur la page du métro dès que TMB les publie.",
    "Bus de nuit : le NitBus circule toutes les nuits de l'année, selon l'AMB. La plupart des lignes N s'arrêtent à la place de Catalogne.",
    `Taxi : les 31 décembre et 1er janvier, un supplément de ${f.sup} s'applique de 20 h à 8 h, en plus du tarif de nuit (course minimum ${f.min}, puis ${f.km} par km).`,
    "Marchez quelques rues loin du spectacle avant d'appeler un taxi ou un VTC : la circulation est restreinte autour de la place d'Espagne.",
  ],
  homeLinks: ["Horaires et lignes du métro", "Lignes de bus de nuit", "Stations et numéros de taxi", "Rentrer à Barcelone la nuit"],
  safetyH2: "Règles et sécurité cette nuit-là",
  safety: [
    "Boire dans la rue est sanctionné d'une amende depuis février 2026. Le guide des règles donne les montants.",
    "En 2025, la Guàrdia Urbana a mené des contrôles d'alcoolémie et de stupéfiants sur les conducteurs dans toute la ville.",
    "La Guàrdia Urbana prévoit des itinéraires sûrs depuis les quartiers de sortie et depuis l'avenue de la Reina Maria Cristina jusqu'aux arrêts de transport les plus proches, pour prévenir les violences sexuelles et LGBTphobes.",
    "Urgences : 112. Police locale (Guàrdia Urbana) : 092.",
  ],
  rulesLabel: "Règles, amendes et sécurité en soirée",
  essH2: "Réglez l'essentiel avant de sortir",
  essIntro: "Noctua répertorie les pharmacies, la restauration tardive et les distributeurs avec leurs horaires.",
  essLinks: ["Pharmacies ouvertes 24 h sur 24", "Restauration tardive", "Distributeurs de billets"],
  faq: (f) => [
    {
      q: "Le métro de Barcelone circule-t-il toute la nuit le soir du Nouvel An ?",
      a: "Dans toutes les éditions de 2021 à 2025, oui ; en 2025, il a circulé 43 heures sans interruption, de 5 h le 31 décembre à minuit le 1er janvier. TMB n'a pas encore publié le plan de 2026 : vérifiez auprès de TMB avant de vous y fier.",
    },
    {
      q: "Où sont les feux d'artifice du Nouvel An à Barcelone ?",
      a: "Le spectacle officiel a lieu sur l'avenue de la Reina Maria Cristina, au pied du Montjuïc, à côté de la place d'Espagne. En 2025, il a eu lieu de 23 h 50 à 0 h 15. Le programme de 2026 n'est pas encore publié.",
    },
    {
      q: "Le spectacle du Nouvel An est-il gratuit ?",
      a: "En 2025, le programme officiel indiquait une entrée gratuite. Consultez le programme de Noël de la ville pour 2026.",
    },
    {
      q: "Combien coûte un taxi le soir du Nouvel An à Barcelone ?",
      a: `Un supplément de ${f.sup} s'applique de 20 h à 8 h les 31 décembre et 1er janvier, en plus du tarif de nuit : course minimum ${f.min}, puis ${f.km} par km (tarifs 2026 de l'AMB).`,
    },
    {
      q: "Les bus de nuit circulent-ils le soir du Nouvel An ?",
      a: "L'AMB indique que le réseau NitBus circule toutes les nuits de l'année. Les horaires peuvent changer à des dates spéciales : vérifiez votre ligne la même semaine.",
    },
    {
      q: "Quand les plans de 2026 seront-ils publiés ?",
      a: "La ville n'a pas annoncé de date. En 2025, le plan de métro a été publié le 28 novembre et le dispositif de sécurité et d'accès le 29 décembre.",
    },
  ],
  src: {
    op: "Ajuntament de Barcelona – Opération Noël 2025 (28 novembre 2025, en catalan)",
    xmas: "Ajuntament de Barcelona – Dispositif du Nouvel An 2025 (29 décembre 2025, en catalan)",
    transport: "Barcelona Noël – Mesures de transport public 2025 (en anglais)",
    show: "Barcelona Noël – Spectacle du Nouvel An 2025 (en anglais)",
    y21: "Ajuntament de Barcelona – Dispositif de Noël 2021 (en catalan)",
  },
  cta: "Organisez votre soirée dans l'app",
}

// --- Italiano ------------------------------------------------------------------------------------------------
const IT: Text = {
  title: "Capodanno a Barcellona 2026: metro, spettacolo e ritorno | Noctua",
  h1: "Capodanno a Barcellona 2026: metro, spettacolo di mezzanotte e come tornare a casa",
  description:
    "Cosa è confermato per il 31 dicembre 2026 e cosa no: metro tutta la notte ogni anno dal 2021, spettacolo gratuito a Montjuïc nel 2025, supplemento taxi e bus notturni.",
  blurb: "Metro tutta la notte, lo spettacolo di Montjuïc e il supplemento taxi.",
  lead:
    "Capodanno 2026 cade di giovedì. Il Comune e TMB non hanno ancora pubblicato i piani di trasporto e sicurezza di quest'anno. Questa guida separa quindi ciò che è confermato, ciò che è successo nel 2025 e ciò che conviene controllare prima di uscire.",
  statusH2: "Cosa è confermato e cosa manca ancora",
  noteTitle: "Controllato il 15 novembre 2026",
  noteText:
    "I piani ufficiali del 2026 per la notte del 31 dicembre non sono ancora pubblicati. Quanto indicato per il periodo 2021-2025 descrive edizioni passate, non una promessa per quest'anno. Prima di partire, controlla le fonti ufficiali in fondo alla pagina.",
  tableHead: ["Tema", "Situazione al 15 novembre 2026"],
  rows: [
    ["Metro tutta la notte", "Non ancora annunciato. Ha funzionato tutta la notte ogni anno dal 2021 al 2025."],
    ["Tram e treni FGC", "Non ancora annunciato. Entrambi hanno funzionato tutta la notte nel 2025."],
    ["Spettacolo di mezzanotte sull'Avinguda de la Reina Maria Cristina", "Non ancora annunciato. Nel 2025 era gratuito e si è svolto dalle 23:50 alle 00:15."],
    ["Supplemento taxi", "Confermato nella tariffa 2026 di AMB: 4,60 € dalle 20:00 alle 08:00 il 31 dicembre e il 1° gennaio."],
    ["Bus notturni (NitBus)", "Secondo AMB circolano ogni notte dell'anno. Controlla l'orario della tua linea in quella settimana."],
  ],
  tableNote: "Nel 2025 il Comune ha annunciato il piano della metro il 28 novembre e il dispositivo di sicurezza e accessi il 29 dicembre.",
  y25H2: "Com'è andata la notte del 2025",
  y25Intro: "L'ultima edizione è la migliore indicazione di cosa aspettarsi. Ecco i dati ufficiali del 2025.",
  y25: [
    "Metro: 43 ore senza interruzione, dalle 05:00 del 31 dicembre alla mezzanotte del 1° gennaio, su tutte le otto linee (165 stazioni).",
    "Frequenza della metro: dalle 21:00 alle 02:00 i treni passavano a meno di 4 minuti l'uno dall'altro sulle linee L1 e L3 e a meno di 6 sulla L5. Dalle 02:00 alle 05:00, a meno di 10 minuti sulle linee L1, L4 e L5 e a circa 11 sulle linee L2 e L3.",
    "Tram: tutta la notte. FGC: senza interruzione sulle linee S1, S2, L6, L7, L8 e L12.",
  ],
  showH2: "Lo spettacolo di mezzanotte sull'Avinguda de la Reina Maria Cristina",
  showIntro:
    "La festa ufficiale di Barcellona è uno spettacolo gratuito di musica, luci e fuochi d'artificio ai piedi del Montjuïc, accanto a Plaça d'Espanya. Nel 2025 si è svolto dalle 23:50 alle 00:15. I dettagli del 2026 non sono ancora pubblicati: ecco l'organizzazione del 2025.",
  show: [
    "Accesso: controlli sulla carreggiata centrale, tra le due Torri Veneziane, con metal detector.",
    "Vietati all'interno: bottiglie di vetro, lattine, monopattini elettrici e qualsiasi oggetto pericoloso.",
    "Chiuse al pubblico: l'Avinguda de Rius i Taulet e l'Avinguda de Francesc Ferrer i Guàrdia. Sono state riservate all'evacuazione in caso di emergenza e all'uscita dopo lo spettacolo.",
    "Metro più vicina: Espanya (L1, L3). Anche Hostafrancs (L1), Tarragona (L3), Rocafort (L1) e Poble Sec (L3).",
    "Autobus: diverse linee TMB sono state deviate o accorciate intorno a Plaça d'Espanya dalle 19:00.",
    "Mobilità ridotta: un'area riservata all'angolo con il Carrer de Rius i Taulet, con posti limitati e documento obbligatorio.",
  ],
  homeH2: "Tornare a casa dopo mezzanotte",
  home: (f) => [
    "Metro: la soluzione più semplice se funziona di nuovo tutta la notte. Controlla gli orari nella pagina della metro appena TMB li pubblica.",
    "Bus notturno: il NitBus circola ogni notte dell'anno, secondo AMB. La maggior parte delle linee N si ferma a Plaça Catalunya.",
    `Taxi: il 31 dicembre e il 1° gennaio si applica un supplemento di ${f.sup} dalle 20:00 alle 08:00, in aggiunta alla tariffa notturna (corsa minima ${f.min}, poi ${f.km} al km).`,
    "Allontanati di qualche isolato dallo spettacolo prima di chiamare un taxi o un'auto con conducente: intorno a Plaça d'Espanya il traffico è limitato.",
  ],
  homeLinks: ["Orari e linee della metro", "Linee dei bus notturni", "Fermate e numeri dei taxi", "Come tornare a casa a Barcellona di notte"],
  safetyH2: "Regole e sicurezza quella notte",
  safety: [
    "Bere per strada è punito con una multa dal febbraio 2026. La guida alle regole riporta gli importi.",
    "Nel 2025 la Guàrdia Urbana ha eseguito controlli su alcol e droghe sui conducenti in tutta la città.",
    "La Guàrdia Urbana pianifica percorsi sicuri dalle zone della vita notturna e dall'Avinguda de la Reina Maria Cristina fino alle fermate dei mezzi pubblici più vicine, per prevenire la violenza sessuale e quella LGBTfobica.",
    "Emergenze: 112. Polizia locale (Guàrdia Urbana): 092.",
  ],
  rulesLabel: "Regole, multe e sicurezza per una serata fuori",
  essH2: "Sistema l'essenziale prima di uscire",
  essIntro: "Noctua elenca farmacie, cibo a tarda notte e bancomat con i loro orari.",
  essLinks: ["Farmacie aperte 24 ore", "Cibo a tarda notte", "Bancomat"],
  faq: (f) => [
    {
      q: "La metro di Barcellona funziona tutta la notte a Capodanno?",
      a: "In tutte le edizioni dal 2021 al 2025 sì; nel 2025 ha funzionato 43 ore senza interruzione, dalle 05:00 del 31 dicembre alla mezzanotte del 1° gennaio. TMB non ha ancora pubblicato il piano del 2026: controlla con TMB prima di darlo per certo.",
    },
    {
      q: "Dove sono i fuochi d'artificio di Capodanno a Barcellona?",
      a: "Lo spettacolo ufficiale si svolge sull'Avinguda de la Reina Maria Cristina, ai piedi del Montjuïc, accanto a Plaça d'Espanya. Nel 2025 è andato dalle 23:50 alle 00:15. Il programma del 2026 non è ancora pubblicato.",
    },
    {
      q: "Lo spettacolo di Capodanno è gratuito?",
      a: "Nel 2025 il programma ufficiale indicava ingresso gratuito. Controlla il programma natalizio del Comune per il 2026.",
    },
    {
      q: "Quanto costa un taxi a Capodanno a Barcellona?",
      a: `Dalle 20:00 alle 08:00 del 31 dicembre e del 1° gennaio si applica un supplemento di ${f.sup}, in aggiunta alla tariffa notturna: corsa minima ${f.min}, poi ${f.km} al km (tariffe 2026 di AMB).`,
    },
    {
      q: "I bus notturni circolano a Capodanno?",
      a: "Secondo AMB la rete NitBus circola ogni notte dell'anno. Gli orari possono cambiare in date speciali: controlla la tua linea nella stessa settimana.",
    },
    {
      q: "Quando saranno pubblicati i piani del 2026?",
      a: "Il Comune non ha comunicato una data. Nel 2025 il piano della metro è stato pubblicato il 28 novembre e il dispositivo di sicurezza e accessi il 29 dicembre.",
    },
  ],
  src: {
    op: "Ajuntament de Barcelona – Operazione Natale 2025 (28 novembre 2025, in catalano)",
    xmas: "Ajuntament de Barcelona – Dispositivo di Capodanno 2025 (29 dicembre 2025, in catalano)",
    transport: "Barcelona Natale – Misure sul trasporto pubblico 2025 (in inglese)",
    show: "Barcelona Natale – Spettacolo di Capodanno 2025 (in inglese)",
    y21: "Ajuntament de Barcelona – Dispositivo di Natale 2021 (in catalano)",
  },
  cta: "Organizza la tua serata nell'app",
}

const TEXT: Record<NyeLang, Text> = { es: ES, en: EN, de: DE, fr: FR, it: IT }

const SOURCE_URL = {
  op: "https://ajuntament.barcelona.cat/premsa/2025/11/28/lajuntament-posa-en-marxa-loperacio-nadal-per-assegurar-uns-optims-nivells-de-seguretat-convivencia-mobilitat-i-neteja/",
  xmas: "https://ajuntament.barcelona.cat/premsa/2025/12/29/dispositiu-per-a-la-nit-de-cap-dany-6/",
  transport: "https://www.barcelona.cat/nadal/en/practical-information/special-public-transport-measures",
  show: "https://www.barcelona.cat/nadal/en/new-years-bell-ringing",
  y21: "https://www.barcelona.cat/infobarcelona/ca/dispositiu-de-seguretat-convivencia-i-mobilitat-a-la-ciutat-de-nadal_1126739.html",
} as const

/** Importe como se escribe en cada idioma: «€2.80» en inglés, «2,80 €» en los demás. */
function eur(lang: NyeLang, n: number): string {
  if (lang === "en") return `€${Number.isInteger(n) ? n : n.toFixed(2)}`
  return `${Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ",")} €`
}

/** Dirección interna de cada idioma: en español sin prefijo, en los demás /{idioma}. */
const prefixOf = (lang: NyeLang) => (lang === "es" ? "" : `/${lang}`)

/** Título, descripción y resumen de la guía en cada idioma (para la lista de guías, el sitemap y los metadatos). */
export function nyeMeta(lang: NyeLang): GuideMeta {
  const t = TEXT[lang]
  const m: GuideMeta = { slug: NYE_SLUG, title: t.title, h1: t.h1, description: t.description, blurb: t.blurb, esPath: NYE_ES_PATH, reviewed: NYE_CHECKED }
  return lang === "fr" ? frTypo(m) : m
}

/** La guía entera en un idioma. No toca la base de datos: todo es texto fijo con fuente. */
export function nyeGuide(lang: NyeLang): Guide {
  const t = TEXT[lang]
  const p = prefixOf(lang)
  const f: Fares = {
    min: eur(lang, TAXI_2026_NUM.minFare),
    km: eur(lang, TAXI_2026_NUM.perKmNight),
    sup: eur(lang, TAXI_2026_NUM.holidayEveSurcharge),
  }
  // Las fuentes de AMB ya tienen su nombre en los cuatro idiomas; en español se escriben aquí.
  const amb = lang === "es" ? { name: "AMB (operador del autobús nocturno)", url: "https://www.amb.cat" } : sourcesOf(lang).amb
  const taxiAmb = lang === "es" ? { name: "AMB Taxi – tarifas urbanas 2026", url: "https://taxi.amb.cat/en/usuaris/tarifes-del-taxi" } : sourcesOf(lang).taxiAmb
  // Rutas: en español /nitbus y /metro; en los demás /{idioma}/night-bus y /{idioma}/metro.
  const metroHref = `${p}/metro`
  const busHref = lang === "es" ? "/nitbus" : `${p}/night-bus`
  const guideBase = lang === "es" ? null : `${p}/guides`

  const links = (items: { label: string; href: string }[]) => ({ t: "links" as const, items })

  const guide: Guide = {
    slug: NYE_SLUG,
    title: t.title,
    h1: t.h1,
    description: t.description,
    lead: t.lead,
    sections: [
      {
        id: "status",
        h2: t.statusH2,
        blocks: [
          { t: "note", tone: "info", title: t.noteTitle, text: t.noteText },
          { t: "table", head: [...t.tableHead], rows: t.rows.map((r) => [...r]), note: t.tableNote },
        ],
      },
      { id: "2025", h2: t.y25H2, blocks: [{ t: "p", text: t.y25Intro }, { t: "ul", items: t.y25 }] },
      { id: "show", h2: t.showH2, blocks: [{ t: "p", text: t.showIntro }, { t: "ul", items: t.show }] },
      {
        id: "home",
        h2: t.homeH2,
        blocks: [
          { t: "ul", items: t.home(f) },
          links([
            { label: t.homeLinks[0], href: metroHref },
            { label: t.homeLinks[1], href: busHref },
            { label: t.homeLinks[2], href: `${p}/essentials/taxi` },
            ...(guideBase ? [{ label: t.homeLinks[3], href: `${guideBase}/how-to-get-home-barcelona-at-night` }] : []),
          ]),
        ],
      },
      {
        id: "safety",
        h2: t.safetyH2,
        blocks: [
          { t: "ul", items: t.safety },
          ...(guideBase ? [links([{ label: t.rulesLabel, href: `${guideBase}/barcelona-nightlife-rules-fines-safety` }])] : []),
        ],
      },
      {
        id: "essentials",
        h2: t.essH2,
        blocks: [
          { t: "p", text: t.essIntro },
          links([
            { label: t.essLinks[0], href: `${p}/essentials/pharmacy` },
            { label: t.essLinks[1], href: `${p}/essentials/food` },
            { label: t.essLinks[2], href: `${p}/essentials/atm` },
          ]),
        ],
      },
    ],
    faq: t.faq(f),
    sources: [
      { name: t.src.xmas, url: SOURCE_URL.xmas },
      { name: t.src.op, url: SOURCE_URL.op },
      { name: t.src.transport, url: SOURCE_URL.transport },
      { name: t.src.show, url: SOURCE_URL.show },
      { name: t.src.y21, url: SOURCE_URL.y21 },
      taxiAmb,
      amb,
    ],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: t.cta, href: "/plan" },
  }
  return lang === "fr" ? frTypo(guide) : guide
}
