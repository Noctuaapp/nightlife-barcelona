// Ratgeber für Touristen auf Deutsch (10/11/2026): /de/guides/[slug]. Gleiche Ratgeber, gleiche Reihenfolge und
// gleiche Adressen wie auf Englisch (lib/intl/en/guides.ts); hier steht nur der übersetzte Text.
//
// Jeder Ratgeber mischt festen Text (Regeln und Tipps, die in offiziellen Quellen geprüft wurden, mit Link am Ende)
// und echte Zahlen von Noctua (wie viele Lokale es gibt, wann sie üblicherweise öffnen, welche Apotheken 24 Stunden
// offen haben...). buildGuide() greift nicht auf die Datenbank zu: Es bekommt die fertig berechneten Zahlen (GuideCtx)
// und liefert den ganzen Ratgeber, lässt sich also mit erfundenen Daten testen. Die Zahlen kommen aus
// lib/intl/guideData.ts.
//
// Regeln: Keine Zahl stammt aus dem Gedächtnis. Was aus einer externen Quelle kommt, hat seinen Link in «sources».
// Was von den Daten von Noctua abhängt, sagt «auf Noctua» und verschwindet, wenn die Stichprobe zu klein ist.

import type { AreaFacts } from "../../areaFacts"
import type { Block, Guide, GuideCtx, GuideMeta, GuideSection, PlaceLine } from "../guideTypes"
import { listOf } from "../clubText"
import { TAXI_PHONES, busRouteOf, eurOf, metroHoursOf, metroNoteOf, sourcesOf, taxiFaresOf } from "../transit"

const L = "de" as const
const METRO_HOURS = metroHoursOf(L)
const METRO_HOURS_NOTE = metroNoteOf(L)
const SOURCES = sourcesOf(L)
const TAXI = taxiFaresOf(L)
const P = "/de"

export const GUIDES_REVIEWED = "2026-11-10"

export const GUIDES: GuideMeta[] = [
  {
    slug: "how-to-get-home-barcelona-at-night",
    title: "Nachts in Barcelona heimkommen: Metro, Nachtbus & Taxi | Noctua",
    h1: "Nachts in Barcelona heimkommen: Metro, Nachtbus und Taxi",
    description:
      "Metro-Zeiten je nach Nacht, die Nachtbusse der N-Linien und wo sie sich treffen, offizielle Taxitarife 2026 und Apps: alles für den Heimweg nach einer Nacht in Barcelona.",
    blurb: "Metro-Zeiten je nach Nacht, Nachtbusse der N-Linien, Taxitarife und Apps.",
  },
  {
    slug: "barcelona-club-entry-id-age-dress-code",
    title: "Clubs in Barcelona: Eintritt, Ausweis, Mindestalter & Dresscode | Noctua",
    h1: "In Barcelonas Clubs kommen: Eintritt, Ausweis, Mindestalter und Dresscode",
    description:
      "Was du an der Tür dabeihaben musst, wie alt du sein musst, was Clubs kosten und wie streng der Dresscode wirklich ist, mit Zahlen aus den Lokalen auf Noctua.",
    blurb: "Ausweis, Mindestalter, Eintrittspreise, Dresscode und Gästelisten.",
  },
  {
    slug: "barcelona-nightlife-what-time-to-go-out",
    title: "Wann in Barcelona ausgehen: Club-Zeiten & was nach 2 Uhr offen ist | Noctua",
    h1: "Wann man in Barcelona ausgeht: Club-Zeiten und was nach 2 Uhr noch offen hat",
    description:
      "Eine typische Nacht Stunde für Stunde: wann Clubs öffnen und schließen, an welchen Abenden Lokale aufhaben und wie viele lange offen bleiben, nach den Lokalen auf Noctua.",
    blurb: "Eine Nacht Stunde für Stunde und wie viele Lokale lange offen bleiben.",
  },
  {
    slug: "24-hour-pharmacies-and-emergency-care-barcelona",
    title: "Apotheken (24 Std.) & Notfallversorgung in Barcelona nachts | Noctua",
    h1: "Apotheken mit 24-Stunden-Dienst und Notfallversorgung in Barcelona nachts",
    description:
      "Apotheken, die in Barcelona die ganze Nacht offen haben, mit Adressen und Telefonnummern, Krankenhäuser mit Notaufnahme und die Nummern, die du anrufst, wenn etwas schiefgeht.",
    blurb: "Nachtapotheken, Krankenhäuser und die Nummern, die du anrufst.",
  },
  {
    slug: "late-night-food-cash-and-essentials-barcelona",
    title: "Essen spät nachts, Supermärkte & Geldautomaten in Barcelona | Noctua",
    h1: "Essen spät nachts, Supermärkte und Bargeld in Barcelona",
    description:
      "Wo du nach dem Club etwas essen kannst, welche Supermärkte und Imbisse 24 Stunden offen haben und wie du Geldautomaten mit hohen Gebühren für ausländische Karten vermeidest.",
    blurb: "Essen nach dem Club, Läden rund um die Uhr und Geldautomaten, die du meiden solltest.",
  },
  {
    slug: "barcelona-nightlife-rules-fines-safety",
    title: "Regeln im Nachtleben von Barcelona: Bußgelder, Sicherheit & Betrug | Noctua",
    h1: "Regeln im Nachtleben von Barcelona: Bußgelder auf der Straße, Sicherheit und Betrug",
    description:
      "Seit Februar 2026 bestraft Barcelona Trinken auf der Straße und Urinieren in der Öffentlichkeit. Was die Regeln sagen, wie Taschendiebe arbeiten und wen du im Notfall anrufst.",
    blurb: "Bußgelder fürs Trinken auf der Straße, Taschendiebe und wen du anrufst.",
  },
  {
    slug: "where-to-go-out-in-barcelona-by-neighbourhood",
    title: "Wo man in Barcelona ausgeht: Nachtleben nach Stadtviertel | Noctua",
    h1: "Wo man in Barcelona ausgeht: Nachtleben nach Stadtviertel",
    description:
      "Die wichtigsten Ausgehviertel Barcelonas mit der Zahl ihrer Lokale, üblichen Eintrittspreisen und Öffnungszeiten, Musikstilen und der nächsten Metro und dem nächsten Nachtbus.",
    blurb: "Viertel für Viertel, mit Eintrittspreisen und Verkehrsanbindung.",
  },
]

export function guideMeta(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

// --- Hilfsfunktionen ----------------------------------------------------------------------------------------------

const eur = (n: number) => eurOf(L, n)
const when = (n: number, one: string, many: string) => (n === 1 ? one : many)
const joinList = (items: string[]) => listOf(L, items)

function priceSentence(f: AreaFacts | null): string | null {
  if (!f?.price) return null
  const { min, max } = f.price
  return min === 0
    ? `Auf Noctua reichen die angegebenen Eintrittspreise der Lokale von kostenlosem Eintritt bis ${eur(max)}.`
    : `Auf Noctua verlangen Lokale, die einen Eintrittspreis angeben, zwischen ${eur(min)} und ${eur(max)}.`
}

function placesBlock(items: PlaceLine[], total: number, noun: string): Block {
  return {
    t: "places",
    items: items.map((p) => ({ name: p.name, line: [p.where, p.phone ? `Tel. ${p.phone}` : ""].filter(Boolean).join(" · ") })),
    more: total > items.length ? `Weitere ${total - items.length} ${noun} stehen in der App.` : undefined,
  }
}

// --- Die Ratgeber -------------------------------------------------------------------------------------------------

function getHome(ctx: GuideCtx): Guide {
  const meta = GUIDES[0]
  const lines = ctx.busLines
  const viaCat = lines.filter((l) => l.catalunya).length
  const notCat = lines.filter((l) => !l.catalunya).map((l) => l.code)
  const first = lines[0]?.code
  const last = lines[lines.length - 1]?.code
  const routeOf = (code: string) => {
    const l = lines.find((x) => x.code === code)
    return l ? busRouteOf(L, l.route) : null
  }
  const airport = ["N17", "N18", "N19"].map((c) => ({ c, r: routeOf(c) })).filter((x): x is { c: string; r: string } => !!x.r)
  const transitRows = ctx.areas
    .filter((a) => a.facts && (a.facts.metro.length > 0 || a.facts.nitbus.length > 0))
    .slice(0, 8)
    .map((a) => [a.name, a.facts!.metro.join(", ") || "–", a.facts!.nitbus.join(", ") || "–"])

  const sections: GuideSection[] = [
    {
      id: "metro",
      h2: "Prüf zuerst die Metro",
      blocks: [
        { t: "p", text: "Die Metro ist der schnellste Weg nach Hause, bis sie aufhört zu fahren, und wann das ist, hängt vom Wochentag ab." },
        { t: "table", head: ["Wann", "Betriebszeiten der Metro"], rows: METRO_HOURS.map((r) => [r.when, r.hours]), note: METRO_HOURS_NOTE },
        {
          t: "p",
          text: "Die Schlusszeiten sind die Abfahrt des letzten Zuges an der Endstation jeder Linie. Verlass dich also nicht darauf, den allerletzten Zug zu erwischen: Sei mit etwas Reserve am Bahnsteig.",
        },
        { t: "links", items: [{ label: "Metrolinien und Stationen", href: `${P}/metro`, note: "jede Linie, Station für Station" }] },
      ],
    },
    {
      id: "night-bus",
      h2: "Wenn die Metro schließt: der Nachtbus (NitBus)",
      blocks: [
        {
          t: "p",
          text:
            lines.length > 0
              ? `Barcelonas Nachtbusse sind die N-Linien. Noctua listet ${lines.length} davon, von ${first} bis ${last}. ${viaCat} der ${lines.length} halten an der Plaça Catalunya, dem zentralen Umsteigepunkt. Wenn du nicht sicher bist, welchen Bus du nehmen sollst, fahr zur Plaça Catalunya und steig dort um.`
              : "Barcelonas Nachtbusse sind die N-Linien. Die meisten halten an der Plaça Catalunya, dem zentralen Umsteigepunkt.",
        },
        {
          t: "ul",
          items: [
            "Zeiten: Nachtbusse fahren in der Regel von etwa 22:00 Uhr bis etwa 05:00–05:30 Uhr, ungefähr alle 20 Minuten. Die genauen Zeiten hängen von der Linie ab, prüf also den Fahrplan der Linie, die du brauchst.",
            "Fahrkarten: Prüf, ob deine Fahrkarte oder dein Ticket im Nachtbus gilt, bevor du dich darauf verlässt.",
            ...(notCat.length > 0 ? [`Linien, die nicht an der Plaça Catalunya halten: ${joinList(notCat)}.`] : []),
            "Jede Linie hat eine eigene Seite mit den Haltestellen der Reihe nach, so findest du die Haltestelle, die dir am nächsten liegt, und weißt, wo du aussteigen musst.",
          ],
        },
        { t: "links", items: [{ label: "Alle Nachtbuslinien", href: `${P}/night-bus`, note: "Strecken, Haltestellen und Umstiege" }] },
      ],
    },
  ]
  if (transitRows.length > 0) {
    sections.push({
      id: "from-areas",
      h2: "Heimweg aus den wichtigsten Ausgehvierteln",
      blocks: [
        {
          t: "table",
          head: ["Viertel", "Nächste Metrostationen", "Nachtbusse in der Nähe"],
          rows: transitRows,
          note: "Auf Grundlage der Lokale in jedem Viertel: Metrostationen im Umkreis von 600 m und Nachtbushaltestellen im Umkreis von 500 m der Lokale.",
        },
        { t: "links", items: [{ label: "Nachtleben nach Stadtviertel", href: `${P}/guides/where-to-go-out-in-barcelona-by-neighbourhood` }] },
      ],
    })
  }
  sections.push(
    {
      id: "taxi",
      h2: "Taxi und Fahrdienste",
      blocks: [
        {
          t: "p",
          text: "Offizielle Taxis sind schwarz-gelb, haben ein Taxameter und sind reguliert. Ein grünes Licht auf dem Dach bedeutet, dass das Taxi frei ist. Viele Straßen im Gotischen Viertel, im Raval und im Born sind Fußgängerzonen. Such dir deshalb einen Ausstiegspunkt an der nächsten befahrbaren Straße.",
        },
        {
          t: "ul",
          items: [
            `Nachttarif (T-2): gilt werktags von 20:00 bis 08:00 Uhr sowie samstags und an Feiertagen. Mindestpreis ${TAXI.minFare}, dann ${TAXI.perKmNight} pro km.`,
            `Zuschläge: ${TAXI.airportSurcharge} für den Flughafen, ${TAXI.satsSurcharge} bei Abfahrt vom Bahnhof Sants und ${TAXI.holidayEveSurcharge} in manchen Nächten vor Feiertagen.`,
            `Bei Bestellung per Telefon oder App gilt ein Mindestpreis von ${TAXI.appBookingMinimum}.`,
            "Die meisten offiziellen Taxis nehmen Karten: Frag nach, bevor du einsteigst, und lass dir eine Quittung geben (un recibo).",
            ...TAXI_PHONES.map((p) => `${p.name}: ${p.phone}`),
          ],
        },
        {
          t: "p",
          text: "Taxi-Apps wie FREE NOW bestellen offizielle Taxis zu den regulierten Tarifen. Auch Fahrdienst-Apps wie Uber, Cabify und Bolt funktionieren in Barcelona; die Regeln dafür haben sich in den letzten Jahren geändert, prüf also vor dem Bestellen die Verfügbarkeit und den in der App angezeigten Preis.",
        },
        {
          t: "note",
          tone: "warn",
          title: "Nur lizenzierte Fahrten nutzen",
          text: "Ignoriere Leute, die dich vor Clubs ansprechen und eine Fahrt anbieten. Nimm ein Taxi von der Straße oder vom Taxistand oder bestell über eine App.",
        },
        { t: "links", items: [{ label: "Taxistände und Telefonnummern", href: `${P}/essentials/taxi` }] },
      ],
    },
    {
      id: "airport",
      h2: "Nachts zum Flughafen",
      blocks: [
        {
          t: "ul",
          items: [
            ...airport.map((a) => `${a.c}: ${a.r}.`),
            `Taxi: Für eine Fahrt, die am Flughafen beginnt, gilt ein Mindestpreis von ${TAXI.fromAirportMinimum}.`,
          ],
        },
      ],
    },
    {
      id: "safety",
      h2: "Sicher auf dem Heimweg",
      blocks: [
        {
          t: "ul",
          items: [
            "Handys und Geldbörsen sind das Ziel von Taschendieben auf vollen Metro-Bahnsteigen, rund um die Rambla und im Gotischen Viertel. Trag sie in der vorderen Hosentasche oder in einer Tasche mit Reißverschluss.",
            "Vereinbart, wo ihr euch trefft, falls die Gruppe sich trennt, und lad dein Handy auf.",
            "Im Notfall ruf die 112 an. Für die Stadtpolizei (Guàrdia Urbana) wähl die 092.",
          ],
        },
        { t: "links", items: [{ label: "Regeln, Bußgelder und Sicherheit in der Nacht", href: `${P}/guides/barcelona-nightlife-rules-fines-safety` }] },
      ],
    },
  )

  return {
    ...meta,
    lead: "In Barcelona kommst du nachts gut herum, wenn du die Regeln kennst: Die Metro fährt freitags lange und samstags die ganze Nacht, ein Netz von N-Linien übernimmt, wenn sie schließt, und Taxis mit Taxameter gibt es reichlich.",
    sections,
    faq: [
      {
        q: "Fährt die Metro in Barcelona die ganze Nacht?",
        a: "Nur in den Nächten auf Sonntag, wenn sie von Samstagmorgen bis Sonntag um Mitternacht durchgehend fährt, und in ein paar besonderen Nächten wie Sant Joan und Silvester. Freitags und am Vorabend eines Feiertags ist um 02:00 Uhr Schluss, in den anderen Nächten um Mitternacht.",
      },
      {
        q: "Gibt es in Barcelona einen Nachtbus?",
        a:
          lines.length > 0
            ? `Ja. Das NitBus-Netz hat in der Liste von Noctua ${lines.length} N-Linien, ${viaCat} davon halten an der Plaça Catalunya. Die Busse fahren in der Regel von etwa 22:00 Uhr bis etwa 05:00–05:30 Uhr, ungefähr alle 20 Minuten; prüf den Fahrplan deiner Linie.`
            : "Ja. Das NitBus-Netz der N-Linien deckt die Stadt von etwa 22:00 Uhr bis etwa 05:00–05:30 Uhr ab, ungefähr alle 20 Minuten, und die meisten Linien halten an der Plaça Catalunya.",
      },
      {
        q: "Was kostet ein Taxi nachts in Barcelona?",
        a: `Nachts gilt der offizielle Tarif (T-2) mit einem Mindestpreis von ${TAXI.minFare} und ${TAXI.perKmNight} pro km, dazu Zuschläge wie ${TAXI.airportSurcharge} für den Flughafen. Bei Bestellung per Telefon oder App gilt ein Mindestpreis von ${TAXI.appBookingMinimum}. Das sind die von AMB veröffentlichten Stadttarife 2026.`,
      },
      {
        q: "Gibt es Uber in Barcelona?",
        a: "Fahrdienst-Apps wie Uber, Cabify und Bolt funktionieren in Barcelona, aber die Regeln dafür haben sich in den letzten Jahren geändert. Prüf die Verfügbarkeit und den Preis in der App. Die App FREE NOW bestellt offizielle Taxis zu den regulierten Tarifen.",
      },
      {
        q: "Wie komme ich nachts zum Flughafen?",
        a:
          airport.length > 0
            ? `Die Nachtbusse ${joinList(airport.map((a) => a.c))} fahren zum Flughafen, und Taxis fahren die ganze Nacht. Für ein Taxi ab dem Flughafen gilt ein Mindestpreis von ${TAXI.fromAirportMinimum}.`
            : `Nimm ein Taxi: Für eine Fahrt, die am Flughafen beginnt, gilt ein Mindestpreis von ${TAXI.fromAirportMinimum}.`,
      },
    ],
    sources: [SOURCES.tmbHours, SOURCES.taxiAmb, SOURCES.amb],
    related: ["barcelona-nightlife-what-time-to-go-out", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Finde deine nächste Haltestelle in der App", href: "/nitbus" },
  }
}

function getEntry(ctx: GuideCtx): Guide {
  const meta = GUIDES[1]
  const f = ctx.facts
  const price = priceSentence(f)
  const ageTop = ctx.ages.slice(0, 3)
  const dressTop = ctx.dress.slice(0, 4)
  const sections: GuideSection[] = [
    {
      id: "door",
      h2: "An der Tür: Ausweis und Alter",
      blocks: [
        {
          t: "p",
          text: "Nimm deinen Reisepass oder Personalausweis mit. Das Türpersonal kann von jedem, der jung aussieht, einen Ausweis verlangen, und ohne ihn kannst du abgewiesen werden. Ein Foto auf dem Handy wird nicht immer akzeptiert, bring also das Dokument selbst mit.",
        },
        {
          t: "p",
          text: "Das gesetzliche Mindestalter für den Alkoholausschank beträgt in Katalonien 18 Jahre. Lokale können ein höheres Mindestalter festlegen, und manche Clubs verlangen 21 oder mehr.",
        },
        ...(ageTop.length > 0 && ctx.withAge >= 10
          ? [
              {
                t: "table" as const,
                head: ["Mindestalter", "Lokale auf Noctua"],
                rows: ageTop.map((a) => [`${a.age}+`, String(a.n)]),
                note: `Unter den ${ctx.withAge} Lokalen, die ein Mindestalter angeben.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "prices",
      h2: "Was Clubs kosten",
      blocks: [
        ...(price ? [{ t: "p" as const, text: price }] : []),
        {
          t: "ul",
          items: [
            "Viele Clubs schließen ein Getränk im Eintrittspreis ein. Auf der Seite des Lokals siehst du, ob das dort der Fall ist.",
            "Tickets, die du vorab online kaufst, sind oft günstiger als an der Tür, und meist sparst du dir damit die Schlange.",
            "Manche Lokale sind früh am Abend oder mit Gästeliste kostenlos. Frag genau nach, was enthalten ist, bevor du ein Angebot annimmst.",
          ],
        },
        { t: "links", items: [{ label: "Clubs und Bars ansehen", href: `${P}/clubs` }] },
      ],
    },
    {
      id: "dress",
      h2: "Dresscode",
      blocks: [
        {
          t: "p",
          text: "Die meisten Lokale sind entspannt, aber manche Clubs setzen an der Tür einen Dresscode durch. Badekleidung, Flip-Flops und Sportkleidung sind häufige Gründe für eine Abweisung; geschlossene Schuhe und ein sauberes, schlichtes Outfit sind eine sichere Wahl.",
        },
        ...(dressTop.length > 0 && ctx.withDress >= 10
          ? [
              {
                t: "table" as const,
                head: ["Dresscode", "Lokale auf Noctua"],
                rows: dressTop.map((d) => [d.label, String(d.n)]),
                note: `Unter den ${ctx.withDress} Lokalen, die einen Dresscode angeben. Die Seite jedes Lokals zeigt den eigenen.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "promoters",
      h2: "Promoter und Gästelisten",
      blocks: [
        {
          t: "p",
          text: "Vor den großen Clubs begegnest du Promotern, die Gästelisten- oder Freieintritt-Angebote verteilen. Manche sind seriös, andere nicht der Rede wert. Frag, bevor du einem folgst, was enthalten ist (nur Eintritt oder Eintritt mit Getränk), ob es ein Zeitlimit gibt und wie viel du an der Tür zahlst. Eine offizielle Ticketseite oder die Gästeliste des Lokals selbst ist die sicherste Möglichkeit.",
        },
      ],
    },
    {
      id: "queue",
      h2: "In der Schlange",
      blocks: [
        {
          t: "ul",
          items: [
            "Das Personal kann jedem den Einlass verweigern, der sichtbar betrunken ist. Lass es also schon vor der Ankunft ruhig angehen.",
            "Trink nicht in der Schlange und sei leise: Über vielen Lokalen wohnen Anwohner.",
            "Halte Handy und Geldbörse beim Warten außer Sicht. Schlangen sind ein beliebter Ort für Taschendiebe.",
          ],
        },
      ],
    },
  ]
  return {
    ...meta,
    lead: "In Barcelonas Clubs kommst du leicht hinein, wenn du den richtigen Ausweis dabeihast, zu einer vernünftigen Uhrzeit kommst und dich so anziehst, als gingst du aus. Das erwartet dich, mit Zahlen aus den Lokalen, die auf Noctua gelistet sind.",
    sections,
    faq: [
      {
        q: "Brauche ich einen Reisepass, um in einen Club in Barcelona zu kommen?",
        a: "Nimm deinen Reisepass oder Personalausweis mit. Das Türpersonal kann von jedem, der jung aussieht, einen Ausweis verlangen, und ohne ihn kannst du abgewiesen werden.",
      },
      {
        q: "Ab welchem Alter darf man in Barcelona in Clubs?",
        a: "Das gesetzliche Mindestalter für den Alkoholausschank beträgt in Katalonien 18 Jahre. Einzelne Lokale können ein höheres Mindestalter festlegen, manche verlangen 21 oder mehr. Die Seite jedes Lokals auf Noctua zeigt das Mindestalter, wenn es bekannt ist.",
      },
      {
        q: "Was kostet der Eintritt in einen Club in Barcelona?",
        a: price
          ? `${price} Viele Clubs schließen ein Getränk im Eintrittspreis ein, und online gekaufte Tickets sind oft günstiger.`
          : "Die Preise schwanken stark je nach Club und Nacht. Viele Clubs schließen ein Getränk im Eintrittspreis ein, und online gekaufte Tickets sind oft günstiger als an der Tür.",
      },
      {
        q: "Gibt es einen Dresscode?",
        a: "Die meisten Lokale sind entspannt, aber manche Clubs setzen an der Tür einen Dresscode durch. Vermeide Badekleidung, Flip-Flops und Sportkleidung und trag geschlossene Schuhe.",
      },
    ],
    sources: [],
    related: ["barcelona-nightlife-what-time-to-go-out", "where-to-go-out-in-barcelona-by-neighbourhood"],
    cta: { label: "Eintrittspreis und Dresscode jedes Lokals ansehen", href: `${P}/clubs` },
  }
}

function busiestNights(nights: { day: string; n: number }[]): string {
  const sorted = [...nights].sort((a, b) => b.n - a.n)
  const [a, b] = sorted
  if (!a || !b) return ""
  return `Auf Noctua haben am ${a.day} und am ${b.day} die meisten Lokale geöffnet.`
}

function getTime(ctx: GuideCtx): Guide {
  const meta = GUIDES[2]
  const f = ctx.facts
  const usual = f?.hours ? `Auf Noctua ist die häufigste Öffnungszeit ${f.hours.open} Uhr und die häufigste Schließzeit ${f.hours.close} Uhr.` : null
  const late = f?.late && f.late.of >= 10 ? `${f.late.n} der ${f.late.of} Lokale mit Öffnungszeiten auf Noctua haben nach 02:30 Uhr noch offen.` : null
  const nights = ctx.nightsOpen.filter((n) => n.n > 0)
  const sections: GuideSection[] = [
    {
      id: "timeline",
      h2: "Eine typische Nacht, Stunde für Stunde",
      blocks: [
        {
          t: "table",
          head: ["Uhrzeit", "Was passiert"],
          rows: [
            ["21:00–23:00", "Abendessen. Spanien isst spät: Die Restaurants füllen sich ab etwa 21:00 bis 22:00 Uhr."],
            ["23:00–01:00", "Drinks in einer Bar oder auf einer Terrasse. In den Clubs ist noch wenig los."],
            ["00:00–02:00", "Die Clubs öffnen ihre Türen. Früher Einlass ist oft günstiger oder frei."],
            ["02:00–04:00", "Die vollsten Stunden in den meisten Clubs."],
            ["05:00–06:00", "Die meisten Clubs schließen. Die Metro fährt werktags ab 05:00 Uhr wieder und samstagnachts durchgehend."],
          ],
          note: "Ein allgemeines Muster: Jedes Lokal legt seine Zeiten selbst fest.",
        },
        ...(usual ? [{ t: "p" as const, text: usual }] : []),
        ...(late ? [{ t: "p" as const, text: late }] : []),
      ],
    },
  ]
  if (nights.length >= 4) {
    sections.push({
      id: "nights",
      h2: "An welchen Abenden haben die Lokale geöffnet?",
      blocks: [
        {
          t: "table",
          head: ["Abend", "Geöffnete Lokale auf Noctua"],
          rows: nights.map((n) => [n.day, String(n.n)]),
          note: "Zählt Lokale, deren Öffnungszeiten oder Öffnungstage bekannt sind. Die Nacht zählt ab dem Abend: Die Freitagnacht schließt die frühen Morgenstunden des Samstags ein.",
        },
        {
          t: "p",
          text: `${busiestNights(nights)} Viele Lokale haben nur an manchen Abenden der Woche geöffnet, prüf das Lokal also, bevor du losgehst.`,
        },
      ],
    })
  }
  sections.push(
    {
      id: "late",
      h2: "Was nach 2 Uhr noch offen hat",
      blocks: [
        {
          t: "p",
          text: "Clubs und manche Bars bleiben bis 05:00 oder 06:00 Uhr offen. Für alles andere sind die Dinge, die die ganze Nacht erreichbar sind, Apotheken, einige Supermärkte und Imbisse sowie der Verkehr, den du für den Heimweg brauchst.",
        },
        {
          t: "links",
          items: [
            { label: "Essen spät nachts, Supermärkte und Geldautomaten", href: `${P}/guides/late-night-food-cash-and-essentials-barcelona` },
            { label: "Apotheken (24 Std.) und Notfallversorgung", href: `${P}/guides/24-hour-pharmacies-and-emergency-care-barcelona` },
            { label: "Heimkommen: Metro, Nachtbus und Taxi", href: `${P}/guides/how-to-get-home-barcelona-at-night` },
          ],
        },
      ],
    },
    {
      id: "tips",
      h2: "Tipps für die Planung deiner Nacht",
      blocks: [
        {
          t: "ul",
          items: [
            "Entscheide vor dem Ausgehen, wie du heimkommst. Von Montag bis Donnerstag hält die Metro um Mitternacht.",
            "Kauf Tickets für große Nächte online; sie sind oft günstiger und sparen dir die Schlange.",
            "Prüf die Zeiten des Lokals: Viele haben nur von Donnerstag bis Samstag geöffnet.",
          ],
        },
      ],
    },
  )
  return {
    ...meta,
    lead: "Barcelona geht spät aus. Das Abendessen ist um 21:00 Uhr oder später, die Clubs öffnen gegen Mitternacht und werden nach 02:00 Uhr voll. So sieht das Muster aus, mit Zahlen aus den Lokalen, die auf Noctua gelistet sind.",
    sections,
    faq: [
      {
        q: "Wann öffnen die Clubs in Barcelona?",
        a: f?.hours
          ? `Clubs öffnen in der Regel gegen Mitternacht und bleiben bis 05:00–06:00 Uhr offen. Auf Noctua ist die häufigste Öffnungszeit ${f.hours.open} Uhr und die häufigste Schließzeit ${f.hours.close} Uhr.`
          : "Clubs öffnen in der Regel gegen Mitternacht und bleiben bis 05:00–06:00 Uhr offen.",
      },
      {
        q: "Wann beginnt das Nachtleben in Barcelona?",
        a: "Das Abendessen ist spät, ab 21:00 Uhr. Die Bars füllen sich ab etwa 23:00 Uhr, die Clubs öffnen gegen Mitternacht und sind zwischen 02:00 und 04:00 Uhr am vollsten.",
      },
      {
        q: "Was hat in Barcelona nach 2 Uhr noch offen?",
        a: late
          ? `${late} Apotheken, einige Supermärkte und Imbisse haben ebenfalls die ganze Nacht geöffnet.`
          : "Clubs und manche Bars bleiben bis 05:00 oder 06:00 Uhr offen. Apotheken, einige Supermärkte und Imbisse haben ebenfalls die ganze Nacht geöffnet.",
      },
      {
        q: "Wann hört die Metro auf zu fahren?",
        a: "Von Sonntag bis Donnerstag um Mitternacht, freitags und am Vorabend eines Feiertags um 02:00 Uhr, und samstags fährt sie die ganze Nacht.",
      },
    ],
    sources: [SOURCES.tmbHours],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-club-entry-id-age-dress-code"],
    cta: { label: "In der App sehen, was gerade offen ist", href: "/clubs" },
  }
}

function getPharmacy(ctx: GuideCtx): Guide {
  const meta = GUIDES[3]
  const n = ctx.pharmacies24Total
  const sections: GuideSection[] = [
    {
      id: "pharmacies",
      h2: "Apotheken mit 24-Stunden-Dienst",
      blocks: [
        {
          t: "p",
          text:
            n > 0
              ? `Noctua listet ${ctx.pharmaciesTotal} Apotheken im Raum Barcelona, ${n} davon rund um die Uhr geöffnet. Die Zeiten können sich ändern, ruf also vorher an, wenn du einen weiten Weg hast.`
              : "Ruf an, bevor du losfährst: Öffnungszeiten ändern sich, und Karten-Apps sind nicht immer aktuell.",
        },
        ...(n > 0 ? [placesBlock(ctx.pharmacies24, n, "Apotheken mit 24-Stunden-Dienst")] : []),
        { t: "links", items: [{ label: "Alle Apotheken auf Noctua", href: `${P}/essentials/pharmacy` }] },
      ],
    },
    {
      id: "how",
      h2: "Eine Apotheke in Spanien nutzen",
      blocks: [
        {
          t: "ul",
          items: [
            "Apotheken (farmacias) erkennst du am grünen Kreuz. Der Apotheker kann bei kleineren Beschwerden beraten.",
            "Manche Medikamente sind verschreibungspflichtig. Nimm den Namen des Wirkstoffs (den generischen Namen) mit, denn Markennamen unterscheiden sich von Land zu Land.",
            "Nachts bedienen Apotheken mit 24-Stunden-Dienst manchmal durch ein kleines Fenster oder eine Klappe.",
            "Die Zeiten in Karten-Apps können veraltet sein: Wenn du weit weg bist, ruf vorher an.",
          ],
        },
      ],
    },
    {
      id: "emergency",
      h2: "Notrufnummern",
      blocks: [
        {
          t: "table",
          head: ["Nummer", "Wofür"],
          rows: [
            ["112", "Jeder Notfall: Krankenwagen, Polizei oder Feuerwehr. Von jedem Telefon aus kostenlos."],
            ["061", "Gesundheitsberatung in Katalonien (Salut Respon)."],
            ["092", "Stadtpolizei (Guàrdia Urbana)."],
          ],
        },
        {
          t: "note",
          title: "Reiseversicherung",
          text: "EU-Bürger können mit der Europäischen Krankenversicherungskarte die öffentliche Gesundheitsversorgung nutzen (Besucher aus dem Vereinigten Königreich mit der GHIC). Alle anderen sollten eine Reiseversicherung haben. Halte deine Versicherungsnummer auf dem Handy bereit.",
        },
      ],
    },
  ]
  if (ctx.hospitals.length > 0) {
    sections.push({
      id: "hospitals",
      h2: "Krankenhäuser",
      blocks: [
        { t: "p", text: "Große öffentliche Krankenhäuser haben eine Notaufnahme (urgències), die Tag und Nacht geöffnet ist. Ruf bei allem Dringenden die 112 an, statt allein loszufahren." },
        placesBlock(ctx.hospitals, ctx.hospitalsTotal, "Krankenhäuser"),
        { t: "links", items: [{ label: "Krankenhäuser auf Noctua", href: `${P}/essentials/hospital` }] },
      ],
    })
  }
  return {
    ...meta,
    lead: "Wenn du mitten in der Nacht Medikamente oder einen Arzt brauchst, erfährst du hier, wohin du in Barcelona gehst und welche Nummern du anrufst.",
    sections,
    faq: [
      {
        q: "Welche Apotheken haben in Barcelona 24 Stunden geöffnet?",
        a:
          n > 0
            ? `Noctua listet ${n} Apotheken mit 24-Stunden-Dienst, zum Beispiel ${ctx.pharmacies24
                .slice(0, 3)
                .map((p) => p.name)
                .join(", ")}. Die vollständige Liste mit Adressen steht auf dieser Seite.`
            : "Manche Apotheken haben die ganze Nacht geöffnet. Schau in die Liste in der App und ruf vorher an, denn die Zeiten ändern sich.",
      },
      {
        q: "Welche Nummer rufe ich in Barcelona bei einem medizinischen Notfall an?",
        a: "Ruf die 112 an. Sie ist von jedem Telefon aus kostenlos und funktioniert in ganz Spanien und der EU. Für Gesundheitsberatung in Katalonien kannst du auch die 061 anrufen.",
      },
      {
        q: "Kann ich in Spanien Medikamente ohne Rezept kaufen?",
        a: "Manche Medikamente bekommst du ohne Rezept, andere sind verschreibungspflichtig. Der Apotheker sagt es dir. Nimm den generischen Namen des Medikaments mit, denn Markennamen unterscheiden sich von Land zu Land.",
      },
    ],
    sources: [],
    related: ["late-night-food-cash-and-essentials-barcelona", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Die nächste Apotheke in der App finden", href: "/essentials/pharmacy" },
  }
}

function getFood(ctx: GuideCtx): Guide {
  const meta = GUIDES[4]
  const sections: GuideSection[] = [
    {
      id: "food",
      h2: "Essen nach dem Club",
      blocks: [
        {
          t: "p",
          text:
            ctx.food24.length > 0
              ? `Noctua listet ${ctx.food24Total} Imbisse und Lokale, die 24 Stunden geöffnet haben. Döner, Pizza vom Stück und Fast Food bleiben offen, wenn die Küchen normaler Restaurants schon geschlossen haben.`
              : "Döner, Pizza vom Stück und Fast Food bleiben offen, wenn die Küchen normaler Restaurants schon geschlossen haben.",
        },
        ...(ctx.food24.length > 0 ? [placesBlock(ctx.food24, ctx.food24Total, "Imbisse und Lokale mit 24-Stunden-Betrieb")] : []),
        { t: "links", items: [{ label: "Essen spät nachts auf Noctua", href: `${P}/essentials/food` }] },
      ],
    },
    {
      id: "supermarkets",
      h2: "Supermärkte, die spät offen haben",
      blocks: [
        {
          t: "p",
          text:
            ctx.supermarkets24.length > 0
              ? `Noctua listet ${ctx.supermarkets24Total} Supermärkte und Lebensmittelgeschäfte, die 24 Stunden geöffnet haben. Sie sind praktisch für Wasser, Snacks und das Nötigste.`
              : "Manche Supermärkte und Lebensmittelgeschäfte bleiben lange offen. Schau in der App nach den Zeiten.",
        },
        ...(ctx.supermarkets24.length > 0 ? [placesBlock(ctx.supermarkets24, ctx.supermarkets24Total, "Supermärkte mit 24-Stunden-Betrieb")] : []),
        { t: "links", items: [{ label: "Supermärkte auf Noctua", href: `${P}/essentials/supermarket` }] },
      ],
    },
    {
      id: "cash",
      h2: "Bargeld und Geldautomaten",
      blocks: [
        {
          t: "p",
          text: "Karten werden fast überall akzeptiert, aber etwas Bargeld ist praktisch für kleine Bars und Straßenstände.",
        },
        {
          t: "ul",
          items: [
            "Meide unabhängige Geldautomaten wie die Euronet-Automaten in Touristengegenden. Sie verlangen von ausländischen Karten hohe Gebühren und schlechte Wechselkurse.",
            "Nutz Automaten, die zu einer Bank gehören, etwa CaixaBank, Santander, BBVA oder Sabadell.",
            "Wenn der Automat anbietet, in deiner Heimatwährung abzurechnen, wähl Euro. Der Umrechnungskurs ist meist schlechter.",
          ],
        },
        ...(ctx.highFeeAtms > 0
          ? [
              {
                t: "note" as const,
                title: "Noctua markiert die teuren",
                text: `Noctua markiert ${ctx.highFeeAtms} der ${ctx.atmsTotal} gelisteten Geldautomaten als teuer, damit du sie meiden kannst.`,
                tone: "info" as const,
              },
            ]
          : []),
        { t: "links", items: [{ label: "Geldautomaten auf Noctua", href: `${P}/essentials/atm` }] },
      ],
    },
  ]
  return {
    ...meta,
    lead: "Nach dem Club brauchst du Essen, Wasser, Bargeld oder eine Apotheke. Das bleibt in Barcelona spät noch offen und so zahlst du nicht mehr als nötig.",
    sections,
    faq: [
      {
        q: "Gibt es in Barcelona Supermärkte, die 24 Stunden offen haben?",
        a:
          ctx.supermarkets24.length > 0
            ? `Ja. Noctua listet ${ctx.supermarkets24Total} Supermärkte und Lebensmittelgeschäfte mit 24-Stunden-Betrieb. Prüf die Zeiten in der App, bevor du losgehst.`
            : "Manche bleiben lange offen, aber prüf die Zeiten in der App, bevor du losgehst.",
      },
      {
        q: "Welche Geldautomaten sollte ich in Barcelona meiden?",
        a: "Meide unabhängige Euronet-Automaten in Touristengegenden. Sie verlangen von ausländischen Karten hohe Gebühren und schlechte Wechselkurse. Nutz Automaten, die zu einer Bank gehören, und wähl die Abrechnung in Euro.",
      },
      {
        q: "Wo kann ich in Barcelona um 4 Uhr morgens essen?",
        a:
          ctx.food24.length > 0
            ? `Noctua listet ${ctx.food24Total} Imbisse und Lokale mit 24-Stunden-Betrieb, meist Döner, Pizza und Fast Food. Die Liste steht auf dieser Seite.`
            : "Döner, Pizza vom Stück und Fast Food sind die üblichen Optionen. Schau in der App nach den Zeiten.",
      },
    ],
    sources: [],
    related: ["24-hour-pharmacies-and-emergency-care-barcelona", "how-to-get-home-barcelona-at-night"],
    cta: { label: "Finde, was in deiner Nähe offen ist", href: "/essentials" },
  }
}

function getRules(): Guide {
  const meta = GUIDES[5]
  return {
    ...meta,
    lead: "Barcelonas neue Verordnung zum Zusammenleben ist am 15. Februar 2026 in Kraft getreten. Sie hat die Bußgelder für das erhöht, was Besucher auf einer Nacht draußen am häufigsten falsch machen. Das steht darin, und so bleibst du aus dem Ärger.",
    sections: [
      {
        id: "street",
        h2: "Trinken auf der Straße",
        blocks: [
          { t: "p", text: "Alkohol auf der Straße zu trinken ist in Barcelona nicht erlaubt. Die neue Verordnung sieht diese Bußgelder vor:" },
          {
            t: "table",
            head: ["Verstoß", "Bußgeld"],
            rows: [
              ["Alkohol auf der Straße trinken (leichter Verstoß)", "100 € bis 600 €"],
              ["Dasselbe an einem besonders überfüllten Ort oder vor Minderjährigen", "750 € bis 1.500 €"],
              ["Öffentliches Urinieren", "Bis zu 300 €"],
              ["Urinieren in der Nähe öffentlicher Toiletten, rund um Bars oder Nachtclubs oder in einer Straße, die weniger als vier Meter breit ist", "Bis zu 750 €"],
              ["Besonders schwere Fälle von öffentlichem Urinieren (vor allem an überfüllten Orten, an Orten, die Minderjährige besuchen, oder an denkmalgeschützten Orten)", "750 € bis 1.500 €"],
              ["Trinkrouten (touristische Touren, die mehrere Bars besuchen, mit dem Hauptziel, Alkohol zu trinken)", "1.500 € bis 3.000 €"],
            ],
            note: "Quelle: Ara, die wichtigsten Punkte der neuen Verordnung (siehe Quellen).",
          },
          {
            t: "p",
            text: "Bei leichten Verstößen und bei Personen, die im Ausland wohnen, können Beamte der Guàrdia Urbana mit Kartenterminal die Zahlung vor Ort anbieten, mit einem Nachlass von bis zu 50 %, wenn du innerhalb von zehn Tagen nach der Benachrichtigung zahlst. Es bleibt trotzdem ein Bußgeld.",
          },
          { t: "note", title: "In der Praxis", text: "Trink in einer Bar oder auf einer Terrasse und geh in einer Bar auf die Toilette, bevor du gehst. Eine Dose vom Straßenverkäufer, die du draußen trinkst, ist das Bußgeld nicht wert.", tone: "warn" },
        ],
      },
      {
        id: "theft",
        h2: "Taschendiebe und Handydiebstahl",
        blocks: [
          {
            t: "ul",
            items: [
              "Taschendiebe arbeiten an überfüllten Orten: auf der Rambla, im Gotischen Viertel, auf Metro-Bahnsteigen und in den Schlangen vor Clubs. Trag Handy und Geldbörse in der vorderen Hosentasche oder in einer Tasche mit Reißverschluss.",
              "Leg dein Handy nicht auf einen Tisch oder an den Rand einer Terrasse.",
              "Sei vorsichtig bei Fremden, die dich anrempeln, dir die Hand schütteln oder dir etwas geben wollen. Oft lenken sie dich nur ab.",
              "Wenn dir etwas gestohlen wird, erstatte Anzeige bei einer Polizeiwache (hacer una denuncia). Deine Versicherung verlangt die Anzeige.",
            ],
          },
        ],
      },
      {
        id: "drinks",
        h2: "Auf dich und dein Getränk aufpassen",
        blocks: [
          {
            t: "ul",
            items: [
              "Lass dein Getränk nie unbeaufsichtigt und nimm keine Getränke von Fremden an.",
              "Wenn dir schlecht wird, sag dem Personal oder einem Freund Bescheid und ruf die 112 an.",
              "Vereinbart vor dem Ausgehen in der Gruppe einen Treffpunkt und einen Heimweg.",
            ],
          },
        ],
      },
      {
        id: "help",
        h2: "Wen du anrufst",
        blocks: [
          {
            t: "table",
            head: ["Nummer", "Wofür"],
            rows: [
              ["112", "Jeder Notfall: Krankenwagen, Polizei oder Feuerwehr. Von jedem Telefon aus kostenlos."],
              ["092", "Stadtpolizei (Guàrdia Urbana)."],
              ["061", "Gesundheitsberatung in Katalonien."],
            ],
          },
          { t: "links", items: [{ label: "Apotheken (24 Std.) und Notfallversorgung", href: `${P}/guides/24-hour-pharmacies-and-emergency-care-barcelona` }] },
        ],
      },
    ],
    faq: [
      {
        q: "Darf man in Barcelona auf der Straße Alkohol trinken?",
        a: "Nein. Nach der seit dem 15. Februar 2026 geltenden Verordnung kann das Trinken von Alkohol auf der Straße mit 100 € bis 600 € bestraft werden, an besonders überfüllten Orten oder vor Minderjährigen mit 750 € bis 1.500 €.",
      },
      {
        q: "Wie hoch ist das Bußgeld fürs öffentliche Urinieren in Barcelona?",
        a: "Im Allgemeinen bis zu 300 €, bis zu 750 € in der Nähe öffentlicher Toiletten, rund um Bars oder Nachtclubs oder in Straßen, die weniger als vier Meter breit sind, und 750 € bis 1.500 € in besonders schweren Fällen.",
      },
      {
        q: "Ist Barcelona nachts sicher?",
        a: "Die meisten Besucher haben keine Probleme, aber Taschendiebstahl ist an überfüllten Orten verbreitet. Halte Handy und Geldbörse außer Sicht und lass Getränke nicht unbeaufsichtigt.",
      },
    ],
    sources: [SOURCES.ordinance],
    related: ["how-to-get-home-barcelona-at-night", "24-hour-pharmacies-and-emergency-care-barcelona"],
    cta: { label: "Plane deine Nacht in der App", href: "/plan" },
  }
}

// Ein Satz zu jedem Viertel, das man seit jeher kennt; steht das Viertel nicht hier, erscheinen nur seine Daten.
const AREA_NOTES: [RegExp, string][] = [
  [/raval/, "Kompakt und lebendig, mit günstigen Bars, Livemusik und Nachtlokalen direkt an der Rambla."],
  [/gracia/, "Dorfatmosphäre, mit Plätzen voller Lokale aus der Nachbarschaft. Eher entspannt als clubbig."],
  [/poble-?sec/, "Der Carrer de Blai für Tapas und die Avinguda del Paral·lel mit Theatern und Musiklokalen."],
  [/eixample/, "Das Schachbrettmuster der Innenstadt, mit vielen Cocktailbars, Restaurants und LGBTQ+-Lokalen."],
  [/barceloneta|olimpic/, "Strandpromenade und Hafen, wo die großen Clubs und Strandbars sind."],
  [/poblenou|poble-nou/, "Ein ehemaliges Industrieviertel am Strand, bekannt für größere Clubs und elektronische Musik."],
  [/born|ribera|sant-pere/, "Enge mittelalterliche Gassen mit Cocktailbars und kleinen Lokalen."],
  [/gotic|gothic/, "Die Altstadt: Bars und Clubs rund um die Plaça Reial und in den Gassen abseits der Rambla."],
  [/sants/, "Wohnviertel mit viel Lokalkolorit, mit Bars und Clubs nahe dem Bahnhof Sants."],
]

function areaNote(slug: string): string | null {
  const hit = AREA_NOTES.find(([rx]) => rx.test(slug))
  return hit ? hit[1] : null
}

function getAreas(ctx: GuideCtx): Guide {
  const meta = GUIDES[6]
  const blocks: Block[] = []
  for (const a of ctx.areas.slice(0, 10)) {
    const f = a.facts
    const parts: string[] = []
    const note = areaNote(a.slug)
    if (note) parts.push(note)
    parts.push(`${a.count} ${when(a.count, "Lokal", "Lokale")} gelistet.`)
    if (f?.price) parts.push(f.price.min === 0 ? `Eintritt: gratis bis ${eur(f.price.max)}.` : `Eintritt: ${eur(f.price.min)}–${eur(f.price.max)}.`)
    if (f?.hours) parts.push(`Meist geöffnet ${f.hours.open}–${f.hours.close} Uhr.`)
    if (f?.metro.length) parts.push(`Metro: ${f.metro.join(", ")}.`)
    if (f?.nitbus.length) parts.push(`Nachtbusse: ${f.nitbus.join(", ")}.`)
    blocks.push({ t: "places", items: [{ name: a.name, line: parts.join(" ") }] })
    blocks.push({ t: "links", items: [{ label: `Lokale in ${a.name}`, href: `${P}/neighbourhoods/${a.slug}` }] })
  }
  return {
    ...meta,
    lead: "Barcelonas Nachtleben verteilt sich auf eine Handvoll Stadtviertel, jedes mit eigener Stimmung. Hier sind die wichtigsten, mit der Zahl der Lokale, die Noctua listet, den üblichen Preisen und Zeiten und dem Heimweg.",
    sections: [
      { id: "areas", h2: "Die wichtigsten Ausgehviertel", blocks },
      {
        id: "choose",
        h2: "So wählst du",
        blocks: [
          {
            t: "ul",
            items: [
              "Für große Clubs und elektronische Musik schau dir die Strandpromenade, den Hafen und Poblenou an.",
              "Für Cocktailbars und einen entspannten Abend probier El Born, Gràcia und den Eixample.",
              "Für günstige Drinks und Livemusik den Raval und Poble-sec.",
              "Plane den Heimweg, bevor du losgehst: Viertel am Meer sind um 02:00 Uhr weiter von der Metro entfernt als die Innenstadt.",
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: "Welches Viertel ist das beste fürs Nachtleben in Barcelona?",
        a: ctx.areas[0]
          ? `Das hängt davon ab, was du willst. Auf Noctua hat ${ctx.areas[0].name} die meisten gelisteten Lokale (${ctx.areas[0].count}). Die Strandpromenade und Poblenou sind für große Clubs bekannt, El Born und Gràcia für Cocktailbars und einen entspannten Abend.`
          : "Das hängt davon ab, was du willst. Die Strandpromenade und Poblenou sind für große Clubs bekannt, El Born und Gràcia für Cocktailbars und einen entspannten Abend.",
      },
      {
        q: "Wo sind die Clubs in Barcelona?",
        a: "Die größten Clubs liegen am Hafen und an der Strandpromenade sowie rund um Poblenou. Es gibt auch Clubs im Raval, in Poble-sec und im Eixample.",
      },
    ],
    sources: [],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-nightlife-what-time-to-go-out"],
    cta: { label: "Die Karte der Lokale erkunden", href: "/map" },
  }
}

export function buildGuide(slug: string, ctx: GuideCtx): Guide | null {
  switch (slug) {
    case GUIDES[0].slug:
      return getHome(ctx)
    case GUIDES[1].slug:
      return getEntry(ctx)
    case GUIDES[2].slug:
      return getTime(ctx)
    case GUIDES[3].slug:
      return getPharmacy(ctx)
    case GUIDES[4].slug:
      return getFood(ctx)
    case GUIDES[5].slug:
      return getRules()
    case GUIDES[6].slug:
      return getAreas(ctx)
    default:
      return null
  }
}
