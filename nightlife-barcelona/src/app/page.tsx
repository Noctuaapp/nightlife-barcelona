import { fetchVisibleClubs, HOME_CLUB_FIELDS } from "../lib/clubQueries"
import { supabase } from "../lib/supabase"
import HomeClient from "../components/home/HomeClient"

// Antes esta página empezaba con "use client" y pedía los clubs a Supabase dentro de un
// useEffect, es decir, después de que el navegador descargase y ejecutase el JS. El HTML inicial
// que recibían tanto el usuario como Google llegaba prácticamente vacío (solo el esqueleto),
// y el contenido real tardaba un viaje de red completo en aparecer. Al convertir esta página en
// un Server Component async, los clubs se piden en el servidor antes de enviar la respuesta: el
// HTML que llega de entrada ya trae los datos reales. La parte interactiva (pestañas, buscador,
// animaciones) sigue viviendo en HomeClient, que recibe esos datos ya listos como prop.
export const revalidate = 3600

// Solo para la cinta de cifras ("180+ clubs" etc.): un recuento exacto (head: true, no descarga
// filas) de eventos y esenciales visibles. Los clubs ya los tenemos de fetchVisibleClubs, así que
// no hace falta pedirlos otra vez.
async function countVisible(table: "events" | "essentials"): Promise<number> {
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("hidden", false)
  return count || 0
}

export default async function Home() {
  const [clubs, eventsCount, essentialsCount] = await Promise.all([
    fetchVisibleClubs(HOME_CLUB_FIELDS),
    countVisible("events"),
    countVisible("essentials"),
  ])

  return <HomeClient initialClubs={clubs} eventsCount={eventsCount} essentialsCount={essentialsCount} />
}
