import type { MetadataRoute } from "next"

const BASE_URL = "https://noctuaapp.com"

// Antes no existía robots.txt, así que Google usaba su comportamiento por defecto: rastrear todo,
// incluidas zonas que no deberían indexarse (el panel de admin, los paneles de gestión de
// club/festival de cada dueño, la cuenta de cada usuario) y la ruta antigua /club/[name] — una
// versión previa de la ficha de club, con datos estáticos desactualizados, que ahora vive
// duplicada junto a /clubs/[slug] y solo generaría contenido duplicado en el buscador.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/api/",
        "/mi-club",
        "/mi-festival",
        "/mi-evento",
        "/profile",
        "/confirm-age",
        "/blocked",
        "/club/",
        "/club-event/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
