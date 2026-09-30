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

export default async function Home() {
  const { data: clubs } = await supabase.from("clubs").select("*").eq("hidden", false)

  return <HomeClient initialClubs={clubs || []} />
}
