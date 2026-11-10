import { cache } from "react"
import { clubOpensOn } from "../clubHours"
import { computeAreaFacts } from "../areaFactsData"
import { NIGHT_BUS_LINES } from "../nightBuses"
import { compareLineCodes } from "../nitbusRoutes"
import { createSlug } from "../slug"
import { englishAreas, getAllClubs, getCityStats, getEssentials, rankClubs, type EssentialRowEn } from "./data"
import type { GuideCtx, PlaceLine } from "./en/guides"

// Cifras reales de Noctua que alimentan las guías en inglés. Se calculan en el servidor al generar la
// página (una vez por petición gracias a cache()) y buildGuide() las convierte en texto. Si una consulta
// falla o no hay datos, esa parte de la guía simplemente no sale: nunca se rellena con algo inventado.

// De lunes a domingo, con su número de día (0 = domingo) para clubOpensOn.
const NIGHTS: { day: string; dow: number }[] = [
  { day: "Monday", dow: 1 },
  { day: "Tuesday", dow: 2 },
  { day: "Wednesday", dow: 3 },
  { day: "Thursday", dow: 4 },
  { day: "Friday", dow: 5 },
  { day: "Saturday", dow: 6 },
  { day: "Sunday", dow: 0 },
]

const placeOf = (r: EssentialRowEn): PlaceLine => ({
  name: r.name,
  where: [r.address, r.neighborhood].filter((x) => x && x.trim()).slice(0, 2).join(", "),
  phone: r.phone || undefined,
})

const byName = (a: EssentialRowEn, b: EssentialRowEn) => a.name.localeCompare(b.name, "en")

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch {
    return fallback
  }
}

/** Sitios abiertos 24 horas de una categoría, por orden alfabético, y cuántos hay en total. */
function open24(rows: EssentialRowEn[], limit: number): { list: PlaceLine[]; total: number } {
  const all = rows.filter((r) => r.open24).sort(byName)
  return { list: all.slice(0, limit).map(placeOf), total: all.length }
}

export const loadGuideCtx = cache(async (): Promise<GuideCtx> => {
  const [clubs, stats, pharmacy, hospital, food, supermarket, atm] = await Promise.all([
    safe(getAllClubs, []),
    safe(getCityStats, null),
    safe(() => getEssentials("Pharmacy"), []),
    safe(() => getEssentials("Hospital"), []),
    safe(() => getEssentials("Food"), []),
    safe(() => getEssentials("Supermarket"), []),
    safe(() => getEssentials("ATM"), []),
  ])

  // Cuántos locales abren cada noche (solo cuentan los que tienen horario o días de apertura).
  const nightsOpen = NIGHTS.map(({ day, dow }) => ({
    day,
    n: clubs.filter((c) => clubOpensOn(c.hours, c.open_days, dow) === true).length,
  }))

  // Los barrios con más locales, cada uno con sus datos (entrada, horario, metro y Nitbus cerca).
  const topAreas = englishAreas(clubs).slice(0, 10)
  const areas = await Promise.all(
    topAreas.map(async (a) => {
      const inArea = rankClubs(clubs.filter((c) => createSlug(c.neighborhood) === a.slug))
      const facts = await safe(() => computeAreaFacts(inArea), null)
      return { slug: a.slug, name: a.name, count: a.count, facts }
    })
  )

  const p24 = open24(pharmacy, 12)
  const f24 = open24(food, 10)
  const s24 = open24(supermarket, 10)
  const hospitals = [...hospital].sort(byName)

  return {
    total: stats?.total ?? clubs.length,
    facts: stats?.facts ?? null,
    dress: stats?.dress ?? [],
    withDress: stats?.withDress ?? 0,
    ages: stats?.ages ?? [],
    withAge: stats?.withAge ?? 0,
    nightsOpen,
    pharmacies24: p24.list,
    pharmacies24Total: p24.total,
    pharmaciesTotal: pharmacy.length,
    hospitals: hospitals.slice(0, 8).map(placeOf),
    hospitalsTotal: hospitals.length,
    food24: f24.list,
    food24Total: f24.total,
    supermarkets24: s24.list,
    supermarkets24Total: s24.total,
    highFeeAtms: atm.filter((r) => r.highFee).length,
    atmsTotal: atm.length,
    busLines: Object.values(NIGHT_BUS_LINES)
      .sort((a, b) => compareLineCodes(a.code, b.code))
      .map((l) => ({ code: l.code, route: l.route, catalunya: l.catalunya })),
    areas,
  }
})
