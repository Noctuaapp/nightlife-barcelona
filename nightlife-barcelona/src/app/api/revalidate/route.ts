import { revalidatePath } from "next/cache"
import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

// El admin y "mi club" guardan directamente contra Supabase desde el navegador, así que Next no
// se entera del cambio: las páginas públicas (listados y fichas) son estáticas con un `revalidate`
// de minutos/horas y seguían sirviendo la versión vieja hasta que caducaba el caché. Este endpoint
// deja que, justo después de guardar, el propio admin le diga a Next qué páginas refrescar ya.
//
// Auditoría 2/11/2026: antes no llevaba autenticación («no hay nada sensible detrás»), pero un robot
// podía llamarlo en bucle y obligar a Vercel a regenerar páginas sin parar (más consumo y más
// carga en la base de datos). Ahora exige una sesión de Supabase válida (la del admin o la de un
// dueño, que son quienes lo usan: ver lib/touchCache.ts). Sin sesión, 401.
//
// Rutas que se pueden refrescar. Un test (lib/__tests__/seguridad.test.ts) cazó que la lista
// anterior con «/» como prefijo dejaba pasar CUALQUIER ruta (/admin, /api/...): la raíz es solo
// «/», no un prefijo.
const EXACT_PATHS = new Set(["/", "/clubs", "/events", "/esenciales", "/mapa", "/map"])
// «/en/clubs/», «/de/clubs/», «/fr/clubs/», «/it/clubs/»: fichas del mismo local en los idiomas internacionales (lib/intl, 10/11/2026).
const PATH_PREFIXES = ["/clubs/", "/en/clubs/", "/de/clubs/", "/fr/clubs/", "/it/clubs/", "/event/", "/club-event/", "/barrio/", "/musica/"]

function isAllowedPath(p: unknown): p is string {
  if (typeof p !== "string" || p.length >= 1024 || p.includes("..")) return false
  return EXACT_PATHS.has(p) || PATH_PREFIXES.some((prefix) => p.startsWith(prefix))
}

// Como mucho 20 rutas por llamada (el admin nunca manda más): evita que alguien la use para
// forzar regeneraciones masivas.
const MAX_PATHS = 20

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get("authorization") || ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!token) return false
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getUser(token)
    return !error && !!data.user
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!(await hasValidSession(request))) {
    return Response.json({ revalidated: false, message: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ revalidated: false, message: "JSON inválido" }, { status: 400 })
  }

  const paths = Array.isArray((body as { paths?: unknown })?.paths) ? (body as { paths: unknown[] }).paths : []
  const valid = paths.filter(isAllowedPath)

  for (const path of valid.slice(0, MAX_PATHS)) revalidatePath(path)

  return Response.json({ revalidated: true, paths: valid })
}
