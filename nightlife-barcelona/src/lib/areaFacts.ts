import type { DbRow } from "./clubQueries"
import { STYLES, clubsForStyle } from "./areas"
import { clubStaysOpenPast } from "./clubHours"
import { nearestMetroStations } from "./metroStations"
import { distanceInMeters } from "./geo"
import { createSlug } from "./slug"

// Datos reales de una zona (barrio o municipio) para sus páginas /barrio y /zona (29/10/2026).
//
// Search Console marcaba estas páginas como poco útiles: una frase de introducción y una lista de
// nombres. Aquí se resume lo que ya sabemos de los locales de la zona (entrada, horario, estilos,
// metro y Nitbus cerca, los mejor valorados). Todo sale de los datos de los locales; si un dato no
// se puede sacar con garantías (pocos locales con horario, sin coordenadas...) simplemente no se
// enseña, nunca se rellena con algo inventado.

export type AreaFacts = {
  total: number
  price: { min: number; max: number } | null
  hours: { open: string; close: string } | null
  late: { n: number; of: number } | null
  styles: string[] // slugs de lib/areas STYLES, de más a menos habitual
  metro: string[]
  nitbus: string[] // códigos (N7, N9...)
  top: { name: string; slug: string; rating: number }[]
}

export type NitbusStop = { lat: number; lon: number; codes: string[] }

// Mínimo de locales con el dato para poder hablar de "lo habitual".
const MIN_SAMPLE = 3

// Precios de entrada en euros que aparecen en el texto del campo price ("€10–€15", "10-15€",
// "Gratis", "15€ con consumición"). Solo cuentan números pegados a un € (así "2 copas" no se
// confunde con un precio) y "gratis/free" cuenta como 0.
export function entryPrices(price: unknown): number[] {
  if (typeof price !== "string" || !price.trim()) return []
  const text = price.toLowerCase()
  const out: number[] = []
  const num = (s: string) => parseFloat(s.replace(",", "."))
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*€/g)) out.push(num(m[1]), num(m[2]))
  for (const m of text.matchAll(/€\s*(\d+(?:[.,]\d+)?)/g)) out.push(num(m[1]))
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*€/g)) out.push(num(m[1]))
  if (/\b(gratis|free|gratuit)\b/.test(text)) out.push(0)
  // Una entrada de más de 100 € es una mesa o un reservado, no la entrada habitual.
  return Array.from(new Set(out)).filter((n) => Number.isFinite(n) && n >= 0 && n <= 100)
}

const pad = (n: number) => String(n).padStart(2, "0")

// Primera franja horaria "23:55-06:00" del campo hours.
export function firstSlot(hours: unknown): { open: string; close: string } | null {
  if (typeof hours !== "string") return null
  const m = hours.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/)
  if (!m) return null
  const oh = parseInt(m[1], 10)
  const ch = parseInt(m[3], 10)
  if (oh > 24 || ch > 24) return null
  return { open: `${pad(oh % 24)}:${m[2]}`, close: `${pad(ch % 24)}:${m[4]}` }
}

function mode(values: string[]): string | null {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  let best: string | null = null
  let bestN = 0
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v
      bestN = n
    }
  }
  return best
}

function topCounts(counts: Map<string, number>, limit: number): string[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, limit)
    .map(([k]) => k)
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : null
}

// Parte pura (sin base de datos) para poder probarla: recibe los locales y las paradas de Nitbus.
export function buildAreaFacts(clubs: DbRow[], stops: NitbusStop[] = []): AreaFacts {
  // Entrada: el mínimo y el máximo entre los locales con precio conocido.
  const prices = clubs.map((c) => entryPrices(c.price)).filter((p) => p.length > 0)
  const price =
    prices.length >= MIN_SAMPLE
      ? { min: Math.min(...prices.map((p) => Math.min(...p))), max: Math.max(...prices.map((p) => Math.max(...p))) }
      : null

  // Horario habitual: la hora de apertura y de cierre que más locales comparten.
  const slots = clubs.map((c) => firstSlot(c.hours)).filter((s): s is { open: string; close: string } => !!s)
  const open = mode(slots.map((s) => s.open))
  const close = mode(slots.map((s) => s.close))
  const hours = slots.length >= MIN_SAMPLE && open && close ? { open, close } : null

  // Cuántos siguen abiertos pasadas las 02:30.
  const lateFlags = clubs.map((c) => clubStaysOpenPast(c.hours)).filter((v): v is boolean => v !== null)
  const late = lateFlags.length >= MIN_SAMPLE ? { n: lateFlags.filter(Boolean).length, of: lateFlags.length } : null

  // Estilos: los 3 más habituales (con al menos 2 locales). «Electrónica» ya incluye techno y house,
  // que no salen aparte para no repetir lo mismo con dos nombres.
  const styles = STYLES.filter((s) => s.slug !== "techno" && s.slug !== "house")
    .map((s) => ({ slug: s.slug, n: clubsForStyle(clubs, s).length }))
    .filter((s) => s.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 3)
    .map((s) => s.slug)

  // Metro y Nitbus: la estación (hasta 600 m) y las líneas (hasta 500 m) más cercanas a cada local.
  const metroCounts = new Map<string, number>()
  const busCounts = new Map<string, number>()
  for (const c of clubs) {
    const lat = num(c.latitude)
    const lon = num(c.longitude)
    if (lat === null || lon === null) continue
    const st = nearestMetroStations(lat, lon, 600, 1)[0]
    if (st) metroCounts.set(st.name, (metroCounts.get(st.name) || 0) + 1)
    const codes = new Set<string>()
    for (const s of stops) if (distanceInMeters(lat, lon, s.lat, s.lon) <= 500) s.codes.forEach((code) => codes.add(code))
    codes.forEach((code) => busCounts.set(code, (busCounts.get(code) || 0) + 1))
  }

  const top = clubs
    .map((c) => ({ name: String(c.name || ""), slug: String(c.slug || createSlug(c.name)), rating: num(c.google_rating) || num(c.rating) || 0 }))
    .filter((c) => c.name && c.rating >= 4)
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "es"))
    .slice(0, 3)

  return {
    total: clubs.length,
    price,
    hours,
    late,
    styles,
    metro: topCounts(metroCounts, 3),
    nitbus: topCounts(busCounts, 4),
    top,
  }
}
