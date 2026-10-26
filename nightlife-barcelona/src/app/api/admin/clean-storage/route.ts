import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// «Liberar espacio» (26/10/2026): borra las fotos de las carpetas automáticas que ya no usa
// ninguna ficha. GET = solo cuenta (vista previa); POST = borra (como mucho 1.000 por carpeta y
// pulsación: si hay más, se vuelve a pulsar). La lista la calcula admin_storage_orphans()
// (supabase/47_fotos_sin_usar.sql) y el borrado va por la API de Storage, que es la que libera
// de verdad el espacio.
const BUCKETS = ["club-photos", "event-photos", "essential-photos"] as const

type Orphans = { bucket: string; count: number; mb: number; names: string[] }

async function scan(supabase: ReturnType<typeof client>, limit: number) {
  const out: Orphans[] = []
  for (const b of BUCKETS) {
    const { data, error } = await supabase.rpc("admin_storage_orphans", { p_bucket: b, p_limit: limit })
    if (error) throw new Error(error.message)
    out.push(data as Orphans)
  }
  return out
}

function client() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const result = await scan(client(), 1)
    return NextResponse.json({ buckets: result.map(({ bucket, count, mb }) => ({ bucket, count, mb })) })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = client()
  try {
    const found = await scan(supabase, 1000)
    let deleted = 0
    let freedMb = 0
    for (const b of found) {
      if (!b.names.length) continue
      for (let i = 0; i < b.names.length; i += 100) {
        const chunk = b.names.slice(i, i + 100)
        const { data, error } = await supabase.storage.from(b.bucket).remove(chunk)
        if (error) return NextResponse.json({ error: error.message, deleted }, { status: 500 })
        deleted += data?.length || 0
      }
      freedMb += b.names.length >= b.count ? Number(b.mb) : 0
    }
    const remaining = found.reduce((a, b) => a + Math.max(0, b.count - b.names.length), 0)
    return NextResponse.json({ deleted, freedMb: Math.round(freedMb), remaining })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
