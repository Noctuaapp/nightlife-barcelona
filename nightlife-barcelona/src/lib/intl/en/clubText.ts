// Texto de cada local EN INGLÉS (10/11/2026). Es el equivalente de lib/clubSummary.ts para las páginas
// /en/clubs/...: monta títulos, descripciones y frases a partir de los datos reales del local (tipo,
// barrio, música, horario, entrada, edad, vestimenta, servicios, valoración). No inventa nada: si un dato
// no se puede pasar al inglés con garantías (un precio escrito en texto libre, por ejemplo), se enseña tal
// cual está escrito marcado como español, nunca una traducción adivinada.

import { EXTRA_FEATURES } from "../../extraFeatures"
import { dressCodeOf } from "../../dressCode"
import { clubPlace } from "../../clubSummary"
import { expandDays, openDaysToLetters } from "../../clubHours"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/** "a", "b" and "c". */
export function listEn(items: string[]): string {
  if (items.length <= 1) return items.join("")
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// --- Tipo de local ------------------------------------------------------------------------------

export type KindEn = { noun: string; plural: string }

/** Mismo criterio que venueKind() de clubSummary.ts, con los nombres en inglés. */
export function venueKindEn(venueType: string | null | undefined): KindEn {
  const v = (venueType || "").toLowerCase()
  if (/karaoke/.test(v)) return { noun: "karaoke bar", plural: "karaoke bars" }
  if (/billar|pool/.test(v)) return { noun: "pool bar", plural: "pool bars" }
  if (/cocktail|coctel|cóctel/.test(v)) return { noun: "cocktail bar", plural: "cocktail bars" }
  if (/pub/.test(v)) return { noun: "pub", plural: "pubs" }
  if (/bar/.test(v)) return { noun: "bar", plural: "bars" }
  if (/sala|concert|live/.test(v)) return { noun: "live music venue", plural: "live music venues" }
  return { noun: "nightclub", plural: "nightclubs" }
}

// --- Música ---------------------------------------------------------------------------------------

const MUSIC_EN: Record<string, string> = {
  comercial: "commercial",
  commercial: "commercial",
  latina: "Latin",
  latino: "Latin",
  latin: "Latin",
  electronica: "electronic",
  electronic: "electronic",
  reggaeton: "reggaeton",
  "hip hop": "hip hop",
  "hip-hop": "hip hop",
  hiphop: "hip hop",
  rap: "rap",
  trap: "trap",
  "r&b": "R&B",
  rnb: "R&B",
  urbana: "urban",
  urbano: "urban",
  urban: "urban",
  techno: "techno",
  house: "house",
  "deep house": "deep house",
  "tech house": "tech house",
  minimal: "minimal",
  edm: "EDM",
  pop: "pop",
  rock: "rock",
  indie: "indie",
  punk: "punk",
  metal: "metal",
  jazz: "jazz",
  soul: "soul",
  funk: "funk",
  blues: "blues",
  disco: "disco",
  salsa: "salsa",
  bachata: "bachata",
  merengue: "merengue",
  cumbia: "cumbia",
  kizomba: "kizomba",
  flamenco: "flamenco",
  rumba: "rumba",
  dj: "DJ sets",
  variada: "mixed",
  variado: "mixed",
  mixta: "mixed",
  mixto: "mixed",
  "de todo": "mixed",
  "musica en directo": "live music",
  "directo": "live music",
  "años 80": "80s",
  "anos 80": "80s",
  "años 90": "90s",
  "anos 90": "90s",
  "80s": "80s",
  "90s": "90s",
  "2000s": "2000s",
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** "Techno · Comercial" → ["techno", "commercial"]. Lo que no se reconoce se deja como está escrito. */
export function musicEn(raw: unknown): string[] {
  const text = clean(raw)
  if (!text || /^karaoke$/i.test(text)) return []
  const out: string[] = []
  for (const part of text.split(/[,/·|;]/)) {
    const p = part.trim()
    if (!p) continue
    const key = stripAccents(p.toLowerCase())
    const hit = MUSIC_EN[key] ?? MUSIC_EN[p.toLowerCase()]
    const value = hit ?? p
    if (!out.includes(value)) out.push(value)
  }
  return out
}

// --- Vestimenta -----------------------------------------------------------------------------------

export function dressEn(club: Club): string {
  const code = dressCodeOf(club)
  if (!code) return ""
  if (code === "Elegante") return "Elegant"
  return code
}

// --- Edad -----------------------------------------------------------------------------------------

export function minAgeOf(club: Club): number | null {
  const raw = club.age_min ?? club.min_age ?? club.edad_minima
  if (raw === null || raw === undefined || raw === "") return null
  const n = parseInt(String(raw).replace(/[^\d]/g, ""), 10)
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null
}

// --- Horario --------------------------------------------------------------------------------------

const WEEK = ["L", "M", "X", "J", "V", "S", "D"]
const DAY_EN: Record<string, string> = { L: "Mon", M: "Tue", X: "Wed", J: "Thu", V: "Fri", S: "Sat", D: "Sun" }

function daysEn(letters: string[]): string {
  const idx = WEEK.map((l, i) => (letters.includes(l) ? i : -1)).filter((i) => i >= 0)
  if (idx.length === 0) return ""
  if (idx.length === 7) return "Every night"
  const runs: number[][] = []
  for (const i of idx) {
    const last = runs[runs.length - 1]
    if (last && last[last.length - 1] === i - 1) last.push(i)
    else runs.push([i])
  }
  return runs
    .map((r) => (r.length === 1 ? DAY_EN[WEEK[r[0]]] : r.length === 2 ? `${DAY_EN[WEEK[r[0]]]}, ${DAY_EN[WEEK[r[1]]]}` : `${DAY_EN[WEEK[r[0]]]}–${DAY_EN[WEEK[r[r.length - 1]]]}`))
    .join(", ")
}

const pad = (s: string) => s.padStart(2, "0")

/** El campo "hours" del local ("V/S 23:00-06:00, D 19:00-01:00") en inglés. Vacío si no se entiende. */
export function hoursEn(hours: unknown, openDays?: string[] | null): string[] {
  const text = clean(hours)
  if (!text) return []
  const openLetters = openDaysToLetters(openDays)
  const out: string[] = []
  for (const raw of text.split(/[,|;]/)) {
    const m = raw.trim().match(/^(?:([LMXJVSD/\-]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
    if (!m) continue
    const time = `${pad(m[2])}:${m[3]}–${pad(m[4])}:${m[5]}`
    const letters = m[1] ? expandDays(m[1]) : openLetters
    const days = letters && letters.length ? daysEn(letters) : "Every night"
    out.push(`${days} ${time}`)
  }
  return out
}

/** Primera franja "23:55–06:00" (para frases cortas). */
export function firstSlotEn(hours: unknown): string | null {
  const m = clean(hours).match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
  return m ? `${pad(m[1])}:${m[2]}–${pad(m[3])}:${m[4]}` : null
}

// --- Entrada --------------------------------------------------------------------------------------

const PRICE_WORDS: Record<string, string> = {
  gratis: "free",
  gratuita: "free",
  gratuito: "free",
  libre: "free",
  entrada: "entry",
  copa: "drink",
  copas: "drinks",
  consumicion: "drink",
  incluida: "included",
  incluido: "included",
  con: "with",
  sin: "without",
  antes: "before",
  despues: "after",
  hasta: "until",
  desde: "from",
  y: "and",
  o: "or",
  de: "",
  la: "",
  el: "",
  las: "",
  los: "",
  una: "a",
  un: "a",
  anticipada: "in advance",
  puerta: "at the door",
  hombres: "men",
  mujeres: "women",
  chicos: "men",
  chicas: "women",
  por: "per",
  persona: "person",
  lista: "guest list",
  mesa: "table",
  reservado: "VIP table",
  noche: "night",
  noches: "nights",
}
const ENGLISH_OK = new Set(["free", "entry", "drink", "drinks", "with", "without", "before", "after", "until", "from", "and", "or", "a", "in", "advance", "at", "the", "door", "men", "women", "per", "person", "guest", "list", "table", "vip", "included", "online", "night", "nights", "h", "am", "pm", "eur", "euros", "euro", "cover", "per"])

export type PriceEn = { text: string; translated: boolean }

/** El precio es texto libre del admin. Se traduce solo si TODAS sus palabras se reconocen; si no, se deja tal cual. */
export function priceEn(raw: unknown): PriceEn | null {
  const original = clean(raw).replace(/\s+/g, " ")
  if (!original) return null
  // Frases hechas antes de mirar palabra a palabra («15€ con copa» → «15€ with a drink»).
  const text = original
    .replace(/\bcon\s+(?:una\s+|1\s+)?(?:copa|consumici[oó]n)\b/gi, "with a drink")
    .replace(/\b(?:copa|consumici[oó]n)\s+incluida\b/gi, "drink included")
    .replace(/\b(\d+)\s+copas\b/gi, "$1 drinks")
  let unknown = false
  const parts = text.split(/([A-Za-zÀ-ÿ]+)/)
  const mapped = parts
    .map((part) => {
      if (!/^[A-Za-zÀ-ÿ]+$/.test(part)) return part
      const key = stripAccents(part.toLowerCase())
      if (key in PRICE_WORDS) return PRICE_WORDS[key]
      if (ENGLISH_OK.has(key)) return part.toLowerCase()
      unknown = true
      return part
    })
    .join("")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .trim()
  if (unknown || !mapped) return { text: original, translated: false }
  return { text: capitalize(mapped), translated: true }
}

// --- Servicios ------------------------------------------------------------------------------------

const FEATURE_EN: Record<string, string> = {
  cigarette_machine: "a cigarette machine",
  darts: "darts",
  karaoke: "karaoke",
  sports_tv: "TVs for live sport",
  hot_shows: "adult shows (18+)",
  cocktails: "a cocktail menu",
  games: "board and drinking games",
  live_music: "live music",
  dance_floor: "a dance floor",
  cloakroom: "a cloakroom",
  food: "a kitchen",
  shisha: "shisha",
  wheelchair_accessible: "wheelchair access",
  birthdays: "birthday celebrations",
  private_events: "private events",
  venue_rental: "venue hire",
}

/** Servicios del local como frases cortas ("a terrace", "VIP tables"…). */
export function featuresEn(club: Club): string[] {
  const out: string[] = []
  if (club.terrace) out.push("a terrace")
  if (club.smoking_area) out.push("a smoking area")
  if (club.vip_tables) out.push("VIP tables")
  if (club.has_foosball) out.push("pool or foosball tables")
  if (club.table_booking) out.push("table booking")
  for (const f of EXTRA_FEATURES) if (club[f.field] && FEATURE_EN[f.field]) out.push(FEATURE_EN[f.field])
  return out
}

// --- Valoración -----------------------------------------------------------------------------------

export function ratingOf(club: Club): { value: number; reviews: number } | null {
  const value = Number(club.google_rating || club.rating || 0)
  if (!(value >= 1)) return null
  const reviews = Number(club.google_review_count || club.review_count || 0)
  return { value, reviews: Number.isFinite(reviews) ? reviews : 0 }
}

// --- Frases ---------------------------------------------------------------------------------------

export function streetOf(club: Club): string {
  const address = clean(club.address)
  return address.replace(/,?\s*\d{5}.*$/, "")
}

/** Párrafo propio del local, montado solo con sus datos reales. */
export function clubSummaryEn(club: Club): string {
  const name = clean(club.name)
  const kind = venueKindEn(club.venue_type)
  const parts: string[] = []
  const street = streetOf(club)
  parts.push(`${name} is a ${kind.noun} in ${clubPlace(club)}${street ? `, at ${street}` : ""}.`)

  const music = musicEn(club.music)
  if (music.length) parts.push(`Music: ${listEn(music)}.`)

  const hours = hoursEn(club.hours, club.open_days)
  const price = priceEn(club.price)
  if (hours.length) parts.push(`Opening hours: ${hours.join("; ")}.`)
  if (price) parts.push(`Entry: ${price.text}.`)

  const age = minAgeOf(club)
  if (age) parts.push(`Minimum age: ${age}+.`)
  const dress = dressEn(club)
  if (dress) parts.push(`Dress code: ${dress}.`)

  const features = featuresEn(club)
  if (features.length) parts.push(`It has ${listEn(features)}.`)
  if (club.lgtbi_friendly) parts.push("It is an LGBTQ+ friendly venue.")

  const rating = ratingOf(club)
  if (rating) {
    parts.push(
      rating.reviews >= 5
        ? `Google rating: ${rating.value.toFixed(1)} out of 5 from ${rating.reviews.toLocaleString("en-GB")} reviews.`
        : `Google rating: ${rating.value.toFixed(1)} out of 5.`
    )
  }
  return parts.join(" ")
}

export const CLUB_TITLE_MAX = 70

export function clubTitleEn(club: Club): string {
  const name = clean(club.name)
  const kind = capitalize(venueKindEn(club.venue_type).noun)
  const place = clean(club.neighborhood) || "Barcelona"
  const base = `${name} – ${kind} in ${place}`
  const full = `${base}: hours & how to get home | Noctua`
  return full.length <= CLUB_TITLE_MAX ? full : `${base} | Noctua`
}

function fitMeta(text: string): string {
  if (text.length <= 158) return text
  const cut = text.slice(0, 155)
  return cut.slice(0, cut.lastIndexOf(" ")) + "…"
}

export function clubMetaDescriptionEn(club: Club): string {
  const name = clean(club.name)
  const kind = venueKindEn(club.venue_type).noun
  const facts: string[] = []
  const hours = hoursEn(club.hours, club.open_days)
  const price = priceEn(club.price)
  if (hours.length) facts.push(`Hours: ${hours[0]}.`)
  if (price) facts.push(`Entry: ${price.text}.`)
  const music = musicEn(club.music)
  if (music.length) facts.push(`Music: ${listEn(music.slice(0, 3))}.`)
  facts.push("Night bus, metro and taxi to get home.")
  return fitMeta(`${name}, ${/^[aeiou]/i.test(kind) ? "an" : "a"} ${kind} in ${clubPlace(club)}. ${facts.join(" ")}`)
}

/** Línea corta para tarjetas y listas: "Nightclub · Gràcia · techno, house". */
export function clubTagline(club: Club): string {
  const bits = [capitalize(venueKindEn(club.venue_type).noun), clean(club.neighborhood) || "Barcelona"]
  const music = musicEn(club.music)
  if (music.length) bits.push(music.slice(0, 2).join(", "))
  return bits.join(" · ")
}
