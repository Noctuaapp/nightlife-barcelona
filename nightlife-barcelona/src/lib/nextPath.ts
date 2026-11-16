import { rememberedHome } from "./cityMemory"

// Página a la que volver tras iniciar sesión o registrarse (?next=/plan). Solo rutas internas:
// nunca una URL externa, para que nadie pueda usar el enlace de login para redirigir a otra web.
//
// Sin ?next= (el botón «Iniciar sesión» de la cabecera no lo lleva) se vuelve a la portada de la ciudad en la que se estaba
// (16/11/2026): quien venía de Madrid vuelve a /madrid, no a «/» (Barcelona). Ver lib/cityMemory.ts. Con `fallback` explícito se usa ese.
export function safeNextPath(fallback?: string): string {
  if (typeof window === "undefined") return fallback ?? "/"
  const back = fallback ?? rememberedHome()
  try {
    const next = new URLSearchParams(window.location.search).get("next") || ""
    return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : back
  } catch {
    return back
  }
}
