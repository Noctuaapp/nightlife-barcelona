import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Se ejecuta sola cada mes via Vercel Cron (ver vercel.json).
// Para probarla a mano: https://TU_DOMINIO/api/cron/refresh-google-data?secret=TU_ADMIN_SECRET
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const authHeader = req.headers.get("authorization")
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isManual = searchParams.get("secret") === process.env.ADMIN_SECRET
  if (!isVercelCron && !isManual) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!

  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, google_place_id")
    .not("google_place_id", "is", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: any[] = []

  for (const club of clubs || []) {
    try {
      const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${club.google_place_id}`, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "rating,userRatingCount,reviews,photos",
        },
      })
      const data = await detailsRes.json()

      // Descargamos las fotos y las guardamos en tu propio Storage (NUNCA guardar la URL
      // directa de Google: si no, cada visita a la web sería una llamada de pago a Google).
      const photoUrls: string[] = []
      for (const p of (data.photos || []).slice(0, 6)) {
        try {
          const photoRes = await fetch(
            `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1000&key=${apiKey}`
          )
          const buffer = await photoRes.arrayBuffer()
          const fileName = `${club.id}/${p.name.split("/").pop()}.jpg`
          await supabase.storage
            .from("club-photos")
            .upload(fileName, Buffer.from(buffer), { contentType: "image/jpeg", upsert: true })
          const { data: pub } = supabase.storage.from("club-photos").getPublicUrl(fileName)
          photoUrls.push(pub.publicUrl)
        } catch {}
      }

      await supabase
        .from("clubs")
        .update({
          google_rating: data.rating ?? null,
          google_review_count: data.userRatingCount ?? null,
          ...(photoUrls.length > 0 ? { gallery: photoUrls } : {}),
        })
        .eq("id", club.id)

      if (Array.isArray(data.reviews)) {
        await supabase.from("club_reviews").delete().eq("club_id", club.id)
        const rows = data.reviews.slice(0, 5).map((r: any) => ({
          club_id: club.id,
          author_name: r.authorAttribution?.displayName || "Anónimo",
          rating: r.rating || null,
          text: r.text?.text || r.originalText?.text || "",
          relative_time: r.relativePublishTimeDescription || "",
        }))
        if (rows.length > 0) await supabase.from("club_reviews").insert(rows)
      }

      results.push({ club: club.name, status: "ok", photos: photoUrls.length, reviews: data.reviews?.length || 0 })
    } catch (e: any) {
      results.push({ club: club.name, status: "error", message: e.message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
