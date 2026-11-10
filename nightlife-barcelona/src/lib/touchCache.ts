// Después de guardar algo en Supabase desde el admin o "mi club", avisa a Next para que las
// páginas públicas afectadas dejen de servir la versión en caché. Ver src/app/api/revalidate.
// Desde la auditoría del 2/11/2026 el endpoint exige sesión: se manda el token de quien guarda
// (admin o dueño). Sin sesión no hay nada que refrescar, así que ni se llama.
import { supabase } from "./supabase"

export async function touchCache(paths: string[]): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) return
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paths }),
    })
  } catch {
    // Si falla, la página se refrescará sola cuando caduque el caché normal: no bloquea el guardado.
  }
}

// La ficha en inglés (/en/clubs/...) se refresca a la vez que la española.
export const clubPaths = (slug?: string | null): string[] =>
  ["/", "/clubs", "/mapa", "/map", ...(slug ? [`/clubs/${slug}`, `/en/clubs/${slug}`] : [])]

export const eventPaths = (slug?: string | null): string[] =>
  ["/", "/events", "/mapa", "/map", ...(slug ? [`/event/${slug}`] : [])]

export const clubEventPaths = (id?: number | string | null): string[] =>
  ["/", "/mapa", "/map", ...(id !== null && id !== undefined ? [`/club-event/${id}`] : [])]

export const essentialPaths = (): string[] => ["/esenciales", "/mapa", "/map"]
