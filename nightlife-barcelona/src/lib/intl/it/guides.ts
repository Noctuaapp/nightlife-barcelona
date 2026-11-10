// Guide per i turisti in italiano (10/11/2026): /it/guides/[slug]. Stesse guide, stesso ordine e stessi indirizzi
// dell'inglese (lib/intl/en/guides.ts); qui c'è solo il testo tradotto.
//
// Ogni guida mescola testo fisso (regole e consigli verificati su fonti ufficiali, con il link in fondo) e cifre reali
// di Noctua (quanti locali ci sono, a che ora aprono di solito, quali farmacie sono aperte 24 ore...). buildGuide() non
// tocca il database: riceve le cifre già calcolate (GuideCtx) e restituisce la guida intera, quindi si può provare con
// dati finti. Le cifre arrivano da lib/intl/guideData.ts.
//
// Regole: nessuna cifra viene dalla memoria. Quello che viene da una fonte esterna porta il suo link in «sources».
// Quello che dipende dai dati di Noctua dice «su Noctua» e scompare se il campione non basta.

import type { AreaFacts } from "../../areaFacts"
import type { Block, Guide, GuideCtx, GuideMeta, GuideSection, PlaceLine } from "../guideTypes"
import { listOf } from "../clubText"
import { TAXI_PHONES, busRouteOf, eurOf, metroHoursOf, metroNoteOf, sourcesOf, taxiFaresOf } from "../transit"

const L = "it" as const
const METRO_HOURS = metroHoursOf(L)
const METRO_HOURS_NOTE = metroNoteOf(L)
const SOURCES = sourcesOf(L)
const TAXI = taxiFaresOf(L)
const P = "/it"

export const GUIDES_REVIEWED = "2026-11-10"

export const GUIDES: GuideMeta[] = [
  {
    slug: "how-to-get-home-barcelona-at-night",
    title: "Tornare a casa a Barcellona di notte: metro, bus notturno e taxi | Noctua",
    h1: "Tornare a casa a Barcellona di notte: metro, bus notturno e taxi",
    description:
      "Orari della metro per ogni notte, bus notturni delle linee N, tariffe ufficiali dei taxi 2026 e app: tutto per tornare a casa a Barcellona dopo una serata.",
    blurb: "Orari della metro a seconda della notte, bus notturni delle linee N, tariffe dei taxi e app.",
  },
  {
    slug: "barcelona-club-entry-id-age-dress-code",
    title: "Discoteche di Barcellona: ingresso, documento, età e dress code | Noctua",
    h1: "Entrare nelle discoteche di Barcellona: prezzi d'ingresso, documento, età minima e dress code",
    description:
      "Cosa portare all'ingresso, che età serve, quanto costano le discoteche e quanto è rigido davvero il dress code, con cifre dei locali in elenco su Noctua.",
    blurb: "Documento, età minima, prezzi d'ingresso, dress code e liste ospiti.",
  },
  {
    slug: "barcelona-nightlife-what-time-to-go-out",
    title: "A che ora uscire a Barcellona: orari dei locali e dopo le 2 | Noctua",
    h1: "A che ora uscire a Barcellona: orari delle discoteche e cosa resta aperto dopo le 2",
    description:
      "Una serata tipo ora per ora: quando i locali aprono e chiudono, in quali sere sono aperti e quanti restano aperti fino a tardi, in base ai locali su Noctua.",
    blurb: "Una serata ora per ora e quanti locali restano aperti fino a tardi.",
  },
  {
    slug: "24-hour-pharmacies-and-emergency-care-barcelona",
    title: "Farmacie aperte 24 ore e pronto soccorso a Barcellona di notte | Noctua",
    h1: "Farmacie aperte 24 ore e pronto soccorso a Barcellona di notte",
    description:
      "Le farmacie aperte tutta la notte a Barcellona con indirizzi e numeri di telefono, gli ospedali con pronto soccorso e i numeri da chiamare quando qualcosa va storto.",
    blurb: "Farmacie notturne, ospedali e numeri da chiamare.",
  },
  {
    slug: "late-night-food-cash-and-essentials-barcelona",
    title: "Cibo a tarda notte, supermercati e bancomat a Barcellona | Noctua",
    h1: "Cibo a tarda notte, supermercati e contanti a Barcellona",
    description:
      "Dove mangiare dopo la discoteca, quali supermercati e locali per mangiare sono aperti 24 ore e come evitare i bancomat con commissioni alte per le carte straniere.",
    blurb: "Mangiare dopo la discoteca, negozi aperti 24 ore e bancomat da evitare.",
  },
  {
    slug: "barcelona-nightlife-rules-fines-safety",
    title: "Regole della vita notturna a Barcellona: multe, sicurezza e truffe | Noctua",
    h1: "Regole della vita notturna a Barcellona: multe per bere in strada, sicurezza e truffe",
    description:
      "Da febbraio 2026 Barcellona multa chi beve in strada e chi urina in pubblico. Cosa dicono le regole, cosa fanno i borseggiatori e chi chiamare se qualcosa va storto.",
    blurb: "Multe per bere in strada, borseggiatori e chi chiamare.",
  },
  {
    slug: "where-to-go-out-in-barcelona-by-neighbourhood",
    title: "Dove uscire a Barcellona: la vita notturna per quartiere | Noctua",
    h1: "Dove uscire a Barcellona: la vita notturna per quartiere",
    description:
      "I principali quartieri della vita notturna di Barcellona: numero di locali, prezzi d'ingresso e orari abituali, stili musicali, metro e bus notturno più vicini.",
    blurb: "Quartiere per quartiere, con prezzi d'ingresso e trasporti.",
  },
]

export function guideMeta(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

// --- Funzioni di supporto -----------------------------------------------------------------------------------------

const eur = (n: number) => eurOf(L, n)
const when = (n: number, one: string, many: string) => (n === 1 ? one : many)
const joinList = (items: string[]) => listOf(L, items)

function priceSentence(f: AreaFacts | null): string | null {
  if (!f?.price) return null
  const { min, max } = f.price
  return min === 0
    ? `Su Noctua, i prezzi d'ingresso indicati dai locali vanno dall'ingresso gratuito fino a ${eur(max)}.`
    : `Su Noctua, i locali che indicano un prezzo d'ingresso chiedono tra ${eur(min)} e ${eur(max)}.`
}

function placesBlock(items: PlaceLine[], total: number, noun: string): Block {
  return {
    t: "places",
    items: items.map((p) => ({ name: p.name, line: [p.where, p.phone ? `Tel. ${p.phone}` : ""].filter(Boolean).join(" · ") })),
    more: total > items.length ? `Nell'app sono elencati altri ${total - items.length} ${noun}.` : undefined,
  }
}

// --- Le guide -----------------------------------------------------------------------------------------------------

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
      h2: "Controlla prima la metro",
      blocks: [
        { t: "p", text: "La metro è il modo più veloce per tornare a casa finché circola, e l'orario in cui si ferma dipende dalla sera della settimana." },
        { t: "table", head: ["Quando", "Orari della metro"], rows: METRO_HOURS.map((r) => [r.when, r.hours]), note: METRO_HOURS_NOTE },
        {
          t: "p",
          text: "Gli orari di chiusura sono quelli della partenza dell'ultimo treno dal capolinea di ciascuna estremità della linea, quindi non contare di prendere proprio l'ultimo treno: fatti trovare in banchina con un po' di margine.",
        },
        { t: "links", items: [{ label: "Linee e stazioni della metro", href: `${P}/metro`, note: "ogni linea, stazione per stazione" }] },
      ],
    },
    {
      id: "night-bus",
      h2: "Quando la metro chiude: il bus notturno (NitBus)",
      blocks: [
        {
          t: "p",
          text:
            lines.length > 0
              ? `I bus notturni di Barcellona sono le linee N. Noctua ne elenca ${lines.length}, da ${first} a ${last}. ${viaCat} su ${lines.length} fermano in Plaça Catalunya, il punto di scambio centrale: se non sai quale bus prendere, vai in Plaça Catalunya e cambia lì.`
              : "I bus notturni di Barcellona sono le linee N. La maggior parte ferma in Plaça Catalunya, il punto di scambio centrale.",
        },
        {
          t: "ul",
          items: [
            "Orari: i bus notturni di solito circolano da circa le 22:00 a circa le 05:00–05:30, più o meno ogni 20 minuti. Gli orari esatti cambiano da linea a linea, quindi controlla quello della linea che ti serve.",
            "Biglietti: controlla che il tuo biglietto o abbonamento sia valido sui bus notturni prima di contarci.",
            ...(notCat.length > 0 ? [`Linee che non fermano in Plaça Catalunya: ${joinList(notCat)}.`] : []),
            "Ogni linea ha la sua pagina con le fermate in ordine, così trovi la fermata più vicina a te e sai dove scendere.",
          ],
        },
        { t: "links", items: [{ label: "Tutte le linee dei bus notturni", href: `${P}/night-bus`, note: "percorsi, fermate e cambi" }] },
      ],
    },
  ]
  if (transitRows.length > 0) {
    sections.push({
      id: "from-areas",
      h2: "Tornare a casa dai principali quartieri della vita notturna",
      blocks: [
        {
          t: "table",
          head: ["Quartiere", "Stazioni della metro più vicine", "Bus notturni nelle vicinanze"],
          rows: transitRows,
          note: "In base ai locali di ciascun quartiere: stazioni della metro entro 600 m e fermate dei bus notturni entro 500 m dai locali.",
        },
        { t: "links", items: [{ label: "La vita notturna per quartiere", href: `${P}/guides/where-to-go-out-in-barcelona-by-neighbourhood` }] },
      ],
    })
  }
  sections.push(
    {
      id: "taxi",
      h2: "Taxi e app di trasporto",
      blocks: [
        {
          t: "p",
          text: "I taxi ufficiali sono neri e gialli, con tassametro e regolamentati. Una luce verde sul tetto significa che il taxi è libero. Molte strade del Barri Gòtic, del Raval e del Born sono pedonali: scegli un punto di discesa sulla strada carrabile più vicina.",
        },
        {
          t: "ul",
          items: [
            `Tariffa notturna (T-2): vale dalle 20:00 alle 08:00 nei giorni feriali e di sabato e nei festivi. Corsa minima ${TAXI.minFare}, poi ${TAXI.perKmNight} al km.`,
            `Supplementi: ${TAXI.airportSurcharge} per l'aeroporto, ${TAXI.satsSurcharge} in partenza dalla stazione di Sants e ${TAXI.holidayEveSurcharge} in alcune notti di vigilia di festivo.`,
            `La prenotazione per telefono o da app ha un minimo di ${TAXI.appBookingMinimum}.`,
            "La maggior parte dei taxi ufficiali accetta le carte: conferma prima di salire e chiedi la ricevuta (un recibo).",
            ...TAXI_PHONES.map((p) => `${p.name}: ${p.phone}`),
          ],
        },
        {
          t: "p",
          text: "Le app di taxi come FREE NOW prenotano taxi ufficiali alle tariffe regolamentate. Anche le app di trasporto privato come Uber, Cabify e Bolt funzionano a Barcellona; le regole che le riguardano sono cambiate negli ultimi anni, quindi controlla disponibilità e prezzo mostrato nell'app prima di prenotare.",
        },
        {
          t: "note",
          tone: "warn",
          title: "Usa solo corse autorizzate",
          text: "Ignora le persone che ti avvicinano fuori dalle discoteche offrendoti un passaggio. Prendi un taxi dalla strada o da un posteggio, oppure prenota con un'app.",
        },
        { t: "links", items: [{ label: "Posteggi taxi e numeri di telefono", href: `${P}/essentials/taxi` }] },
      ],
    },
    {
      id: "airport",
      h2: "Andare in aeroporto di notte",
      blocks: [
        {
          t: "ul",
          items: [
            ...airport.map((a) => `${a.c}: ${a.r}.`),
            `Taxi: una corsa che parte dall'aeroporto ha una corsa minima di ${TAXI.fromAirportMinimum}.`,
          ],
        },
      ],
    },
    {
      id: "safety",
      h2: "Tornare a casa in sicurezza",
      blocks: [
        {
          t: "ul",
          items: [
            "Telefoni e portafogli sono il bersaglio dei borseggiatori sulle banchine affollate della metro, intorno alla Rambla e nel Barri Gòtic. Tienili in una tasca davanti o in una borsa con la zip.",
            "Accordatevi su dove incontrarvi se il gruppo si divide e tieni il telefono carico.",
            "In caso di emergenza chiama il 112. Per la polizia locale (Guàrdia Urbana) chiama il 092.",
          ],
        },
        { t: "links", items: [{ label: "Regole, multe e sicurezza di sera", href: `${P}/guides/barcelona-nightlife-rules-fines-safety` }] },
      ],
    },
  )

  return {
    ...meta,
    lead: "Barcellona è facile da girare di notte una volta conosciute le regole: la metro va avanti fino a tardi il venerdì e tutta la notte il sabato, una rete di linee N subentra quando chiude e i taxi, con tassametro, sono molti.",
    sections,
    faq: [
      {
        q: "La metro di Barcellona va avanti tutta la notte?",
        a: "Solo nelle notti tra sabato e domenica, quando circola senza interruzione dal sabato mattina fino a mezzanotte della domenica, e in alcune notti speciali come Sant Joan e Capodanno. Il venerdì e la vigilia di un giorno festivo chiude alle 02:00, le altre notti a mezzanotte.",
      },
      {
        q: "A Barcellona c'è il bus notturno?",
        a:
          lines.length > 0
            ? `Sì. La rete NitBus ha ${lines.length} linee N nell'elenco di Noctua e ${viaCat} di queste fermano in Plaça Catalunya. I bus di solito circolano da circa le 22:00 a circa le 05:00–05:30, più o meno ogni 20 minuti; controlla l'orario della tua linea.`
            : "Sì. La rete NitBus di linee N copre la città da circa le 22:00 a circa le 05:00–05:30, più o meno ogni 20 minuti, e la maggior parte delle linee ferma in Plaça Catalunya.",
      },
      {
        q: "Quanto costa un taxi di notte a Barcellona?",
        a: `Di notte la tariffa ufficiale (T-2) ha una corsa minima di ${TAXI.minFare} e ${TAXI.perKmNight} al km, più supplementi come ${TAXI.airportSurcharge} per l'aeroporto. Le prenotazioni per telefono o da app hanno un minimo di ${TAXI.appBookingMinimum}. Sono le tariffe urbane 2026 pubblicate da AMB.`,
      },
      {
        q: "A Barcellona c'è Uber?",
        a: "Le app di trasporto privato come Uber, Cabify e Bolt funzionano a Barcellona, ma le regole che le riguardano sono cambiate negli ultimi anni: controlla disponibilità e prezzo nell'app. L'app FREE NOW prenota taxi ufficiali alle tariffe regolamentate.",
      },
      {
        q: "Come arrivo in aeroporto di notte?",
        a:
          airport.length > 0
            ? `I bus notturni ${joinList(airport.map((a) => a.c))} servono l'aeroporto e i taxi circolano tutta la notte. Un taxi dall'aeroporto ha una corsa minima di ${TAXI.fromAirportMinimum}.`
            : `Prendi un taxi: una corsa che parte dall'aeroporto ha una corsa minima di ${TAXI.fromAirportMinimum}.`,
      },
    ],
    sources: [SOURCES.tmbHours, SOURCES.taxiAmb, SOURCES.amb],
    related: ["barcelona-nightlife-what-time-to-go-out", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Trova la fermata più vicina nell'app", href: "/nitbus" },
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
      h2: "All'ingresso: documento ed età",
      blocks: [
        {
          t: "p",
          text: "Porta con te il passaporto o la carta d'identità. Il personale all'ingresso può chiedere un documento a chiunque sembri giovane e senza puoi essere respinto. Una foto sul telefono non sempre viene accettata, quindi porta il documento vero e proprio.",
        },
        {
          t: "p",
          text: "L'età legale per farsi servire alcolici in Catalogna è 18 anni. I locali possono fissare un minimo più alto e alcune discoteche chiedono 21 anni o più.",
        },
        ...(ageTop.length > 0 && ctx.withAge >= 10
          ? [
              {
                t: "table" as const,
                head: ["Età minima", "Locali su Noctua"],
                rows: ageTop.map((a) => [`${a.age}+`, String(a.n)]),
                note: `Tra i ${ctx.withAge} locali che indicano un'età minima.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "prices",
      h2: "Quanto costano le discoteche",
      blocks: [
        ...(price ? [{ t: "p" as const, text: price }] : []),
        {
          t: "ul",
          items: [
            "Molte discoteche includono una consumazione nel prezzo d'ingresso. La pagina del locale indica se è così.",
            "I biglietti acquistati online in anticipo costano spesso meno che all'ingresso e di solito permettono di saltare la coda.",
            "Alcuni locali sono gratuiti a inizio serata o con la lista ospiti. Chiedi esattamente cosa è incluso prima di accettare un'offerta.",
          ],
        },
        { t: "links", items: [{ label: "Vedi locali e bar", href: `${P}/clubs` }] },
      ],
    },
    {
      id: "dress",
      h2: "Dress code",
      blocks: [
        {
          t: "p",
          text: "La maggior parte dei locali è tranquilla, ma alcune discoteche impongono un dress code all'ingresso. Costume da bagno, infradito e abbigliamento sportivo sono motivi frequenti di rifiuto; scarpe chiuse e un abbigliamento pulito e semplice sono una scelta sicura.",
        },
        ...(dressTop.length > 0 && ctx.withDress >= 10
          ? [
              {
                t: "table" as const,
                head: ["Dress code", "Locali su Noctua"],
                rows: dressTop.map((d) => [d.label, String(d.n)]),
                note: `Tra i ${ctx.withDress} locali che indicano un dress code. La pagina di ogni locale mostra il proprio.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "promoters",
      h2: "Promoter e liste ospiti",
      blocks: [
        {
          t: "p",
          text: "Fuori dalle grandi discoteche incontrerai promoter che distribuiscono offerte di lista ospiti o ingresso gratuito. Alcune sono serie, altre non valgono la pena. Prima di seguirne uno, chiedi cosa è incluso (solo ingresso o ingresso con consumazione), se c'è un limite d'orario e quanto paghi all'ingresso. Una pagina ufficiale per i biglietti o la lista ospiti del locale stesso è l'opzione più sicura.",
        },
      ],
    },
    {
      id: "queue",
      h2: "In coda",
      blocks: [
        {
          t: "ul",
          items: [
            "Il personale può rifiutare l'ingresso a chi è visibilmente ubriaco, quindi vai piano prima di arrivare.",
            "Non bere in coda e non fare rumore: sopra molti locali abitano dei residenti.",
            "Tieni telefono e portafogli fuori vista mentre aspetti. Le code sono uno dei posti preferiti dai borseggiatori.",
          ],
        },
      ],
    },
  ]
  return {
    ...meta,
    lead: "Entrare nelle discoteche di Barcellona è facile se porti il documento giusto, arrivi a un'ora sensata e ti vesti come per uscire. Ecco cosa aspettarti, con cifre dei locali in elenco su Noctua.",
    sections,
    faq: [
      {
        q: "Serve il passaporto per entrare in una discoteca a Barcellona?",
        a: "Porta con te il passaporto o la carta d'identità. Il personale all'ingresso può chiedere un documento a chiunque sembri giovane e senza puoi essere respinto.",
      },
      {
        q: "Qual è il limite d'età per le discoteche di Barcellona?",
        a: "L'età legale per farsi servire alcolici in Catalogna è 18 anni. I singoli locali possono fissare un minimo più alto e alcuni chiedono 21 anni o più. La pagina di ogni locale su Noctua mostra l'età minima quando è nota.",
      },
      {
        q: "Quanto costa entrare in una discoteca a Barcellona?",
        a: price
          ? `${price} Molte discoteche includono una consumazione nel prezzo d'ingresso e i biglietti acquistati online costano spesso meno.`
          : "I prezzi variano molto da una discoteca all'altra e da una sera all'altra. Molte discoteche includono una consumazione nel prezzo d'ingresso e i biglietti acquistati online costano spesso meno che all'ingresso.",
      },
      {
        q: "C'è un dress code?",
        a: "La maggior parte dei locali è tranquilla, ma alcune discoteche impongono un dress code all'ingresso. Evita costume da bagno, infradito e abbigliamento sportivo e metti scarpe chiuse.",
      },
    ],
    sources: [],
    related: ["barcelona-nightlife-what-time-to-go-out", "where-to-go-out-in-barcelona-by-neighbourhood"],
    cta: { label: "Vedi prezzo d'ingresso e dress code di ogni locale", href: `${P}/clubs` },
  }
}

function busiestNights(nights: { day: string; n: number }[]): string {
  const sorted = [...nights].sort((a, b) => b.n - a.n)
  const [a, b] = sorted
  if (!a || !b) return ""
  return `Su Noctua, il maggior numero di locali è aperto il ${a.day.toLowerCase()} e il ${b.day.toLowerCase()}.`
}

function getTime(ctx: GuideCtx): Guide {
  const meta = GUIDES[2]
  const f = ctx.facts
  const usual = f?.hours ? `Su Noctua, l'orario di apertura più comune è ${f.hours.open} e l'orario di chiusura più comune è ${f.hours.close}.` : null
  const late = f?.late && f.late.of >= 10 ? `${f.late.n} dei ${f.late.of} locali con orari su Noctua restano aperti dopo le 02:30.` : null
  const nights = ctx.nightsOpen.filter((n) => n.n > 0)
  const sections: GuideSection[] = [
    {
      id: "timeline",
      h2: "Una serata tipo, ora per ora",
      blocks: [
        {
          t: "table",
          head: ["Ora", "Cosa succede"],
          rows: [
            ["21:00–23:00", "Cena. In Spagna si cena tardi: i ristoranti si riempiono da circa le 21:00 alle 22:00."],
            ["23:00–01:00", "Drink in un bar o su una terrazza. Le discoteche sono ancora tranquille."],
            ["00:00–02:00", "Le discoteche aprono le porte. L'ingresso anticipato è spesso più economico o gratuito."],
            ["02:00–04:00", "Le ore più affollate nella maggior parte delle discoteche."],
            ["05:00–06:00", "La maggior parte delle discoteche chiude. La metro riparte alle 05:00 nei giorni feriali e di sabato notte va avanti senza interruzione."],
          ],
          note: "Uno schema generale: ogni locale stabilisce i propri orari.",
        },
        ...(usual ? [{ t: "p" as const, text: usual }] : []),
        ...(late ? [{ t: "p" as const, text: late }] : []),
      ],
    },
  ]
  if (nights.length >= 4) {
    sections.push({
      id: "nights",
      h2: "In quali sere sono aperti i locali?",
      blocks: [
        {
          t: "table",
          head: ["Sera", "Locali aperti su Noctua"],
          rows: nights.map((n) => [n.day, String(n.n)]),
          note: "Conta i locali di cui si conoscono gli orari o i giorni di apertura. La notte si conta dalla sera: la notte del venerdì comprende le prime ore del sabato.",
        },
        {
          t: "p",
          text: `${busiestNights(nights)} Molti locali aprono solo alcune sere della settimana, quindi controlla ciascun locale prima di uscire.`,
        },
      ],
    })
  }
  sections.push(
    {
      id: "late",
      h2: "Cosa è aperto dopo le 2",
      blocks: [
        {
          t: "p",
          text: "Le discoteche e alcuni bar restano aperti fino alle 05:00 o alle 06:00. Per tutto il resto, le cose utili aperte tutta la notte sono le farmacie, alcuni supermercati e locali per mangiare e i trasporti che ti servono per tornare a casa.",
        },
        {
          t: "links",
          items: [
            { label: "Cibo a tarda notte, supermercati e bancomat", href: `${P}/guides/late-night-food-cash-and-essentials-barcelona` },
            { label: "Farmacie aperte 24 ore e pronto soccorso", href: `${P}/guides/24-hour-pharmacies-and-emergency-care-barcelona` },
            { label: "Tornare a casa: metro, bus notturno e taxi", href: `${P}/guides/how-to-get-home-barcelona-at-night` },
          ],
        },
      ],
    },
    {
      id: "tips",
      h2: "Consigli per organizzare la serata",
      blocks: [
        {
          t: "ul",
          items: [
            "Decidi come tornerai a casa prima di uscire. Dal lunedì al giovedì la metro si ferma a mezzanotte.",
            "Compra online i biglietti per le serate importanti: costano spesso meno e ti fanno saltare la coda.",
            "Controlla gli orari del locale: molti aprono solo dal giovedì al sabato.",
          ],
        },
      ],
    },
  )
  return {
    ...meta,
    lead: "Barcellona esce tardi. La cena è alle 21:00 o dopo, le discoteche aprono verso mezzanotte e si riempiono dopo le 02:00. Ecco lo schema, con cifre dei locali in elenco su Noctua.",
    sections,
    faq: [
      {
        q: "A che ora aprono le discoteche a Barcellona?",
        a: f?.hours
          ? `Le discoteche di solito aprono verso mezzanotte e restano aperte fino alle 05:00–06:00. Su Noctua l'orario di apertura più comune è ${f.hours.open} e l'orario di chiusura più comune è ${f.hours.close}.`
          : "Le discoteche di solito aprono verso mezzanotte e restano aperte fino alle 05:00–06:00.",
      },
      {
        q: "A che ora comincia la vita notturna a Barcellona?",
        a: "La cena è tarda, dalle 21:00. I bar si riempiono da circa le 23:00, le discoteche aprono verso mezzanotte e sono più affollate tra le 02:00 e le 04:00.",
      },
      {
        q: "Cosa è aperto dopo le 2 a Barcellona?",
        a: late
          ? `${late} Anche farmacie, alcuni supermercati e locali per mangiare sono aperti tutta la notte.`
          : "Le discoteche e alcuni bar restano aperti fino alle 05:00 o alle 06:00. Anche farmacie, alcuni supermercati e locali per mangiare sono aperti tutta la notte.",
      },
      {
        q: "A che ora si ferma la metro?",
        a: "A mezzanotte dalla domenica al giovedì, alle 02:00 il venerdì e la vigilia di un giorno festivo, e il sabato va avanti tutta la notte.",
      },
    ],
    sources: [SOURCES.tmbHours],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-club-entry-id-age-dress-code"],
    cta: { label: "Vedi cosa è aperto adesso nell'app", href: "/clubs" },
  }
}

function getPharmacy(ctx: GuideCtx): Guide {
  const meta = GUIDES[3]
  const n = ctx.pharmacies24Total
  const sections: GuideSection[] = [
    {
      id: "pharmacies",
      h2: "Farmacie aperte 24 ore",
      blocks: [
        {
          t: "p",
          text:
            n > 0
              ? `Noctua elenca ${ctx.pharmaciesTotal} farmacie nell'area di Barcellona, ${n} delle quali aperte 24 ore. Gli orari possono cambiare, quindi telefona prima se devi fare molta strada.`
              : "Telefona prima di muoverti: gli orari cambiano e le app di mappe non sono sempre aggiornate.",
        },
        ...(n > 0 ? [placesBlock(ctx.pharmacies24, n, "farmacie aperte 24 ore")] : []),
        { t: "links", items: [{ label: "Tutte le farmacie su Noctua", href: `${P}/essentials/pharmacy` }] },
      ],
    },
    {
      id: "how",
      h2: "Usare una farmacia in Spagna",
      blocks: [
        {
          t: "ul",
          items: [
            "Le farmacie (farmacias) sono segnalate da una croce verde. Il farmacista può dare consigli per i piccoli problemi.",
            "Alcuni medicinali richiedono la ricetta. Porta il nome del principio attivo (il nome generico), perché i nomi commerciali cambiano da un paese all'altro.",
            "Di notte le farmacie aperte 24 ore a volte servono da una piccola finestra o da uno sportello.",
            "Gli orari mostrati sulle app di mappe possono essere superati: se sei lontano, telefona prima.",
          ],
        },
      ],
    },
    {
      id: "emergency",
      h2: "Numeri di emergenza",
      blocks: [
        {
          t: "table",
          head: ["Numero", "Quando usarlo"],
          rows: [
            ["112", "Qualsiasi emergenza: ambulanza, polizia o vigili del fuoco. Gratuito da qualsiasi telefono."],
            ["061", "Consulenza sanitaria in Catalogna (Salut Respon)."],
            ["092", "Polizia locale (Guàrdia Urbana)."],
          ],
        },
        {
          t: "note",
          title: "Assicurazione di viaggio",
          text: "I cittadini dell'UE possono usare l'assistenza sanitaria pubblica con la Tessera europea di assicurazione malattia (chi arriva dal Regno Unito con la GHIC). Tutti gli altri dovrebbero avere un'assicurazione di viaggio. Tieni il numero della polizza sul telefono.",
        },
      ],
    },
  ]
  if (ctx.hospitals.length > 0) {
    sections.push({
      id: "hospitals",
      h2: "Ospedali",
      blocks: [
        { t: "p", text: "I grandi ospedali pubblici hanno un pronto soccorso (urgències) aperto giorno e notte. Per qualsiasi cosa urgente chiama il 112 invece di andare da solo." },
        placesBlock(ctx.hospitals, ctx.hospitalsTotal, "ospedali"),
        { t: "links", items: [{ label: "Ospedali su Noctua", href: `${P}/essentials/hospital` }] },
      ],
    })
  }
  return {
    ...meta,
    lead: "Se ti servono un medicinale o un medico nel cuore della notte, ecco dove andare a Barcellona e quali numeri chiamare.",
    sections,
    faq: [
      {
        q: "Quali farmacie sono aperte 24 ore a Barcellona?",
        a:
          n > 0
            ? `Noctua elenca ${n} farmacie aperte 24 ore, come ${ctx.pharmacies24
                .slice(0, 3)
                .map((p) => p.name)
                .join(", ")}. L'elenco completo con gli indirizzi è in questa pagina.`
            : "Alcune farmacie sono aperte tutta la notte. Controlla l'elenco nell'app e telefona prima, perché gli orari cambiano.",
      },
      {
        q: "Che numero chiamo in caso di emergenza medica a Barcellona?",
        a: "Chiama il 112. È gratuito da qualsiasi telefono e funziona in tutta la Spagna e nell'UE. Per una consulenza sanitaria in Catalogna puoi chiamare anche il 061.",
      },
      {
        q: "In Spagna posso comprare medicinali senza ricetta?",
        a: "Alcuni medicinali si comprano senza ricetta, altri la richiedono. Te lo dirà il farmacista. Porta il nome generico del medicinale, perché i nomi commerciali cambiano da un paese all'altro.",
      },
    ],
    sources: [],
    related: ["late-night-food-cash-and-essentials-barcelona", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Trova la farmacia più vicina nell'app", href: "/essentials/pharmacy" },
  }
}

function getFood(ctx: GuideCtx): Guide {
  const meta = GUIDES[4]
  const sections: GuideSection[] = [
    {
      id: "food",
      h2: "Mangiare dopo la discoteca",
      blocks: [
        {
          t: "p",
          text:
            ctx.food24.length > 0
              ? `Noctua elenca ${ctx.food24Total} locali per mangiare aperti 24 ore. Kebab, pizza al taglio e fast food restano aperti quando le cucine dei ristoranti normali hanno chiuso.`
              : "Kebab, pizza al taglio e fast food restano aperti quando le cucine dei ristoranti normali hanno chiuso.",
        },
        ...(ctx.food24.length > 0 ? [placesBlock(ctx.food24, ctx.food24Total, "locali per mangiare aperti 24 ore")] : []),
        { t: "links", items: [{ label: "Cibo a tarda notte su Noctua", href: `${P}/essentials/food` }] },
      ],
    },
    {
      id: "supermarkets",
      h2: "Supermercati aperti fino a tardi",
      blocks: [
        {
          t: "p",
          text:
            ctx.supermarkets24.length > 0
              ? `Noctua elenca ${ctx.supermarkets24Total} supermercati e alimentari aperti 24 ore. Sono utili per acqua, snack e l'essenziale.`
              : "Alcuni supermercati e alimentari restano aperti fino a tardi. Controlla gli orari nell'app.",
        },
        ...(ctx.supermarkets24.length > 0 ? [placesBlock(ctx.supermarkets24, ctx.supermarkets24Total, "supermercati aperti 24 ore")] : []),
        { t: "links", items: [{ label: "Supermercati su Noctua", href: `${P}/essentials/supermarket` }] },
      ],
    },
    {
      id: "cash",
      h2: "Contanti e bancomat",
      blocks: [
        {
          t: "p",
          text: "Le carte sono accettate quasi ovunque, ma un po' di contanti fa comodo nei bar piccoli e alle bancarelle di strada.",
        },
        {
          t: "ul",
          items: [
            "Evita i bancomat indipendenti come le macchine Euronet che si vedono nelle zone turistiche. Applicano commissioni alte e cambi sfavorevoli alle carte straniere.",
            "Usa i bancomat che appartengono a una banca, come CaixaBank, Santander, BBVA o Sabadell.",
            "Se la macchina ti propone di addebitare nella valuta del tuo paese, scegli l'euro. Il tasso di conversione di solito è peggiore.",
          ],
        },
        ...(ctx.highFeeAtms > 0
          ? [
              {
                t: "note" as const,
                title: "Noctua segnala quelli costosi",
                text: `Noctua segna ${ctx.highFeeAtms} dei ${ctx.atmsTotal} bancomat che elenca come a commissioni alte, così puoi evitarli.`,
                tone: "info" as const,
              },
            ]
          : []),
        { t: "links", items: [{ label: "Bancomat su Noctua", href: `${P}/essentials/atm` }] },
      ],
    },
  ]
  return {
    ...meta,
    lead: "Dopo la discoteca ti servono cibo, acqua, contanti o una farmacia. Ecco cosa resta aperto fino a tardi a Barcellona e come evitare di pagare più del dovuto.",
    sections,
    faq: [
      {
        q: "A Barcellona ci sono supermercati aperti 24 ore?",
        a:
          ctx.supermarkets24.length > 0
            ? `Sì. Noctua elenca ${ctx.supermarkets24Total} supermercati e alimentari aperti 24 ore. Controlla gli orari nell'app prima di andare.`
            : "Alcuni restano aperti fino a tardi, ma controlla gli orari nell'app prima di andare.",
      },
      {
        q: "Quali bancomat devo evitare a Barcellona?",
        a: "Evita i bancomat indipendenti Euronet nelle zone turistiche. Applicano commissioni alte e cambi sfavorevoli alle carte straniere. Usa quelli che appartengono a una banca e scegli di essere addebitato in euro.",
      },
      {
        q: "Dove si mangia alle 4 di notte a Barcellona?",
        a:
          ctx.food24.length > 0
            ? `Noctua elenca ${ctx.food24Total} locali per mangiare aperti 24 ore, soprattutto kebab, pizza e fast food. L'elenco è in questa pagina.`
            : "Kebab, pizza al taglio e fast food sono le opzioni di sempre. Controlla gli orari nell'app.",
      },
    ],
    sources: [],
    related: ["24-hour-pharmacies-and-emergency-care-barcelona", "how-to-get-home-barcelona-at-night"],
    cta: { label: "Trova cosa è aperto vicino a te", href: "/essentials" },
  }
}

function getRules(): Guide {
  const meta = GUIDES[5]
  return {
    ...meta,
    lead: "La nuova ordinanza sulla convivenza di Barcellona è entrata in vigore il 15 febbraio 2026. Ha alzato le multe per le cose che chi esce di sera sbaglia più spesso. Ecco cosa dice e come evitare guai.",
    sections: [
      {
        id: "street",
        h2: "Bere in strada",
        blocks: [
          { t: "p", text: "Bere alcolici in strada non è consentito a Barcellona. La nuova ordinanza fissa queste multe:" },
          {
            t: "table",
            head: ["Infrazione", "Multa"],
            rows: [
              ["Bere alcolici in strada (infrazione lieve)", "Da 100 € a 600 €"],
              ["Lo stesso in un luogo particolarmente affollato o davanti a minori", "Da 750 € a 1.500 €"],
              ["Urinare in pubblico", "Fino a 300 €"],
              ["Urinare vicino a bagni pubblici, intorno a bar o discoteche, o in una strada larga meno di quattro metri", "Fino a 750 €"],
              ["Casi particolarmente gravi di minzione in pubblico (soprattutto in luoghi molto affollati, frequentati da minori o tutelati)", "Da 750 € a 1.500 €"],
              ["Percorsi alcolici (itinerari turistici che visitano più bar con lo scopo principale di bere alcol)", "Da 1.500 € a 3.000 €"],
            ],
            note: "Fonte: Ara, i punti chiave della nuova ordinanza (vedi Fonti).",
          },
          {
            t: "p",
            text: "Per le infrazioni lievi, e per chi vive all'estero, gli agenti della Guàrdia Urbana con i terminali per le carte possono offrire il pagamento sul posto con uno sconto fino al 50% se paghi entro dieci giorni dalla notifica. Resta comunque una multa.",
          },
          { t: "note", title: "Nella pratica", text: "Bevi in un bar o su una terrazza e usa il bagno di un bar prima di andare via. Una lattina comprata da un venditore ambulante e bevuta fuori non vale la multa.", tone: "warn" },
        ],
      },
      {
        id: "theft",
        h2: "Borseggiatori e furti di telefono",
        blocks: [
          {
            t: "ul",
            items: [
              "I borseggiatori lavorano nei luoghi affollati: la Rambla, il Barri Gòtic, le banchine della metro e le code fuori dalle discoteche. Tieni telefono e portafogli in una tasca davanti o in una borsa con la zip.",
              "Non lasciare il telefono su un tavolo o sul bordo di una terrazza.",
              "Diffida degli sconosciuti che ti urtano, ti stringono la mano o cercano di darti qualcosa. Spesso creano un diversivo.",
              "Se ti rubano qualcosa, fai denuncia in un commissariato (hacer una denuncia). La tua assicurazione ti chiederà la denuncia.",
            ],
          },
        ],
      },
      {
        id: "drinks",
        h2: "Fare attenzione a te e al tuo drink",
        blocks: [
          {
            t: "ul",
            items: [
              "Non lasciare il drink incustodito e non accettare drink da sconosciuti.",
              "Se ti senti male, dillo al personale o a un amico e chiama il 112.",
              "Prima di uscire accordatevi nel gruppo su un punto d'incontro e su come tornare a casa.",
            ],
          },
        ],
      },
      {
        id: "help",
        h2: "Chi chiamare",
        blocks: [
          {
            t: "table",
            head: ["Numero", "Quando usarlo"],
            rows: [
              ["112", "Qualsiasi emergenza: ambulanza, polizia o vigili del fuoco. Gratuito da qualsiasi telefono."],
              ["092", "Polizia locale (Guàrdia Urbana)."],
              ["061", "Consulenza sanitaria in Catalogna."],
            ],
          },
          { t: "links", items: [{ label: "Farmacie aperte 24 ore e pronto soccorso", href: `${P}/guides/24-hour-pharmacies-and-emergency-care-barcelona` }] },
        ],
      },
    ],
    faq: [
      {
        q: "A Barcellona si può bere alcol in strada?",
        a: "No. Secondo l'ordinanza in vigore dal 15 febbraio 2026, bere alcol in strada può essere multato da 100 € a 600 €, e da 750 € a 1.500 € nei luoghi particolarmente affollati o davanti a minori.",
      },
      {
        q: "Quanto costa la multa per urinare in pubblico a Barcellona?",
        a: "Fino a 300 € in generale, fino a 750 € vicino a bagni pubblici, intorno a bar o discoteche o in strade larghe meno di quattro metri, e da 750 € a 1.500 € nei casi particolarmente gravi.",
      },
      {
        q: "Barcellona è sicura di notte?",
        a: "La maggior parte dei visitatori non ha problemi, ma i borseggi sono frequenti nei luoghi affollati. Tieni telefono e portafogli fuori vista e non lasciare i drink incustoditi.",
      },
    ],
    sources: [SOURCES.ordinance],
    related: ["how-to-get-home-barcelona-at-night", "24-hour-pharmacies-and-emergency-care-barcelona"],
    cta: { label: "Organizza la tua serata nell'app", href: "/plan" },
  }
}

// Una frase su ogni quartiere noto da sempre; se il quartiere non è qui, escono solo i suoi dati.
const AREA_NOTES: [RegExp, string][] = [
  [/raval/, "Compatto e vivace, con bar economici, musica dal vivo e locali notturni a due passi dalla Rambla."],
  [/gracia/, "Atmosfera da paese, con piazze piene di bar di quartiere. Più rilassato che da discoteca."],
  [/poble-?sec/, "Carrer de Blai per le tapas e l'avenida del Paral·lel con teatri e locali di musica."],
  [/eixample/, "La griglia del centro di Barcellona, con molti cocktail bar, ristoranti e locali LGBTQ+."],
  [/barceloneta|olimpic/, "Il lungomare e il porto, dove si trovano le grandi discoteche e i bar sulla spiaggia."],
  [/poblenou|poble-nou/, "Un ex quartiere industriale vicino alla spiaggia, noto per le discoteche più grandi e la musica elettronica."],
  [/born|ribera|sant-pere/, "Strette vie medievali con cocktail bar e piccoli locali."],
  [/gotic|gothic/, "La città vecchia: bar e discoteche intorno a Plaça Reial e nei vicoli che partono dalla Rambla."],
  [/sants/, "Residenziale e di quartiere, con bar e discoteche vicino alla stazione di Sants."],
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
    parts.push(`${a.count} ${when(a.count, "locale in elenco", "locali in elenco")}.`)
    if (f?.price) parts.push(f.price.min === 0 ? `Ingresso: gratis fino a ${eur(f.price.max)}.` : `Ingresso: ${eur(f.price.min)}–${eur(f.price.max)}.`)
    if (f?.hours) parts.push(`Di solito aperto ${f.hours.open}–${f.hours.close}.`)
    if (f?.metro.length) parts.push(`Metro: ${f.metro.join(", ")}.`)
    if (f?.nitbus.length) parts.push(`Bus notturni: ${f.nitbus.join(", ")}.`)
    blocks.push({ t: "places", items: [{ name: a.name, line: parts.join(" ") }] })
    blocks.push({ t: "links", items: [{ label: `Locali a ${a.name}`, href: `${P}/neighbourhoods/${a.slug}` }] })
  }
  return {
    ...meta,
    lead: "La vita notturna di Barcellona è distribuita in una manciata di quartieri, ciascuno con la sua atmosfera. Ecco i principali, con quanti locali elenca Noctua, prezzi e orari tipici e come tornare a casa.",
    sections: [
      { id: "areas", h2: "I principali quartieri della vita notturna", blocks },
      {
        id: "choose",
        h2: "Come scegliere",
        blocks: [
          {
            t: "ul",
            items: [
              "Per le grandi discoteche e la musica elettronica guarda il lungomare, il porto e il Poblenou.",
              "Per cocktail bar e una serata rilassata prova El Born, Gràcia e l'Eixample.",
              "Per drink economici e musica dal vivo, il Raval e Poble-sec.",
              "Pianifica il ritorno prima di uscire: i quartieri vicino al mare sono più lontani dalla metro alle 02:00 di quanto lo sia il centro.",
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: "Qual è il miglior quartiere per la vita notturna a Barcellona?",
        a: ctx.areas[0]
          ? `Dipende da cosa cerchi. Su Noctua, ${ctx.areas[0].name} ha più locali in elenco (${ctx.areas[0].count}). Il lungomare e il Poblenou sono noti per le grandi discoteche, El Born e Gràcia per i cocktail bar e le serate rilassate.`
          : "Dipende da cosa cerchi. Il lungomare e il Poblenou sono noti per le grandi discoteche, El Born e Gràcia per i cocktail bar e le serate rilassate.",
      },
      {
        q: "Dove sono le discoteche di Barcellona?",
        a: "Le discoteche più grandi sono vicino al porto e sul lungomare, e intorno al Poblenou. Ce ne sono anche nel Raval, a Poble-sec e nell'Eixample.",
      },
    ],
    sources: [],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-nightlife-what-time-to-go-out"],
    cta: { label: "Esplora la mappa dei locali", href: "/map" },
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
