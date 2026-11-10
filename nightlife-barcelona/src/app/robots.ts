import type { MetadataRoute } from "next"

const BASE_URL = "https://www.noctuaapp.com"

// Parámetros que solo cambian lo que se ve dentro de una página que ya existe (no crean contenido nuevo):
// id (esencial o club marcado en el mapa), stop/line (parada o línea), lat/lon (cerca de ti), open (abierto
// ahora), search (búsqueda), tab (pestaña), type (tipo en el mapa), ref (invitación), next/recovery (tras iniciar sesión).
export const STATE_PARAMS = ["id", "stop", "line", "lat", "lon", "open", "search", "tab", "type", "ref", "next", "recovery"]

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
        "/recuperar",
        // Enlaces "Reportar" de cada ficha: /contact?type=report_issue&subject=... generaba cientos de
        // URLs duplicadas que Google rastreaba sin valor. Solo se bloquean las que llevan parámetros.
        "/contact?",
        // 11/11/2026: URLs de «estado» (una parada concreta, un esencial concreto, «abierto ahora», tu
        // ubicación…). Son la misma página de siempre con algo marcado, no contenido nuevo, y llevan canonical
        // a la página base, pero Google las rastreaba una a una (en Search Console salen como «Alternativa con
        // página canónica adecuada»). Así deja de gastar rastreo en ellas; las páginas base siguen abiertas.
        ...STATE_PARAMS.flatMap((p) => [`/*?${p}=`, `/*&${p}=`]),
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
