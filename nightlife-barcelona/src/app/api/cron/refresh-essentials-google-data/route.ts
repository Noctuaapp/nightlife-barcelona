import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY!
const BATCH_SIZE = 15
const MAX_PHOTOS = 4

const BARCELONA_BIAS = { circle: { center: { latitude: 41.3874, longitude: 2.1686 }, radius: 20000 } }

const GEOGRAPHIC_TYPES = new Set([
  "country", "locality", "sublocality", "sublocality_level_1", "political",
  "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "administrative_area_level_4", "administrative_area_level_5", "continent", "postal_code", "natural_feature",
])
function isGeographicMismatch(types?: string[]) {
  return types?.some((t) => GEOGRAPHIC_TYPES.has(t)) ?? false
}

// A diferencia de clubs/eventos, aquí NO metemos la palabra de categoría (farmacia, taxi, hotel...)
// en las stopwords: en esenciales suele ser justo la palabra que confirma el match (p.ej. "Farmàcia Muntaner").
const STOPWORDS = new Set(["de", "del", "la", "el", "los", "las", "en", "y", "the", "a", "al", "un", "una"])

// Si Google clasifica el sitio con un tipo que encaja con la categoría del esencial, cuenta como
// señal de match aunque el nombre no coincida palabra por palabra (útil para sitios con nombre genérico).
const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  Pharmacy: ["pharmacy", "drugstore"],
  ATM: ["atm", "bank"],
  Food: ["restaurant", "meal_takeaway", "meal_delivery", "food", "fast_food_restaurant", "cafe"],
  Transport: ["transit_station", "bus_station", "subway_station", "train_station"],
  Taxi: ["taxi_stand"],
  Supermarket: ["supermarket", "grocery_store", "convenience_store"],
  Hotel: ["lodging", "hotel"],
  Casino: ["casino"],
  "Gas Station": ["gas_station"],
  Hospital: ["hospital"],
}
function categoryTypeMatches(category: string, types?: string[]): boolean {
  const expected = CATEGORY_TYPE_MAP[category]
  if (!expected || !types) return false
  return types.some((t) => expected.includes(t))
}

function normalizeWords(str: string): Set<string> {
  const normalized = (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
  return new Set(normalized.split(/\s+/).filter((w) => w.length > 1 && !STOPWORDS.has(w)))
}

function wordsOverlap(a: string, b: string): boolean {
  const wa = normalizeWords(a)
  const wb = normalizeWords(b)
  if (wa.size === 0 || wb.size === 0) return false
  for (const w of wa) if (wb.has(w)) return true
  return false
}

// Compara el nombre que devuelve Google contra el nombre del esencial Y su dirección/barrio,
// porque muchas cadenas (Mercadona, Caixabank...) comparten nombre pero hay que confirmar ubicación.
function isLikelyMatch(name: string, address: string | null, neighborhood: string | null, googleName: string): boolean {
  if (wordsOverlap(name, googleName)) return true
  if (address && wordsOverlap(address, googleName)) return true
  if (neighborhood && wordsOverlap(neighborhood, googleName)) return true
  return false
}

function isPlaceholderImage(image: string | null | undefined): boolean {
  return !image || image.trim() === ""
}

async function textSearch(query: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.types",
    },
    body: JSON.stringify({ textQuery: query, locationBias: BARCELONA_BIAS }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.places?.[0] || null
}

async function placeDetails(placeId: string) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_KEY,
      "X-Goog-FieldMask": "displayName,types,rating,userRatingCount,reviews,photos",
    },
  })
  if (!res.ok) return null
  return res.json()
}

async function cachePhoto(photoName: string, essentialId: number, index: number): Promise<string | null> {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1000&key=${GOOGLE_KEY}`
  const res = await fetch(url)
  if (!res.ok) return null
  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get("content-type") || "image/jpeg"
  const ext = contentType.includes("png") ? "png" : "jpg"
  const filePath = `essentials/${essentialId}/${index}-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from("essential-photos").upload(filePath, buffer, {
    contentType,
    upsert: true,
  })
  if (error) return null

  const { data } = supabase.storage.from("essential-photos").getPublicUrl(filePath)
  return data.publicUrl
}

export async function GET() {
  const results: any[] = []

  // Paso 0: asignar google_place_id a los esenciales que todavía no lo tienen
  // (y que no estén marcados como manual_photos, en cuyo caso el pipeline los deja en paz).
  const { data: unassigned } = await supabase
    .from("essentials")
    .select("id, name, address, neighborhood, category")
    .is("google_place_id", null)
    .or("manual_photos.is.null,manual_photos.eq.false")
    .or("google_match_failed.is.null,google_match_failed.eq.false")
    .limit(BATCH_SIZE)

  const newlyAssigned: any[] = []

  if (unassigned && unassigned.length > 0) {
    await Promise.all(
      unassigned.map(async (item) => {
        const query = [item.name, item.address || item.neighborhood || "Barcelona"].filter(Boolean).join(" ")
        const found = await textSearch(query)

        if (!found) {
          await supabase.from("essentials").update({ google_match_failed: true }).eq("id", item.id)
          newlyAssigned.push({ essential: item.name, status: "not_found" })
          return
        }

        const googleName = found.displayName?.text
        const match =
          (googleName && isLikelyMatch(item.name, item.address, item.neighborhood, googleName)) ||
          categoryTypeMatches(item.category, found.types)
        const geoMismatch = isGeographicMismatch(found.types)

        if (!match || geoMismatch) {
          await supabase.from("essentials").update({ google_match_failed: true }).eq("id", item.id)
          newlyAssigned.push({ essential: item.name, status: "rejected_mismatch", googleSaid: googleName })
          return
        }

        await supabase.from("essentials").update({ google_place_id: found.id }).eq("id", item.id)
        newlyAssigned.push({ essential: item.name, placeId: found.id, matchedAs: googleName, status: "assigned" })
      })
    )
  }

  // Refresco principal: esenciales con google_place_id, se re-verifica el match cada vez
  // (auto-corrección) y se cachean hasta 4 fotos + reviews.
  const { data: toRefresh, error } = await supabase
    .from("essentials")
    .select("id, name, address, neighborhood, category, image, google_place_id")
    .not("google_place_id", "is", null)
    .or("manual_photos.is.null,manual_photos.eq.false")
    .limit(BATCH_SIZE)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (toRefresh && toRefresh.length > 0) {
    await Promise.all(
      toRefresh.map(async (item) => {
        const data = await placeDetails(item.google_place_id as string)
        const googleName = data?.displayName?.text

        const hasMatch =
          (googleName && isLikelyMatch(item.name, item.address, item.neighborhood, googleName)) ||
          categoryTypeMatches(item.category, data?.types)
        const badMatch = !hasMatch || isGeographicMismatch(data?.types)

        if (badMatch) {
          await supabase
            .from("essentials")
            .update({
              google_place_id: null,
              google_last_refreshed_at: null,
              gallery: null,
              ...(isPlaceholderImage(item.image) || (typeof item.image === "string" && item.image.includes("essential-photos"))
                ? { image: null }
                : {}),
            })
            .eq("id", item.id)
          results.push({ essential: item.name, status: "mismatch_reset", googleSaid: googleName, types: data?.types })
          return
        }

        const photos = (data?.photos || []).slice(0, MAX_PHOTOS)
        const cachedUrls: string[] = []

        for (let i = 0; i < photos.length; i++) {
          const cached = await cachePhoto(photos[i].name, item.id, i)
          if (cached) cachedUrls.push(cached)
        }

        const reviews = data?.reviews || []
        if (reviews.length > 0) {
          await supabase.from("essential_reviews").delete().eq("essential_id", item.id)
          await supabase.from("essential_reviews").insert(
            reviews.slice(0, 5).map((r: any) => ({
              essential_id: item.id,
              author_name: r.authorAttribution?.displayName || "Google",
              rating: r.rating || null,
              text: r.text?.text || "",
              relative_time: r.relativePublishTimeDescription || "",
            }))
          )
        }

        await supabase
          .from("essentials")
          .update({
            gallery: cachedUrls.length > 0 ? cachedUrls : null,
            ...(cachedUrls.length > 0 && isPlaceholderImage(item.image) ? { image: cachedUrls[0] } : {}),
            google_rating: data?.rating || null,
            google_review_count: data?.userRatingCount || null,
            google_last_refreshed_at: new Date().toISOString(),
          })
          .eq("id", item.id)

        results.push({ essential: item.name, status: "ok", photos: cachedUrls.length, reviews: reviews.length })
      })
    )
  }

  const { count: pendingAssign } = await supabase
    .from("essentials")
    .select("id", { count: "exact", head: true })
    .is("google_place_id", null)
    .or("manual_photos.is.null,manual_photos.eq.false")
    .or("google_match_failed.is.null,google_match_failed.eq.false")

  const { count: failedCount } = await supabase
    .from("essentials")
    .select("id", { count: "exact", head: true })
    .eq("google_match_failed", true)

  const { count: pendingRefresh } = await supabase
    .from("essentials")
    .select("id", { count: "exact", head: true })
    .not("google_place_id", "is", null)
    .is("google_last_refreshed_at", null)
    .or("manual_photos.is.null,manual_photos.eq.false")

  const remaining = (pendingAssign || 0) + (pendingRefresh || 0)

  return NextResponse.json({
    newlyAssigned,
    processed: results.length,
    remaining: remaining || 0,
    needsManualReview: failedCount || 0,
    results,
  })
}
