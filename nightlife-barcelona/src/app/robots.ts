import type { MetadataRoute } from "next"

const BASE_URL = "https://www.noctuaapp.com"

// Antes no existía robots.txt, así que Google usaba su comportamiento por defecto: rastrear todo,
// incluidas zonas que no deberían indexarse (el panel de admin, los paneles de gestión de
// club/festival de cada dueño, la cuenta de cada usuario). La ruta antigua /club/[name] (una
// versión previa de la ficha de club, ya rota porque su fuente de datos ni siquiera existe) se ha
// borrado directamente en vez de solo bloquearla aquí. Las noches de club (/club-event/) ya no se
// bloquean: tienen título y datos propios y son contenido que la gente busca.
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
        // Enlaces "Reportar" de cada ficha: /contact?type=report_issue&subject=... generaba cientos de
        // URLs duplicadas que Google rastreaba sin valor. Solo se bloquean las que llevan parámetros.
        "/contact?",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
