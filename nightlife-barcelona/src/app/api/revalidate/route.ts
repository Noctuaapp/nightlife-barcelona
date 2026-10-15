import { revalidatePath } from "next/cache"
import { NextRequest } from "next/server"

// El admin y "mi club" guardan directamente contra Supabase desde el navegador, así que Next no
// se entera del cambio: las páginas públicas (listados y fichas) son estáticas con un `revalidate`
// de minutos/horas y seguían sirviendo la versión vieja hasta que caducaba el caché. Este endpoint
// deja que, justo después de guardar, el propio admin le diga a Next qué páginas refrescar ya.
//
// No hay nada sensible detrás de esto (solo marca páginas para volver a generarse en la próxima
// visita), así que no lleva autenticación: como mucho, alguien podría forzar que una página se
// regenere un poco más a menudo.
const ALLOWED_PREFIXES = ["/", "/clubs", "/events", "/event/", "/club-event/", "/esenciales", "/barrio/", "/musica/", "/mapa", "/map"]

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ revalidated: false, message: "JSON inválido" }, { status: 400 })
  }

  const paths = Array.isArray((body as { paths?: unknown })?.paths) ? (body as { paths: unknown[] }).paths : []
  const valid = paths.filter(
    (p): p is string => typeof p === "string" && p.length < 1024 && ALLOWED_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))
  )

  for (const path of valid) revalidatePath(path)

  return Response.json({ revalidated: true, paths: valid })
}
