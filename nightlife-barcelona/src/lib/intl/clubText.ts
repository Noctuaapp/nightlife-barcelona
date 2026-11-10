// Texto de cada local en inglés, alemán, francés e italiano (10/11/2026). Es el equivalente de lib/clubSummary.ts
// para las fichas /{idioma}/clubs/...: monta títulos, descripciones y frases a partir de los datos reales del
// local (tipo, barrio, música, horario, entrada, edad, vestimenta, servicios, valoración). No inventa nada: si un
// dato no se puede pasar al idioma con garantías (un precio escrito en texto libre, por ejemplo), se enseña tal
// cual está escrito marcado como español, nunca una traducción adivinada.
//
// Las palabras de cada idioma (tipos de local, estilos de música, días, servicios, frases) están en clubLex.ts.

import { EXTRA_FEATURES } from "../extraFeatures"
import { dressCodeOf } from "../dressCode"
import { expandDays, openDaysToLetters } from "../clubHours"
import { CLUB_LEX, MUSIC_KEYS, type Kind, type KindKey } from "./clubLex"
import { CITY_NAME, NUM_LOCALE, type IntlLang } from "./lang"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Club = Record<string, any>

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/** Barrio y ciudad del local en el idioma: «El Raval (Barcelona)», «El Raval (Barcelone)»… */
export function placeOf(lang: IntlLang, club: Club): string {
  const area = clean(club.neighborhood)
  const rawCity = clean(club.city) || "Barcelona"
  const isBcn = /^barcelona$/i.test(rawCity)
  const city = isBcn ? CITY_NAME[lang] : rawCity
  if (!area || area === rawCity) return city
  return isBcn ? `${area} (${city})` : area
}

/** Número con coma decimal en alemán, francés e italiano: 4.5 → «4,5». */
const decimal = (lang: IntlLang, n: number): string => (lang === "en" ? n.toFixed(1) : n.toFixed(1).replace(".", ","))

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** "a", "b" and "c" (con «und», «et», «e» en los otros idiomas). */
export function listOf(lang: IntlLang, items: string[]): string {
  const and = CLUB_LEX[lang].and
  if (items.length <= 1) return items.join("")
  if (items.length === 2) return `${items[0]} ${and} ${items[1]}`
  return `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

// --- Tipo de local ------------------------------------------------------------------------------

/** Mismo criterio que venueKind() de clubSummary.ts. */
export function venueKindKey(venueType: string | null | undefined): KindKey {
  const v = (venueType || "").toLowerCase()
  if (/karaoke/.test(v)) return "karaoke"
  if (/billar|pool/.test(v)) return "pool"
  if (/cocktail|coctel|cóctel/.test(v)) return "cocktail"
  if (/pub/.test(v)) return "pub"
  if (/bar/.test(v)) return "bar"
  if (/sala|concert|live/.test(v)) return "live"
  return "club"
}

export function venueKindOf(lang: IntlLang, venueType: string | null | undefined): Kind {
  return CLUB_LEX[lang].kinds[venueKindKey(venueType)]
}

// --- Música ---------------------------------------------------------------------------------------

/** "Techno · Comercial" → ["techno", "commercial"]. Lo que no se reconoce se deja como está escrito. */
export function musicOf(lang: IntlLang, raw: unknown): string[] {
  const text = clean(raw)
  if (!text || /^karaoke$/i.test(text)) return []
  const labels = CLUB_LEX[lang].musicLabel
  const out: string[] = []
  for (const part of text.split(/[,/·|;]/)) {
    const p = part.trim()
    if (!p) continue
    const key = MUSIC_KEYS[stripAccents(p.toLowerCase())] ?? MUSIC_KEYS[p.toLowerCase()]
    const value = key ? labels[key] ?? p : p
    if (!out.includes(value)) out.push(value)
  }
  return out
}

// --- Vestimenta -----------------------------------------------------------------------------------

export function dressOf(lang: IntlLang, club: Club): string {
  const code = dressCodeOf(club)
  if (!code) return ""
  if (code === "Elegante") return CLUB_LEX[lang].elegant
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

function daysOf(lang: IntlLang, letters: string[]): string {
  const lex = CLUB_LEX[lang]
  const name = (i: number) => lex.days[i]
  const idx = WEEK.map((l, i) => (letters.includes(l) ? i : -1)).filter((i) => i >= 0)
  if (idx.length === 0) return ""
  if (idx.length === 7) return lex.everyNight
  const runs: number[][] = []
  for (const i of idx) {
    const last = runs[runs.length - 1]
    if (last && last[last.length - 1] === i - 1) last.push(i)
    else runs.push([i])
  }
  return runs
    .map((r) => (r.length === 1 ? name(r[0]) : r.length === 2 ? `${name(r[0])}, ${name(r[1])}` : `${name(r[0])}–${name(r[r.length - 1])}`))
    .join(", ")
}

const pad = (s: string) => s.padStart(2, "0")

/** El campo "hours" del local ("V/S 23:00-06:00, D 19:00-01:00") en el idioma. Vacío si no se entiende. */
export function hoursOf(lang: IntlLang, hours: unknown, openDays?: string[] | null): string[] {
  const text = clean(hours)
  if (!text) return []
  const openLetters = openDaysToLetters(openDays)
  const out: string[] = []
  for (const raw of text.split(/[,|;]/)) {
    const m = raw.trim().match(/^(?:([LMXJVSD/\-]+)\s+)?(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/)
    if (!m) continue
    const time = `${pad(m[2])}:${m[3]}–${pad(m[4])}:${m[5]}`
    const letters = m[1] ? expandDays(m[1]) : openLetters
    const days = letters && letters.length ? daysOf(lang, letters) : CLUB_LEX[lang].everyNight
    out.push(`${days} ${time}`)
  }
  return out
}

/** Primera franja "23:55–06:00" (para frases cortas). */
export function firstSlot(hours: unknown): string | null {
  const m = clean(hours).match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
  return m ? `${pad(m[1])}:${m[2]}–${pad(m[3])}:${m[4]}` : null
}

// --- Entrada --------------------------------------------------------------------------------------

export type PriceText = { text: string; translated: boolean }

/** El precio es texto libre del admin. Se traduce solo si TODAS sus palabras se reconocen; si no, se deja tal cual. */
export function priceOf(lang: IntlLang, raw: unknown): PriceText | null {
  const original = clean(raw).replace(/\s+/g, " ")
  if (!original) return null
  const lex = CLUB_LEX[lang]
  // Frases hechas antes de mirar palabra a palabra («15€ con copa» → «15€ with a drink»). Se guardan aparte
  // para que sus palabras, ya traducidas, no se vuelvan a mirar.
  const stash: string[] = []
  let text = original
  for (const [rx, out] of lex.pricePhrases) {
    text = text.replace(rx, (...m: unknown[]) => {
      stash.push(out.replace(/\$(\d)/g, (_, i: string) => String(m[Number(i)])))
      return `§${stash.length - 1}§`
    })
  }
  const keep = new Set(lex.priceKeep)
  let unknown = false
  const parts = text.split(/([A-Za-zÀ-ÿ]+)/)
  const mapped = parts
    .map((part) => {
      if (!/^[A-Za-zÀ-ÿ]+$/.test(part)) return part
      const key = stripAccents(part.toLowerCase())
      if (key in lex.priceWords) return lex.priceWords[key]
      if (keep.has(key)) return part.toLowerCase()
      unknown = true
      return part
    })
    .join("")
    .replace(/§(\d+)§/g, (_, i: string) => stash[Number(i)])
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:)])/g, "$1")
    .trim()
  if (unknown || !mapped) return { text: original, translated: false }
  return { text: capitalize(mapped), translated: true }
}

// --- Servicios ------------------------------------------------------------------------------------

/** Servicios del local como frases cortas. */
export function featuresOf(lang: IntlLang, club: Club): string[] {
  const lex = CLUB_LEX[lang]
  const out: string[] = []
  if (club.terrace) out.push(lex.baseFeatures.terrace)
  if (club.smoking_area) out.push(lex.baseFeatures.smoking)
  if (club.vip_tables) out.push(lex.baseFeatures.vip)
  if (club.has_foosball) out.push(lex.baseFeatures.foosball)
  if (club.table_booking) out.push(lex.baseFeatures.booking)
  for (const f of EXTRA_FEATURES) if (club[f.field] && lex.features[f.field]) out.push(lex.features[f.field])
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
export function clubSummary(lang: IntlLang, club: Club): string {
  const tpl = CLUB_LEX[lang].tpl
  const name = clean(club.name)
  const kind = venueKindOf(lang, club.venue_type)
  const parts: string[] = []
  parts.push(tpl.intro(name, kind.indef, placeOf(lang, club), streetOf(club)))

  const music = musicOf(lang, club.music)
  if (music.length) parts.push(tpl.music(listOf(lang, music)))

  const hours = hoursOf(lang, club.hours, club.open_days)
  const price = priceOf(lang, club.price)
  if (hours.length) parts.push(tpl.hours(hours.join("; ")))
  if (price) parts.push(tpl.entry(price.text))

  const age = minAgeOf(club)
  if (age) parts.push(tpl.age(age))
  const dress = dressOf(lang, club)
  if (dress) parts.push(tpl.dress(dress))

  const features = featuresOf(lang, club)
  if (features.length) parts.push(tpl.features(listOf(lang, features)))
  if (club.lgtbi_friendly) parts.push(tpl.lgbt)

  const rating = ratingOf(club)
  if (rating) {
    parts.push(
      rating.reviews >= 5
        ? tpl.ratingFull(decimal(lang, rating.value), rating.reviews.toLocaleString(NUM_LOCALE[lang]))
        : tpl.ratingShort(decimal(lang, rating.value))
    )
  }
  return parts.join(" ")
}

export const CLUB_TITLE_MAX = 70

export function clubTitle(lang: IntlLang, club: Club): string {
  const tpl = CLUB_LEX[lang].tpl
  const name = clean(club.name)
  const kind = capitalize(venueKindOf(lang, club.venue_type).noun)
  const place = clean(club.neighborhood) || CITY_NAME[lang]
  const base = tpl.titleBase(name, kind, place)
  const full = `${base}${tpl.titleTail}`
  return full.length <= CLUB_TITLE_MAX ? full : `${base} | Noctua`
}

function fitMeta(text: string): string {
  if (text.length <= 158) return text
  const cut = text.slice(0, 155)
  return cut.slice(0, cut.lastIndexOf(" ")) + "…"
}

export function clubMetaDescription(lang: IntlLang, club: Club): string {
  const tpl = CLUB_LEX[lang].tpl
  const name = clean(club.name)
  const kind = venueKindOf(lang, club.venue_type)
  const facts: string[] = []
  const hours = hoursOf(lang, club.hours, club.open_days)
  const price = priceOf(lang, club.price)
  if (hours.length) facts.push(tpl.metaHours(hours[0]))
  if (price) facts.push(tpl.metaEntry(price.text))
  const music = musicOf(lang, club.music)
  if (music.length) facts.push(tpl.metaMusic(listOf(lang, music.slice(0, 3))))
  facts.push(tpl.metaTransit)
  // Se quitan datos por el final hasta que quepa, en vez de cortar la frase a la mitad.
  const intro = tpl.metaIntro(name, kind.indef, placeOf(lang, club))
  for (let n = facts.length; n >= 0; n--) {
    const text = [intro, ...facts.slice(0, n)].join(" ")
    if (text.length <= 158) return text
  }
  return fitMeta(intro)
}

/** Línea corta para tarjetas y listas: "Nightclub · Gràcia · techno, house". */
export function clubTagline(lang: IntlLang, club: Club): string {
  const bits = [capitalize(venueKindOf(lang, club.venue_type).noun), clean(club.neighborhood) || CITY_NAME[lang]]
  const music = musicOf(lang, club.music)
  if (music.length) bits.push(music.slice(0, 2).join(", "))
  return bits.join(" · ")
}
