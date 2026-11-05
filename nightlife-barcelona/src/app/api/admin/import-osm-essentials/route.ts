import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"
import { fetchAreaElements } from "@/lib/osmAreaFetch"
import { staticBoundary } from "@/lib/osmBoundaries"
import { AREAS, cityFor, normalize } from "@/lib/osmAreas"
import { ESSENTIAL_TYPES, essentialAddress, essentialContact, isDuplicateEssential, judgeEssential, osmMatches, osmSourceUrl, typesFor, type ExistingEssential } from "@/lib/osmEssentials"
import { clubsNearCount, type ClubPoint } from "@/lib/parkingNearClubs"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Importa esenciales para la noche desde OpenStreetMap (gratis, sin tocar la cuota de Google):
// farmacias, cajeros, comida, supermercados, gasolineras y hospitales que abren las 24 h o cierran
// pasada la 1:00. Todo entra OCULTO (hidden = true) y marcado con import_source = 'osm' para
// revisarlo antes de publicar. Se salta lo que ya existe (misma categoría y mismo sitio).
//
//   Vista previa (no escribe nada):  /api/admin/import-osm-essentials?area=badalona&cat=all
//   Importar de verdad:              /api/admin/import-osm-essentials?area=badalona&cat=all&dry=0
//   area = igual que el importador de locales
//   cat  = all | pharmacy | atm | food | supermarket | gas | hospital | parking
//          | taxi | veterinary | toilets | vending | luggage | police | bicing
//   «all» son solo las seis primeras de la lista (las de siempre); parking y las nuevas se piden de una en una.
//   En Barcelona conviene ir categoría a categoría: son muchos datos para una sola consulta.
//
// Categorías nuevas (5/11/2026): taxi, veterinary, toilets, vending, luggage, police y bicing. Necesitan el
// SQL 82 (columnas phone, website, source, source_url, attrs…). Entran ocultas y con verification_status
// «unverified»: en la web salen como «horario sin confirmar» hasta que se verifican en Admin › Esenciales.
// Bicing trae solo la ubicación de las estaciones (no las bicis libres en directo).
//
// Parkings (2/11/2026): solo gratuitos y públicos, y solo los que tienen algún club publicado a menos de
// 1.200 m (unos 15 min andando): un parking gratis a 5 km de cualquier club no sirve para salir de
// fiesta y llenaría la lista. Para traerlos todos, añade &clubs=0. «cat=all» no incluye parkings.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const areaKey = (searchParams.get("area") || "").toLowerCase()
  const area = AREAS[areaKey]
  if (!area) return NextResponse.json({ error: `area debe ser una de: ${Object.keys(AREAS).join(", ")}` }, { status: 400 })
  const cat = (searchParams.get("cat") || "all").toLowerCase()
  const types = typesFor(cat)
  if (types.length === 0) {
    return NextResponse.json({ error: `cat debe ser una de: all, ${ESSENTIAL_TYPES.map((t) => t.key).join(", ")}` }, { status: 400 })
  }
  const dry = searchParams.get("dry") !== "0"

  const errors: string[] = []
  const got = await fetchAreaElements({
    pattern: area.osmPattern,
    label: area.city,
    blocks: (scope) => types.flatMap((t) => t.selectors.map((sel) => `nwr${scope}${sel};`)),
    errors,
    boundary: staticBoundary(areaKey),
    minAreaKm2: areaKey === "barcelona" ? 60 : undefined,
  })
  if (!got.ok) {
    return NextResponse.json({ error: got.error + (cat === "all" ? " Si vuelve a pasar, elige una sola categoría." : ""), detalle: errors }, { status: got.status })
  }
  const elements = got.elements

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Clubs publicados, solo si se importan parkings (para quedarse con los que tienen un club a pie).
  const onlyNearClubs = types.some((t) => t.key === "parking") && searchParams.get("clubs") !== "0"
  const clubPoints: ClubPoint[] = []
  if (onlyNearClubs) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from("clubs").select("id, name, slug, latitude, longitude").eq("hidden", false).order("id").range(from, from + 999)
      if (error) return NextResponse.json({ error: `No he podido leer los clubs: ${error.message}` }, { status: 500 })
      clubPoints.push(...((data || []) as ClubPoint[]))
      if (!data || data.length < 1000) break
    }
  }

  const existing: ExistingEssential[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("essentials")
      .select("name, category, latitude, longitude")
      .in("category", types.map((t) => t.category))
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
    }
    if (!data || data.length < 1000) break
  }

  // Todas las filas llevan las mismas columnas: al insertar varias de golpe, una que falte en una
  // fila se rellena con null y la base de datos la rechaza.
  type Row = {
    name: string; category: string; subcategory: string | null; address: string | null; neighborhood: string
    description: null; image: null; open_hours: string | null; maps_link: null
    latitude: number; longitude: number; hidden: true; import_source: "osm"
    phone: string | null; website: string | null; is_24h: boolean | null
    source: "osm"; source_url: string | null; verification_status: "unverified"; attrs: Record<string, unknown>
  }
  const rows: Row[] = []
  type Tally = { encontrados_en_osm: number; ya_existian: number; nuevos: number; descartados: Record<string, number> }
  const resumen: Record<string, Tally> = {}
  for (const t of types) resumen[t.category] = { encontrados_en_osm: 0, ya_existian: 0, nuevos: 0, descartados: {} }

  for (const el of elements) {
    const tags: Record<string, string> = el.tags || {}
    const type = types.find((t) => osmMatches(t.key, tags))
    if (!type) continue
    const tally = resumen[type.category]
    tally.encontrados_en_osm++

    const lat = Number(el.lat ?? el.center?.lat)
    const lon = Number(el.lon ?? el.center?.lon)
    if (!isFinite(lat) || !isFinite(lon)) { tally.descartados.sin_coordenadas = (tally.descartados.sin_coordenadas || 0) + 1; continue }

    const verdict = judgeEssential(type, tags)
    if (!verdict.ok) { tally.descartados[verdict.reason] = (tally.descartados[verdict.reason] || 0) + 1; continue }

    if (type.key === "parking" && onlyNearClubs && clubsNearCount(lat, lon, clubPoints) === 0) {
      tally.descartados.sin_club_cerca = (tally.descartados.sin_club_cerca || 0) + 1
      continue
    }

    if (isDuplicateEssential(existing, { category: type.category, name: verdict.name, lat, lon })) { tally.ya_existian++; continue }
    existing.push({ category: type.category, norm: normalize(verdict.name), lat, lon })

    const cityName = cityFor(tags, area.city)
    const contact = essentialContact(tags)
    tally.nuevos++
    rows.push({
      name: verdict.name,
      category: type.category,
      subcategory: verdict.subcategory ?? null,
      address: essentialAddress(tags, cityName),
      neighborhood: tags["addr:suburb"] || tags["addr:district"] || cityName,
      description: null,
      image: null,
      open_hours: verdict.openHours,
      maps_link: null,
      latitude: lat,
      longitude: lon,
      hidden: true,
      import_source: "osm",
      phone: contact.phone,
      website: contact.website,
      is_24h: verdict.openHours === "Open 24 hours" ? true : null,
      source: "osm",
      source_url: osmSourceUrl(el),
      verification_status: "unverified",
      attrs: verdict.attrs ?? {},
    })
  }

  if (dry) {
    return NextResponse.json({
      modo: "VISTA PREVIA (no se ha escrito nada). Marca «Importar de verdad» para guardar.",
      area: area.city,
      categoria: cat,
      descartados_por_estar_fuera_del_municipio: got.descartados_fuera_del_municipio,
      ...(onlyNearClubs ? { parkings_solo_con_club_a_menos_de_1200_m: `${clubPoints.length} clubs publicados mirados` } : {}),
      nuevos_total: rows.length,
      por_categoria: resumen,
      muestra: rows.slice(0, 60).map((r) => `${r.category} · ${r.name} · ${r.open_hours ?? "sin horario"} · ${r.address ?? r.neighborhood}`),
    })
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase.from("essentials").insert(chunk)
    if (error) {
      return NextResponse.json({ error: error.message, insertados_antes_del_error: inserted }, { status: 500 })
    }
    inserted += chunk.length
  }
  return NextResponse.json({
    modo: "IMPORTADO. Todo entra oculto: revísalo en Admin › Esenciales y publica lo que esté bien.",
    area: area.city,
    categoria: cat,
    insertados: inserted,
    por_categoria: resumen,
  })
}
