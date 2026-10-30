import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAuthorizedCronRequest } from "@/lib/cronAuth"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// Borra los mensajes del formulario de Contacto de más de 12 meses: es el plazo que promete la
// política de Privacidad. La función purge_old_contact_messages() está en supabase/58_borrado_mensajes_contacto.sql
// y solo la puede ejecutar el service role. Se llama cada lunes (ver vercel.json).
export async function GET(req: Request) {
  if (!(await isAuthorizedCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.rpc("purge_old_contact_messages", { p_months: 12 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: data ?? 0 })
}
