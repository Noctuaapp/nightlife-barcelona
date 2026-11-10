// Categorías de «Esenciales» que tienen página en inglés (/en/essentials/[slug]). Solo las que un visitante
// busca de noche; las demás (casino, bicing, consignas...) siguen solo en español.

export type EssentialEn = {
  slug: string
  /** Valor de la columna `category` en la base. */
  key: string
  title: string
  h1: string
  description: string
  intro: string
  /** Guía relacionada (slug en /en/guides). */
  guide?: string
  /** Texto del enlace a la guía. */
  guideLabel?: string
}

export const ESSENTIALS_EN: EssentialEn[] = [
  {
    slug: "pharmacy",
    key: "Pharmacy",
    title: "24-Hour Pharmacies in Barcelona | Noctua",
    h1: "24-hour pharmacies in Barcelona",
    description: "Pharmacies open all night in Barcelona, with addresses, phone numbers and directions. Find the nearest one when you need medicine after midnight.",
    intro: "Pharmacies (farmacias) are marked with a green cross. These are the ones that open 24 hours; hours can change, so phone first if you have to travel.",
    guide: "24-hour-pharmacies-and-emergency-care-barcelona",
    guideLabel: "24-hour pharmacies and emergency care",
  },
  {
    slug: "hospital",
    key: "Hospital",
    title: "Hospitals & Emergency Rooms in Barcelona | Noctua",
    h1: "Hospitals and emergency rooms in Barcelona",
    description: "Hospitals with emergency departments (urgències) in Barcelona, with addresses and phone numbers. In an emergency, call 112.",
    intro: "For anything urgent call 112, free from any phone. These hospitals have an emergency department (urgències).",
    guide: "24-hour-pharmacies-and-emergency-care-barcelona",
    guideLabel: "Emergency numbers and what to do",
  },
  {
    slug: "taxi",
    key: "Taxi",
    title: "Taxi in Barcelona at Night: Ranks, Phone Numbers & 2026 Fares | Noctua",
    h1: "Taxi in Barcelona at night",
    description: "Taxi ranks and phone numbers in Barcelona, with the official 2026 night fares and supplements, so you know what a ride home should cost.",
    intro: "Official taxis are black and yellow and metered. Hail one in the street, go to a rank or book by phone or app.",
    guide: "how-to-get-home-barcelona-at-night",
    guideLabel: "How to get home: metro, night bus and taxi",
  },
  {
    slug: "food",
    key: "Food",
    title: "Late-Night Food in Barcelona: Open 24 Hours | Noctua",
    h1: "Late-night food in Barcelona",
    description: "Where to eat after the club in Barcelona: kebabs, pizza and fast food open late or 24 hours, with addresses and directions.",
    intro: "Kebab shops, pizza and fast food for after the party. Places marked 24 hours are open all week, day and night.",
    guide: "late-night-food-cash-and-essentials-barcelona",
    guideLabel: "Late-night food, supermarkets and cash",
  },
  {
    slug: "supermarket",
    key: "Supermarket",
    title: "24-Hour Supermarkets in Barcelona | Noctua",
    h1: "24-hour supermarkets in Barcelona",
    description: "Supermarkets and grocery stores open 24 hours or late in Barcelona, with addresses and directions. Water, snacks and basics after the club.",
    intro: "Useful for water, snacks and basics before or after going out. Places marked 24 hours are open all week, day and night.",
    guide: "late-night-food-cash-and-essentials-barcelona",
    guideLabel: "Late-night food, supermarkets and cash",
  },
  {
    slug: "atm",
    key: "ATM",
    title: "ATMs in Barcelona: Which to Avoid (High Fees) | Noctua",
    h1: "ATMs in Barcelona and which to avoid",
    description: "Cash machines in Barcelona with addresses and directions, and the independent Euronet ATMs that charge high fees to foreign cards.",
    intro: "Use ATMs that belong to a bank. Independent machines such as Euronet charge high fees and poor exchange rates to foreign cards: they are marked here so you can avoid them.",
    guide: "late-night-food-cash-and-essentials-barcelona",
    guideLabel: "Late-night food, supermarkets and cash",
  },
  {
    slug: "gas-station",
    key: "Gas Station",
    title: "24-Hour Petrol Stations in Barcelona | Noctua",
    h1: "24-hour petrol stations in Barcelona",
    description: "Petrol stations open at night or 24 hours in Barcelona, with addresses and directions.",
    intro: "Petrol stations (gasolineras) that stay open at night. Places marked 24 hours are open all week, day and night.",
  },
]

export const essentialEn = (slug: string): EssentialEn | undefined => ESSENTIALS_EN.find((e) => e.slug === slug)
