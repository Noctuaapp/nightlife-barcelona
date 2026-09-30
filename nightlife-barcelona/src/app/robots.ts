import type { MetadataRoute } from "next"

const BASE_URL = "https://noctuaapp.com"

// Antes no existía robots.txt, así que Google usaba su comportamiento por defecto: rastrear todo,
// incluidas zonas que no deberían indexarse (el panel de admin, los paneles de gestión de
// club/festival de cada dueño, la cuenta de cada usuario). La ruta antigua /club/[name] (una
// versión previa de la ficha de club, ya rota porque su fuente de datos ni siquiera existe) se ha
// borrado directamente en vez de solo bloquearla aquí — ver la entrada de /club-event/, que sigue
// existiendo y sí necesita quedar fuera del rastreo.
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
        "/club-event/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
