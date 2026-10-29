import type { DbRow } from "./clubQueries"
import { supabase } from "./supabase"
import { fetchAllPages } from "./fetchAll"
import { getNightBusLine, splitNightBusCodes } from "./nightBuses"
import { buildAreaFacts, type AreaFacts, type NitbusStop } from "./areaFacts"

// Parte con base de datos de lib/areaFacts: carga las paradas de Nitbus y calcula los datos de una
// zona. Está aparte para que areaFacts.ts (los cálculos) se pueda probar sin conectarse a nada.

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : null
}

// Paradas de Nitbus (las mismas que usa la ficha de cada local), en memoria durante una hora.
let stopsCache: { at: number; stops: NitbusStop[] } | null = null
async function loadNitbusStops(): Promise<NitbusStop[]> {
  if (stopsCache && Date.now() - stopsCache.at < 3600_000) return stopsCache.stops
  try {
    const rows = await fetchAllPages((from, to) =>
      supabase.from("essentials").select("subcategory, latitude, longitude").eq("category", "Nitbus").eq("hidden", false).order("id").range(from, to)
    )
    const stops = (rows as Record<string, unknown>[])
      .map((e) => ({
        lat: num(e.latitude),
        lon: num(e.longitude),
        codes: e.subcategory ? splitNightBusCodes(String(e.subcategory)).map((c) => c.toUpperCase()).filter((c) => !!getNightBusLine(c)) : [],
      }))
      .filter((s): s is NitbusStop => s.lat !== null && s.lon !== null && s.codes.length > 0)
    stopsCache = { at: Date.now(), stops }
    return stops
  } catch {
    return []
  }
}

export async function computeAreaFacts(clubs: DbRow[]): Promise<AreaFacts | null> {
  if (clubs.length === 0) return null
  const stops = await loadNitbusStops()
  return buildAreaFacts(clubs, stops)
}
