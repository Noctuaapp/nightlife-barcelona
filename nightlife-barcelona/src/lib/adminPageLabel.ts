// Nombre legible de cada ruta de la web para los paneles del admin (Visitas, Datos...). Sacado de
// admin/visitas el 10/11/2026 para usarlo también en Datos › Clics y tiempo.
export function unslug(s: string) {
  // Las rutas llegan del navegador de cualquier visitante: una mal escrita (%E0%A4) no debe romper el panel.
  let raw = s
  try {
    raw = decodeURIComponent(s)
  } catch {
    /* se deja tal cual */
  }
  const t = raw.replace(/-/g, " ")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// Nombre legible de cada ruta.
export function pageLabel(path: string | null, names: Map<string, string>): string {
  if (!path) return "—"
  if (names.has(path)) return names.get(path)!
  const p = path.replace(/\/+$/, "") || "/"
  const fixed: Record<string, string> = {
    "/": "Portada", "/clubs": "Lista de clubs", "/events": "Eventos", "/map": "Mapa", "/plan": "Planifica tu noche",
    "/essentials": "Esenciales", "/favorites": "Favoritos", "/profile": "Perfil", "/login": "Iniciar sesión",
    "/signup": "Registro", "/contact": "Contacto", "/faq": "Preguntas frecuentes", "/club-noctua": "Club Noctua",
    "/opinion": "Opinión de la web", "/privacy": "Privacidad", "/terms": "Términos", "/invitar": "Invitar amigos",
    "/recuperar": "Recuperar contraseña", "/confirm-age": "Confirmar edad", "/nitbus": "NitBus", "/metro": "Metro",
    "/mi-mes": "Mi mes", "/derechos": "Derechos del consumidor", "/para-locales": "Para locales", "/zona": "Zonas",
  }
  if (fixed[p]) return fixed[p]
  const m = p.match(/^\/(clubs|event|club-event|barrio|musica|essentials|plan|nitbus|metro|zona)\/(.+)$/)
  if (m) {
    const kind = { clubs: "Club", event: "Evento", "club-event": "Noche de club", barrio: "Barrio", musica: "Música", essentials: "Esenciales", plan: "Plan compartido", nitbus: "NitBus", metro: "Metro", zona: "Zona" }[m[1]]
    // El código de un plan compartido es la «llave» de su enlace (solo entra quien lo tiene): no se enseña, ni
    // como número raro (13/11/2026: salía «Plan compartido 37c2325c»). Una noche de club sí lleva su número.
    if (m[1] === "plan") return kind!
    return m[1] === "club-event" ? `${kind} ${m[2]}` : `${kind}: ${unslug(m[2])}`
  }
  return p
}
