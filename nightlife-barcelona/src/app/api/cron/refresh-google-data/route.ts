import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

const STOPWORDS = new Set([
  "the", "bar", "club", "sala", "disco", "discoteca", "pub", "lounge", "festival", "fiesta", "fiestas",
  "de", "del", "la", "el", "los", "las", "en", "y", "and", "of", "barcelona",
])

function normalizeWords(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(ACCENT_PATTERN, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

function namesLikelyMatch(eventName: string, googleName: string): boolean {
  const a = normalizeWords(eventName)
  const b = normalizeWords(googleName)
  if (a.length === 0 || b.length === 0) return true
  return a.some((w) => b.includes(w)) || b.some((w) => a.includes(w))
}

const isPlaceholderImage = (img: string | null | undefined) =>
  !img || img.includes("razz") || img.trim() === ""

// Igual que /api/cron/refresh-google-data pero para la tabla "events" (festivales / fiestas de
// barrio, no noches dentro de un club). Cada evento es un sitio real distinto en Google, así que
// tiene su propio google_place_id, no comparte el de ningún club.
// Al principio: visita esta URL repetidamente hasta que "remaining" salga en 0.
// https://TU_DOMINIO/api/cron/refresh-events-google-data?secret=TU_ADMIN_SECRET
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
  const BATCH_SIZE = 4
  const PHOTOS_PER_EVENT = 4

  // Paso 0: eventos nuevos sin google_place_id -> se lo asignamos aquí, comprobando que el
  // nombre que devuelve Google se parece de verdad al del evento antes de aceptarlo.
  const { data: newEvents } = await supabase
    .from("events")
    .select("id, title, address, club_name")
    .is("google_place_id", null)
    .limit(5)

  const newlyAssigned = await Promise.all(
    (newEvents || []).map(async (ev) => {
      const query = `${ev.title} ${ev.address || ev.club_name || ""} Barcelona`.trim()
      try {
        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.id,places.displayName",
          },
          body: JSON.stringify({ textQuery: query }),
        })
        const json = await res.json()
        const place = json?.places?.[0]
        const placeId = place?.id
        const placeName = place?.displayName?.text || ""

        if (placeId && namesLikelyMatch(ev.title, placeName)) {
          await supabase.from("events").update({ google_place_id: placeId }).eq("id", ev.id)
          return { event: ev.title, placeId, matchedAs: placeName, status: "assigned" }
        }
        if (placeId) return { event: ev.title, status: "rejected_mismatch", googleSaid: placeName }
        return { event: ev.title, status: "not_found" }
      } catch (e: any) {
        return { event: ev.title, status: "error", message: e.message }
      }
    })
  )

  const { data: evs, error } = await supabase
    .from("events")
    .select("id, title, image, google_place_id")
    .not("google_place_id", "is", null)
    .order("google_last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  const { count: totalWithPlaceId } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)

  const { count: alreadyRefreshed } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)
    .not("google_last_refreshed_at", "is", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.all(
    (evs || []).map(async (ev) => {
      try {
        const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${ev.google_place_id}`, {
          headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,photos" },
        })
        const data = await detailsRes.json()
        const googleName = data?.displayName?.text || ""

        if (googleName && !namesLikelyMatch(ev.title, googleName)) {
          const wasFromGoogle = typeof ev.image === "string" && ev.image.includes("event-photos")
          await supabase
            .from("events")
            .update({
              google_place_id: null,
              google_last_refreshed_at: null,
              gallery: null,
              ...(wasFromGoogle ? { image: "/clubs/razz.jpg" } : {}),
            })
            .eq("id", ev.id)
          return { event: ev.title, status: "mismatch_reset", googleSaid: googleName }
        }

        const photoResults = await Promise.all(
          (data.photos || []).slice(0, PHOTOS_PER_EVENT).map(async (p: any) => {
            try {
              const photoRes = await fetch(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1000&key=${apiKey}`)
              const buffer = await photoRes.arrayBuffer()
              const fileName = `${ev.id}/${p.name.split("/").pop()}.jpg`
              await supabase.storage.from("event-photos").upload(fileName, Buffer.from(buffer), { contentType: "image/jpeg", upsert: true })
              const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(fileName)
              return pub.publicUrl
            } catch {
              return null
            }
          })
        )
        const photoUrls = photoResults.filter((u): u is string => !!u)

        await supabase
          .from("events")
          .update({
            google_rating: data.rating ?? null,
            google_review_count: data.userRatingCount ?? null,
            google_last_refreshed_at: new Date().toISOString(),
            ...(photoUrls.length > 0 ? { gallery: photoUrls } : {}),
            ...(isPlaceholderImage(ev.image) && photoUrls.length > 0 ? { image: photoUrls[0] } : {}),
          })
          .eq("id", ev.id)

        if (Array.isArray(data.reviews)) {
          await supabase.from("event_reviews").delete().eq("event_id", ev.id)
          const rows = data.reviews.slice(0, 5).map((r: any) => ({
            event_id: ev.id,
            author_name: r.authorAttribution?.displayName || "Anónimo",
            rating: r.rating || null,
            text: r.text?.text || r.originalText?.text || "",
            relative_time: r.relativePublishTimeDescription || "",
          }))
          if (rows.length > 0) await supabase.from("event_reviews").insert(rows)
        }

        return { event: ev.title, status: "ok", photos: photoUrls.length, reviews: data.reviews?.length || 0 }
      } catch (e: any) {
        return { event: ev.title, status: "error", message: e.message }
      }
    })
  )

  const remaining = (totalWithPlaceId ?? 0) - (alreadyRefreshed ?? 0) - results.length
  return NextResponse.json({
    newlyAssigned,
    processed: results.length,
    remaining: remaining < 0 ? 0 : remaining,
    results,
  })
}
