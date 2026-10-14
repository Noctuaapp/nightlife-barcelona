import { timingSafeEqual } from "crypto"
import { createClient } from "@supabase/supabase-js"

// Autorización de los endpoints /api/admin/* y /api/cron/*.
//
// Antes la clave iba en la propia URL (?secret=...): quedaba guardada en el historial del
// navegador, en los registros de Vercel y en cualquier captura o enlace compartido. Ahora la URL
// nunca lleva claves. Se acepta, por este orden:
//   1) La llamada programada de Vercel: cabecera "Authorization: Bearer CRON_SECRET".
//   2) Tú desde el panel de admin (/admin/herramientas): se envía tu sesión de Supabase y se
//      comprueba en el servidor que la cuenta es la de administración.
//   3) Una herramienta externa (curl, Postman): cabecera "x-admin-secret: ADMIN_SECRET".

export const ADMIN_EMAIL = "info@noctuaapp.com"

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

function bearer(req: Request): string {
  const auth = req.headers.get("authorization") || ""
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
}

export async function isAdminRequest(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET
  const headerSecret = req.headers.get("x-admin-secret")
  if (secret && headerSecret && safeEqual(headerSecret, secret)) return true

  const token = bearer(req)
  if (!token) return false
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase.auth.getUser(token)
    return !error && data.user?.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

export async function isAuthorizedCronRequest(req: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const token = bearer(req)
  if (cronSecret && token && safeEqual(token, cronSecret)) return true
  return isAdminRequest(req)
}
