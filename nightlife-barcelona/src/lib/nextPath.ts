// Página a la que volver tras iniciar sesión o registrarse (?next=/plan). Solo rutas internas:
// nunca una URL externa, para que nadie pueda usar el enlace de login para redirigir a otra web.
export function safeNextPath(fallback = "/"): string {
  if (typeof window === "undefined") return fallback
  try {
    const next = new URLSearchParams(window.location.search).get("next") || ""
    return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback
  } catch {
    return fallback
  }
}
