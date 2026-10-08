import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Rellena latitude/longitude de los locales que no la tienen, a partir de su dirección, con
// OpenStreetMap Nominatim (gratis; sin tocar la cuota de Google). Procesa 10 por visita (Nominatim
// pide como máximo 1 petición por segundo). Recarga hasta que "remaining" sea 0.
// https://TU_DOMINIO/api/admin/geocode-clubs?secret=TU_ADMIN_SECRET
// Un resultado solo se acepta si cae dentro del área metropolitana de Barcelona.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, address, city")
    .is("latitude", null)
    .not("address", "is", null)
    .limit(10)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: totalPending } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true })
    .is("latitude", null)
    .not("address", "is", null)

  const results: any[] = []
  for (const club of clubs || []) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(club.address)}`
      const res = await fetch(url, { headers: { "User-Agent": "NoctuaApp/1.0 (info@noctuaapp.com)" } })
      const json = await res.json()
      const hit = Array.isArray(json) ? json[0] : null
      const lat = hit ? Number(hit.lat) : NaN
      const lon = hit ? Number(hit.lon) : NaN
      const inArea = lat > 41.28 && lat < 41.55 && lon > 1.95 && lon < 2.35
      if (hit && inArea) {
        await supabase.from("clubs").update({ latitude: lat, longitude: lon }).eq("id", club.id)
        results.push({ club: club.name, lat, lon, status: "ok" })
      } else {
        results.push({ club: club.name, status: hit ? "fuera_de_zona" : "no_encontrado", address: club.address })
      }
    } catch (e: any) {
      results.push({ club: club.name, status: "error", message: e.message })
    }
    await new Promise((r) => setTimeout(r, 1100))
  }

  const ok = results.filter((r) => r.status === "ok").length
  return NextResponse.json({
    processed: results.length,
    ok,
    remaining: Math.max(0, (totalPending ?? 0) - ok),
    results,
  })
}
