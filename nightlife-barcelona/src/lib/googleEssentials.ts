// Esenciales de noche desde Google Places (Text Search «New»): supermercados, comida, gasolineras y
// farmacias que abren las 24 h o cierran pasada la 1:00. Lo usa el importador
// (/api/admin/import-google-essentials). Está aparte para poder probarlo sin llamar a Google.
//
// Por qué Google y no OpenStreetMap: OpenStreetMap solo trae horario en una parte de los locales, y
// Overture Maps no trae horarios. Google sí los trae para casi todos, pero cada llamada es de pago
// (ver googlePlacesBudget.ts), así que todo lo que gasta pasa por el tope diario.
//
// Los horarios de Google («periods») se convierten al mismo formato que los de OpenStreetMap
// (WeekHours), y de ahí salen el criterio de noche y el texto que guarda Noctua (lib/osmHours.ts).

import { isNightEssentialHours, toNoctuaHours, type Interval, type WeekHours } from "./osmHours"

export type GoogleKey = "supermarket" | "food" | "gas" | "pharmacy"

export type GoogleQuery = { text: string; includedType?: string }
export type GoogleCategory = { key: GoogleKey; category: string; label: string; queries: GoogleQuery[] }

// `category` es el valor de la columna essentials.category (el mismo que usa el importador de OSM).
// Cada consulta pide hasta 20 resultados por página; pocas consultas y bien dirigidas = pocas llamadas.
export const GOOGLE_CATEGORIES: GoogleCategory[] = [
  {
    key: "supermarket",
    category: "Supermarket",
    label: "Supermercados",
    queries: [
      { text: "supermercado abierto 24 horas", includedType: "supermarket" },
      { text: "tienda de alimentación 24 horas", includedType: "convenience_store" },
      { text: "alimentación colmado abierto hasta tarde", includedType: "grocery_store" },
    ],
  },
  {
    key: "food",
    category: "Food",
    label: "Comida",
    queries: [
      { text: "kebab abierto hasta tarde" },
      { text: "pizzería abierta hasta tarde" },
      { text: "hamburguesería comida rápida abierta de madrugada" },
      { text: "restaurante abierto hasta la madrugada" },
    ],
  },
  { key: "gas", category: "Gas Station", label: "Gasolineras", queries: [{ text: "gasolinera 24 horas", includedType: "gas_station" }] },
  { key: "pharmacy", category: "Pharmacy", label: "Farmacias", queries: [{ text: "farmacia de guardia 24 horas", includedType: "pharmacy" }] },
]

// «all» = las cuatro. También vale una lista separada por comas («supermarket,food»). Vacío si alguna
// clave no existe. Siempre en el orden de GOOGLE_CATEGORIES y sin repetir.
export function googleCategoriesFor(cat: string): GoogleCategory[] {
  const wanted = (cat || "all").toLowerCase().split(",").map((x) => x.trim()).filter(Boolean)
  if (wanted.length === 0 || wanted.includes("all")) return GOOGLE_CATEGORIES
  if (wanted.some((k) => !GOOGLE_CATEGORIES.some((c) => c.key === k))) return []
  return GOOGLE_CATEGORIES.filter((c) => wanted.includes(c.key))
}

// ---- Precio ---------------------------------------------------------------------------------
// Text Search con horarios (regularOpeningHours) es el nivel «Enterprise» de Google: 35 $ por cada
// 1.000 llamadas, y Google regala las primeras 1.000 de cada mes (precios de la lista oficial de
// Google Maps Platform, comprobados el 1/11/2026). Una «llamada» es una página de hasta 20 resultados.
export const USD_PER_CALL = 35 / 1000
export function estimateCostUsd(calls: number): number {
  return Math.round(calls * USD_PER_CALL * 100) / 100
}

// ---- Petición a Google ----------------------------------------------------------------------
export const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
export const SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.location,places.regularOpeningHours,places.types,places.primaryType,places.businessStatus,nextPageToken"

export type Bbox = [number, number, number, number] // sur, oeste, norte, este (como boundaryBbox)

export function buildSearchBody(q: GoogleQuery, bbox: Bbox, pageToken?: string) {
  const [s, w, n, e] = bbox
  return {
    textQuery: q.text,
    languageCode: "es",
    regionCode: "ES",
    pageSize: 20,
    ...(q.includedType ? { includedType: q.includedType, strictTypeFiltering: true } : {}),
    locationRestriction: { rectangle: { low: { latitude: s, longitude: w }, high: { latitude: n, longitude: e } } },
    ...(pageToken ? { pageToken } : {}),
  }
}

// ---- Lo que devuelve Google -----------------------------------------------------------------
export type GooglePoint = { day?: number; hour?: number; minute?: number }
export type GooglePeriod = { open?: GooglePoint; close?: GooglePoint }
export type GooglePlace = {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  regularOpeningHours?: { periods?: GooglePeriod[] }
  types?: string[]
  primaryType?: string
  businessStatus?: string
}

export type PageResult =
  | { ok: true; places: GooglePlace[]; nextPageToken?: string }
  | { ok: false; status: number; message: string }

export type CollectResult = {
  places: Map<string, GooglePlace>
  devueltos: number // sitios que ha devuelto Google (con repetidos entre consultas)
  llamadas: number // páginas pedidas con respuesta
  pendientes: string[] // consultas que no se llegaron a hacer (o se cortaron)
  detenido: string | null // por qué se paró antes de tiempo
}

// Lanza todas las consultas de una categoría, pasando de página mientras Google dé páginas llenas, y
// junta los sitios sin repetir. `fetchPage` es quien hace la llamada de verdad (y cuenta contra el
// tope diario: al llegar al tope lanza un error y aquí se corta con lo que haya hasta ese momento).
// Un error 4xx (clave mala, cuota agotada, petición no válida) para TODO: repetirlo solo gastaría más.
// Un 5xx salta esa consulta y sigue con la siguiente.
export async function collectPlaces(opts: {
  queries: GoogleQuery[]
  pages: number
  bbox: Bbox
  fetchPage: (body: ReturnType<typeof buildSearchBody>) => Promise<PageResult>
}): Promise<CollectResult> {
  const places = new Map<string, GooglePlace>()
  let devueltos = 0
  let llamadas = 0
  let detenido: string | null = null
  let i = 0
  outer: for (; i < opts.queries.length; i++) {
    const q = opts.queries[i]
    let token: string | undefined
    for (let page = 0; page < opts.pages; page++) {
      let res: PageResult
      try {
        res = await opts.fetchPage(buildSearchBody(q, opts.bbox, token))
      } catch (e) {
        detenido = e instanceof Error ? e.message : "error desconocido"
        break outer
      }
      llamadas++
      if (!res.ok) {
        if (res.status >= 500) break
        detenido = `Google respondió ${res.status}: ${res.message}`
        break outer
      }
      for (const p of res.places) {
        devueltos++
        if (p.id && !places.has(p.id)) places.set(p.id, p)
      }
      if (!res.nextPageToken || res.places.length < 20) break
      token = res.nextPageToken
    }
  }
  return { places, devueltos, llamadas, pendientes: detenido ? opts.queries.slice(i).map((q) => q.text) : [], detenido }
}

// ---- Horarios de Google → WeekHours ----------------------------------------------------------
// Google da el horario como «periodos»: abre (día 0 = domingo, hora, minuto) y cierra (otro día/hora).
// Un sitio que abre siempre sale como un único periodo que abre el domingo a las 0:00 y no cierra.
// Aquí el lunes es el día 0 (como en OpenStreetMap) y un cierre pasada la medianoche se guarda en el
// día en que abre, con minutos por encima de 1440 («viernes 20:00 – sábado 2:00» = [1200, 1560]).

function validPoint(p: GooglePoint | undefined): p is Required<GooglePoint> {
  return !!p && Number.isInteger(p.day) && Number.isInteger(p.hour) && Number.isInteger(p.minute)
    && p.day! >= 0 && p.day! <= 6 && p.hour! >= 0 && p.hour! <= 23 && p.minute! >= 0 && p.minute! <= 59
}

export function periodsToWeek(periods: GooglePeriod[] | undefined): WeekHours | null {
  if (!periods || periods.length === 0) return null
  const all: WeekHours = Array.from({ length: 7 }, () => [[0, 1440]] as Interval[])
  const week: WeekHours = Array.from({ length: 7 }, () => [])

  for (const per of periods) {
    if (!validPoint(per.open)) return null
    if (!per.close) {
      // Sin cierre solo significa «siempre abierto» si es el periodo único del domingo a las 0:00.
      if (periods.length === 1 && per.open.day === 0 && per.open.hour === 0 && per.open.minute === 0) return all
      return null
    }
    if (!validPoint(per.close)) return null
    const d0 = (per.open.day + 6) % 7
    const start = per.open.hour * 60 + per.open.minute
    const span = (per.close.day - per.open.day + 7) % 7
    const closeMin = per.close.hour * 60 + per.close.minute
    if (span === 0 && closeMin <= start) return null // periodo vacío o dado la vuelta: mejor «no sé»
    if (span <= 1) {
      week[d0].push([start, span * 1440 + closeMin])
    } else {
      // Más de un día seguido (raro): se reparte por los días para que cada uno quede bien.
      week[d0].push([start, 1440])
      for (let k = 1; k < span; k++) week[(d0 + k) % 7].push([0, 1440])
      if (closeMin > 0) week[(d0 + span) % 7].push([0, closeMin])
    }
  }

  // Ordenar y juntar tramos que se tocan (p. ej. 0:00–24:00 + 0:00–2:00 del día siguiente no se tocan
  // aquí, pero dos periodos seguidos del mismo día sí).
  for (let d = 0; d < 7; d++) {
    week[d].sort((a, b) => a[0] - b[0])
    const merged: Interval[] = []
    for (const iv of week[d]) {
      const last = merged[merged.length - 1]
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1])
      else merged.push([iv[0], iv[1]])
    }
    week[d] = merged
  }
  return week.some((d) => d.length > 0) ? week : null
}

// ---- Qué sitios valen -----------------------------------------------------------------------
// Tipos de Google que NO son un esencial aunque aparezcan en la búsqueda: bares y discotecas (ya hay
// otra sección para ellos) y alojamientos.
const NIGHTLIFE = new Set(["bar", "night_club", "pub", "wine_bar", "irish_pub", "cocktail_bar", "karaoke", "casino", "hookah_bar", "bar_and_grill", "lodging", "hotel"])
const SUPER = new Set(["supermarket", "grocery_store", "convenience_store", "asian_grocery_store", "food_store", "market"])
const FOOD_EXTRA = new Set(["cafe", "coffee_shop", "bakery", "sandwich_shop", "meal_takeaway", "meal_delivery", "food_court", "kebab_shop"])

function isFoodType(t: string): boolean {
  return /restaurant$/.test(t) || FOOD_EXTRA.has(t)
}

export function matchesCategory(key: GoogleKey, primaryType: string | undefined, types: string[] | undefined): boolean {
  const all = types || []
  if ((primaryType && NIGHTLIFE.has(primaryType)) || all.includes("night_club") || all.includes("casino")) return false
  // Si Google da tipo principal, manda ese; si no, vale cualquiera de los tipos.
  const test = (fn: (t: string) => boolean) => (primaryType ? fn(primaryType) : all.some(fn))
  switch (key) {
    case "supermarket": return test((t) => SUPER.has(t))
    case "food": return test(isFoodType)
    case "gas": return test((t) => t === "gas_station")
    case "pharmacy": return test((t) => t === "pharmacy")
  }
}

export type GoogleVerdict =
  | { ok: true; id: string; name: string; lat: number; lon: number; address: string | null; openHours: string }
  | { ok: false; reason: "sin_id" | "sin_nombre" | "sin_coordenadas" | "cerrado" | "no_es_del_tipo" | "sin_horario" | "no_es_de_noche" }

export function googleName(p: GooglePlace): string | null {
  const n = (p.displayName?.text || "").replace(/\s+/g, " ").trim()
  return n ? n.slice(0, 120) : null
}

export function googleAddress(p: GooglePlace): string | null {
  const a = (p.formattedAddress || "").replace(/,\s*(España|Spain)\s*$/i, "").trim()
  return a || null
}

export function judgeGooglePlace(key: GoogleKey, p: GooglePlace): GoogleVerdict {
  if (!p.id) return { ok: false, reason: "sin_id" }
  const name = googleName(p)
  if (!name) return { ok: false, reason: "sin_nombre" }
  const lat = Number(p.location?.latitude)
  const lon = Number(p.location?.longitude)
  if (p.location?.latitude == null || p.location?.longitude == null || !isFinite(lat) || !isFinite(lon)) return { ok: false, reason: "sin_coordenadas" }
  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return { ok: false, reason: "cerrado" }
  if (!matchesCategory(key, p.primaryType, p.types)) return { ok: false, reason: "no_es_del_tipo" }
  const week = periodsToWeek(p.regularOpeningHours?.periods)
  if (!week) return { ok: false, reason: "sin_horario" }
  if (!isNightEssentialHours(week)) return { ok: false, reason: "no_es_de_noche" }
  return { ok: true, id: p.id, name, lat, lon, address: googleAddress(p), openHours: toNoctuaHours(week) }
}
