// Clubs que quedan cerca de un parking (2/11/2026). Se calcula en el navegador con las coordenadas de
// los clubs publicados: no hay ningún dato nuevo que mantener ni que pueda quedarse viejo.
//
// «Cerca» = hasta 1.200 m en línea recta (unos 15 min andando, que es lo que alguien está dispuesto a
// caminar desde el coche). Se enseñan como mucho los 3 más cercanos, con los minutos a pie.

import { distanceInMeters, walkingMinutes } from "./geo"

export const NEAR_CLUB_METERS = 1200
export const NEAR_CLUB_MAX = 3

export type ClubPoint = {
  id: number | string
  name: string
  slug?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

export type NearClub = { id: number | string; name: string; slug: string | null; meters: number; minutes: number }

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function clubsNear(
  lat: number | string | null | undefined,
  lon: number | string | null | undefined,
  clubs: ClubPoint[],
  radius: number = NEAR_CLUB_METERS,
  max: number = NEAR_CLUB_MAX
): NearClub[] {
  const la = num(lat)
  const lo = num(lon)
  if (la === null || lo === null) return []
  const out: NearClub[] = []
  for (const c of clubs) {
    const cla = num(c.latitude)
    const clo = num(c.longitude)
    if (cla === null || clo === null) continue
    const meters = distanceInMeters(la, lo, cla, clo)
    if (meters <= radius) out.push({ id: c.id, name: c.name, slug: c.slug ?? null, meters, minutes: walkingMinutes(meters) })
  }
  return out.sort((a, b) => a.meters - b.meters).slice(0, max)
}

// Cuántos clubs hay a distancia de paseo (para ordenar los parkings: primero los que tienen clubs cerca).
export function clubsNearCount(lat: number | string | null | undefined, lon: number | string | null | undefined, clubs: ClubPoint[], radius: number = NEAR_CLUB_METERS): number {
  return clubsNear(lat, lon, clubs, radius, Number.MAX_SAFE_INTEGER).length
}
