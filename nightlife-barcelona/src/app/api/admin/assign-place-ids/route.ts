import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Visita esta URL repetidamente (recarga la página) hasta que "remaining" salga en 0.
// Procesa de 15 en 15 para no superar el límite de tiempo de Vercel.
// https://TU_DOMINIO/api/admin/assign-place-ids?secret=TU_ADMIN_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!
  const BATCH_SIZE = 15

  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, address, neighborhood")
    .is("google_place_id", null)
    .limit(BATCH_SIZE)

  const { count: remaining } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true })
    .is("google_place_id", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: any[] = []

  for (const club of clubs || []) {
    const query = `${club.name} ${club.address || club.neighborhood || ""} Barcelona`.trim()
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
        },
        body: JSON.stringify({ textQuery: query }),
      })
      const json = await res.json()
      const placeId = json?.places?.[0]?.id

      if (placeId) {
        await supabase.from("clubs").update({ google_place_id: placeId }).eq("id", club.id)
        results.push({ club: club.name, placeId, status: "ok" })
      } else {
        results.push({ club: club.name, status: "not_found", raw: json })
      }
    } catch (e: any) {
      results.push({ club: club.name, status: "error", message: e.message })
    }
  }

  return NextResponse.json({
    processed: results.length,
    remaining: (remaining ?? 0) - results.length < 0 ? 0 : (remaining ?? 0) - results.length,
    results,
  })
}
