import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

const STOPWORDS = new Set([
  "the", "bar", "club", "sala", "disco", "discoteca", "pub", "lounge",
  "de", "del", "la", "el", "los", "las", "en", "y", "and", "of",
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

// Comprueba que el nombre que devuelve Google se parece de verdad al nombre del club,
// para no asignarle a un club el place_id de un sitio totalmente distinto
// (p.ej. "Costa Breve" emparejado por error con "Costa Brava").
function namesLikelyMatch(clubName: string, googleName: string): boolean {
  const a = normalizeWords(clubName)
  const b = normalizeWords(googleName)
  if (a.length === 0 || b.length === 0) return true // no hay suficiente info para descartar, no bloqueamos
  return a.some((w) => b.includes(w)) || b.some((w) => a.includes(w))
}

const isPlaceholderImage = (img: string | null | undefined) =>
  !img || img.includes("razz") || img.trim() === ""

// Al principio: visita esta URL repetidamente (recarga la página) hasta que "remaining" salga en 0,
// para traer las fotos/reseñas de los 130 clubs por primera vez.
// Luego el cron diario va reciclando los más antiguos automáticamente, unos pocos cada vez.
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
  const BATCH_SIZE = 4
  const PHOTOS_PER_CLUB = 4

  // Paso 0: si hay clubs nuevos sin google_place_id (los añadiste después de la carga inicial),
  // les asignamos uno automáticamente aquí mismo, así nunca hace falta volver a tocar esto a mano.
  const { data: newClubs } = await supabase
    .from("clubs")
    .select("id, name, address, neighborhood")
    .is("google_place_id", null)
    .limit(5)

  const newlyAssigned = await Promise.all(
    (newClubs || []).map(async (club) => {
      const query = `${club.name} ${club.address || club.neighborhood || ""} Barcelona`.trim()
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

        if (placeId && namesLikelyMatch(club.name, placeName)) {
          await supabase.from("clubs").update({ google_place_id: placeId }).eq("id", club.id)
          return { club: club.name, placeId, matchedAs: placeName, status: "assigned" }
        }
        if (placeId) {
          return { club: club.name, status: "rejected_mismatch", googleSaid: placeName }
        }
        return { club: club.name, status: "not_found" }
      } catch (e: any) {
        return { club: club.name, status: "error", message: e.message }
      }
    })
  )

  const { data: clubs, error } = await supabase
    .from("clubs")
    .select("id, name, image, google_place_id")
    .not("google_place_id", "is", null)
    .order("google_last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  const { count: totalWithPlaceId } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)

  const { count: alreadyRefreshed } = await supabase
    .from("clubs")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)
    .not("google_last_refreshed_at", "is", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Procesamos todos los clubs de la tanda EN PARALELO (y las fotos de cada uno también en
  // paralelo). Es el mismo trabajo, pero como son llamadas de red, en paralelo tarda una
  // fracción del tiempo que en serie — clave para no pasarnos del límite de 10s de Vercel Hobby.
  const results = await Promise.all(
    (clubs || []).map(async (club) => {
      try {
        const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${club.google_place_id}`, {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "displayName,rating,userRatingCount,reviews,photos",
          },
        })
        const data = await detailsRes.json()
        const googleName = data?.displayName?.text || ""

        // Si el place_id guardado no corresponde de verdad a este club (mal emparejado en su
        // día), no le pegamos fotos/reseñas ajenas: lo desasignamos para que el Paso 0 lo
        // vuelva a buscar bien en el próximo ciclo, sin tocar nada a mano.
        if (googleName && !namesLikelyMatch(club.name, googleName)) {
          await supabase
            .from("clubs")
            .update({ google_place_id: null, google_last_refreshed_at: null })
            .eq("id", club.id)
          return { club: club.name, status: "mismatch_reset", googleSaid: googleName }
        }

        // Descargamos las fotos y las guardamos en tu propio Storage (NUNCA guardar la URL
        // directa de Google: si no, cada visita a la web sería una llamada de pago a Google).
        const photoResults = await Promise.all(
          (data.photos || []).slice(0, PHOTOS_PER_CLUB).map(async (p: any) => {
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
              return pub.publicUrl
            } catch {
              return null
            }
          })
        )
        const photoUrls = photoResults.filter((u): u is string => !!u)

        await supabase
          .from("clubs")
          .update({
            google_rating: data.rating ?? null,
            google_review_count: data.userRatingCount ?? null,
            google_last_refreshed_at: new Date().toISOString(),
            ...(photoUrls.length > 0 ? { gallery: photoUrls } : {}),
            // Si el club no tenía foto principal propia (o seguía con el placeholder de
            // Razzmatazz de los datos de partida), usamos la primera de Google como portada.
            ...(isPlaceholderImage(club.image) && photoUrls.length > 0 ? { image: photoUrls[0] } : {}),
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

        return { club: club.name, status: "ok", photos: photoUrls.length, reviews: data.reviews?.length || 0 }
      } catch (e: any) {
        return { club: club.name, status: "error", message: e.message }
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
