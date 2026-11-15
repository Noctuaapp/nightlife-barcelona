import { supabase } from "./supabase"
import { fetchAllPages } from "./fetchAll"
import { clubCityIndex, eventsOfCity } from "./adminCity"
import type { CityKey } from "./cities"

// Eventos por ciudad (15/11/2026).
//
// La tabla `events` no tiene columna de ciudad. La ciudad de un evento sale de sus coordenadas y, si no las tiene, del local
// donde es (por el nombre del local): ver cityOfEvent en lib/adminCity.ts. Lo que no encaja en nada es de Barcelona, como
// en toda la web. Así /events (Barcelona) y /madrid/events enseñan cada una solo sus eventos.

type PlaceRow = { name?: string | null; city?: string | null; latitude?: number | string | null; longitude?: number | string | null }
type EventRow = { club_name?: string | null; city?: string | null; latitude?: number | string | null; longitude?: number | string | null }

/** De una lista de eventos, los de una ciudad. `clubs` solo hace falta para ubicar los eventos que no traen coordenadas. */
export function eventsForCity<T extends EventRow>(events: T[], clubs: PlaceRow[], city: CityKey): T[] {
  return eventsOfCity(events, city, clubCityIndex(clubs))
}

/**
 * Los eventos publicados de una ciudad, por fecha. Pide también los locales (solo nombre, ciudad y coordenadas, ocultos
 * incluidos: el evento de un local de Madrid sigue siendo de Madrid aunque el local aún no se vea).
 */
export async function fetchCityEvents(city: CityKey): Promise<any[]> {
  const [eventsRes, clubs] = await Promise.all([
    supabase.from("events").select("*").eq("hidden", false).order("date", { ascending: true }),
    fetchAllPages<PlaceRow>((from, to) => supabase.from("clubs").select("name, city, latitude, longitude").order("id").range(from, to) as any),
  ])
  return eventsForCity((eventsRes.data || []) as any[], clubs, city)
}
