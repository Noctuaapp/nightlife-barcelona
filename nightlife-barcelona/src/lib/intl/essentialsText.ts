import type { IntlLang } from "./lang"

// Categorías de «Esenciales» que tienen página en inglés, alemán, francés e italiano
// (/{idioma}/essentials/[slug]). Solo las que un visitante busca de noche; las demás (casino, bicing,
// consignas...) siguen solo en español.

export type EssentialText = {
  slug: string
  /** Valor de la columna `category` en la base. */
  key: string
  title: string
  h1: string
  description: string
  intro: string
  /** Guía relacionada (slug en /{idioma}/guides). */
  guide?: string
  /** Texto del enlace a la guía. */
  guideLabel?: string
}

type Texts = Omit<EssentialText, "slug" | "key" | "guide">
type Fixed = { slug: string; key: string; guide?: string }

const FIXED: Fixed[] = [
  { slug: "pharmacy", key: "Pharmacy", guide: "24-hour-pharmacies-and-emergency-care-barcelona" },
  { slug: "hospital", key: "Hospital", guide: "24-hour-pharmacies-and-emergency-care-barcelona" },
  { slug: "taxi", key: "Taxi", guide: "how-to-get-home-barcelona-at-night" },
  { slug: "food", key: "Food", guide: "late-night-food-cash-and-essentials-barcelona" },
  { slug: "supermarket", key: "Supermarket", guide: "late-night-food-cash-and-essentials-barcelona" },
  { slug: "atm", key: "ATM", guide: "late-night-food-cash-and-essentials-barcelona" },
  { slug: "gas-station", key: "Gas Station" },
]

const TEXTS: Record<IntlLang, Record<string, Texts>> = {
  en: {
    pharmacy: {
      title: "24-Hour Pharmacies in Barcelona | Noctua",
      h1: "24-hour pharmacies in Barcelona",
      description: "Pharmacies open all night in Barcelona, with addresses, phone numbers and directions. Find the nearest one when you need medicine after midnight.",
      intro: "Pharmacies (farmacias) are marked with a green cross. These are the ones that open 24 hours; hours can change, so phone first if you have to travel.",
      guideLabel: "24-hour pharmacies and emergency care",
    },
    hospital: {
      title: "Hospitals & Emergency Rooms in Barcelona | Noctua",
      h1: "Hospitals and emergency rooms in Barcelona",
      description: "Hospitals with emergency departments (urgències) in Barcelona, with addresses and phone numbers. In an emergency, call 112.",
      intro: "For anything urgent call 112, free from any phone. These hospitals have an emergency department (urgències).",
      guideLabel: "Emergency numbers and what to do",
    },
    taxi: {
      title: "Taxi in Barcelona at Night: Ranks, Phone Numbers & 2026 Fares | Noctua",
      h1: "Taxi in Barcelona at night",
      description: "Taxi ranks and phone numbers in Barcelona, with the official 2026 night fares and supplements, so you know what a ride home should cost.",
      intro: "Official taxis are black and yellow and metered. Hail one in the street, go to a rank or book by phone or app.",
      guideLabel: "How to get home: metro, night bus and taxi",
    },
    food: {
      title: "Late-Night Food in Barcelona: Open 24 Hours | Noctua",
      h1: "Late-night food in Barcelona",
      description: "Where to eat after the club in Barcelona: kebabs, pizza and fast food open late or 24 hours, with addresses and directions.",
      intro: "Kebab shops, pizza and fast food for after the party. Places marked 24 hours are open all week, day and night.",
      guideLabel: "Late-night food, supermarkets and cash",
    },
    supermarket: {
      title: "24-Hour Supermarkets in Barcelona | Noctua",
      h1: "24-hour supermarkets in Barcelona",
      description: "Supermarkets and grocery stores open 24 hours or late in Barcelona, with addresses and directions. Water, snacks and basics after the club.",
      intro: "Useful for water, snacks and basics before or after going out. Places marked 24 hours are open all week, day and night.",
      guideLabel: "Late-night food, supermarkets and cash",
    },
    atm: {
      title: "ATMs in Barcelona: Which to Avoid (High Fees) | Noctua",
      h1: "ATMs in Barcelona and which to avoid",
      description: "Cash machines in Barcelona with addresses and directions, and the independent Euronet ATMs that charge high fees to foreign cards.",
      intro: "Use ATMs that belong to a bank. Independent machines such as Euronet charge high fees and poor exchange rates to foreign cards: they are marked here so you can avoid them.",
      guideLabel: "Late-night food, supermarkets and cash",
    },
    "gas-station": {
      title: "24-Hour Petrol Stations in Barcelona | Noctua",
      h1: "24-hour petrol stations in Barcelona",
      description: "Petrol stations open at night or 24 hours in Barcelona, with addresses and directions.",
      intro: "Petrol stations (gasolineras) that stay open at night. Places marked 24 hours are open all week, day and night.",
    },
  },
  de: {
    pharmacy: {
      title: "24-Stunden-Apotheken in Barcelona | Noctua",
      h1: "24-Stunden-Apotheken in Barcelona",
      description: "Apotheken, die in Barcelona die ganze Nacht geöffnet sind, mit Adresse, Telefonnummer und Wegbeschreibung. So findest du nach Mitternacht schnell die nächste.",
      intro: "Apotheken (farmacias) erkennst du am grünen Kreuz. Hier stehen die, die rund um die Uhr geöffnet sind. Öffnungszeiten können sich ändern: ruf vorher an, wenn du weit fahren musst.",
      guideLabel: "24-Stunden-Apotheken und medizinische Notfälle",
    },
    hospital: {
      title: "Krankenhäuser & Notaufnahmen in Barcelona | Noctua",
      h1: "Krankenhäuser und Notaufnahmen in Barcelona",
      description: "Krankenhäuser mit Notaufnahme (urgències) in Barcelona, mit Adresse und Telefonnummer. Im Notfall wähle die 112.",
      intro: "Bei allem Dringenden ruf die 112 an, von jedem Telefon aus kostenlos. Diese Krankenhäuser haben eine Notaufnahme (urgències).",
      guideLabel: "Notrufnummern und was zu tun ist",
    },
    taxi: {
      title: "Taxi in Barcelona nachts: Stände, Telefon & Tarife 2026 | Noctua",
      h1: "Taxi in Barcelona bei Nacht",
      description: "Taxistände und Telefonnummern in Barcelona, mit den offiziellen Nachttarifen und Zuschlägen 2026, damit du weißt, was die Fahrt nach Hause kosten sollte.",
      intro: "Offizielle Taxis sind schwarz-gelb und haben ein Taxameter. Du kannst eines auf der Straße anhalten, zu einem Taxistand gehen oder per Telefon oder App bestellen.",
      guideLabel: "So kommst du nach Hause: Metro, Nachtbus und Taxi",
    },
    food: {
      title: "Essen spät nachts in Barcelona: rund um die Uhr offen | Noctua",
      h1: "Essen spät nachts in Barcelona",
      description: "Wo du in Barcelona nach dem Club essen kannst: Kebab, Pizza und Fast Food, spät oder rund um die Uhr geöffnet, mit Adresse und Wegbeschreibung.",
      intro: "Kebab, Pizza und Fast Food für nach der Party. Orte mit der Markierung „24 Stunden“ sind die ganze Woche Tag und Nacht geöffnet.",
      guideLabel: "Essen spät nachts, Supermärkte und Bargeld",
    },
    supermarket: {
      title: "24-Stunden-Supermärkte in Barcelona | Noctua",
      h1: "24-Stunden-Supermärkte in Barcelona",
      description: "Supermärkte und Lebensmittelläden in Barcelona, die rund um die Uhr oder bis spät offen sind, mit Adresse und Wegbeschreibung. Wasser, Snacks und das Nötigste nach dem Club.",
      intro: "Praktisch für Wasser, Snacks und das Nötigste vor oder nach dem Ausgehen. Orte mit der Markierung „24 Stunden“ sind die ganze Woche Tag und Nacht geöffnet.",
      guideLabel: "Essen spät nachts, Supermärkte und Bargeld",
    },
    atm: {
      title: "Geldautomaten in Barcelona: welche du meiden solltest | Noctua",
      h1: "Geldautomaten in Barcelona und welche du meiden solltest",
      description: "Geldautomaten in Barcelona mit Adresse und Wegbeschreibung und die unabhängigen Euronet-Automaten, die ausländischen Karten hohe Gebühren berechnen.",
      intro: "Nutz Automaten, die zu einer Bank gehören. Unabhängige Geräte wie Euronet verlangen von ausländischen Karten hohe Gebühren und schlechte Wechselkurse: Sie sind hier markiert, damit du sie umgehen kannst.",
      guideLabel: "Essen spät nachts, Supermärkte und Bargeld",
    },
    "gas-station": {
      title: "24-Stunden-Tankstellen in Barcelona | Noctua",
      h1: "24-Stunden-Tankstellen in Barcelona",
      description: "Tankstellen in Barcelona, die nachts oder rund um die Uhr geöffnet sind, mit Adresse und Wegbeschreibung.",
      intro: "Tankstellen (gasolineras), die nachts geöffnet bleiben. Orte mit der Markierung „24 Stunden“ sind die ganze Woche Tag und Nacht geöffnet.",
    },
  },
  fr: {
    pharmacy: {
      title: "Pharmacies ouvertes 24 h/24 à Barcelone | Noctua",
      h1: "Pharmacies ouvertes 24 h/24 à Barcelone",
      description: "Pharmacies ouvertes toute la nuit à Barcelone, avec adresses, numéros de téléphone et itinéraires. Trouvez la plus proche quand il vous faut un médicament après minuit.",
      intro: "Les pharmacies (farmacias) se repèrent à leur croix verte. Voici celles qui ouvrent 24 h/24 ; les horaires peuvent changer, appelez avant de vous déplacer si c'est loin.",
      guideLabel: "Pharmacies 24 h/24 et urgences médicales",
    },
    hospital: {
      title: "Hôpitaux et urgences à Barcelone | Noctua",
      h1: "Hôpitaux et urgences à Barcelone",
      description: "Hôpitaux avec service d'urgences (urgències) à Barcelone, avec adresses et numéros de téléphone. En cas d'urgence, appelez le 112.",
      intro: "Pour toute urgence, appelez le 112, gratuit depuis n'importe quel téléphone. Ces hôpitaux disposent d'un service d'urgences (urgències).",
      guideLabel: "Numéros d'urgence et que faire",
    },
    taxi: {
      title: "Taxi à Barcelone la nuit : stations, téléphones et tarifs 2026 | Noctua",
      h1: "Taxi à Barcelone la nuit",
      description: "Stations de taxi et numéros de téléphone à Barcelone, avec les tarifs de nuit et suppléments officiels 2026, pour savoir combien doit coûter le retour.",
      intro: "Les taxis officiels sont noir et jaune et équipés d'un compteur. Hélez-en un dans la rue, rendez-vous à une station ou réservez par téléphone ou appli.",
      guideLabel: "Comment rentrer : métro, bus de nuit et taxi",
    },
    food: {
      title: "Manger tard la nuit à Barcelone : ouvert 24 h/24 | Noctua",
      h1: "Manger tard la nuit à Barcelone",
      description: "Où manger après la boîte à Barcelone : kebabs, pizzas et fast-food ouverts tard ou 24 h/24, avec adresses et itinéraires.",
      intro: "Kebabs, pizzas et fast-food pour après la fête. Les adresses marquées « 24 h/24 » sont ouvertes toute la semaine, jour et nuit.",
      guideLabel: "Manger tard, supermarchés et espèces",
    },
    supermarket: {
      title: "Supermarchés ouverts 24 h/24 à Barcelone | Noctua",
      h1: "Supermarchés ouverts 24 h/24 à Barcelone",
      description: "Supermarchés et épiceries ouverts 24 h/24 ou tard à Barcelone, avec adresses et itinéraires. De l'eau, des snacks et l'essentiel après la boîte.",
      intro: "Pratique pour l'eau, les snacks et l'essentiel avant ou après la sortie. Les adresses marquées « 24 h/24 » sont ouvertes toute la semaine, jour et nuit.",
      guideLabel: "Manger tard, supermarchés et espèces",
    },
    atm: {
      title: "Distributeurs à Barcelone : lesquels éviter (frais élevés) | Noctua",
      h1: "Distributeurs de billets à Barcelone et ceux à éviter",
      description: "Distributeurs de billets à Barcelone avec adresses et itinéraires, et les automates indépendants Euronet qui facturent des frais élevés aux cartes étrangères.",
      intro: "Utilisez les distributeurs rattachés à une banque. Les automates indépendants comme Euronet appliquent des frais élevés et de mauvais taux de change aux cartes étrangères : ils sont signalés ici pour que vous puissiez les éviter.",
      guideLabel: "Manger tard, supermarchés et espèces",
    },
    "gas-station": {
      title: "Stations-service ouvertes 24 h/24 à Barcelone | Noctua",
      h1: "Stations-service ouvertes 24 h/24 à Barcelone",
      description: "Stations-service ouvertes la nuit ou 24 h/24 à Barcelone, avec adresses et itinéraires.",
      intro: "Stations-service (gasolineras) ouvertes la nuit. Les adresses marquées « 24 h/24 » sont ouvertes toute la semaine, jour et nuit.",
    },
  },
  it: {
    pharmacy: {
      title: "Farmacie aperte 24 ore a Barcellona | Noctua",
      h1: "Farmacie aperte 24 ore a Barcellona",
      description: "Farmacie aperte tutta la notte a Barcellona, con indirizzi, numeri di telefono e indicazioni. Trova la più vicina quando ti serve un medicinale dopo mezzanotte.",
      intro: "Le farmacie (farmacias) si riconoscono dalla croce verde. Queste sono quelle aperte 24 ore su 24; gli orari possono cambiare, quindi telefona prima se devi spostarti lontano.",
      guideLabel: "Farmacie 24 ore e pronto soccorso",
    },
    hospital: {
      title: "Ospedali e pronto soccorso a Barcellona | Noctua",
      h1: "Ospedali e pronto soccorso a Barcellona",
      description: "Ospedali con pronto soccorso (urgències) a Barcellona, con indirizzi e numeri di telefono. In caso di emergenza chiama il 112.",
      intro: "Per qualsiasi urgenza chiama il 112, gratuito da qualsiasi telefono. Questi ospedali hanno un pronto soccorso (urgències).",
      guideLabel: "Numeri di emergenza e cosa fare",
    },
    taxi: {
      title: "Taxi a Barcellona di notte: soste, telefoni e tariffe 2026 | Noctua",
      h1: "Taxi a Barcellona di notte",
      description: "Soste dei taxi e numeri di telefono a Barcellona, con le tariffe notturne ufficiali e i supplementi del 2026, per sapere quanto dovrebbe costare il ritorno a casa.",
      intro: "I taxi ufficiali sono neri e gialli e hanno il tassametro. Puoi fermarne uno per strada, andare a una sosta o prenotarlo per telefono o con un'app.",
      guideLabel: "Come tornare a casa: metro, bus notturno e taxi",
    },
    food: {
      title: "Mangiare di notte a Barcellona: aperto 24 ore | Noctua",
      h1: "Mangiare di notte a Barcellona",
      description: "Dove mangiare dopo la discoteca a Barcellona: kebab, pizza e fast food aperti fino a tardi o 24 ore su 24, con indirizzi e indicazioni.",
      intro: "Kebab, pizza e fast food per dopo la festa. I locali segnati come «24 ore» sono aperti tutta la settimana, giorno e notte.",
      guideLabel: "Cibo a tarda notte, supermercati e contanti",
    },
    supermarket: {
      title: "Supermercati aperti 24 ore a Barcellona | Noctua",
      h1: "Supermercati aperti 24 ore a Barcellona",
      description: "Supermercati e minimarket aperti 24 ore o fino a tardi a Barcellona, con indirizzi e indicazioni. Acqua, snack e l'essenziale dopo la discoteca.",
      intro: "Utili per acqua, snack e l'essenziale prima o dopo la serata. I punti segnati come «24 ore» sono aperti tutta la settimana, giorno e notte.",
      guideLabel: "Cibo a tarda notte, supermercati e contanti",
    },
    atm: {
      title: "Bancomat a Barcellona: quali evitare (commissioni alte) | Noctua",
      h1: "Bancomat a Barcellona e quali evitare",
      description: "Sportelli bancomat a Barcellona con indirizzi e indicazioni, e gli sportelli indipendenti Euronet che applicano commissioni alte alle carte straniere.",
      intro: "Usa gli sportelli che appartengono a una banca. Quelli indipendenti come Euronet applicano commissioni alte e cambi sfavorevoli alle carte straniere: qui sono segnalati così puoi evitarli.",
      guideLabel: "Cibo a tarda notte, supermercati e contanti",
    },
    "gas-station": {
      title: "Distributori di benzina aperti 24 ore a Barcellona | Noctua",
      h1: "Distributori di benzina aperti 24 ore a Barcellona",
      description: "Distributori di benzina aperti di notte o 24 ore su 24 a Barcellona, con indirizzi e indicazioni.",
      intro: "Distributori (gasolineras) aperti di notte. I punti segnati come «24 ore» sono aperti tutta la settimana, giorno e notte.",
    },
  },
}

/** Las categorías de un idioma, en el orden de la página. */
export function essentialsOf(lang: IntlLang): EssentialText[] {
  return FIXED.map((f) => {
    const t = TEXTS[lang][f.slug]
    return { slug: f.slug, key: f.key, guide: f.guide, ...t, guideLabel: f.guide ? t.guideLabel : undefined }
  })
}

export const essentialIn = (lang: IntlLang, slug: string): EssentialText | undefined => essentialsOf(lang).find((e) => e.slug === slug)
