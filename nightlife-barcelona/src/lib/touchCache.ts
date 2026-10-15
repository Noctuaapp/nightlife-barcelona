// Después de guardar algo en Supabase desde el admin o "mi club", avisa a Next para que las
// páginas públicas afectadas dejen de servir la versión en caché. Ver src/app/api/revalidate.
export async function touchCache(paths: string[]): Promise<void> {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    })
  } catch {
    // Si falla, la página se refrescará sola cuando caduque el caché normal: no bloquea el guardado.
  }
}

export const clubPaths = (slug?: string | null): string[] =>
  ["/", "/clubs", "/mapa", "/map", ...(slug ? [`/clubs/${slug}`] : [])]

export const eventPaths = (slug?: string | null): string[] =>
  ["/", "/events", "/mapa", "/map", ...(slug ? [`/event/${slug}`] : [])]

export const clubEventPaths = (id?: number | string | null): string[] =>
  ["/", "/mapa", "/map", ...(id !== null && id !== undefined ? [`/club-event/${id}`] : [])]

export const essentialPaths = (): string[] => ["/esenciales", "/mapa", "/map"]
