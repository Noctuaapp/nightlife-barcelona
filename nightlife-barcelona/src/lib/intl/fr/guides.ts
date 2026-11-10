// Guides pour les touristes en français (10/11/2026) : /fr/guides/[slug]. Mêmes guides, même ordre et mêmes adresses
// qu'en anglais (lib/intl/en/guides.ts) ; ici il n'y a que le texte traduit.
//
// Chaque guide mêle du texte fixe (règles et conseils vérifiés dans des sources officielles, avec leur lien en bas) et
// des chiffres réels de Noctua (combien d'établissements, à quelle heure ils ouvrent d'habitude, quelles pharmacies
// ouvrent 24 h/24...). buildGuide() ne touche pas à la base de données : il reçoit les chiffres déjà calculés (GuideCtx)
// et renvoie le guide entier ; on peut donc le tester avec de fausses données. Les chiffres viennent de
// lib/intl/guideData.ts.
//
// Règles : aucun chiffre ne sort de la mémoire. Ce qui vient d'une source externe porte son lien dans « sources ».
// Ce qui dépend des données de Noctua dit « sur Noctua » et disparaît s'il n'y a pas assez d'échantillon.
// Les espaces insécables avant « : ; ! ? » sont ajoutées par frTypo().

import type { AreaFacts } from "../../areaFacts"
import type { Block, Guide, GuideCtx, GuideMeta, GuideSection, PlaceLine } from "../guideTypes"
import { listOf } from "../clubText"
import { frTypo } from "../frTypo"
import { TAXI_PHONES, busRouteOf, eurOf, metroHoursOf, metroNoteOf, sourcesOf, taxiFaresOf } from "../transit"

const L = "fr" as const
const METRO_HOURS = metroHoursOf(L)
const METRO_HOURS_NOTE = metroNoteOf(L)
const SOURCES = sourcesOf(L)
const TAXI = taxiFaresOf(L)
const P = "/fr"

export const GUIDES_REVIEWED = "2026-11-10"

export const GUIDES: GuideMeta[] = frTypo([
  {
    slug: "how-to-get-home-barcelona-at-night",
    title: "Rentrer la nuit à Barcelone : métro, bus de nuit et taxi | Noctua",
    h1: "Rentrer la nuit à Barcelone : métro, bus de nuit et taxi",
    description:
      "Horaires du métro selon la nuit, bus de nuit des lignes N et où ils se croisent, tarifs officiels des taxis 2026 et applis : tout pour rentrer à Barcelone après une soirée.",
    blurb: "Horaires du métro selon la nuit, bus de nuit des lignes N, tarifs des taxis et applis.",
  },
  {
    slug: "barcelona-club-entry-id-age-dress-code",
    title: "Clubs de Barcelone : prix d'entrée, pièce d'identité, âge et tenue | Noctua",
    h1: "Entrer dans les clubs de Barcelone : prix d'entrée, pièce d'identité, âge minimum et code vestimentaire",
    description:
      "Ce qu'il faut présenter à l'entrée, l'âge minimum, le prix des clubs et la rigueur du code vestimentaire, avec des chiffres tirés des lieux répertoriés sur Noctua.",
    blurb: "Pièce d'identité, âge minimum, prix d'entrée, code vestimentaire et listes d'invités.",
  },
  {
    slug: "barcelona-nightlife-what-time-to-go-out",
    title: "À quelle heure sortir à Barcelone : horaires des clubs | Noctua",
    h1: "À quelle heure sortir à Barcelone : horaires des clubs et ce qui reste ouvert après 2 h",
    description:
      "Une soirée type heure par heure : ouverture et fermeture des clubs, soirs d'ouverture et nombre de lieux ouverts tard, d'après les établissements répertoriés sur Noctua.",
    blurb: "Une soirée heure par heure, et combien d'établissements restent ouverts tard.",
  },
  {
    slug: "24-hour-pharmacies-and-emergency-care-barcelona",
    title: "Pharmacies 24 h/24 et urgences à Barcelone la nuit | Noctua",
    h1: "Pharmacies ouvertes 24 h/24 et urgences à Barcelone la nuit",
    description:
      "Les pharmacies ouvertes toute la nuit à Barcelone avec adresses et téléphones, les hôpitaux avec urgences et les numéros à appeler en cas de problème.",
    blurb: "Pharmacies de nuit, hôpitaux et numéros à appeler.",
  },
  {
    slug: "late-night-food-cash-and-essentials-barcelona",
    title: "Manger tard, supermarchés et distributeurs à Barcelone | Noctua",
    h1: "Manger tard, supermarchés et espèces à Barcelone",
    description:
      "Où manger après le club, quels supermarchés et quelles adresses restent ouverts 24 h/24, et comment éviter les distributeurs à frais élevés pour les cartes étrangères.",
    blurb: "Manger après le club, commerces ouverts 24 h/24 et distributeurs à éviter.",
  },
  {
    slug: "barcelona-nightlife-rules-fines-safety",
    title: "Règles de la nuit à Barcelone : amendes, sécurité et arnaques | Noctua",
    h1: "Règles de la nuit à Barcelone : amendes pour boire dans la rue, sécurité et arnaques",
    description:
      "Depuis février 2026, Barcelone sanctionne l'alcool dans la rue et le fait d'uriner en public. Les règles, les pickpockets et qui appeler en cas de problème.",
    blurb: "Amendes pour boire dans la rue, pickpockets et qui appeler.",
  },
  {
    slug: "where-to-go-out-in-barcelona-by-neighbourhood",
    title: "Où sortir à Barcelone : la vie nocturne par quartier | Noctua",
    h1: "Où sortir à Barcelone : la vie nocturne par quartier",
    description:
      "Les principaux quartiers où sortir à Barcelone : nombre d'établissements, prix d'entrée et horaires habituels, styles de musique, métro et bus de nuit les plus proches.",
    blurb: "Quartier par quartier, avec prix d'entrée et transports.",
  },
])

export function guideMeta(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

// --- Fonctions utilitaires ----------------------------------------------------------------------------------------

const eur = (n: number) => eurOf(L, n)
const when = (n: number, one: string, many: string) => (n === 1 ? one : many)
const joinList = (items: string[]) => listOf(L, items)

function priceSentence(f: AreaFacts | null): string | null {
  if (!f?.price) return null
  const { min, max } = f.price
  return min === 0
    ? `Sur Noctua, les prix d'entrée indiqués par les établissements vont de l'entrée gratuite jusqu'à ${eur(max)}.`
    : `Sur Noctua, les établissements qui indiquent un prix d'entrée demandent entre ${eur(min)} et ${eur(max)}.`
}

function placesBlock(items: PlaceLine[], total: number, noun: string): Block {
  return {
    t: "places",
    items: items.map((p) => ({ name: p.name, line: [p.where, p.phone ? `Tél. ${p.phone}` : ""].filter(Boolean).join(" · ") })),
    more: total > items.length ? `${total - items.length} ${noun} de plus sont répertoriés dans l'appli.` : undefined,
  }
}

// --- Les guides ---------------------------------------------------------------------------------------------------

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
      h2: "Vérifiez d'abord le métro",
      blocks: [
        { t: "p", text: "Le métro est le moyen le plus rapide de rentrer tant qu'il circule, et l'heure à laquelle il s'arrête dépend du jour de la semaine." },
        { t: "table", head: ["Quand", "Horaires du métro"], rows: METRO_HOURS.map((r) => [r.when, r.hours]), note: METRO_HOURS_NOTE },
        {
          t: "p",
          text: "Les heures de fermeture sont celles du départ du dernier train depuis le terminus de chaque extrémité de la ligne. Ne comptez donc pas sur le tout dernier train : soyez sur le quai avec une marge.",
        },
        { t: "links", items: [{ label: "Lignes et stations de métro", href: `${P}/metro`, note: "chaque ligne, station par station" }] },
      ],
    },
    {
      id: "night-bus",
      h2: "Quand le métro ferme : le bus de nuit (NitBus)",
      blocks: [
        {
          t: "p",
          text:
            lines.length > 0
              ? `Les bus de nuit de Barcelone sont les lignes N. Noctua en répertorie ${lines.length}, de ${first} à ${last}. ${viaCat} sur ${lines.length} s'arrêtent à la Plaça Catalunya, le point de correspondance central. Si vous ne savez pas quel bus prendre, allez à la Plaça Catalunya et changez-y.`
              : "Les bus de nuit de Barcelone sont les lignes N. La plupart s'arrêtent à la Plaça Catalunya, le point de correspondance central.",
        },
        {
          t: "ul",
          items: [
            "Horaires : les bus de nuit circulent en général d'environ 22:00 à environ 05:00–05:30, à peu près toutes les 20 minutes. Les horaires exacts varient selon la ligne : vérifiez celui de la ligne dont vous avez besoin.",
            "Titres de transport : vérifiez que votre billet ou votre titre de transport est valable dans les bus de nuit avant de vous y fier.",
            ...(notCat.length > 0 ? [`Lignes qui ne s'arrêtent pas à la Plaça Catalunya : ${joinList(notCat)}.`] : []),
            "Chaque ligne a sa propre page avec ses arrêts dans l'ordre : vous trouvez l'arrêt le plus proche de vous et savez où descendre.",
          ],
        },
        { t: "links", items: [{ label: "Toutes les lignes de bus de nuit", href: `${P}/night-bus`, note: "trajets, arrêts et correspondances" }] },
      ],
    },
  ]
  if (transitRows.length > 0) {
    sections.push({
      id: "from-areas",
      h2: "Rentrer depuis les principaux quartiers de sortie",
      blocks: [
        {
          t: "table",
          head: ["Quartier", "Stations de métro les plus proches", "Bus de nuit à proximité"],
          rows: transitRows,
          note: "D'après les établissements de chaque quartier : stations de métro à moins de 600 m et arrêts de bus de nuit à moins de 500 m des établissements.",
        },
        { t: "links", items: [{ label: "La vie nocturne par quartier", href: `${P}/guides/where-to-go-out-in-barcelona-by-neighbourhood` }] },
      ],
    })
  }
  sections.push(
    {
      id: "taxi",
      h2: "Taxi et VTC",
      blocks: [
        {
          t: "p",
          text: "Les taxis officiels sont noir et jaune, équipés d'un compteur et réglementés. Un voyant vert sur le toit signifie que le taxi est libre. Beaucoup de rues du quartier gothique, du Raval et du Born sont piétonnes : choisissez un point de dépose sur la route accessible la plus proche.",
        },
        {
          t: "ul",
          items: [
            `Tarif de nuit (T-2) : s'applique de 20:00 à 08:00 en semaine, ainsi que les samedis et jours fériés. Prix minimum ${TAXI.minFare}, puis ${TAXI.perKmNight} par km.`,
            `Suppléments : ${TAXI.airportSurcharge} pour l'aéroport, ${TAXI.satsSurcharge} au départ de la gare de Sants et ${TAXI.holidayEveSurcharge} certaines nuits de veille de jour férié.`,
            `Une réservation par téléphone ou par appli a un prix minimum de ${TAXI.appBookingMinimum}.`,
            "La plupart des taxis officiels acceptent la carte : confirmez avant de monter et demandez un reçu (un recibo).",
            ...TAXI_PHONES.map((p) => `${p.name} : ${p.phone}`),
          ],
        },
        {
          t: "p",
          text: "Les applis de taxi comme FREE NOW réservent des taxis officiels aux tarifs réglementés. Les applis de VTC comme Uber, Cabify et Bolt fonctionnent aussi à Barcelone ; les règles qui les concernent ont changé ces dernières années, vérifiez donc leur disponibilité et le prix affiché dans l'appli avant de réserver.",
        },
        {
          t: "note",
          tone: "warn",
          title: "Utilisez uniquement des trajets autorisés",
          text: "Ignorez les personnes qui vous abordent devant les clubs pour vous proposer un trajet. Prenez un taxi dans la rue ou à une station, ou réservez avec une appli.",
        },
        { t: "links", items: [{ label: "Stations de taxi et numéros de téléphone", href: `${P}/essentials/taxi` }] },
      ],
    },
    {
      id: "airport",
      h2: "Aller à l'aéroport la nuit",
      blocks: [
        {
          t: "ul",
          items: [
            ...airport.map((a) => `${a.c} : ${a.r}.`),
            `Taxi : une course qui part de l'aéroport a un prix minimum de ${TAXI.fromAirportMinimum}.`,
          ],
        },
      ],
    },
    {
      id: "safety",
      h2: "Rentrer en sécurité",
      blocks: [
        {
          t: "ul",
          items: [
            "Les téléphones et les portefeuilles sont la cible des pickpockets sur les quais de métro bondés, autour de la Rambla et dans le quartier gothique. Gardez-les dans une poche avant ou dans un sac fermé.",
            "Convenez d'un lieu de rendez-vous au cas où votre groupe se sépare, et gardez votre téléphone chargé.",
            "En cas d'urgence, appelez le 112. Pour la police municipale (Guàrdia Urbana), appelez le 092.",
          ],
        },
        { t: "links", items: [{ label: "Règles, amendes et sécurité en soirée", href: `${P}/guides/barcelona-nightlife-rules-fines-safety` }] },
      ],
    },
  )

  return frTypo({
    ...meta,
    lead: "Barcelone se parcourt facilement la nuit une fois qu'on connaît les règles : le métro circule tard le vendredi et toute la nuit le samedi, un réseau de lignes N prend le relais quand il ferme, et les taxis, équipés d'un compteur, sont nombreux.",
    sections,
    faq: [
      {
        q: "Le métro de Barcelone circule-t-il toute la nuit ?",
        a: "Seulement les nuits du samedi au dimanche, où il circule en continu du samedi matin jusqu'à minuit le dimanche, et quelques nuits spéciales comme la Sant Joan et la Saint-Sylvestre. Le vendredi et la veille d'un jour férié, il ferme à 02:00, et les autres nuits à minuit.",
      },
      {
        q: "Y a-t-il un bus de nuit à Barcelone ?",
        a:
          lines.length > 0
            ? `Oui. Le réseau NitBus compte ${lines.length} lignes N dans la liste de Noctua, dont ${viaCat} s'arrêtent à la Plaça Catalunya. Les bus circulent en général d'environ 22:00 à environ 05:00–05:30, à peu près toutes les 20 minutes ; vérifiez l'horaire de votre ligne.`
            : "Oui. Le réseau NitBus de lignes N couvre la ville d'environ 22:00 à environ 05:00–05:30, à peu près toutes les 20 minutes, et la plupart des lignes s'arrêtent à la Plaça Catalunya.",
      },
      {
        q: "Combien coûte un taxi la nuit à Barcelone ?",
        a: `La nuit, le tarif officiel (T-2) a un prix minimum de ${TAXI.minFare} et ${TAXI.perKmNight} par km, plus des suppléments comme ${TAXI.airportSurcharge} pour l'aéroport. Les réservations par téléphone ou par appli ont un prix minimum de ${TAXI.appBookingMinimum}. Ce sont les tarifs urbains 2026 publiés par AMB.`,
      },
      {
        q: "Uber existe-t-il à Barcelone ?",
        a: "Les applis de VTC comme Uber, Cabify et Bolt fonctionnent à Barcelone, mais les règles qui les concernent ont changé ces dernières années : vérifiez leur disponibilité et le prix dans l'appli. L'appli FREE NOW réserve des taxis officiels aux tarifs réglementés.",
      },
      {
        q: "Comment aller à l'aéroport la nuit ?",
        a:
          airport.length > 0
            ? `Les bus de nuit ${joinList(airport.map((a) => a.c))} desservent l'aéroport, et les taxis circulent toute la nuit. Un taxi au départ de l'aéroport a un prix minimum de ${TAXI.fromAirportMinimum}.`
            : `Prenez un taxi : une course qui part de l'aéroport a un prix minimum de ${TAXI.fromAirportMinimum}.`,
      },
    ],
    sources: [SOURCES.tmbHours, SOURCES.taxiAmb, SOURCES.amb],
    related: ["barcelona-nightlife-what-time-to-go-out", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Trouvez votre arrêt le plus proche dans l'appli", href: "/nitbus" },
  })
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
      h2: "À l'entrée : pièce d'identité et âge",
      blocks: [
        {
          t: "p",
          text: "Ayez sur vous votre passeport ou votre carte d'identité. Le personnel de l'entrée peut demander une pièce d'identité à toute personne qui paraît jeune, et vous pouvez être refusé sans elle. Une photo sur le téléphone n'est pas toujours acceptée : apportez le document lui-même.",
        },
        {
          t: "p",
          text: "L'âge légal pour être servi en alcool en Catalogne est de 18 ans. Les établissements peuvent fixer un minimum plus élevé, et certains clubs demandent 21 ans ou plus.",
        },
        ...(ageTop.length > 0 && ctx.withAge >= 10
          ? [
              {
                t: "table" as const,
                head: ["Âge minimum", "Établissements sur Noctua"],
                rows: ageTop.map((a) => [`${a.age}+`, String(a.n)]),
                note: `Parmi les ${ctx.withAge} établissements qui indiquent un âge minimum.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "prices",
      h2: "Ce que coûtent les clubs",
      blocks: [
        ...(price ? [{ t: "p" as const, text: price }] : []),
        {
          t: "ul",
          items: [
            "Beaucoup de clubs incluent une consommation dans le prix d'entrée. La page de l'établissement indique si c'est le cas.",
            "Les billets achetés en ligne à l'avance sont souvent moins chers qu'à l'entrée, et ils permettent généralement d'éviter la file.",
            "Certains établissements sont gratuits en début de soirée ou avec une liste d'invités. Demandez exactement ce qui est inclus avant d'accepter une offre.",
          ],
        },
        { t: "links", items: [{ label: "Voir les clubs et bars", href: `${P}/clubs` }] },
      ],
    },
    {
      id: "dress",
      h2: "Code vestimentaire",
      blocks: [
        {
          t: "p",
          text: "La plupart des établissements sont décontractés, mais certains clubs imposent un code vestimentaire à l'entrée. Maillot de bain, tongs et tenue de sport font partie des motifs de refus les plus courants ; des chaussures fermées et une tenue propre et simple sont un choix sûr.",
        },
        ...(dressTop.length > 0 && ctx.withDress >= 10
          ? [
              {
                t: "table" as const,
                head: ["Code vestimentaire", "Établissements sur Noctua"],
                rows: dressTop.map((d) => [d.label, String(d.n)]),
                note: `Parmi les ${ctx.withDress} établissements qui indiquent un code vestimentaire. La page de chaque établissement présente le sien.`,
              },
            ]
          : []),
      ],
    },
    {
      id: "promoters",
      h2: "Promoteurs et listes d'invités",
      blocks: [
        {
          t: "p",
          text: "Devant les grands clubs, vous croiserez des promoteurs qui distribuent des offres de liste d'invités ou d'entrée gratuite. Certaines sont sérieuses, d'autres ne valent pas le coup. Avant d'en suivre un, demandez ce qui est inclus (l'entrée seule ou l'entrée avec une consommation), s'il y a une limite d'heure et combien vous payez à l'entrée. Une page de billetterie officielle ou la liste d'invités de l'établissement lui-même est l'option la plus sûre.",
        },
      ],
    },
    {
      id: "queue",
      h2: "Dans la file d'attente",
      blocks: [
        {
          t: "ul",
          items: [
            "Le personnel peut refuser l'entrée à toute personne visiblement ivre : allez-y doucement avant d'arriver.",
            "Ne buvez pas dans la file et restez discret : des habitants vivent au-dessus de nombreux établissements.",
            "Gardez votre téléphone et votre portefeuille hors de vue pendant l'attente. Les files sont un endroit de prédilection pour les pickpockets.",
          ],
        },
      ],
    },
  ]
  return frTypo({
    ...meta,
    lead: "Entrer dans les clubs de Barcelone est facile si vous avez la bonne pièce d'identité, arrivez à une heure raisonnable et vous habillez comme pour sortir. Voici à quoi vous attendre, avec des chiffres tirés des établissements répertoriés sur Noctua.",
    sections,
    faq: [
      {
        q: "Faut-il un passeport pour entrer dans un club à Barcelone ?",
        a: "Ayez sur vous votre passeport ou votre carte d'identité. Le personnel de l'entrée peut demander une pièce d'identité à toute personne qui paraît jeune, et vous pouvez être refusé sans elle.",
      },
      {
        q: "Quel est l'âge minimum pour les clubs de Barcelone ?",
        a: "L'âge légal pour être servi en alcool en Catalogne est de 18 ans. Chaque établissement peut fixer un minimum plus élevé, et certains demandent 21 ans ou plus. La page de chaque établissement sur Noctua indique l'âge minimum quand il est connu.",
      },
      {
        q: "Combien coûte l'entrée d'un club à Barcelone ?",
        a: price
          ? `${price} Beaucoup de clubs incluent une consommation dans le prix d'entrée, et les billets achetés en ligne sont souvent moins chers.`
          : "Les prix varient beaucoup selon le club et la nuit. Beaucoup de clubs incluent une consommation dans le prix d'entrée, et les billets achetés en ligne sont souvent moins chers qu'à l'entrée.",
      },
      {
        q: "Y a-t-il un code vestimentaire ?",
        a: "La plupart des établissements sont décontractés, mais certains clubs imposent un code vestimentaire à l'entrée. Évitez le maillot de bain, les tongs et la tenue de sport, et portez des chaussures fermées.",
      },
    ],
    sources: [],
    related: ["barcelona-nightlife-what-time-to-go-out", "where-to-go-out-in-barcelona-by-neighbourhood"],
    cta: { label: "Voir le prix d'entrée et le code vestimentaire de chaque établissement", href: `${P}/clubs` },
  })
}

function busiestNights(nights: { day: string; n: number }[]): string {
  const sorted = [...nights].sort((a, b) => b.n - a.n)
  const [a, b] = sorted
  if (!a || !b) return ""
  return `Sur Noctua, c'est le ${a.day.toLowerCase()} et le ${b.day.toLowerCase()} que le plus d'établissements sont ouverts.`
}

function getTime(ctx: GuideCtx): Guide {
  const meta = GUIDES[2]
  const f = ctx.facts
  const usual = f?.hours ? `Sur Noctua, l'heure d'ouverture la plus courante est ${f.hours.open} et l'heure de fermeture la plus courante est ${f.hours.close}.` : null
  const late = f?.late && f.late.of >= 10 ? `${f.late.n} des ${f.late.of} établissements avec des horaires sur Noctua restent ouverts après 02:30.` : null
  const nights = ctx.nightsOpen.filter((n) => n.n > 0)
  const sections: GuideSection[] = [
    {
      id: "timeline",
      h2: "Une soirée type, heure par heure",
      blocks: [
        {
          t: "table",
          head: ["Heure", "Ce qui se passe"],
          rows: [
            ["21:00–23:00", "Dîner. L'Espagne dîne tard : les restaurants se remplissent d'environ 21:00 à 22:00."],
            ["23:00–01:00", "Verres dans un bar ou sur une terrasse. Les clubs sont encore calmes."],
            ["00:00–02:00", "Les clubs ouvrent leurs portes. L'entrée anticipée est souvent moins chère ou gratuite."],
            ["02:00–04:00", "Les heures les plus animées dans la plupart des clubs."],
            ["05:00–06:00", "La plupart des clubs ferment. Le métro reprend à 05:00 en semaine et circule en continu les nuits de samedi."],
          ],
          note: "Un schéma général : chaque établissement fixe ses propres horaires.",
        },
        ...(usual ? [{ t: "p" as const, text: usual }] : []),
        ...(late ? [{ t: "p" as const, text: late }] : []),
      ],
    },
  ]
  if (nights.length >= 4) {
    sections.push({
      id: "nights",
      h2: "Quels soirs les établissements sont-ils ouverts ?",
      blocks: [
        {
          t: "table",
          head: ["Soir", "Établissements ouverts sur Noctua"],
          rows: nights.map((n) => [n.day, String(n.n)]),
          note: "Compte les établissements dont les horaires ou les jours d'ouverture sont connus. La nuit compte à partir du soir : la nuit du vendredi comprend les premières heures du samedi.",
        },
        {
          t: "p",
          text: `${busiestNights(nights)} Beaucoup d'établissements n'ouvrent que certains soirs de la semaine : vérifiez chacun avant de sortir.`,
        },
      ],
    })
  }
  sections.push(
    {
      id: "late",
      h2: "Ce qui est ouvert après 2 h",
      blocks: [
        {
          t: "p",
          text: "Les clubs et certains bars restent ouverts jusqu'à 05:00 ou 06:00. Pour tout le reste, les indispensables ouverts toute la nuit sont les pharmacies, quelques supermarchés et adresses pour manger, et le transport dont vous avez besoin pour rentrer.",
        },
        {
          t: "links",
          items: [
            { label: "Manger tard, supermarchés et distributeurs", href: `${P}/guides/late-night-food-cash-and-essentials-barcelona` },
            { label: "Pharmacies 24 h/24 et urgences", href: `${P}/guides/24-hour-pharmacies-and-emergency-care-barcelona` },
            { label: "Rentrer : métro, bus de nuit et taxi", href: `${P}/guides/how-to-get-home-barcelona-at-night` },
          ],
        },
      ],
    },
    {
      id: "tips",
      h2: "Conseils pour organiser votre soirée",
      blocks: [
        {
          t: "ul",
          items: [
            "Décidez comment vous rentrerez avant de sortir. Du lundi au jeudi, le métro s'arrête à minuit.",
            "Achetez vos billets en ligne pour les grandes soirées : ils sont souvent moins chers et évitent la file.",
            "Vérifiez les horaires de l'établissement : beaucoup n'ouvrent que du jeudi au samedi.",
          ],
        },
      ],
    },
  )
  return frTypo({
    ...meta,
    lead: "Barcelone sort tard. Le dîner est à 21:00 ou plus tard, les clubs ouvrent vers minuit et deviennent animés après 02:00. Voici le schéma, avec des chiffres tirés des établissements répertoriés sur Noctua.",
    sections,
    faq: [
      {
        q: "À quelle heure les clubs ouvrent-ils à Barcelone ?",
        a: f?.hours
          ? `Les clubs ouvrent en général vers minuit et restent ouverts jusqu'à 05:00–06:00. Sur Noctua, l'heure d'ouverture la plus courante est ${f.hours.open} et l'heure de fermeture la plus courante est ${f.hours.close}.`
          : "Les clubs ouvrent en général vers minuit et restent ouverts jusqu'à 05:00–06:00.",
      },
      {
        q: "À quelle heure commence la vie nocturne à Barcelone ?",
        a: "Le dîner est tardif, à partir de 21:00. Les bars se remplissent vers 23:00, les clubs ouvrent vers minuit et sont les plus animés entre 02:00 et 04:00.",
      },
      {
        q: "Qu'est-ce qui est ouvert après 2 h à Barcelone ?",
        a: late
          ? `${late} Les pharmacies, quelques supermarchés et adresses pour manger ouvrent aussi toute la nuit.`
          : "Les clubs et certains bars restent ouverts jusqu'à 05:00 ou 06:00. Les pharmacies, quelques supermarchés et adresses pour manger ouvrent aussi toute la nuit.",
      },
      {
        q: "À quelle heure le métro s'arrête-t-il ?",
        a: "À minuit du dimanche au jeudi, à 02:00 le vendredi et la veille d'un jour férié, et il circule toute la nuit le samedi.",
      },
    ],
    sources: [SOURCES.tmbHours],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-club-entry-id-age-dress-code"],
    cta: { label: "Voir ce qui est ouvert en ce moment dans l'appli", href: "/clubs" },
  })
}

function getPharmacy(ctx: GuideCtx): Guide {
  const meta = GUIDES[3]
  const n = ctx.pharmacies24Total
  const sections: GuideSection[] = [
    {
      id: "pharmacies",
      h2: "Pharmacies ouvertes 24 h/24",
      blocks: [
        {
          t: "p",
          text:
            n > 0
              ? `Noctua répertorie ${ctx.pharmaciesTotal} pharmacies dans la région de Barcelone, dont ${n} ouvertes 24 h/24. Les horaires peuvent changer : appelez avant si vous devez faire un long trajet.`
              : "Appelez avant de vous déplacer : les horaires changent et les applis de cartes ne sont pas toujours à jour.",
        },
        ...(n > 0 ? [placesBlock(ctx.pharmacies24, n, "pharmacies ouvertes 24 h/24")] : []),
        { t: "links", items: [{ label: "Toutes les pharmacies sur Noctua", href: `${P}/essentials/pharmacy` }] },
      ],
    },
    {
      id: "how",
      h2: "Utiliser une pharmacie en Espagne",
      blocks: [
        {
          t: "ul",
          items: [
            "Les pharmacies (farmacias) sont signalées par une croix verte. Le pharmacien peut conseiller pour les petits problèmes.",
            "Certains médicaments nécessitent une ordonnance. Apportez le nom de la substance active (le nom générique), car les noms de marque diffèrent d'un pays à l'autre.",
            "La nuit, les pharmacies ouvertes 24 h/24 servent parfois par un petit guichet ou une trappe.",
            "Les horaires affichés sur les applis de cartes peuvent être périmés : si vous êtes loin, appelez avant.",
          ],
        },
      ],
    },
    {
      id: "emergency",
      h2: "Numéros d'urgence",
      blocks: [
        {
          t: "table",
          head: ["Numéro", "À utiliser pour"],
          rows: [
            ["112", "Toute urgence : ambulance, police ou pompiers. Gratuit depuis n'importe quel téléphone."],
            ["061", "Conseils de santé en Catalogne (Salut Respon)."],
            ["092", "Police municipale (Guàrdia Urbana)."],
          ],
        },
        {
          t: "note",
          title: "Assurance voyage",
          text: "Les citoyens de l'UE peuvent utiliser les soins publics avec la carte européenne d'assurance maladie (les visiteurs du Royaume-Uni avec la GHIC). Toutes les autres personnes doivent avoir une assurance voyage. Gardez votre numéro de police sur votre téléphone.",
        },
      ],
    },
  ]
  if (ctx.hospitals.length > 0) {
    sections.push({
      id: "hospitals",
      h2: "Hôpitaux",
      blocks: [
        { t: "p", text: "Les grands hôpitaux publics ont un service d'urgences (urgències) ouvert jour et nuit. Pour tout ce qui est urgent, appelez le 112 plutôt que de vous déplacer seul." },
        placesBlock(ctx.hospitals, ctx.hospitalsTotal, "hôpitaux"),
        { t: "links", items: [{ label: "Hôpitaux sur Noctua", href: `${P}/essentials/hospital` }] },
      ],
    })
  }
  return frTypo({
    ...meta,
    lead: "Si vous avez besoin de médicaments ou d'un médecin en pleine nuit, voici où aller à Barcelone et quels numéros appeler.",
    sections,
    faq: [
      {
        q: "Quelles pharmacies sont ouvertes 24 h/24 à Barcelone ?",
        a:
          n > 0
            ? `Noctua répertorie ${n} pharmacies ouvertes 24 h/24, comme ${ctx.pharmacies24
                .slice(0, 3)
                .map((p) => p.name)
                .join(", ")}. La liste complète avec les adresses est sur cette page.`
            : "Certaines pharmacies ouvrent toute la nuit. Consultez la liste dans l'appli et appelez avant, car les horaires changent.",
      },
      {
        q: "Quel numéro appeler en cas d'urgence médicale à Barcelone ?",
        a: "Appelez le 112. Il est gratuit depuis n'importe quel téléphone et fonctionne dans toute l'Espagne et l'UE. Pour des conseils de santé en Catalogne, vous pouvez aussi appeler le 061.",
      },
      {
        q: "Peut-on acheter des médicaments sans ordonnance en Espagne ?",
        a: "Certains médicaments s'achètent sans ordonnance, d'autres en exigent une. Le pharmacien vous le dira. Apportez le nom générique du médicament, car les noms de marque diffèrent d'un pays à l'autre.",
      },
    ],
    sources: [],
    related: ["late-night-food-cash-and-essentials-barcelona", "barcelona-nightlife-rules-fines-safety"],
    cta: { label: "Trouver la pharmacie la plus proche dans l'appli", href: "/essentials/pharmacy" },
  })
}

function getFood(ctx: GuideCtx): Guide {
  const meta = GUIDES[4]
  const sections: GuideSection[] = [
    {
      id: "food",
      h2: "Manger après le club",
      blocks: [
        {
          t: "p",
          text:
            ctx.food24.length > 0
              ? `Noctua répertorie ${ctx.food24Total} adresses pour manger ouvertes 24 h/24. Kebabs, pizza à la part et restauration rapide restent ouverts quand les cuisines des restaurants classiques ont fermé.`
              : "Kebabs, pizza à la part et restauration rapide restent ouverts quand les cuisines des restaurants classiques ont fermé.",
        },
        ...(ctx.food24.length > 0 ? [placesBlock(ctx.food24, ctx.food24Total, "adresses pour manger ouvertes 24 h/24")] : []),
        { t: "links", items: [{ label: "Manger tard sur Noctua", href: `${P}/essentials/food` }] },
      ],
    },
    {
      id: "supermarkets",
      h2: "Supermarchés ouverts tard",
      blocks: [
        {
          t: "p",
          text:
            ctx.supermarkets24.length > 0
              ? `Noctua répertorie ${ctx.supermarkets24Total} supermarchés et épiceries ouverts 24 h/24. Ils sont utiles pour l'eau, les en-cas et l'essentiel.`
              : "Certains supermarchés et épiceries restent ouverts tard. Consultez les horaires dans l'appli.",
        },
        ...(ctx.supermarkets24.length > 0 ? [placesBlock(ctx.supermarkets24, ctx.supermarkets24Total, "supermarchés ouverts 24 h/24")] : []),
        { t: "links", items: [{ label: "Supermarchés sur Noctua", href: `${P}/essentials/supermarket` }] },
      ],
    },
    {
      id: "cash",
      h2: "Espèces et distributeurs",
      blocks: [
        {
          t: "p",
          text: "Les cartes sont acceptées presque partout, mais un peu d'espèces est utile pour les petits bars et les stands de rue.",
        },
        {
          t: "ul",
          items: [
            "Évitez les distributeurs indépendants comme les machines Euronet que l'on voit dans les zones touristiques. Ils facturent des frais élevés et de mauvais taux de change aux cartes étrangères.",
            "Utilisez les distributeurs qui appartiennent à une banque, comme CaixaBank, Santander, BBVA ou Sabadell.",
            "Si la machine propose de vous facturer dans la devise de votre pays, choisissez l'euro. Le taux de conversion est généralement moins bon.",
          ],
        },
        ...(ctx.highFeeAtms > 0
          ? [
              {
                t: "note" as const,
                title: "Noctua signale les plus chers",
                text: `Noctua signale ${ctx.highFeeAtms} des ${ctx.atmsTotal} distributeurs qu'il répertorie comme à frais élevés, pour que vous puissiez les éviter.`,
                tone: "info" as const,
              },
            ]
          : []),
        { t: "links", items: [{ label: "Distributeurs sur Noctua", href: `${P}/essentials/atm` }] },
      ],
    },
  ]
  return frTypo({
    ...meta,
    lead: "Après le club, il vous faut de quoi manger, de l'eau, des espèces ou une pharmacie. Voici ce qui reste ouvert tard à Barcelone et comment ne pas payer plus que nécessaire.",
    sections,
    faq: [
      {
        q: "Y a-t-il des supermarchés ouverts 24 h/24 à Barcelone ?",
        a:
          ctx.supermarkets24.length > 0
            ? `Oui. Noctua répertorie ${ctx.supermarkets24Total} supermarchés et épiceries ouverts 24 h/24. Vérifiez les horaires dans l'appli avant de partir.`
            : "Certains restent ouverts tard, mais vérifiez les horaires dans l'appli avant de partir.",
      },
      {
        q: "Quels distributeurs faut-il éviter à Barcelone ?",
        a: "Évitez les distributeurs indépendants Euronet dans les zones touristiques. Ils facturent des frais élevés et de mauvais taux de change aux cartes étrangères. Utilisez ceux qui appartiennent à une banque et choisissez d'être facturé en euros.",
      },
      {
        q: "Où manger à 4 h du matin à Barcelone ?",
        a:
          ctx.food24.length > 0
            ? `Noctua répertorie ${ctx.food24Total} adresses pour manger ouvertes 24 h/24, surtout des kebabs, de la pizza et de la restauration rapide. La liste est sur cette page.`
            : "Kebabs, pizza à la part et restauration rapide sont les options habituelles. Consultez les horaires dans l'appli.",
      },
    ],
    sources: [],
    related: ["24-hour-pharmacies-and-emergency-care-barcelona", "how-to-get-home-barcelona-at-night"],
    cta: { label: "Trouver ce qui est ouvert près de vous", href: "/essentials" },
  })
}

function getRules(): Guide {
  const meta = GUIDES[5]
  return frTypo({
    ...meta,
    lead: "La nouvelle ordonnance de Barcelone sur le vivre-ensemble est entrée en vigueur le 15 février 2026. Elle a relevé les amendes pour les infractions que les visiteurs commettent le plus souvent en soirée. Voici ce qu'elle dit et comment éviter les ennuis.",
    sections: [
      {
        id: "street",
        h2: "Boire dans la rue",
        blocks: [
          { t: "p", text: "Boire de l'alcool dans la rue n'est pas autorisé à Barcelone. La nouvelle ordonnance fixe ces amendes :" },
          {
            t: "table",
            head: ["Infraction", "Amende"],
            rows: [
              ["Boire de l'alcool dans la rue (infraction légère)", "100 € à 600 €"],
              ["La même chose dans un lieu particulièrement fréquenté ou devant des mineurs", "750 € à 1 500 €"],
              ["Uriner en public", "Jusqu'à 300 €"],
              ["Uriner près de toilettes publiques, autour de bars ou de boîtes de nuit, ou dans une rue de moins de quatre mètres de large", "Jusqu'à 750 €"],
              ["Cas particulièrement graves de miction en public (surtout dans des lieux très fréquentés, des lieux fréquentés par des mineurs, des lieux classés ou protégés)", "750 € à 1 500 €"],
              ["Itinéraires de beuverie (parcours touristiques qui visitent plusieurs bars dans le but principal de boire de l'alcool)", "1 500 € à 3 000 €"],
            ],
            note: "Source : Ara, points clés de la nouvelle ordonnance (voir Sources).",
          },
          {
            t: "p",
            text: "Pour les infractions légères, et pour les personnes qui vivent à l'étranger, les agents de la Guàrdia Urbana équipés de terminaux de paiement peuvent proposer un paiement sur place avec une réduction pouvant aller jusqu'à 50 % si vous payez dans les dix jours suivant la notification. Cela reste une amende.",
          },
          { t: "note", title: "En pratique", text: "Buvez dans un bar ou sur une terrasse, et utilisez les toilettes d'un bar avant de partir. Une canette achetée à un vendeur de rue et bue dehors ne vaut pas l'amende.", tone: "warn" },
        ],
      },
      {
        id: "theft",
        h2: "Pickpockets et vols de téléphone",
        blocks: [
          {
            t: "ul",
            items: [
              "Les pickpockets travaillent dans les lieux bondés : la Rambla, le quartier gothique, les quais de métro et les files devant les clubs. Gardez votre téléphone et votre portefeuille dans une poche avant ou dans un sac fermé.",
              "Ne laissez pas votre téléphone sur une table ni au bord d'une terrasse.",
              "Méfiez-vous des inconnus qui vous bousculent, vous serrent la main ou essaient de vous donner quelque chose. Ils créent souvent une diversion.",
              "Si quelque chose est volé, déclarez-le dans un commissariat (hacer una denuncia). Votre assurance vous demandera le récépissé.",
            ],
          },
        ],
      },
      {
        id: "drinks",
        h2: "Prendre soin de vous et de votre verre",
        blocks: [
          {
            t: "ul",
            items: [
              "Ne laissez pas votre verre sans surveillance et n'acceptez pas de verre d'un inconnu.",
              "Si vous vous sentez mal, prévenez le personnel ou un ami et appelez le 112.",
              "Convenez d'un point de rendez-vous et d'un moyen de rentrer avec votre groupe avant de sortir.",
            ],
          },
        ],
      },
      {
        id: "help",
        h2: "Qui appeler",
        blocks: [
          {
            t: "table",
            head: ["Numéro", "À utiliser pour"],
            rows: [
              ["112", "Toute urgence : ambulance, police ou pompiers. Gratuit depuis n'importe quel téléphone."],
              ["092", "Police municipale (Guàrdia Urbana)."],
              ["061", "Conseils de santé en Catalogne."],
            ],
          },
          { t: "links", items: [{ label: "Pharmacies 24 h/24 et urgences", href: `${P}/guides/24-hour-pharmacies-and-emergency-care-barcelona` }] },
        ],
      },
    ],
    faq: [
      {
        q: "Peut-on boire de l'alcool dans la rue à Barcelone ?",
        a: "Non. Selon l'ordonnance en vigueur depuis le 15 février 2026, boire de l'alcool dans la rue peut être sanctionné de 100 € à 600 €, et de 750 € à 1 500 € dans des lieux particulièrement fréquentés ou devant des mineurs.",
      },
      {
        q: "Quelle est l'amende pour uriner en public à Barcelone ?",
        a: "Jusqu'à 300 € en général, jusqu'à 750 € près de toilettes publiques, autour de bars ou de boîtes de nuit ou dans des rues de moins de quatre mètres de large, et de 750 € à 1 500 € dans les cas particulièrement graves.",
      },
      {
        q: "Barcelone est-elle sûre la nuit ?",
        a: "La plupart des visiteurs n'ont aucun problème, mais les vols à la tire sont fréquents dans les lieux bondés. Gardez votre téléphone et votre portefeuille hors de vue, et ne laissez pas vos verres sans surveillance.",
      },
    ],
    sources: [SOURCES.ordinance],
    related: ["how-to-get-home-barcelona-at-night", "24-hour-pharmacies-and-emergency-care-barcelona"],
    cta: { label: "Organisez votre soirée dans l'appli", href: "/plan" },
  })
}

// Une phrase sur chaque quartier connu de longue date ; si le quartier n'est pas ici, seules ses données apparaissent.
const AREA_NOTES: [RegExp, string][] = [
  [/raval/, "Compact et animé, avec des bars bon marché, de la musique live et des adresses nocturnes tout près de la Rambla."],
  [/gracia/, "Une ambiance de village, avec des places pleines de bars de quartier. Plus décontracté que club."],
  [/poble-?sec/, "Le carrer de Blai pour les tapas, et l'avenue du Paral·lel avec ses théâtres et ses salles de musique."],
  [/eixample/, "Le quadrillage du centre de Barcelone, avec de nombreux bars à cocktails, restaurants et lieux LGBTQ+."],
  [/barceloneta|olimpic/, "Le front de mer et le port, où se trouvent les grands clubs et les bars de plage."],
  [/poblenou|poble-nou/, "Un ancien quartier industriel près de la plage, connu pour ses grands clubs et sa musique électronique."],
  [/born|ribera|sant-pere/, "Des ruelles médiévales étroites avec des bars à cocktails et de petites salles."],
  [/gotic|gothic/, "La vieille ville : bars et clubs autour de la Plaça Reial et des ruelles qui partent de la Rambla."],
  [/sants/, "Résidentiel et de quartier, avec des bars et des clubs près de la gare de Sants."],
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
    parts.push(`${a.count} ${when(a.count, "établissement répertorié", "établissements répertoriés")}.`)
    if (f?.price) parts.push(f.price.min === 0 ? `Entrée : gratuite jusqu'à ${eur(f.price.max)}.` : `Entrée : ${eur(f.price.min)}–${eur(f.price.max)}.`)
    if (f?.hours) parts.push(`Généralement ouvert ${f.hours.open}–${f.hours.close}.`)
    if (f?.metro.length) parts.push(`Métro : ${f.metro.join(", ")}.`)
    if (f?.nitbus.length) parts.push(`Bus de nuit : ${f.nitbus.join(", ")}.`)
    blocks.push({ t: "places", items: [{ name: a.name, line: parts.join(" ") }] })
    blocks.push({ t: "links", items: [{ label: `Établissements à ${a.name}`, href: `${P}/neighbourhoods/${a.slug}` }] })
  }
  return frTypo({
    ...meta,
    lead: "La vie nocturne de Barcelone se répartit entre une poignée de quartiers, chacun avec son ambiance. Voici les principaux, avec le nombre d'établissements que Noctua répertorie, les prix et horaires habituels, et comment rentrer.",
    sections: [
      { id: "areas", h2: "Les principaux quartiers de sortie", blocks },
      {
        id: "choose",
        h2: "Comment choisir",
        blocks: [
          {
            t: "ul",
            items: [
              "Pour les grands clubs et la musique électronique, regardez le front de mer, le port et Poblenou.",
              "Pour les bars à cocktails et une soirée tranquille, essayez El Born, Gràcia et l'Eixample.",
              "Pour des verres bon marché et de la musique live, le Raval et Poble-sec.",
              "Prévoyez votre retour avant de sortir : les quartiers près de la mer sont plus loin du métro à 02:00 que le centre.",
            ],
          },
        ],
      },
    ],
    faq: [
      {
        q: "Quel est le meilleur quartier pour la vie nocturne à Barcelone ?",
        a: ctx.areas[0]
          ? `Cela dépend de ce que vous voulez. Sur Noctua, ${ctx.areas[0].name} compte le plus d'établissements répertoriés (${ctx.areas[0].count}). Le front de mer et Poblenou sont connus pour leurs grands clubs, El Born et Gràcia pour leurs bars à cocktails et leurs soirées tranquilles.`
          : "Cela dépend de ce que vous voulez. Le front de mer et Poblenou sont connus pour leurs grands clubs, El Born et Gràcia pour leurs bars à cocktails et leurs soirées tranquilles.",
      },
      {
        q: "Où sont les clubs de Barcelone ?",
        a: "Les plus grands clubs sont près du port et du front de mer, et autour de Poblenou. Il y a aussi des clubs dans le Raval, à Poble-sec et dans l'Eixample.",
      },
    ],
    sources: [],
    related: ["how-to-get-home-barcelona-at-night", "barcelona-nightlife-what-time-to-go-out"],
    cta: { label: "Explorer la carte des établissements", href: "/map" },
  })
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
