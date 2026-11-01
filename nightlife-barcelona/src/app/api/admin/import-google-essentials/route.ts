import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"
import { boundaryBbox, insideBoundary } from "@/lib/osmBoundary"
import { STATIC_BOUNDARY_KEYS, staticBoundary } from "@/lib/osmBoundaries"
import { AREAS, normalize } from "@/lib/osmAreas"
import { isDuplicateEssential, type ExistingEssential } from "@/lib/osmEssentials"
import { dailyLimit, googleFetch, recordGoogleCalls, startJobBudget } from "@/lib/googlePlacesBudget"
import {
  GOOGLE_CATEGORIES,
  SEARCH_FIELD_MASK,
  SEARCH_URL,
  collectPlaces,
  estimateCostUsd,
  googleCategoriesFor,
  judgeGooglePlace,
  type CollectResult,
  type GoogleCategory,
  type PageResult,
} from "@/lib/googleEssentials"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Importa esenciales de noche desde Google Places: supermercados, comida, gasolineras y farmacias que
// abren las 24 h o cierran a la 1:00 o más tarde, con el horario que da Google. Sirve para lo que
// OpenStreetMap no trae (horarios) y Overture tampoco. Todo entra OCULTO (hidden = true) y marcado con
// import_source = 'google' para revisarlo en Admin › Esenciales antes de publicar.
//
// CUESTA DINERO: cada página de resultados es una llamada de pago (Text Search Enterprise, 35 $ por
// 1.000, con 1.000 gratis al mes). Va por el mismo tope diario que los crons de Google
// (GOOGLE_PLACES_DAILY_LIMIT, ver lib/googlePlacesBudget.ts) y se corta al llegar a él. La vista
// previa también llama a Google (hace falta para saber qué hay): lo único que no hace es escribir.
//
//   Vista previa:       /api/admin/import-google-essentials?area=badalona&cat=supermarket,food
//   Importar de verdad: /api/admin/import-google-essentials?area=badalona&cat=supermarket,food&dry=0
//   area  = uno de los 9 municipios con contorno guardado (no Barcelona)
//   cat   = all | supermarket | food | gas | pharmacy (o varias separadas por comas)
//   pages = páginas por consulta, de 1 a 3 (por defecto 2: hasta 40 resultados por consulta)

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const areaKey = (searchParams.get("area") || "").toLowerCase()
  const area = AREAS[areaKey]
  const boundary = staticBoundary(areaKey)
  if (!area || !boundary) {
    return NextResponse.json({ error: `area debe ser una de: ${STATIC_BOUNDARY_KEYS.join(", ")}. Barcelona no está disponible en esta herramienta.` }, { status: 400 })
  }
  const cats = googleCategoriesFor(searchParams.get("cat") || "all")
  if (cats.length === 0) {
    return NextResponse.json({ error: `cat debe ser all o una o varias (separadas por comas) de: ${GOOGLE_CATEGORIES.map((c) => c.key).join(", ")}` }, { status: 400 })
  }
  const pages = Math.min(3, Math.max(1, Math.floor(Number(searchParams.get("pages"))) || 2))
  const dry = searchParams.get("dry") !== "0"

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: "Falta GOOGLE_PLACES_API_KEY en Vercel." }, { status: 500 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Tope diario: se mira ANTES de llamar a Google. Si ya no queda nada, no se hace ninguna llamada.
  const budget = await startJobBudget(supabase, "essentials")
  if (budget.over) {
    return NextResponse.json(
      {
        error:
          `Hoy ya se han usado ${budget.used} de ${dailyLimit()} llamadas a Google, que es el tope diario. ` +
          "Para hacer esta búsqueda hoy, sube GOOGLE_PLACES_DAILY_LIMIT en Vercel (hace falta volver a desplegar) " +
          "y, si pusiste una cuota diaria en Google Cloud, súbela también. O espera a mañana.",
      },
      { status: 429 }
    )
  }

  // Lo que ya hay en essentials (visible u oculto) de estas categorías, para no duplicar.
  const existing: ExistingEssential[] = []
  const knownIds = new Set<string>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("essentials")
      .select("name, category, latitude, longitude, google_place_id")
      .in("category", cats.map((c) => c.category))
      .order("id")
      .range(from, from + 999)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const e of data || []) {
      existing.push({
        category: e.category,
        norm: normalize(e.name || ""),
        lat: e.latitude != null ? Number(e.latitude) : null,
        lon: e.longitude != null ? Number(e.longitude) : null,
      })
      if (e.google_place_id) knownIds.add(String(e.google_place_id))
    }
    if (!data || data.length < 1000) break
  }

  // ---- Llamadas a Google (cada una cuenta contra el tope y se apunta al final, pase lo que pase) ----
  const counter = budget.counter
  const fetchPage = async (body: object): Promise<PageResult> => {
    const res = await googleFetch(counter, SEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": SEARCH_FIELD_MASK },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, status: res.status, message: text.slice(0, 300) }
    }
    try {
      const json = await res.json()
      return { ok: true, places: json.places || [], nextPageToken: json.nextPageToken || undefined }
    } catch {
      return { ok: false, status: 502, message: "Respuesta de Google no válida" }
    }
  }

  const bbox = boundaryBbox(boundary)
  const results: { cat: GoogleCategory; r: CollectResult }[] = []
  let detenido: string | null = null
  const consultasSinHacer: string[] = []
  try {
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i]
      const r = await collectPlaces({ queries: cat.queries, pages, bbox, fetchPage })
      results.push({ cat, r })
      if (r.detenido) {
        detenido = r.detenido
        consultasSinHacer.push(...r.pendientes.map((q) => `${cat.label}: ${q}`))
        for (const rest of cats.slice(i + 1)) consultasSinHacer.push(...rest.queries.map((q) => `${rest.label}: ${q.text}`))
        break
      }
    }
  } finally {
    await recordGoogleCalls(supabase, counter.count)
  }

  // ---- Quedarse con lo que vale ----
  type Row = {
    name: string; category: string; subcategory: null; address: string | null; neighborhood: string
    description: null; image: null; open_hours: string; maps_link: null
    latitude: number; longitude: number; hidden: true; import_source: "google"; google_place_id: string
  }
  type Tally = { devueltos_por_google: number; descartados: Record<string, number>; fuera_del_municipio: number; ya_existian: number; nuevos: number }
  const rows: Row[] = []
  const resumen: Record<string, Tally> = {}
  for (const { cat, r } of results) {
    const tally: Tally = { devueltos_por_google: r.places.size, descartados: {}, fuera_del_municipio: 0, ya_existian: 0, nuevos: 0 }
    resumen[cat.category] = tally
    for (const p of r.places.values()) {
      const v = judgeGooglePlace(cat.key, p)
      if (!v.ok) { tally.descartados[v.reason] = (tally.descartados[v.reason] || 0) + 1; continue }
      if (!insideBoundary(boundary, v.lat, v.lon)) { tally.fuera_del_municipio++; continue }
      if (knownIds.has(v.id) || isDuplicateEssential(existing, { category: cat.category, name: v.name, lat: v.lat, lon: v.lon })) { tally.ya_existian++; continue }
      knownIds.add(v.id)
      existing.push({ category: cat.category, norm: normalize(v.name), lat: v.lat, lon: v.lon })
      tally.nuevos++
      rows.push({
        name: v.name,
        category: cat.category,
        subcategory: null,
        address: v.address,
        neighborhood: area.city,
        description: null,
        image: null,
        open_hours: v.openHours,
        maps_link: null,
        latitude: v.lat,
        longitude: v.lon,
        hidden: true,
        import_source: "google",
        google_place_id: v.id,
      })
    }
  }

  const llamadas = counter.count
  const gasto = {
    llamadas_a_google: llamadas,
    coste_estimado_usd: estimateCostUsd(llamadas),
    nota_coste: "Sin descontar las 1.000 llamadas gratis al mes de este tipo. Google cobra 35 $ por cada 1.000.",
    tope_diario: dailyLimit(),
    usadas_hoy_antes_de_esta_busqueda: budget.used,
    quedan_hoy: Math.max(0, dailyLimit() - budget.used - llamadas),
  }
  const incompleto = detenido
    ? {
        aviso: "La búsqueda se cortó antes de terminar: lo de abajo es solo lo que dio tiempo a mirar. Vuelve a lanzarla cuando haya llamadas disponibles (lo ya importado no se duplica).",
        motivo: detenido,
        consultas_sin_hacer: consultasSinHacer,
      }
    : false

  if (dry) {
    return NextResponse.json({
      modo: "VISTA PREVIA (no se ha escrito nada, pero SÍ se ha llamado a Google: esas llamadas ya están gastadas). Marca «Importar de verdad» para guardar.",
      area: area.city,
      categoria: searchParams.get("cat") || "all",
      ...gasto,
      incompleto,
      nuevos_total: rows.length,
      por_categoria: resumen,
      muestra: rows.slice(0, 60).map((r) => `${r.category} · ${r.name} · ${r.open_hours} · ${r.address ?? r.neighborhood}`),
    })
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase.from("essentials").insert(chunk)
    if (error) {
      return NextResponse.json({ error: error.message, insertados_antes_del_error: inserted, ...gasto }, { status: 500 })
    }
    inserted += chunk.length
  }
  return NextResponse.json({
    modo: "IMPORTADO. Todo entra oculto: revísalo en Admin › Esenciales y publica lo que esté bien.",
    area: area.city,
    categoria: searchParams.get("cat") || "all",
    ...gasto,
    incompleto,
    insertados: inserted,
    por_categoria: resumen,
    muestra: rows.slice(0, 60).map((r) => `${r.category} · ${r.name} · ${r.open_hours} · ${r.address ?? r.neighborhood}`),
  })
}
