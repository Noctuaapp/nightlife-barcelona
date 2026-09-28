import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ACCENT_PATTERN = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g")

// "festa"/"major"/"fiesta" se repiten en el nombre de decenas de fiestas de barrio distintas
// ("Festa Major de Gràcia", "... de Sarrià", "... del Poblenou"...), así que si no los tratamos
// como genéricos, dos fiestas de barrios totalmente distintos "coinciden" por esas palabras
// sueltas. Se tratan igual que "festival"/"club"/etc: no cuentan para decidir si es el mismo sitio.
const STOPWORDS = new Set([
  "the", "bar", "club", "sala", "disco", "discoteca", "pub", "lounge",
  "festival", "fiesta", "fiestas", "festa", "major", "mayor",
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

function wordsOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false
  return a.some((w) => b.includes(w)) || b.some((w) => a.includes(w))
}

// Comprueba el nombre del evento Y su dirección/lugar contra lo que dice Google, y acepta si
// cualquiera de los dos coincide. Hace falta lo de la dirección porque muchos festivales se
// llaman de forma totalmente distinta al recinto donde se celebran (p.ej. "Primavera Sound"
// se celebra en "Parc del Fòrum" — cero palabras en común, pero es el sitio correcto).
function isLikelyMatch(eventTitle: string, eventAddress: string | null | undefined, googleName: string): boolean {
  const g = normalizeWords(googleName)
  const t = normalizeWords(eventTitle)
  const a = normalizeWords(eventAddress || "")
  if (g.length === 0) return true // no hay suficiente info para descartar, no bloqueamos
  if (t.length === 0 && a.length === 0) return true
  return wordsOverlap(t, g) || wordsOverlap(a, g)
}

// Un país, región o localidad entera nunca es el festival/fiesta en sí (p.ej. "Grec" emparejado
// por error con "Grecia" el país). Si Google devuelve uno de estos tipos, lo descartamos siempre,
// aunque el nombre coincidiera por casualidad.
const GEOGRAPHIC_TYPES = new Set([
  "country", "locality", "sublocality", "sublocality_level_1", "political",
  "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "administrative_area_level_4", "administrative_area_level_5", "continent", "postal_code", "natural_feature",
])

function isGeographicMismatch(types: string[] | undefined): boolean {
  if (!types || types.length === 0) return false
  return types.some((t) => GEOGRAPHIC_TYPES.has(t))
}

const isPlaceholderImage = (img: string | null | undefined) =>
  !img || img.includes("razz") || img.trim() === ""

// Barcelona ciudad — sesgamos aquí las búsquedas para que Google no devuelva coincidencias
// genéricas de cualquier parte del mundo (p.ej. "Grecia" el país en vez del festival Grec).
const BARCELONA_BIAS = { circle: { center: { latitude: 41.3874, longitude: 2.1686 }, radius: 20000 } }

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
  // nombre se parece de verdad Y que no sea un país/región/localidad entera.
  const { data: newEvents } = await supabase
    .from("events")
    .select("id, title, address, club_name")
    .is("google_place_id", null)
    .or("manual_photos.is.null,manual_photos.eq.false")
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
            "X-Goog-FieldMask": "places.id,places.displayName,places.types",
          },
          body: JSON.stringify({ textQuery: query, locationBias: BARCELONA_BIAS }),
        })
        const json = await res.json()
        const place = json?.places?.[0]
        const placeId = place?.id
        const placeName = place?.displayName?.text || ""

        if (placeId && isGeographicMismatch(place?.types)) {
          return { event: ev.title, status: "rejected_geographic", googleSaid: placeName, types: place?.types }
        }
        if (placeId && isLikelyMatch(ev.title, ev.address, placeName)) {
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

  // Los eventos marcados como "manual_photos" los gestionas tú a mano desde Supabase: el pipeline
  // automático nunca los toca (ni fotos ni place_id), para no pisar lo que hayas subido.
  const { data: evs, error } = await supabase
    .from("events")
    .select("id, title, address, image, google_place_id")
    .not("google_place_id", "is", null)
    .or("manual_photos.is.null,manual_photos.eq.false")
    .order("google_last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  const { count: totalWithPlaceId } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)
    .or("manual_photos.is.null,manual_photos.eq.false")

  const { count: alreadyRefreshed } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .not("google_place_id", "is", null)
    .or("manual_photos.is.null,manual_photos.eq.false")
    .not("google_last_refreshed_at", "is", null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.all(
    (evs || []).map(async (ev) => {
      try {
        const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${ev.google_place_id}`, {
          headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "displayName,types,rating,userRatingCount,reviews,photos" },
        })
        const data = await detailsRes.json()
        const googleName = data?.displayName?.text || ""

        const badMatch = (googleName && !isLikelyMatch(ev.title, ev.address, googleName)) || isGeographicMismatch(data?.types)
        if (badMatch) {
          await supabase
            .from("events")
            .update({
              google_place_id: null,
              google_last_refreshed_at: null,
              gallery: null,
              // Antes esto ponía "image" a "/clubs/razz.jpg" — un archivo que no existe (404) y
              // que hacía que este evento mostrase la foto genérica de "Razzmatazz". Ahora se
              // deja en null: el frontend ya sabe mostrar un degradado neutro sin foto.
              ...(isPlaceholderImage(ev.image) || (typeof ev.image === "string" && ev.image.includes("event-photos"))
                ? { image: null }
                : {}),
            })
            .eq("id", ev.id)
          return { event: ev.title, status: "mismatch_reset", googleSaid: googleName, types: data?.types }
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
