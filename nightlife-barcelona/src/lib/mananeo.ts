// Mañaneo / resaca (05/11/2026): sitios de afterhour para seguir cuando sale el sol. Se rellenan en Admin ›
// Mañaneo (tabla mananeo_places, supabase/80_mananeo.sql) y se ven dentro de Eventos. Mientras MANANEO_HIDDEN
// (lib/featureFlags.ts) sea true, solo los ve el admin.
import { clubHoursStatus, clubOpenNow } from "./clubHours"
import { MANANEO_HIDDEN } from "./featureFlags"

export type MananeoPlace = {
  id: number
  name: string
  description: string | null
  neighborhood: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  hours: string | null
  music: string | null
  price: string | null
  image: string | null
  instagram: string | null
  website: string | null
  hidden: boolean
}

// ¿Se enseña el apartado a esta persona? El admin siempre; los demás, solo cuando se abra el interruptor.
export function mananeoVisible(isAdmin: boolean, hiddenFlag: boolean = MANANEO_HIDDEN): boolean {
  return isAdmin || !hiddenFlag
}

// Enlace a Google Maps para llegar: con coordenadas si las hay; si no, con la dirección (y el nombre).
// null = no hay dónde ir.
export function mananeoDirectionsUrl(p: Pick<MananeoPlace, "name" | "latitude" | "longitude" | "address" | "neighborhood">): string | null {
  const lat = Number(p.latitude)
  const lng = Number(p.longitude)
  if (p.latitude !== null && p.longitude !== null && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  }
  const where = [p.name, p.address || p.neighborhood, "Barcelona"].filter(Boolean).join(", ")
  return p.address || p.neighborhood ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}` : null
}

// Estado del horario ahora mismo: «open» con la hora de cierre, «closed» con la hora de apertura de hoy,
// o null si no hay horario o no se entiende (mejor no decir nada que decir una hora falsa).
export type MananeoHours = { state: "open" | "closed"; at: string | null }

export function mananeoHoursState(hours: string | null | undefined): MananeoHours | null {
  if (!hours || !hours.trim()) return null
  const open = clubOpenNow(hours, null)
  if (open === null) return null
  const st = clubHoursStatus(hours, null)
  if (open) return { state: "open", at: st && st.open ? st.at : null }
  return { state: "closed", at: st && !st.open ? st.at : null }
}
