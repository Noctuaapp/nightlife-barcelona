import { fetchVisibleClubs, HOME_CLUB_FIELDS } from "../lib/clubQueries"
import { supabase } from "../lib/supabase"
import HomeClient from "../components/home/HomeClient"
import { getActivePicks } from "../lib/picks"
import { EVENTS_HIDDEN } from "../lib/featureFlags"

// Antes esta página empezaba con "use client" y pedía los clubs a Supabase dentro de un
// useEffect, es decir, después de que el navegador descargase y ejecutase el JS. El HTML inicial
// que recibían tanto el usuario como Google llegaba prácticamente vacío (solo el esqueleto),
// y el contenido real tardaba un viaje de red completo en aparecer. Al convertir esta página en
// un Server Component async, los clubs se piden en el servidor antes de enviar la respuesta: el
// HTML que llega de entrada ya trae los datos reales. La parte interactiva (pestañas, buscador,
// animaciones) sigue viviendo en HomeClient, que recibe esos datos ya listos como prop.
export const revalidate = 3600

// Solo para la cinta de cifras ("180+ clubs" etc.): un recuento exacto (head: true, no descarga
// filas) de esenciales visibles. Los clubs ya los tenemos de fetchVisibleClubs, así que no hace
// falta pedirlos otra vez.
async function countEssentials(): Promise<number> {
  const { count } = await supabase.from("essentials").select("id", { count: "exact", head: true }).eq("hidden", false)
  return count || 0
}

// Eventos que aún no han terminado (27/10/2026). Antes la portada decía "+90 eventos activos" y
// contaba todos los eventos no ocultos, también los que ya habían pasado (la lista de /events los
// enseña atenuados), así que prometía mucho más de lo que se podía ver. Ahora solo cuenta los que
// tienen fecha de hoy o posterior (el último día, si dura varios, como en la lista de eventos).
async function countUpcomingEvents(): Promise<number> {
  if (EVENTS_HIDDEN) return 0 // Eventos oculto (lib/featureFlags.ts): la portada no presume de ellos.
  const { data } = await supabase.from("events").select("date, date_end").eq("hidden", false)
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()) // AAAA-MM-DD
  return (data || []).filter((e) => {
    const last = String(e.date_end || e.date || "").slice(0, 10)
    return last !== "" && last >= today
  }).length
}

export default async function Home() {
  const [clubs, eventsCount, essentialsCount, picks] = await Promise.all([
    fetchVisibleClubs(HOME_CLUB_FIELDS),
    countUpcomingEvents(),
    countEssentials(),
    getActivePicks(),
  ])

  return <HomeClient initialClubs={clubs} eventsCount={eventsCount} essentialsCount={essentialsCount} picks={picks} />
}
