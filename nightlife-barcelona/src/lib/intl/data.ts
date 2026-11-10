import { cache } from "react"
import { supabase } from "../supabase"
import { fetchVisibleClubs, LIST_CLUB_FIELDS, type DbRow } from "../clubQueries"
import { fetchAllPages } from "../fetchAll"
import { computeAreaFacts, loadNitbusStops } from "../areaFactsData"
import type { AreaFacts } from "../areaFacts"
import { rankClubs } from "../areas"
import { distanceInMeters } from "../geo"
import { loadNitbusData, type NbData } from "../nitbusRoutes"
import { cleanEssential, isShownEssential } from "../essentials"
import { dressOf, minAgeOf } from "./clubText"
import type { IntlLang } from "./lang"
import { createSlug } from "../slug"

// Datos que necesitan las páginas en inglés (/en/...). Todo se lee en el servidor al generar la página
// y se guarda un rato en memoria para no repetir las mismas consultas en cada una de las ~100 páginas.

// --- Locales ------------------------------------------------------------------------------------------

export const getAllClubs = cache(async (): Promise<DbRow[]> => fetchVisibleClubs(LIST_CLUB_FIELDS))

export const clubSlugOf = (c: DbRow): string => String(c.slug || createSlug(c.name))

export { englishAreas } from "./areasEn"
export { rankClubs }

// --- Cifras de la ciudad (alimentan las guías con datos propios) -----------------------------------------

export type CityStats = {
  total: number
  facts: AreaFacts | null
  dress: { label: string; n: number }[]
  ages: { age: number; n: number }[]
  withDress: number
  withAge: number
}

export function computeCityStats(clubs: DbRow[], facts: AreaFacts | null, lang: IntlLang = "en"): CityStats {
  const dress = new Map<string, number>()
  const ages = new Map<number, number>()
  for (const c of clubs) {
    const d = dressOf(lang, c)
    if (d) dress.set(d, (dress.get(d) || 0) + 1)
    const a = minAgeOf(c)
    if (a) ages.set(a, (ages.get(a) || 0) + 1)
  }
  return {
    total: clubs.length,
    facts,
    dress: [...dress.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n),
    ages: [...ages.entries()].map(([age, n]) => ({ age, n })).sort((a, b) => b.n - a.n),
    withDress: [...dress.values()].reduce((s, n) => s + n, 0),
    withAge: [...ages.values()].reduce((s, n) => s + n, 0),
  }
}

export const getCityStats = cache(async (lang: IntlLang = "en"): Promise<CityStats> => {
  const clubs = await getAllClubs()
  const facts = await computeAreaFacts(clubs)
  return computeCityStats(clubs, facts, lang)
})

// --- Nitbus ---------------------------------------------------------------------------------------------

let nitbusMemo: { at: number; data: NbData } | null = null
/** Líneas y paradas del Nitbus; en memoria una hora (cada consulta lee más de dos mil filas). */
export async function getNitbusData(): Promise<NbData> {
  if (nitbusMemo && Date.now() - nitbusMemo.at < 3600_000) return nitbusMemo.data
  const data = await loadNitbusData()
  nitbusMemo = { at: Date.now(), data }
  return data
}

/** Líneas de Nitbus con parada a menos de `meters` de un punto, de la más cercana a la más lejana. */
export async function nightBusesNear(lat: number, lon: number, meters = 500): Promise<string[]> {
  const stops = await loadNitbusStops()
  const best = new Map<string, number>()
  for (const s of stops) {
    const d = distanceInMeters(lat, lon, s.lat, s.lon)
    if (d > meters) continue
    for (const code of s.codes) best.set(code, Math.min(best.get(code) ?? Infinity, d))
  }
  return [...best.entries()].sort((a, b) => a[1] - b[1]).map(([code]) => code)
}

// --- Esenciales -----------------------------------------------------------------------------------------

export type EssentialRowEn = {
  id: number
  name: string
  address: string
  neighborhood: string
  openHours: string
  phone: string
  website: string
  lat: number | null
  lon: number | null
  open24: boolean
  highFee: boolean
}

// «Open 24 hours» sin más, o «Monday to Sunday: Open 24 hours». Un horario de un solo día no vale (mismo
// criterio que el texto de /essentials/[category] en español).
export function isOpen24hAllWeek(raw: string | null | undefined): boolean {
  if (!raw) return false
  const lower = raw.trim().toLowerCase()
  if (!/24\s*hours/.test(lower)) return false
  const day = "(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
  const withDay = lower.match(new RegExp(`^${day}(?:\\s+to\\s+${day})?`))
  if (!withDay) return true
  return withDay[1] === "monday" && withDay[2] === "sunday"
}

const FULL_COLS = "id, name, category, address, neighborhood, open_hours, phone, website, latitude, longitude, is_24h"
const BASE_COLS = "id, name, category, address, neighborhood, open_hours, latitude, longitude"

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : null
}
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

export const getEssentials = cache(async (categoryKey: string): Promise<EssentialRowEn[]> => {
  const run = (cols: string) =>
    fetchAllPages<Record<string, unknown>>((from, to) =>
      supabase.from("essentials").select(cols).ilike("category", categoryKey).eq("hidden", false).order("id").range(from, to) as unknown as PromiseLike<{
        data: Record<string, unknown>[] | null
        error: unknown
      }>
    )
  let rows = await run(FULL_COLS)
  // Si una columna nueva aún no existe en la base, se repite con las de siempre.
  if (rows.length === 0) rows = await run(BASE_COLS)
  return rows
    .filter((r) => isShownEssential({ name: str(r.name), category: str(r.category) }))
    .map((r) => {
      const cleaned = cleanEssential({ name: str(r.name), category: str(r.category) })
      const openHours = str(r.open_hours)
      return {
        id: Number(r.id),
        name: cleaned.name || "",
        address: str(r.address),
        neighborhood: str(r.neighborhood),
        openHours,
        phone: str(r.phone),
        website: str(r.website),
        lat: num(r.latitude),
        lon: num(r.longitude),
        open24: r.is_24h === true || isOpen24hAllWeek(openHours),
        highFee: cleaned.highFee,
      }
    })
    .filter((r) => r.name)
})
