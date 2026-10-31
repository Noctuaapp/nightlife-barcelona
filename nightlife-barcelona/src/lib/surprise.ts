// Lógica de «Sorpréndeme» (31/10/2026), separada del componente para poder probarla.
//
// Elige UN local al azar, pero no a ciegas:
//   · nunca uno cerrado temporalmente, cerrado esta noche, ni donde a la persona no la dejaron entrar;
//   · prefiere lo que está abierto ahora, y dentro de eso lo que encaja con el rollo elegido
//     (bailar, charlar…), con «cerca de mí» y con los extras (entrada gratis, terraza, LGTBI+);
//   · si no hay nada con todo eso, va relajando las condiciones por pasos y lo dice (nota);
//   · entre los candidatos tira un dado con pesos (populares y bien valorados salen más, pero
//     cualquiera puede salir) y no repite hasta que se acaban.
import { effectiveOpenNow, isClosedTonight } from "./scheduleNotices"
import { distanceInMeters } from "./geo"
import { zoneOf } from "./zones"

export type Mood = "any" | "dance" | "chat" | "chill" | "live"
export const MOOD_IDS: Mood[] = ["any", "dance", "chat", "chill", "live"]

export const MOOD_WORDS: Record<Mood, string[]> = {
  any: [],
  dance: ["techno", "house", "electr", "reggaeton", "latin", "comerc", "commercial", "hip", "r&b", "dance", "disco", "trap"],
  chat: ["lounge", "cocktail", "coctel", "pop", "indie", "rock", "bar", "chill"],
  chill: ["jazz", "chill", "lounge", "soul", "funk", "acoust", "acústic", "deep"],
  live: ["live", "vivo", "concert", "jazz", "rock", "indie", "flamenco", "blues"],
}

export type Extras = { free: boolean; terrace: boolean; lgtbi: boolean }
export const NO_EXTRAS: Extras = { free: false, terrace: false, lgtbi: false }
export const NEAR_METERS = 4000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Club = Record<string, any>
type Pos = { lat: number; lon: number } | null

export type SurpriseNote = "" | "extras" | "otherOpen" | "later"

// 0 = no encaja. Para «lo que sea» todo vale (1). Cuenta las palabras de música/tipo que coinciden
// y suma un punto si el local tiene la característica (pista de baile, música en vivo, cócteles).
export function moodScore(club: Club, mood: Mood): number {
  if (mood === "any") return 1
  const text = `${club.music || ""} ${club.category || ""} ${club.venue_type || ""}`.toLowerCase()
  let score = MOOD_WORDS[mood].reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0)
  if (mood === "dance" && club.dance_floor) score += 1
  if (mood === "live" && club.live_music) score += 1
  if (mood === "chat" && club.cocktails) score += 1
  return score
}

export function hasFreeEntry(club: Club): boolean {
  return typeof club.free_entry_info === "string" && club.free_entry_info.trim().length > 0
}

export function matchesExtras(club: Club, extras: Extras): boolean {
  if (extras.free && !hasFreeEntry(club)) return false
  if (extras.terrace && !club.terrace) return false
  if (extras.lgtbi && !club.lgtbi_friendly) return false
  return true
}

export function anyExtras(extras: Extras): boolean {
  return extras.free || extras.terrace || extras.lgtbi
}

export function clubDistance(club: Club, pos: Pos): number | null {
  if (!pos) return null
  const lat = Number(club.latitude)
  const lon = Number(club.longitude)
  if (!lat || !lon) return null
  return distanceInMeters(pos.lat, pos.lon, lat, lon)
}

export function pickWeighted<T>(items: T[], weight: (x: T) => number, rand: () => number = Math.random): T {
  const ws = items.map((i) => Math.max(0.1, weight(i)))
  let r = rand() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < items.length; i++) {
    r -= ws[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

export type SurpriseInput = {
  clubs: Club[]
  mood: Mood
  extras: Extras
  zone: string
  near: boolean
  pos: Pos
  denied: Set<number>
  seen: number[]
  rand?: () => number
  isOpen?: (club: Club) => boolean | null
}

export type SurpriseResult = { club: Club; note: SurpriseNote; candidates: Club[] }

export function pickSurprise(input: SurpriseInput): SurpriseResult | null {
  const { clubs, mood, extras, zone, near, pos, denied, seen, rand = Math.random, isOpen = effectiveOpenNow } = input

  const zoned = zone ? clubs.filter((c) => c && c.name && zoneOf(c) === zone) : clubs
  // Nunca un local cerrado ni donde a esta persona no le dejaron entrar (lib/deniedVenues).
  const usable = (zoned.length > 0 ? zoned : clubs).filter(
    (c) => c && c.name && !denied.has(Number(c.id)) && !c.temporarily_closed && !isClosedTonight(c.schedule_notices)
  )
  if (usable.length === 0) return null

  const isNear = (c: Club) => {
    if (!near) return true
    const d = clubDistance(c, pos)
    return d === null || d <= NEAR_METERS
  }
  const open = (c: Club) => isOpen(c) === true
  const fits = (c: Club) => moodScore(c, mood) > 0

  const tiers: { note: SurpriseNote; fn: (c: Club) => boolean }[] = [
    { note: "", fn: (c) => open(c) && fits(c) && isNear(c) && matchesExtras(c, extras) },
    ...(anyExtras(extras) ? [{ note: "extras" as SurpriseNote, fn: (c: Club) => open(c) && fits(c) && isNear(c) }] : []),
    { note: "otherOpen", fn: (c) => open(c) && isNear(c) },
    { note: "later", fn: (c) => fits(c) && isNear(c) },
    { note: "later", fn: () => true },
  ]

  // Primer escalón que aún tiene alguien sin salir; así, cuando se acaban los que encajan del todo,
  // «Otra opción» pasa a los siguientes (avisando) en vez de repetir. Si ya salió todo, se reciclan
  // evitando solo el último.
  let pool: Club[] = []
  let note: SurpriseNote = ""
  const last = seen[seen.length - 1]
  for (const tier of tiers) {
    const fresh = usable.filter((c) => tier.fn(c) && !seen.includes(c.id))
    if (fresh.length > 0) {
      pool = fresh
      note = tier.note
      break
    }
  }
  if (pool.length === 0) {
    for (const tier of tiers) {
      const all = usable.filter(tier.fn)
      if (all.length === 0) continue
      pool = all.length > 1 ? all.filter((c) => c.id !== last) : all
      note = tier.note
      break
    }
  }
  if (pool.length === 0) return null

  const weight = (c: Club) => {
    let w = 1 + (c.trending ? 1.5 : 0) + (c.verified ? 0.5 : 0) + (Number(c.rating) || 3.5) / 5
    if (mood !== "any") w *= 1 + Math.min(moodScore(c, mood), 3) * 0.5
    if (near) {
      const d = clubDistance(c, pos)
      if (d !== null) w *= 1 + 1.5 * (1 - Math.min(d, 6000) / 6000)
    }
    return w
  }
  return { club: pickWeighted(pool, weight, rand), note, candidates: usable }
}
