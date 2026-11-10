import type { Metadata } from "next"
import { isClubNoctuaOn } from "../../lib/clubNoctuaServer"

// 11/11/2026: antes esta página no tenía metadatos propios y entraba en el sitemap aunque Club Noctua esté
// en pausa (entonces solo enseña «Vuelve pronto»). Google la veía como página vacía. Ahora lleva noindex
// mientras esté en pausa y se indexa sola cuando se active desde /admin/herramientas (se comprueba cada 6 h).
export const revalidate = 21600

export async function generateMetadata(): Promise<Metadata> {
  const on = await isClubNoctuaOn()
  return {
    title: "Club Noctua: niveles, retos e insignias | Noctua",
    description: "Gana XP saliendo de noche por Barcelona: check-ins, retos e insignias de barrio, y sube de nivel en Club Noctua.",
    alternates: { canonical: "https://www.noctuaapp.com/club-noctua" },
    ...(on ? {} : { robots: { index: false, follow: true } }),
  }
}

export default function ClubNoctuaLayout({ children }: { children: React.ReactNode }) {
  return children
}
