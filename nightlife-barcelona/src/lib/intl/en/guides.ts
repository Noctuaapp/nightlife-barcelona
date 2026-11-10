// Guías de turista en inglés (10/11/2026): /en/guides/[slug].
//
// Cada guía mezcla texto fijo (reglas y consejos comprobados en fuentes oficiales, con su enlace al final) y
// cifras reales de Noctua (cuántos locales hay, a qué hora abren lo normal, qué farmacias abren 24 h...).
// buildGuide() no toca la base de datos: recibe las cifras ya calculadas (GuideCtx) y devuelve la guía
// entera, así que se puede probar con datos de mentira. Las cifras salen de lib/intl/guideData.ts.
//
// Reglas: ninguna cifra sale de memoria. Lo que viene de una fuente externa lleva su enlace en «sources».
// Lo que depende de los datos de Noctua dice «on Noctua» y desaparece si no hay muestra suficiente.

import type { AreaFacts } from "../../areaFacts"
import type { Block, Guide, GuideCtx, GuideMeta, GuideSection, PlaceLine } from "../guideTypes"
import { METRO_HOURS, METRO_HOURS_NOTE, SOURCES, TAXI_2026, TAXI_PHONES, busRouteEn } from "./transit"

export type { Block, Guide, GuideCtx, GuideMeta, GuideSection, PlaceLine }

/** Día en que se comprobaron las fuentes de las guías (cada vez que se revisen, se actualiza aquí). */
export const GUIDES_REVIEWED = "2026-11-10"

export const GUIDES: GuideMeta[] = [
  {
    slug: "how-to-get-home-barcelona-at-night",
    title: "How to Get Home in Barcelona at Night: Metro, Night Bus & Taxi | Noctua",
    h1: "How to get home in Barcelona at night: metro, night bus and taxi",
    description:
      "Metro hours by night, the N-line night buses and where they meet, official 2026 taxi fares and apps: everything for getting home in Barcelona after a night out.",
    blurb: "Metro hours by night, the N-line night buses, taxi fares and apps.",
  },
  {
    slug: "barcelona-club-entry-id-age-dress-code",
    title: "Barcelona Clubs: Entry Prices, ID, Age Limit & Dress Code | Noctua",
    h1: "Getting into Barcelona clubs: entry prices, ID, age limit and dress code",
    description:
      "What to bring to the door, how old you need to be, what clubs charge and how strict the dress code really is, with figures from the venues listed on Noctua.",
    blurb: "ID, age limit, entry prices, dress code and guest lists.",
  },
  {
    slug: "barcelona-nightlife-what-time-to-go-out",
    title: "When to Go Out in Barcelona: Club Hours & What's Open After 2am | Noctua",
    h1: "When to go out in Barcelona: club hours and what's open after 2am",
    description:
      "A typical night out hour by hour, when clubs open and close, which nights venues are open and how many stay open late, based on the venues listed on Noctua.",
    blurb: "A night out hour by hour, and how many venues stay open late.",
  },
  {
    slug: "24-hour-pharmacies-and-emergency-care-barcelona",
    title: "24-Hour Pharmacies & Emergency Care in Barcelona at Night | Noctua",
    h1: "24-hour pharmacies and emergency care in Barcelona at night",
    description:
      "Pharmacies that open all night in Barcelona with addresses and phone numbers, hospitals with emergency departments, and the numbers to call when something goes wrong.",
    blurb: "All-night pharmacies, hospitals and the numbers to call.",
  },
  {
    slug: "late-night-food-cash-and-essentials-barcelona",
    title: "Late-Night Food, Supermarkets & ATMs in Barcelona | Noctua",
    h1: "Late-night food, supermarkets and cash in Barcelona",
    description:
      "Where to eat after the club, which supermarkets and food places open 24 hours, and how to avoid high-fee ATMs that charge foreign cards.",
    blurb: "Food after the club, 24-hour shops and ATMs to avoid.",
  },
  {
    slug: "barcelona-nightlife-rules-fines-safety",
    title: "Barcelona Nightlife Rules: Street Drinking Fines, Safety & Scams | Noctua",
    h1: "Barcelona nightlife rules: street drinking fines, safety and scams",
    description:
      "Since February 2026 Barcelona fines drinking in the street and urinating in public. What the rules say, what pickpockets do, and who to call if something goes wrong.",
    blurb: "Street drinking fines, pickpockets and who to call.",
  },
  {
    slug: "where-to-go-out-in-barcelona-by-neighbourhood",
    title: "Where to Go Out in Barcelona: Nightlife by Neighbourhood | Noctua",
    h1: "Where to go out in Barcelona: nightlife by neighbourhood",
    description:
      "The main nightlife neighbourhoods of Barcelona with how many venues each has, typical entry prices and opening hours, music styles, and the nearest metro and night bus.",
    blurb: "Neighbourhood by neighbourhood, with entry prices and transport.",
  },
]

export function guideMeta(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

// --- Cifras que alimentan las guías ---------------------------------------------------------------------------

const eur = (n: number) => `€${Number.isInteger(n) ? n : n.toFixed(2)}`
const when = (n: number, one: string, many: string) => (n === 1 ? one : many)
const joinList = (items: string[]) =>
  items.length <= 1 ? items.join("") : items.length === 2 ? `${items[0]} and ${items[1]}` : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`

function priceSentence(f: AreaFacts | null): string | null {
  if (!f?.price) return null
  const { min, max } = f.price
  return min === 0
    ? `On Noctua, venues that list an entry price range from free entry up to ${eur(max)}.`
    : `On Noctua, venues that list an entry price charge between ${eur(min)} and ${eur(max)}.`
}

function placesBlock(items: PlaceLine[], total: number, noun: string): Block {
  return {
    t: "places",
    items: items.map((p) => ({ name: p.name, line: [p.where, p.phone ? `Tel. ${p.phone}` : ""].filter(Boolean).join(" · ") })),
    more: total > items.length ? `${total - items.length} more ${noun} are listed in the app.` : undefined,
  }
}

// --- Las guías ----------------------------------------------------------------------------------------------------

function getHome(ctx: GuideCtx): Guide {
  const meta = GUIDES[0]
  const lines = ctx.busLines
  const viaCat = lines.filter((l) => l.catalunya).length
  const notCat = lines.filter((l) => !l.catalunya).map((l) => l.code)
  const first = lines[0]?.code
  const last = lines[lines.length - 1]?.code
  const routeOf = (code: string) => {
    const l = lines.find((x) => x.code === code)
    return l ? busRouteEn(l.route) : null
  }
  const airport = ["N17", "N18", "N19"].map((c) => ({ c, r: routeOf(c) })).filter((x): x is { c: string; r: string } => !!x.r)
  const transitRows = ctx.areas
    .filter((a) => a.facts && (a.facts.metro.length > 0 || a.facts.nitbus.length > 0))
    .slice(0, 8)
    .map((a) => [a.name, a.facts!.metro.join(", ") || "–", a.facts!.nitbus.join(", ") || "–"])

  const sections: GuideSection[] = [
    {
      id: "metro",
      h2: "Check the metro first",
      blocks: [
        { t: "p", text: "The metro is the fastest way home until it stops, and when it stops depends on the night of the week." },
        { t: "table", head: ["When", "Metro hours"], rows: METRO_HOURS.map((r) => [r.when, r.hours]), note: METRO_HOURS_NOTE },
        {
          t: "p",
          text: "Closing times are when the last train leaves the terminal station at each end of the line, so don't count on catching the very last train: aim to be on the platform with some margin.",
        },
        { t: "links", items: [{ label: "Metro lines and stations", href: "/en/metro", note: "every line, station by station" }] },
      ],
    },
    {
      id: "night-bus",
      h2: "When the metro closes: the night bus (NitBus)",
      blocks: [
        {
          t: "p",
          text:
            lines.length > 0
              ? `Barcelona's night buses are the N-lines. Noctua lists ${lines.length} of them, from ${first} to ${last}. ${viaCat} of the ${lines.length} stop at Plaça Catalunya, the central transfer point, so if you are not sure which bus to take, go to Plaça Catalunya and change there.`
              : "Barcelona's night buses are the N-lines. Most of them stop at Plaça Catalunya, the central transfer point.",
        },
        {
          t: "ul",
          items: [
            "Hours: night buses generally run from about 22:00 until about 05:00–05:30, roughly every 20 minutes. Exact times vary by line, so check the timetable of the line you need.",
            "Tickets: check that your ticket or travel pass is valid on night buses before you rely on it.",
            ...(notCat.length > 0 ? [`Lines that do not stop at Plaça Catalunya: ${joinList(notCat)}.`] : []),
            "Every line has its own page with the stops in order, so you can find the stop nearest to you and where to get off.",
          ],
        },
        { t: "links", items: [{ label: "All night bus lines", href: "/en/night-bus", note: "routes, stops and transfers" }] },
      ],
    },
  ]
  if (transitRows.length > 0) {
    sections.push({
      id: "from-areas",
      h2: "Getting home from the main nightlife areas",
      blocks: [
        {
          t: "table",
          head: ["Area", "Nearest metro stations", "Night buses nearby"],
          rows: transitRows,
          note: "Based on the venues listed in each area: metro stations within 600 m and night bus stops within 500 m of the venues.",
        },
        { t: "links", items: [{ label: "Nightlife by neighbourhood", href: "/en/guides/where-to-go-out-in-barcelona-by-neighbourhood" }] },
      ],
    })
  }
  sections.push(
    {
      id: "taxi",
      h2: "Taxi and ride-hailing",
      blocks: [
        {
          t: "p",
          text: "Official taxis are black and yellow, metered and regulated. A green light on the roof means the taxi is free. Many streets in the Gothic Quarter, El Raval and El Born are pedestrian-only, so choose a drop-off on the nearest road.",
        },
        {
          t: "ul",
          items: [
            `Night tariff (T-2): applies from 20:00 to 08:00 on weekdays and on Saturdays and public holidays. Minimum fare ${TAXI_2026.minFare}, then ${TAXI_2026.perKmNight} per km.`,
            `Supplements: ${TAXI_2026.airportSurcharge} for the airport, ${TAXI_2026.satsSurcharge} when leaving Sants station, and ${TAXI_2026.holidayEveSurcharge} on certain holiday-eve nights.`,
            `Booking by phone or app has a minimum charge of ${TAXI_2026.appBookingMinimum}.`,
            "Most official taxis accept cards: confirm before you get in, and ask for a receipt (un recibo).",
            ...TAXI_PHONES.map((p) => `${p.name}: ${p.phone}`),
          ],
        },
        {
          t: "p",
          text: "Taxi apps such as FREE NOW book official taxis at the regulated rates. Ride-hailing apps such as Uber, Cabify and Bolt also work in Barcelona; the rules for them have changed in recent years, so check availability and the price shown in the app before you book.",
        },
        {
          t: "note",
          tone: "warn",
          title: "Only use licensed rides",
          text: "Ignore people who approach you outside clubs offering a ride. Take a taxi from the street or a rank, or book through an app.",
        },
        { t: "links", items: [{ label: "Taxi ranks and phone numbers", href: "/en/essentials/taxi" }] },
      ],
    },
    {
      id: "airport",
      h2: "Getting to the airport at night",
      blocks: [
        {
          t: "ul",
          items: [
            ...airport.map((a) => `${a.c}: ${a.r}.`),
            `Taxi: a journey that starts at the airport has a minimum fare of ${TAXI_2026.fromAirportMinimum}.`,
          ],
        },
      ],
    },
    {
      id: "safety",
      h2: "Staying safe on the way back",
      blocks: [
        {
          t: "ul",
          items: [
            "Phones and wallets are what pickpockets target on crowded metro platforms, around La Rambla and in the Gothic Quarter. Keep them in a front pocket or zipped bag.",
            "Agree where you will meet if your group splits up, and keep your phone charged.",
            "In an emergency call 112. For the local police (Guàrdia Urbana) call 092.",
          ],
        },
        { t: "links", items: [{ label: "Rules, fines and safety on a night out", href: "/en/guides/barcelona-nightlife-rules-fines-safety" }] },
      ],
    },
  )

  return {
    ...meta,
    lead: "Barcelona is easy to get around at night once you know the rules: the metro runs late on Fridays and all night on Saturdays, a network of N-lines takes over when it closes, and taxis are metered and plentiful.",
    sections,
    faq: [
      {
        q: "Does the Barcelona metro run all night?",
        a: "Only on Saturday nights, when it runs non-stop from Saturday morning until midnight on Sunday, and on a few special nights such as Sant Joan and New Year's Eve. On Fridays and the night before a public holiday it closes at 02:00, and on other nights at midnight.",
      },
      {
        q: "Is there a night bus in Barcelona?",
        a:
          lines.length > 0
            ? `Yes. The NitBus network has ${lines.length} N-lines in Noctua's list, and ${viaCat} of them stop at Plaça Catalunya. Buses generally run from about 22:00 to about 05:00–05:30, roughly every 20 minutes; check the timetable of your line.`
            : "Yes. The NitBus network of N-lines covers the city from about 22:00 to about 05:00–05:30, roughly every 20 minutes, and most lines stop at Plaça Catalunya.",
      },
      {
        q: "How much is a taxi at night in Barcelona?",
        a: `At night the official tariff (T-2) has a minimum fare of ${TAXI_2026.minFare} and ${TAXI_2026.perKmNight} per km, plus supplements such as ${TAXI_2026.airportSurcharge} for the airport. Bookings by phone or app have a minimum charge of ${TAXI_2026.appBookingMinimum}. These are the 2026 urban fares published by AMB.`,
      },
      {
        q: "Is Uber available in Barcelona?",
        a: "Ride-hailing apps such as Uber, Cabify and Bolt work in Barcelona, but the rules for them have changed in recent years, so check availability and the price in the app. The FREE NOW app books official taxis at the regulated rates.",
      },
      {
        q: "How do I get to the airport at night?",
        a:
          airport.length > 0
            ? `Night buses ${joinList(airport.map((a) => a.c))} serve the airport, and taxis run all night. A taxi from the airport has a minimum fare of ${TAXI_2026.fromAirportMinimum}.`
            : `Take a taxi: a journey that starts at the airport has a minimum fare of ${TAXI_2026.fromAirportMinimum}.`,
      },
    ],
    sources: [SOURCES.tmbHours, SOURCES.taxiAmb, SOURCES.amb],
    related: ["barcelona-nightlife-what-time-to-go-out", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Find your nearest stop in the app", href: "/nitbus" },
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
      h2: "At the door: ID and age",
      blocks: [
        {
          t: "p",
          text: "Carry your passport or national ID card. Door staff can ask for ID from anyone who looks young, and you can be turned away without it. A photo on your phone is not always accepted, so bring the document itself.",
        },
        {
          t: "p",
          text: "The legal age to be served alcohol in Catalonia is 18. Venues can set a higher minimum, and some clubs ask for 21 or more.",
        },
        ...(ageTop.length > 0 && ctx.withAge >= 10
          ? [
              {
                t: "table" as const,
                head: ["Minimum age", "Venues on Noctua"],
                rows: ageTop.map((a) => [`${a.age}+`, String(a.n)]),
                note: `Among the ${ctx.withAge} venues that state a minimum age.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "prices",
      h2: "What clubs charge",
      blocks: [
        ...(price ? [{ t: "p" as const, text: price }] : []),
        {
          t: "ul",
          items: [
            "Many clubs include one drink in the entry price. Check the venue page to see whether it does.",
            "Tickets bought online in advance are often cheaper than at the door, and they usually let you skip the queue.",
            "Some venues are free early in the night or with a guest list. Ask exactly what is included before you accept an offer.",
          ],
        },
        { t: "links", items: [{ label: "Browse clubs and bars", href: "/en/clubs" }] },
      ],
    },
    {
      id: "dress",
      h2: "Dress code",
      blocks: [
        {
          t: "p",
          text: "Most venues are relaxed, but some clubs enforce a dress code at the door. Swimwear, flip-flops and sportswear are common reasons for being turned away; closed shoes and a clean, simple outfit are a safe choice.",
        },
        ...(dressTop.length > 0 && ctx.withDress >= 10
          ? [
              {
                t: "table" as const,
                head: ["Dress code", "Venues on Noctua"],
                rows: dressTop.map((d) => [d.label, String(d.n)]),
                note: `Among the ${ctx.withDress} venues that state a dress code. Each venue page shows its own.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "promoters",
      h2: "Promoters and guest lists",
      blocks: [
        {
          t: "p",
          text: "Outside the big clubs you will meet promoters handing out guest-list or free-entry offers. Some are genuine and some are not worth it. Before you follow one, ask what is included (entry only, or entry with a drink), whether there is a time limit, and how much you pay at the door. An official ticket page or the venue's own guest list is the safest option.",
        },
      ],
    },
    {
      id: "queue",
      h2: "At the queue",
      blocks: [
        {
          t: "ul",
          items: [
            "Staff can refuse entry to anyone who is visibly drunk, so pace yourself before you arrive.",
            "Don't drink in the queue, and keep the noise down: residents live above many venues.",
            "Keep your phone and wallet out of sight while you wait. Queues are a favourite place for pickpockets.",
          ],
        },
      ],
    },
  ]
  return {
    ...meta,
    lead: "Clubs in Barcelona are easy to get into if you bring the right ID, arrive at a sensible hour and dress like you are going out. Here is what to expect, with figures from the venues listed on Noctua.",
    sections,
    faq: [
      {
        q: "Do I need a passport to get into a club in Barcelona?",
        a: "Bring your passport or national ID card. Door staff can ask for ID from anyone who looks young, and you may be refused without it.",
      },
      {
        q: "What is the age limit for clubs in Barcelona?",
        a: "The legal age to be served alcohol in Catalonia is 18. Individual venues can set a higher minimum, and some ask for 21 or more. Each venue page on Noctua shows the minimum age when it is known.",
      },
      {
        q: "How much does it cost to get into a club in Barcelona?",
        a: price
          ? `${price} Many clubs include a drink in the entry price, and tickets bought online are often cheaper.`
          : "Prices vary a lot by club and by night. Many clubs include a drink in the entry price, and tickets bought online are often cheaper than at the door.",
      },
      {
        q: "Is there a dress code?",
        a: "Most venues are relaxed, but some clubs enforce a dress code at the door. Avoid swimwear, flip-flops and sportswear, and wear closed shoes.",
      },
    ],
    sources: [],
    related: ["barcelona-nightlife-what-time-to-go-out", "where-to-go-out-in-barcelona-by-neighbourhood"],
    cta: { label: "See entry price and dress code for each venue", href: "/en/clubs" },
  }
}

function busiestNights(nights: { day: string; n: number }[]): string {
  const sorted = [...nights].sort((a, b) => b.n - a.n)
  const [a, b] = sorted
  if (!a || !b) return ""
  return `On Noctua, the most venues are open on ${a.day} and ${b.day} nights.`
}

function getTime(ctx: GuideCtx): Guide {
  const meta = GUIDES[2]
  const f = ctx.facts
  const usual = f?.hours ? `On Noctua, the most common opening time is ${f.hours.open} and the most common closing time is ${f.hours.close}.` : null
  const late = f?.late && f.late.of >= 10 ? `${f.late.n} of the ${f.late.of} venues with opening hours on Noctua stay open past 02:30.` : null
  const nights = ctx.nightsOpen.filter((n) => n.n > 0)
  const sections: GuideSection[] = [
    {
      id: "timeline",
      h2: "A typical night out, hour by hour",
      blocks: [
        {
          t: "table",
          head: ["Time", "What happens"],
          rows: [
            ["21:00–23:00", "Dinner. Spain eats late: restaurants fill up from about 21:00 to 22:00."],
            ["23:00–01:00", "Drinks in a bar or on a terrace. Clubs are still quiet."],
            ["00:00–02:00", "Clubs open their doors. Early entry is often cheaper or free."],
            ["02:00–04:00", "The busiest hours in most clubs."],
            ["05:00–06:00", "Most clubs close. The metro starts again at 05:00 on weekdays and runs non-stop on Saturday nights."],
          ],
          note: "A general pattern: every venue sets its own hours.",
        },
        ...(usual ? [{ t: "p" as const, text: usual }] : []),
        ...(late ? [{ t: "p" as const, text: late }] : []),
      ],
    },
  ]
  if (nights.length >= 4) {
    sections.push({
      id: "nights",
      h2: "Which nights are venues open?",
      blocks: [
        {
          t: "table",
          head: ["Night", "Venues open on Noctua"],
          rows: nights.map((n) => [n.day, String(n.n)]),
          note: "Counts venues whose opening hours or opening days are known. The night counts from the evening: Friday night includes the early hours of Saturday.",
        },
        {
          t: "p",
          text: `${busiestNights(nights)} Many venues open only some nights of the week, so check each venue before you go.`,
        },
      ],
    })
  }
  sections.push(
    {
      id: "late",
      h2: "What's open after 2am",
      blocks: [
        {
          t: "p",
          text: "Clubs and some bars stay open until 05:00 or 06:00. For everything else, the all-night essentials are pharmacies, some supermarkets and food places, and the transport you need to get home.",
        },
        {
          t: "links",
          items: [
            { label: "Late-night food, supermarkets and ATMs", href: "/en/guides/late-night-food-cash-and-essentials-barcelona" },
            { label: "24-hour pharmacies and emergency care", href: "/en/guides/24-hour-pharmacies-and-emergency-care-barcelona" },
            { label: "Getting home: metro, night bus and taxi", href: "/en/guides/how-to-get-home-barcelona-at-night" },
          ],
        },
      ],
    },
    {
      id: "tips",
      h2: "Tips for planning your night",
      blocks: [
        {
          t: "ul",
          items: [
            "Decide how you will get home before you go out. On a Monday to Thursday the metro stops at midnight.",
            "Buy tickets online for big nights; they are often cheaper and skip the queue.",
            "Check the venue's hours: many only open Thursday to Saturday.",
          ],
        },
      ],
    },
  )
  return {
    ...meta,
    lead: "Barcelona goes out late. Dinner is at 21:00 or later, clubs open around midnight and get busy after 02:00. Here is the pattern, with figures from the venues listed on Noctua.",
    sections,
    faq: [
      {
        q: "What time do clubs open in Barcelona?",
        a: f?.hours
          ? `Clubs generally open around midnight and stay open until 05:00–06:00. On Noctua the most common opening time is ${f.hours.open} and the most common closing time is ${f.hours.close}.`
          : "Clubs generally open around midnight and stay open until 05:00–06:00.",
      },
      {
        q: "What time does the nightlife start in Barcelona?",
        a: "Dinner is late, from 21:00. Bars fill up from about 23:00, clubs open around midnight and are busiest between 02:00 and 04:00.",
      },
      {
        q: "What is open after 2am in Barcelona?",
        a: late
          ? `${late} Pharmacies, some supermarkets and food places also open all night.`
          : "Clubs and some bars stay open until 05:00 or 06:00. Pharmacies, some supermarkets and food places also open all night.",
      },
      {
        q: "What time does the metro stop?",
        a: "At midnight from Sunday to Thursday, at 02:00 on Fridays and the night before a public holiday, and it runs all night on Saturdays.",
      },
    ],
    sources: [SOURCES.tmbHours],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-club-entry-id-age-dress-code"],
    cta: { label: "See what's open right now in the app", href: "/clubs" },
  }
}

function getPharmacy(ctx: GuideCtx): Guide {
  const meta = GUIDES[3]
  const n = ctx.pharmacies24Total
  const sections: GuideSection[] = [
    {
      id: "pharmacies",
      h2: "Pharmacies open 24 hours",
      blocks: [
        {
          t: "p",
          text:
            n > 0
              ? `Noctua lists ${ctx.pharmaciesTotal} pharmacies in the Barcelona area, ${n} of them open 24 hours. Hours can change, so phone first if you have to travel a long way.`
              : "Phone before you travel: opening hours change and map apps are not always up to date.",
        },
        ...(n > 0 ? [placesBlock(ctx.pharmacies24, n, "24-hour pharmacies")] : []),
        { t: "links", items: [{ label: "All pharmacies on Noctua", href: "/en/essentials/pharmacy" }] },
      ],
    },
    {
      id: "how",
      h2: "Using a pharmacy in Spain",
      blocks: [
        {
          t: "ul",
          items: [
            "Pharmacies (farmacias) are marked with a green cross. The pharmacist can advise on minor problems.",
            "Some medicines need a prescription. Bring the name of the active ingredient (the generic name), because brand names differ between countries.",
            "At night, 24-hour pharmacies sometimes serve through a small window or hatch.",
            "Hours shown on map apps can be out of date: if you are far away, phone first.",
          ],
        },
      ],
    },
    {
      id: "emergency",
      h2: "Emergency numbers",
      blocks: [
        {
          t: "table",
          head: ["Number", "Use it for"],
          rows: [
            ["112", "Any emergency: ambulance, police or fire. Free from any phone."],
            ["061", "Health advice in Catalonia (Salut Respon)."],
            ["092", "Local police (Guàrdia Urbana)."],
          ],
        },
        {
          t: "note",
          title: "Travel insurance",
          text: "EU citizens can use public healthcare with the European Health Insurance Card (UK visitors with a GHIC). Everyone else should have travel insurance. Keep your policy number on your phone.",
        },
      ],
    },
  ]
  if (ctx.hospitals.length > 0) {
    sections.push({
      id: "hospitals",
      h2: "Hospitals",
      blocks: [
        { t: "p", text: "Large public hospitals have an emergency department (urgències) that is open all day and night. For anything urgent call 112 rather than travelling alone." },
        placesBlock(ctx.hospitals, ctx.hospitalsTotal, "hospitals"),
        { t: "links", items: [{ label: "Hospitals on Noctua", href: "/en/essentials/hospital" }] },
      ],
    })
  }
  return {
    ...meta,
    lead: "If you need medicine or a doctor in the middle of the night, here is where to go in Barcelona and which numbers to call.",
    sections,
    faq: [
      {
        q: "Which pharmacies are open 24 hours in Barcelona?",
        a:
          n > 0
            ? `Noctua lists ${n} pharmacies that open 24 hours, such as ${ctx.pharmacies24
                .slice(0, 3)
                .map((p) => p.name)
                .join(", ")}. The full list with addresses is on this page.`
            : "Some pharmacies open all night. Check the list in the app and phone first, because hours change.",
      },
      {
        q: "What number do I call in a medical emergency in Barcelona?",
        a: "Call 112. It is free from any phone and works across Spain and the EU. For health advice in Catalonia you can also call 061.",
      },
      {
        q: "Can I buy medicine without a prescription in Spain?",
        a: "Some medicines can be bought without one, others need a prescription. The pharmacist will tell you. Bring the generic name of the medicine, since brand names differ between countries.",
      },
    ],
    sources: [],
    related: ["late-night-food-cash-and-essentials-barcelona", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Find the nearest pharmacy in the app", href: "/essentials/pharmacy" },
  }
}

function getFood(ctx: GuideCtx): Guide {
  const meta = GUIDES[4]
  const sections: GuideSection[] = [
    {
      id: "food",
      h2: "Eating after the club",
      blocks: [
        {
          t: "p",
          text:
            ctx.food24.length > 0
              ? `Noctua lists ${ctx.food24Total} food places that open 24 hours. Kebab shops, pizza by the slice and fast food are what stays open after the kitchens of normal restaurants close.`
              : "Kebab shops, pizza by the slice and fast food are what stays open after the kitchens of normal restaurants close.",
        },
        ...(ctx.food24.length > 0 ? [placesBlock(ctx.food24, ctx.food24Total, "24-hour food places")] : []),
        { t: "links", items: [{ label: "Late-night food on Noctua", href: "/en/essentials/food" }] },
      ],
    },
    {
      id: "supermarkets",
      h2: "Supermarkets open late",
      blocks: [
        {
          t: "p",
          text:
            ctx.supermarkets24.length > 0
              ? `Noctua lists ${ctx.supermarkets24Total} supermarkets and grocery stores open 24 hours. They are useful for water, snacks and basics.`
              : "Some supermarkets and grocery stores stay open late. Check the hours in the app.",
        },
        ...(ctx.supermarkets24.length > 0 ? [placesBlock(ctx.supermarkets24, ctx.supermarkets24Total, "24-hour supermarkets")] : []),
        { t: "links", items: [{ label: "Supermarkets on Noctua", href: "/en/essentials/supermarket" }] },
      ],
    },
    {
      id: "cash",
      h2: "Cash and ATMs",
      blocks: [
        {
          t: "p",
          text: "Cards are accepted almost everywhere, but a little cash is handy for small bars and street stalls.",
        },
        {
          t: "ul",
          items: [
            "Avoid independent ATMs such as the Euronet machines you see in tourist areas. They charge high fees and poor exchange rates to foreign cards.",
            "Use ATMs that belong to a bank, such as CaixaBank, Santander, BBVA or Sabadell.",
            "If the machine offers to charge you in your home currency, choose euros. The conversion rate is usually worse.",
          ],
        },
        ...(ctx.highFeeAtms > 0
          ? [
              {
                t: "note" as const,
                title: "Noctua flags the expensive ones",
                text: `Noctua marks ${ctx.highFeeAtms} of the ${ctx.atmsTotal} cash machines it lists as high-fee, so you can avoid them.`,
                tone: "info" as const,
              },
            ]
          : []),
        { t: "links", items: [{ label: "ATMs on Noctua", href: "/en/essentials/atm" }] },
      ],
    },
  ]
  return {
    ...meta,
    lead: "After the club, what you need is food, water, cash or a pharmacy. Here is what stays open late in Barcelona and how to avoid paying more than you should.",
    sections,
    faq: [
      {
        q: "Are there 24-hour supermarkets in Barcelona?",
        a:
          ctx.supermarkets24.length > 0
            ? `Yes. Noctua lists ${ctx.supermarkets24Total} supermarkets and grocery stores open 24 hours. Check the hours in the app before you go.`
            : "Some stay open late, but check the hours in the app before you go.",
      },
      {
        q: "Which ATMs should I avoid in Barcelona?",
        a: "Avoid independent Euronet machines in tourist areas. They charge high fees and poor exchange rates to foreign cards. Use machines that belong to a bank, and choose to be charged in euros.",
      },
      {
        q: "Where can I eat at 4am in Barcelona?",
        a:
          ctx.food24.length > 0
            ? `Noctua lists ${ctx.food24Total} food places open 24 hours, mostly kebab shops, pizza and fast food. The list is on this page.`
            : "Kebab shops, pizza by the slice and fast food are the usual options. Check the hours in the app.",
      },
    ],
    sources: [],
    related: ["24-hour-pharmacies-and-emergency-care-barcelona", "how-to-get-home-barcelona-at-night"],
    cta: { label: "Find what's open near you", href: "/essentials" },
  }
}

function getRules(): Guide {
  const meta = GUIDES[5]
  return {
    ...meta,
    lead: "Barcelona's new coexistence ordinance took effect on 15 February 2026. It raised the fines for the things visitors on a night out most often get wrong. Here is what it says and how to stay out of trouble.",
    sections: [
      {
        id: "street",
        h2: "Drinking in the street",
        blocks: [
          { t: "p", text: "Drinking alcohol in the street is not allowed in Barcelona. The new ordinance sets these fines:" },
          {
            t: "table",
            head: ["Offence", "Fine"],
            rows: [
              ["Drinking alcohol in the street (minor offence)", "€100 to €600"],
              ["The same in a particularly crowded place or in front of minors", "€750 to €1,500"],
              ["Urinating in public", "Up to €300"],
              ["Urinating near public toilets, around bars or nightclubs, or on a street less than four metres wide", "Up to €750"],
              ["Particularly serious cases of urinating in public (especially crowded places, places frequented by minors, listed or protected places)", "€750 to €1,500"],
              ["Drinking routes (tourist itineraries that visit several bars with the main aim of drinking alcohol)", "€1,500 to €3,000"],
            ],
            note: "Source: Ara, key points of the new ordinance (see Sources).",
          },
          {
            t: "p",
            text: "For minor offences, and for people who live abroad, Guàrdia Urbana officers with card terminals can offer payment on the spot with a discount of up to 50% when you pay within ten days of notification. It is still a fine.",
          },
          { t: "note", title: "In practice", text: "Drink in a bar or on a terrace, and use a toilet in a bar before you leave. A can bought from a street seller and drunk outside is not worth the fine.", tone: "warn" },
        ],
      },
      {
        id: "theft",
        h2: "Pickpockets and phone theft",
        blocks: [
          {
            t: "ul",
            items: [
              "Pickpockets work crowded places: La Rambla, the Gothic Quarter, metro platforms and the queues outside clubs. Keep your phone and wallet in a front pocket or a zipped bag.",
              "Don't leave your phone on a table or at the edge of a terrace.",
              "Be wary of strangers who bump into you, shake your hand or try to give you something. They are often creating a distraction.",
              "If something is stolen, report it at a police station (hacer una denuncia). Your insurance will ask for the report.",
            ],
          },
        ],
      },
      {
        id: "drinks",
        h2: "Looking after yourself and your drink",
        blocks: [
          {
            t: "ul",
            items: [
              "Don't leave your drink unattended, and don't accept drinks from strangers.",
              "If you feel unwell, tell the staff or a friend and call 112.",
              "Agree a meeting point and a way home with your group before you go out.",
            ],
          },
        ],
      },
      {
        id: "help",
        h2: "Who to call",
        blocks: [
          {
            t: "table",
            head: ["Number", "Use it for"],
            rows: [
              ["112", "Any emergency: ambulance, police or fire. Free from any phone."],
              ["092", "Local police (Guàrdia Urbana)."],
              ["061", "Health advice in Catalonia."],
            ],
          },
          { t: "links", items: [{ label: "24-hour pharmacies and emergency care", href: "/en/guides/24-hour-pharmacies-and-emergency-care-barcelona" }] },
        ],
      },
    ],
    faq: [
      {
        q: "Can you drink alcohol in the street in Barcelona?",
        a: "No. Under the ordinance in force since 15 February 2026, drinking alcohol in the street can be fined from €100 to €600, and from €750 to €1,500 in particularly crowded places or in front of minors.",
      },
      {
        q: "How much is the fine for urinating in public in Barcelona?",
        a: "Up to €300 in general, up to €750 near public toilets, around bars or nightclubs or on streets less than four metres wide, and €750 to €1,500 in particularly serious cases.",
      },
      {
        q: "Is Barcelona safe at night?",
        a: "Most visitors have no problems, but pickpocketing is common in crowded places. Keep your phone and wallet out of sight, and don't leave drinks unattended.",
      },
    ],
    sources: [SOURCES.ordinance],
    related: ["how-to-get-home-barcelona-at-night", "24-hour-pharmacies-and-emergency-care-barcelona"],
    cta: { label: "Plan your night in the app", href: "/plan" },
  }
}

// Una frase de cada barrio que se conoce de siempre; si el barrio no está aquí, solo salen sus datos.
const AREA_NOTES: [RegExp, string][] = [
  [/raval/, "Compact and lively, with cheap bars, live music and late-night spots right next to La Rambla."],
  [/gracia/, "A village feel, with squares full of local bars. Relaxed rather than clubby."],
  [/poble-?sec/, "Carrer de Blai for tapas, and the Paral·lel avenue with theatres and music venues."],
  [/eixample/, "The grid of central Barcelona, with many cocktail bars, restaurants and LGBTQ+ venues."],
  [/barceloneta|olimpic/, "The beachfront and the port, where the big clubs and beach bars are."],
  [/poblenou|poble-nou/, "A former industrial district by the beach, known for larger clubs and electronic music."],
  [/born|ribera|sant-pere/, "Narrow medieval streets with cocktail bars and small venues."],
  [/gotic|gothic/, "The old city: bars and clubs around Plaça Reial and the lanes off La Rambla."],
  [/sants/, "Residential and local, with bars and clubs close to Sants station."],
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
    parts.push(`${a.count} ${when(a.count, "venue", "venues")} listed.`)
    if (f?.price) parts.push(f.price.min === 0 ? `Entry: free to ${eur(f.price.max)}.` : `Entry: ${eur(f.price.min)}–${eur(f.price.max)}.`)
    if (f?.hours) parts.push(`Usually open ${f.hours.open}–${f.hours.close}.`)
    if (f?.metro.length) parts.push(`Metro: ${f.metro.join(", ")}.`)
    if (f?.nitbus.length) parts.push(`Night buses: ${f.nitbus.join(", ")}.`)
    blocks.push({ t: "places", items: [{ name: a.name, line: parts.join(" ") }] })
    blocks.push({ t: "links", items: [{ label: `Venues in ${a.name}`, href: `/en/neighbourhoods/${a.slug}` }] })
  }
  return {
    ...meta,
    lead: "Barcelona's nightlife is spread across a handful of neighbourhoods, each with its own mood. Here are the main ones, with how many venues Noctua lists, typical prices and hours, and how to get home.",
    sections: [
      { id: "areas", h2: "The main nightlife neighbourhoods", blocks },
      {
        id: "choose",
        h2: "How to choose",
        blocks: [
          {
            t: "ul",
            items: [
              "For big clubs and electronic music, look at the beachfront and port area and at Poblenou.",
              "For cocktail bars and a relaxed evening, try El Born, Gràcia and the Eixample.",
              "For cheap drinks and live music, the Raval and Poble-sec.",
              "Plan your way home before you go: neighbourhoods near the sea are further from the metro at 02:00 than the centre is.",
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: "What is the best neighbourhood for nightlife in Barcelona?",
        a: ctx.areas[0]
          ? `It depends what you want. On Noctua, ${ctx.areas[0].name} has the most venues listed (${ctx.areas[0].count}). The beachfront and Poblenou are known for big clubs, El Born and Gràcia for cocktail bars and a relaxed evening.`
          : "It depends what you want. The beachfront and Poblenou are known for big clubs, El Born and Gràcia for cocktail bars and a relaxed evening.",
      },
      {
        q: "Where are the clubs in Barcelona?",
        a: "The biggest clubs are by the port and the beachfront, and around Poblenou. There are also clubs in the Raval, Poble-sec and the Eixample.",
      },
    ],
    sources: [],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-nightlife-what-time-to-go-out"],
    cta: { label: "Explore the map of venues", href: "/map" },
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
