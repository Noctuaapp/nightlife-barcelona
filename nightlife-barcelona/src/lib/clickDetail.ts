// Desglose de los clics en Admin › Datos › Clics y tiempo (11/11/2026): qué taxi o VTC eligen, desde dónde lo piden,
// a qué webs van y cómo comparten. Los datos salen de admin_interaction_stats (supabase/87_clics_detalle.sql); aquí
// solo se les pone nombre y se ordenan.

export type CountRow = { label: string; n: number }

export type RideCount = { provider: string; n: number; people?: number }
export type RideOriginCount = { origin: string; n: number }
export type DestinationCount = { kind: string; host: string | null; n: number }
export type ShareChannelCount = { channel: string; n: number }

const NO_DATA = "Sin registrar"

export const RIDE_LABEL: Record<string, string> = {
  uber: "Uber",
  cabify: "Cabify",
  freenow: "FREE NOW",
  taxi_phone: "Llamada a un taxi (teléfono)",
  unknown: NO_DATA,
}
export const RIDE_ORIGIN_LABEL: Record<string, string> = {
  club_page: "Ficha de un club",
  event_page: "Ficha de un evento",
  taxi_page: "Página de taxi",
  unknown: NO_DATA,
}
export const SHARE_CHANNEL_LABEL: Record<string, string> = {
  native: "Menú de compartir del móvil",
  copy: "Enlace copiado",
  none: "Sin menú ni portapapeles",
  unknown: NO_DATA,
}

function toRows<T>(rows: T[] | null | undefined, name: (r: T) => string, count: (r: T) => number): CountRow[] {
  return (rows || [])
    .map((r) => ({ label: name(r), n: Number(count(r)) || 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "es"))
}

/** Un mismo nombre puede salir de varias claves (p. ej. dos dominios iguales sin «www»): se suman. */
function merged(rows: CountRow[]): CountRow[] {
  const m = new Map<string, number>()
  for (const r of rows) m.set(r.label, (m.get(r.label) || 0) + r.n)
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "es"))
}

/** Qué taxi o VTC se pulsa, con las llamadas al taxi incluidas. Una clave que no se conoce sale tal cual. */
export function rideRows(rides: RideCount[] | null | undefined): CountRow[] {
  return merged(toRows(rides, (r) => RIDE_LABEL[r.provider] ?? r.provider, (r) => r.n))
}

export function rideOriginRows(origins: RideOriginCount[] | null | undefined): CountRow[] {
  return merged(toRows(origins, (r) => RIDE_ORIGIN_LABEL[r.origin] ?? r.origin, (r) => r.n))
}

/** A qué webs van los clics de un tipo (tickets_click, website_click). Sin dominio guardado: «Sin registrar». */
export function destinationRows(dests: DestinationCount[] | null | undefined, kind: string): CountRow[] {
  return merged(toRows((dests || []).filter((d) => d.kind === kind), (d) => d.host || NO_DATA, (d) => d.n))
}

export function shareChannelRows(channels: ShareChannelCount[] | null | undefined): CountRow[] {
  return merged(toRows(channels, (r) => SHARE_CHANNEL_LABEL[r.channel] ?? r.channel, (r) => r.n))
}
