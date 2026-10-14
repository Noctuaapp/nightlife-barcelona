import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAuthorizedCronRequest } from "@/lib/cronAuth"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// Borra las filas de analítica de más de 13 meses (minimización de datos: no hace falta guardar
// el detalle de cada visita indefinidamente). La función purge_old_analytics() está en el SQL de
// la tanda de seguridad y solo la puede ejecutar el service role.
export async function GET(req: Request) {
  if (!(await isAuthorizedCronRequest(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase.rpc("purge_old_analytics", { p_months: 13 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: data ?? 0 })
}
