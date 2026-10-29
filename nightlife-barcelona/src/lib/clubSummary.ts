// Texto de cada ficha de club para Google (25/10/2026, "lo de la indexación").
//
// La mayoría de fichas (sobre todo las importadas de OpenStreetMap) no tienen descripción, y en
// el HTML solo quedaban el nombre y un puñado de datos sueltos. Google las rastrea pero no las
// indexa ("Rastreada: actualmente sin indexar") porque casi todas son iguales entre sí. Con esto,
// cada ficha sin descripción lleva un párrafo propio montado con SUS datos reales (tipo de local,
// barrio, dirección, música, horario, precio, edad, servicios, valoración), siempre verdadero y
// distinto de un local a otro. Si el local tiene descripción escrita, se usa esa.

import { EXTRA_FEATURES } from "./extraFeatures"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>

type Kind = { label: string; article: "un" | "una" }

export function venueKind(venueType: string | null | undefined): Kind {
  const v = (venueType || "").toLowerCase()
  if (/karaoke/.test(v)) return { label: "Karaoke", article: "un" }
  if (/billar|pool/.test(v)) return { label: "Bar de billar", article: "un" }
  if (/cocktail|coctel|cóctel/.test(v)) return { label: "Coctelería", article: "una" }
  if (/pub/.test(v)) return { label: "Pub", article: "un" }
  if (/bar/.test(v)) return { label: "Bar de copas", article: "un" }
  if (/sala|concert|live/.test(v)) return { label: "Sala de conciertos", article: "una" }
  return { label: "Discoteca", article: "una" }
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

function listEs(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

export function clubPlace(club: Club): string {
  const area = clean(club.neighborhood)
  const city = clean(club.city) || "Barcelona"
  if (!area || area === city) return city
  return /^barcelona$/i.test(city) ? `${area} (Barcelona)` : area
}

export function clubSummary(club: Club): string {
  const name = clean(club.name)
  const kind = venueKind(club.venue_type)
  const parts: string[] = []

  const address = clean(club.address)
  parts.push(
    `${name} es ${kind.article} ${kind.label.toLowerCase()} en ${clubPlace(club)}${address ? `, en ${address.replace(/,?\s*\d{5}.*$/, "")}` : ""}.`
  )

  const music = clean(club.music)
  if (music && !/^karaoke$/i.test(music)) parts.push(`Música: ${music.replace(/\s*·\s*/g, ", ")}.`)

  const hours = clean(club.hours)
  const price = clean(club.price)
  if (hours && price) parts.push(`Horario: ${hours}. Entrada: ${price}.`)
  else if (hours) parts.push(`Horario: ${hours}.`)
  else if (price) parts.push(`Entrada: ${price}.`)

  const age = club.age_min || club.min_age || club.edad_minima
  if (age) parts.push(`Edad mínima: ${String(age).replace(/^\+?/, "+")} años.`)
  const dresscode = clean(club.dresscode)
  if (dresscode) parts.push(`Código de vestimenta: ${dresscode}.`)

  const extras = [
    club.terrace && "terraza",
    club.smoking_area && "zona de fumadores",
    club.vip_tables && "reservados VIP",
    club.has_foosball && "billar o futbolín",
    club.table_booking && "reserva de mesa",
    ...EXTRA_FEATURES.map((f) => club[f.field] && f.summary),
  ].filter(Boolean) as string[]
  if (extras.length) parts.push(`Tiene ${listEs(extras)}.`)
  if (club.lgtbi_friendly) parts.push("Es un local LGTBI+ friendly.")

  const rating = Number(club.google_rating || club.rating || 0)
  const reviews = Number(club.google_review_count || club.review_count || 0)
  if (rating >= 1) {
    const r = rating.toFixed(1).replace(".", ",")
    parts.push(
      reviews >= 5
        ? `En Google tiene una valoración de ${r} sobre 5 con ${reviews.toLocaleString("es-ES")} opiniones.`
        : `En Google tiene una valoración de ${r} sobre 5.`
    )
  }

  parts.push("En Noctua tienes cómo llegar de noche (metro, Nitbus o taxi), qué hay abierto cerca y otros locales parecidos.")
  return parts.join(" ")
}

// Descripción corta para <meta name="description"> (Google corta hacia los 155-160 caracteres).
export function clubMetaDescription(club: Club): string {
  const own = clean(club.description)
  // Una descripción de una frase corta se completa con los datos del local, para que el resultado
  // en Google no sea de una línea (29/10/2026).
  const ownEnded = own && !/[.!?…]$/.test(own) ? `${own}.` : own
  const text = own.length >= 110 ? own : [ownEnded, clubSummary(club)].filter(Boolean).join(" ")
  if (text.length <= 158) return text
  const cut = text.slice(0, 155)
  return cut.slice(0, cut.lastIndexOf(" ")) + "…"
}
