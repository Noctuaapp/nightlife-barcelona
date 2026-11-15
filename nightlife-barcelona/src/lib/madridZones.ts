import { distanceInMeters } from "./geo"
import { MADRID_METRO_STATIONS } from "./madridMetro"

// Barrios «de toda la vida» de Madrid para los locales (14/11/2026).
//
// Los barrios oficiales (Universidad, Justicia, Embajadores…) casi nadie los usa para salir de noche: la gente dice Malasaña, Chueca o La
// Latina. Aquí hay 12 zonas populares, cada una anclada en una o varias estaciones de metro (coordenadas oficiales del CRTM, ver
// madridMetro.ts) con un radio. Son límites aproximados, NO oficiales, y el barrio de cada ficha se puede corregir a mano en el admin.
//
// Un local cae en la zona cuya ancla le queda más cerca EN PROPORCIÓN a su radio (distancia / radio, la más baja que sea ≤ 1): así, si dos
// zonas se solapan, gana la que lo tiene más «dentro». Fuera de las 12 zonas devuelve null y el llamador usa el barrio de OpenStreetMap
// o, si no hay, «Madrid».

export type MadridZone = {
  /** Nombre que se guarda en clubs.neighborhood. */
  name: string
  /** Estaciones de metro (nombre exacto de MADRID_METRO_STATIONS) que anclan la zona. */
  anchors: string[]
  /** Radio en metros alrededor de cada ancla. */
  radiusM: number
}

export const MADRID_ZONES: MadridZone[] = [
  { name: "Malasaña", anchors: ["Tribunal", "Noviciado", "San Bernardo"], radiusM: 450 },
  { name: "Chueca", anchors: ["Chueca"], radiusM: 400 },
  { name: "Gran Vía", anchors: ["Gran Vía", "Callao"], radiusM: 350 },
  { name: "Sol", anchors: ["Sol"], radiusM: 350 },
  { name: "Ópera", anchors: ["Ópera", "Santo Domingo"], radiusM: 400 },
  { name: "La Latina", anchors: ["La Latina", "Puerta de Toledo"], radiusM: 450 },
  { name: "Lavapiés", anchors: ["Lavapiés", "Embajadores", "Tirso de Molina"], radiusM: 400 },
  { name: "Huertas", anchors: ["Antón Martín"], radiusM: 350 },
  { name: "Alonso Martínez", anchors: ["Alonso Martínez"], radiusM: 350 },
  { name: "Salamanca", anchors: ["Serrano", "Velázquez", "Núñez de Balboa", "Goya"], radiusM: 600 },
  { name: "Chamberí", anchors: ["Iglesia", "Quevedo", "Alonso Cano"], radiusM: 500 },
  { name: "Argüelles", anchors: ["Argüelles", "Moncloa"], radiusM: 450 },
]

export const MADRID_ZONE_NAMES: string[] = MADRID_ZONES.map((z) => z.name)

type ResolvedAnchor = { zone: string; lat: number; lon: number; radiusM: number }

const ANCHORS: ResolvedAnchor[] = MADRID_ZONES.flatMap((z) =>
  z.anchors.map((stationName) => {
    const st = MADRID_METRO_STATIONS.find((s) => s.name === stationName)
    if (!st) throw new Error(`madridZones: la estación «${stationName}» no está en madridMetro.ts`)
    return { zone: z.name, lat: st.lat, lon: st.lon, radiusM: z.radiusM }
  })
)

/** Zona popular de Madrid donde cae un punto, o null si queda fuera de las 12 zonas. */
export function madridZoneOf(lat: number | string | null | undefined, lon: number | string | null | undefined): string | null {
  if (lat === null || lat === undefined || lat === "" || lon === null || lon === undefined || lon === "") return null
  const la = Number(lat)
  const lo = Number(lon)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null
  let best: string | null = null
  let bestRatio = Infinity
  for (const a of ANCHORS) {
    const ratio = distanceInMeters(la, lo, a.lat, a.lon) / a.radiusM
    if (ratio <= 1 && ratio < bestRatio) {
      bestRatio = ratio
      best = a.zone
    }
  }
  return best
}

/**
 * Barrio que se guarda en un local de Madrid: la zona popular si cae en una; si no, el barrio que ya traía (el de OpenStreetMap, p. ej.)
 * y, si no hay ninguno, «Madrid».
 */
export function madridNeighborhoodFor(lat: number | string | null | undefined, lon: number | string | null | undefined, current?: string | null): string {
  return madridZoneOf(lat, lon) || (current && current.trim()) || "Madrid"
}
