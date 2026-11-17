import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAuthorizedCronRequest } from "@/lib/adminAuth"
import { startJobBudget, recordGoogleCalls, googleFetch, fetchRichData, fetchReviews, dailyLimit } from "@/lib/googlePlacesBudget"
import { classifyGoogleWebsite } from "@/lib/googleWebsite"
import { CITIES, EXCLUDE_PRELAUNCH_OR, inBox, type CityKey } from "@/lib/cities"

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

// Un país, región o localidad entera nunca es el club en sí (p.ej. "Costa Breve" emparejado por
// error con "Costa Brava"). Si Google devuelve uno de estos tipos, lo descartamos siempre.
const GEOGRAPHIC_TYPES = new Set([
  "country", "locality", "sublocality", "sublocality_level_1", "political",
  "administrative_area_level_1", "administrative_area_level_2", "administrative_area_level_3",
  "administrative_area_level_4", "administrative_area_level_5", "continent", "postal_code", "natural_feature",
])

function isGeographicMismatch(types: string[] | undefined): boolean {
  if (!types || types.length === 0) return false
  return types.some((t) => GEOGRAPHIC_TYPES.has(t))
}

// Antes esto solo reconocía el viejo fallback roto de Razzmatazz. Pero muchos clubs se cargaron
// al principio con fotos de stock de Unsplash (genéricas, repetidas entre varios locales sin
// relación) como placeholder inicial, y el cron nunca las sustituía porque no las consideraba
// "placeholder". Ahora también se reconocen como tal, así el cron las reemplaza por la foto real
// de Google la próxima vez que procese ese club.
const isPlaceholderImage = (img: string | null | undefined) =>
  !img || img.includes("razz") || img.includes("images.unsplash.com") || img.trim() === ""

// Barcelona ciudad — sesgamos aquí las búsquedas para que Google no devuelva coincidencias
// genéricas de cualquier parte del mundo.
const BARCELONA_BIAS = { circle: { center: { latitude: 41.3874, longitude: 2.1686 }, radius: 20000 } }

// Al principio: visita esta URL repetidamente (recarga la página) hasta que "remaining" salga en 0,
// para traer las fotos/reseñas de los 130 clubs por primera vez.
// Luego el cron diario va reciclando los más antiguos automáticamente, unos pocos cada vez.
// Para probarla a mano: botón en /admin/herramientas.
export async function GET(req: Request) {
  if (!(await isAuthorizedCronRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!
  // Con las fotos activadas cada club cuesta 1 consulta + hasta 5 descargas = 6 llamadas.
  const PHOTOS_PER_CLUB = 5
  // Con el tope diario normal (20-100 llamadas) la tanda es corta: con fotos, 2 clubs (2 × 6 = 12 llamadas). Mientras el tope
  // esté subido para una puesta al día (15/11/2026: GOOGLE_PLACES_DAILY_LIMIT alto), las tandas son más grandes y se acaba antes;
  // al volver a bajar el tope vuelve sola a la tanda corta. Los clubs de una tanda se procesan en paralelo.
  const BIG_BUDGET = dailyLimit() >= 200
  const BATCH_SIZE = fetchRichData() ? (BIG_BUDGET ? 6 : 2) : BIG_BUDGET ? 8 : 4

  // Una ciudad concreta desde el panel (15/11/2026): «?city=madrid» refresca SOLO los locales de esa ciudad aunque esté en
  // «prelaunch», sin abrirla al público (sus locales siguen ocultos). La tarea nocturna no lleva este parámetro: sigue dejando
  // en paz las ciudades en prelaunch. Barcelona (o sin parámetro) = el comportamiento de siempre.
  const cityParam = new URL(req.url).searchParams.get("city")
  const scopeKey = (Object.keys(CITIES) as CityKey[]).find((k) => k === cityParam && k !== "barcelona") ?? null
  const scopeCity = scopeKey ? CITIES[scopeKey] : null
  // Dentro del alcance: solo la ciudad pedida (mismo criterio de ciudad que EXCLUDE_PRELAUNCH_OR, a la inversa) o todo lo no prelaunch.
  const inScope = (q: any) => (scopeCity ? q.ilike("city", scopeCity.name) : q.or(EXCLUDE_PRELAUNCH_OR))
  // ¿Cae el punto dentro de la caja de la ciudad pedida? (sin ciudad pedida no se comprueba: Barcelona incluye su área metropolitana)
  const outsideScopeCity = (loc: any) =>
    !!scopeCity && !(typeof loc?.latitude === "number" && typeof loc?.longitude === "number" && inBox(scopeCity.box, loc.latitude, loc.longitude))
  let quotaHit = false // Google devolvió 429 (tope diario de la cuota): se para en vez de dar por buenos datos vacíos

  // Freno de seguridad: si hoy ya se ha llegado al límite diario compartido entre los 3 crons
  // (GOOGLE_PLACES_DAILY_LIMIT, ver src/lib/googlePlacesBudget.ts), no se hace ninguna llamada
  // de pago a Google en este ciclo — se reintenta al día siguiente.
  const budget = await startJobBudget(supabase, "clubs")
  if (budget.over) {
    return NextResponse.json({ skipped: true, reason: "daily_budget_reached", usedToday: budget.used })
  }
  const counter = budget.counter

  // Paso 0: si hay clubs nuevos sin google_place_id (los añadiste después de la carga inicial),
  // les asignamos uno automáticamente aquí mismo, así nunca hace falta volver a tocar esto a mano.
  // En una ciudad concreta (?city=) la búsqueda va «en su ciudad», con sesgo hacia ella, y solo con los clubs que aún no se han
  // intentado: a los que Google no encuentra o descarta se les pone la fecha (google_last_refreshed_at, que sin place_id no
  // significa nada más) para no repetir en cada vuelta una búsqueda de pago que ya falló.
  let step0 = inScope(
    supabase
      .from("clubs")
      .select("id, name, address, neighborhood")
      .is("google_place_id", null)
      .or("manual_photos.is.null,manual_photos.eq.false")
  )
  if (scopeCity) step0 = step0.is("google_last_refreshed_at", null)
  const { data: newClubs } = await step0.limit(scopeCity && BIG_BUDGET ? 10 : 5)

  const markTried = async (id: string) => {
    if (scopeCity) await supabase.from("clubs").update({ google_last_refreshed_at: new Date().toISOString() }).eq("id", id)
  }

  const newlyAssigned = await Promise.all(
    (newClubs || []).map(async (club: any) => {
      const query = `${club.name} ${club.address || club.neighborhood || ""} ${scopeCity ? scopeCity.name : "Barcelona"}`.trim()
      const bias = scopeCity
        ? { circle: { center: { latitude: scopeCity.center.lat, longitude: scopeCity.center.lng }, radius: scopeCity.radiusM } }
        : BARCELONA_BIAS
      try {
        const res = await googleFetch(counter, "https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            // La ubicación solo se pide al buscar en una ciudad concreta (para descartar lo que caiga fuera); no cambia el precio.
            "X-Goog-FieldMask": scopeCity ? "places.id,places.displayName,places.types,places.location" : "places.id,places.displayName,places.types",
          },
          body: JSON.stringify({ textQuery: query, locationBias: bias }),
        })
        if (res.status === 429) {
          quotaHit = true
          return { club: club.name, status: "error", message: "Google ha alcanzado el tope diario de la cuota (429)" }
        }
        const json = await res.json()
        const place = json?.places?.[0]
        const placeId = place?.id
        const placeName = place?.displayName?.text || ""

        if (placeId && isGeographicMismatch(place?.types)) {
          await markTried(club.id)
          return { club: club.name, status: "rejected_geographic", googleSaid: placeName, types: place?.types }
        }
        if (placeId && outsideScopeCity(place?.location)) {
          await markTried(club.id)
          return { club: club.name, status: "rejected_outside_city", googleSaid: placeName }
        }
        if (placeId && namesLikelyMatch(club.name, placeName)) {
          await supabase.from("clubs").update({ google_place_id: placeId }).eq("id", club.id)
          return { club: club.name, placeId, matchedAs: placeName, status: "assigned" }
        }
        if (placeId) {
          await markTried(club.id)
          return { club: club.name, status: "rejected_mismatch", googleSaid: placeName }
        }
        await markTried(club.id)
        return { club: club.name, status: "not_found" }
      } catch (e: any) {
        return { club: club.name, status: "error", message: e.message }
      }
    })
  )

  // Los clubs marcados como "manual_photos" (el admin ha quitado o subido fotos a mano desde el
  // panel) los deja en paz el pipeline automático — ni fotos ni place_id — para no pisar lo que
  // se haya curado a mano.
  const { data: clubs, error } = await inScope(
    supabase
      .from("clubs")
      .select("id, name, image, gallery, google_place_id, website, instagram, tiktok")
      .not("google_place_id", "is", null)
      .or("manual_photos.is.null,manual_photos.eq.false")
  )
    .order("google_last_refreshed_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE)

  // Reseñas (17/11/2026): solo si GOOGLE_PLACES_FETCH_REVIEWS está activa, a los clubs de esta tanda que aún no tienen las suyas bajadas
  // (columna clubs.google_reviews_at, SQL 129) y que Google dice que tienen alguna. Se pide por separado y sin romper nada: si la columna
  // todavía no existe la consulta falla, la lista queda vacía y el cron se comporta exactamente como antes.
  const reviewsPending = new Set<number>()
  if (fetchReviews() && (clubs || []).length > 0) {
    const { data: reviewFlags, error: reviewFlagsError } = await supabase
      .from("clubs")
      .select("id, google_reviews_at, google_review_count")
      .in("id", (clubs || []).map((c: any) => c.id))
    if (!reviewFlagsError) {
      for (const r of (reviewFlags || []) as any[]) if (!r.google_reviews_at && r.google_review_count !== 0) reviewsPending.add(r.id)
    }
  }

  const { count: totalWithPlaceId } = await inScope(
    supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .not("google_place_id", "is", null)
      .or("manual_photos.is.null,manual_photos.eq.false")
  )

  const { count: alreadyRefreshed } = await inScope(
    supabase
      .from("clubs")
      .select("*", { count: "exact", head: true })
      .not("google_place_id", "is", null)
      .or("manual_photos.is.null,manual_photos.eq.false")
  ).not("google_last_refreshed_at", "is", null)

  // En una ciudad concreta, los que aún no tienen ficha y no se han intentado también cuentan como «quedan»: así el botón sigue
  // dándole vueltas hasta asignar todos (los que Google no encuentra se marcan y dejan de contar).
  let untriedWithoutPlaceId = 0
  if (scopeCity) {
    const { count } = await inScope(
      supabase
        .from("clubs")
        .select("*", { count: "exact", head: true })
        .is("google_place_id", null)
        .or("manual_photos.is.null,manual_photos.eq.false")
    ).is("google_last_refreshed_at", null)
    untriedWithoutPlaceId = count ?? 0
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Procesamos todos los clubs de la tanda EN PARALELO (y las fotos de cada uno también en
  // paralelo). Es el mismo trabajo, pero como son llamadas de red, en paralelo tarda una
  // fracción del tiempo que en serie — clave para no pasarnos del límite de 10s de Vercel Hobby.
  const results = await Promise.all(
    (clubs || []).map(async (club: any) => {
      try {
        // languageCode=es hace que Google traduzca automáticamente el texto de las reseñas al
        // español (server-side, sin necesitar la API de Traducción aparte) — "text" viene ya
        // traducido y "originalText" es el texto tal cual lo escribió la persona.
        // reviews/photos solo se piden si GOOGLE_PLACES_FETCH_RICH_DATA está activado: ese
        // fieldmask cae en el tier "Enterprise + Atmosphere" (mucho más caro) en vez del básico.
        // Solo se piden fotos (nunca reseñas, que es lo caro) y solo a los clubs que aún no tienen
        // galería: así no se vuelven a descargar las fotos de los que ya las tienen.
        const hasGallery = Array.isArray(club.gallery) && club.gallery.length > 0
        const needsPhotos = fetchRichData() && !hasGallery
        // websiteUri cae en el mismo nivel de precio que rating/userRatingCount, que ya se pedían: no sube el coste.
        // En una ciudad concreta se pide también la ubicación (mismo nivel de precio) para descartar fichas que caigan fuera de ella.
        const baseFields = "displayName,types,rating,userRatingCount,websiteUri" + (scopeCity ? ",location" : "")
        // Las reseñas llegan en la misma llamada (languageCode=es: el texto viene traducido al castellano); sube la llamada al nivel
        // «Enterprise + Atmosphere» (ver fetchReviews en googlePlacesBudget.ts), pero no añade ninguna llamada.
        const wantsReviews = reviewsPending.has(club.id)
        const fields = [baseFields, needsPhotos ? "photos" : "", wantsReviews ? "reviews" : ""].filter(Boolean).join(",")
        const detailsRes = await googleFetch(counter, `https://places.googleapis.com/v1/places/${club.google_place_id}?languageCode=es`, {
          headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": fields,
          },
        })
        // Si Google responde con un error (tope diario de la cuota, clave...), NO se escribe nada: antes un error dejaba al club con
        // valoración vacía y marcado como «actualizado», y no le tocaba otra vez hasta pasar por todos los demás.
        if (!detailsRes.ok) {
          if (detailsRes.status === 429) {
            quotaHit = true // sin fecha: se reintenta cuando se reinicie la cuota
          } else {
            // Ficha caducada o inexistente (404...): se le pone la fecha para que pase al final de la cola y no la bloquee.
            await supabase.from("clubs").update({ google_last_refreshed_at: new Date().toISOString() }).eq("id", club.id)
          }
          return { club: club.name, status: "google_error", httpStatus: detailsRes.status }
        }
        const data = await detailsRes.json()
        const googleName = data?.displayName?.text || ""

        // Si el place_id guardado no corresponde de verdad a este club (mal emparejado en su
        // día, o es una región/país entero), no le pegamos fotos/reseñas ajenas: lo desasignamos
        // para que el Paso 0 lo vuelva a buscar bien en el próximo ciclo, sin tocar nada a mano.
        const badMatch =
          (googleName && !namesLikelyMatch(club.name, googleName)) || isGeographicMismatch(data?.types) || outsideScopeCity(data?.location)
        if (badMatch) {
          const wasFromGoogle = typeof club.image === "string" && club.image.includes("club-photos")
          await supabase
            .from("clubs")
            .update({
              google_place_id: null,
              // En una ciudad concreta se deja la fecha puesta: así no vuelve a buscarse en bucle un club que ya se descartó.
              google_last_refreshed_at: scopeCity ? new Date().toISOString() : null,
              gallery: null,
              // Antes esto ponía "image" a "/clubs/razz.jpg" — un archivo que no existe (404) y
              // que además hacía que este club mostrase la foto genérica de "Razzmatazz". Ahora
              // se deja en null: el frontend ya sabe mostrar un degradado neutro sin foto.
              ...(wasFromGoogle ? { image: null } : {}),
            })
            .eq("id", club.id)
          return { club: club.name, status: "mismatch_reset", googleSaid: googleName }
        }

        // Descargamos las fotos y las guardamos en tu propio Storage (NUNCA guardar la URL
        // directa de Google: si no, cada visita a la web sería una llamada de pago a Google).
        const photoResults = await Promise.all(
          (data.photos || []).slice(0, PHOTOS_PER_CLUB).map(async (p: any, i: number) => {
            try {
              const photoRes = await googleFetch(
                counter,
                `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&key=${apiKey}`
              )
              // Antes no se comprobaba esto: si Google devolvía un error (referencia de foto
              // caducada, límite de la clave...) el cuerpo de la respuesta no era una imagen de
              // verdad, pero se subía igual a Storage y se guardaba su URL como si nada — de ahí
              // las fotos "rotas" (icono de imagen caída) que se veían en la galería del admin.
              if (!photoRes.ok) return null
              const buffer = await photoRes.arrayBuffer()
              // Nombre fijo por posición (26/10/2026): antes cada descarga creaba un archivo nuevo
              // y los anteriores se quedaban ocupando espacio sin usarse.
              const fileName = `${club.id}/${i}.jpg`
              const { error: uploadError } = await supabase.storage
                .from("club-photos")
                .upload(fileName, Buffer.from(buffer), { contentType: "image/jpeg", upsert: true })
              // Y esto tampoco: si Storage rechazaba la subida (política, cuota...), el error se
              // ignoraba y se guardaba igualmente la URL de un archivo que nunca llegó a existir.
              if (uploadError) return null
              const { data: pub } = supabase.storage.from("club-photos").getPublicUrl(fileName)
              return `${pub.publicUrl}?v=${Date.now()}`
            } catch {
              return null
            }
          })
        )
        const photoUrls = photoResults.filter((u): u is string => !!u)

        // Web y redes (12/11/2026): lo que Google tiene en su ficha, SOLO en los campos que estén vacíos
        // (lo escrito a mano por el admin o por el dueño manda siempre). Si la «web» de Google es su
        // Instagram o su TikTok, va a su campo.
        const found = classifyGoogleWebsite(data.websiteUri)
        const isEmpty = (v: unknown) => typeof v !== "string" || v.trim() === ""
        const socials: Record<string, string> = {}
        if (found.website && isEmpty(club.website)) socials.website = found.website
        if (found.instagram && isEmpty(club.instagram)) socials.instagram = found.instagram
        if (found.tiktok && isEmpty(club.tiktok)) socials.tiktok = found.tiktok

        await supabase
          .from("clubs")
          .update({
            ...socials,
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
          const rows = data.reviews.slice(0, 5).map((r: any) => {
            // Si la reseña ya está escrita en castellano o catalán se guarda tal cual la escribió la persona; si no, el texto traducido al
            // castellano que devuelve Google (languageCode=es), y como último recurso el original.
            const originalLang = String(r.originalText?.languageCode || "").toLowerCase().split("-")[0]
            const keepOriginal = !!r.originalText?.text && (originalLang === "es" || originalLang === "ca")
            return {
              club_id: club.id,
              author_name: r.authorAttribution?.displayName || "Anónimo",
              rating: r.rating || null,
              text: (keepOriginal ? r.originalText.text : r.text?.text || r.originalText?.text) || "",
              relative_time: r.relativePublishTimeDescription || "",
            }
          })
          // Solo se sustituyen las que había si llegan nuevas: una respuesta vacía no borra nada.
          if (rows.length > 0) {
            await supabase.from("club_reviews").delete().eq("club_id", club.id)
            await supabase.from("club_reviews").insert(rows)
          }
        }
        // Las reseñas de este club ya están bajadas: no se vuelven a pedir (ni a pagar) en la próxima vuelta.
        if (wantsReviews) await supabase.from("clubs").update({ google_reviews_at: new Date().toISOString() }).eq("id", club.id)

        return { club: club.name, status: "ok", photos: photoUrls.length, reviews: data.reviews?.length || 0 }
      } catch (e: any) {
        return { club: club.name, status: "error", message: e.message }
      }
    })
  )

  const remaining = (totalWithPlaceId ?? 0) - (alreadyRefreshed ?? 0) - results.length + untriedWithoutPlaceId

  await recordGoogleCalls(supabase, counter.count)

  const body = {
    city: scopeCity ? scopeCity.name : undefined,
    newlyAssigned,
    processed: results.length,
    remaining: remaining < 0 ? 0 : remaining,
    googleCallsThisRun: counter.count,
    results,
  }
  // Si Google dijo «tope diario de la cuota» se responde con error: el botón del panel se para y lo enseña, en vez de seguir
  // dando vueltas contra un muro. Se retoma al reiniciarse la cuota (medianoche del Pacífico, ~09:00 en Madrid).
  if (quotaHit) {
    return NextResponse.json(
      { ...body, error: "Google ha alcanzado el tope diario de su cuota (429). Sigue mañana desde las 09:00, o sube la cuota en Google Cloud." },
      { status: 429 }
    )
  }
  return NextResponse.json(body)
}
