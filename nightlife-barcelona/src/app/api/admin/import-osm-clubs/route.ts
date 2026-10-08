import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Importa discotecas, pubs, salas de música y bares nocturnos desde OpenStreetMap (gratis, sin
// tocar la cuota de Google). Todo entra OCULTO (hidden = true) y marcado con import_source = 'osm'
// para poder revisarlo antes de publicar. Se salta lo que ya existe en la tabla.
//
//   Vista previa (no escribe nada):
//   /api/admin/import-osm-clubs?secret=TU_ADMIN_SECRET&area=barcelona
//   Importar de verdad:
//   /api/admin/import-osm-clubs?secret=TU_ADMIN_SECRET&area=barcelona&dry=0
//   area = barcelona | hospitalet | badalona

const AREAS: Record<string, { osmPattern: string; city: string }> = {
  barcelona: { osmPattern: "Barcelona", city: "Barcelona" },
  hospitalet: { osmPattern: "[Ll].[Hh]ospitalet de [Ll]lobregat", city: "L'Hospitalet de Llobregat" },
  badalona: { osmPattern: "Badalona", city: "Badalona" },
}

const STOP_WORDS = ["bar", "pub", "club", "discoteca", "cafe", "restaurant", "restaurante", "bcn", "barcelona", "the", "el", "la", "los", "las", "de", "del", "i", "y", "and"]

function normalize(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
  const words = base.split(/\s+/).filter((w) => w && !STOP_WORDS.includes(w))
  return (words.length ? words : base.split(/\s+/).filter(Boolean)).join("")
}

function meters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const rad = (v: number) => (v * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Los "pub" y "bar" de OpenStreetMap en España son, casi todos, bares de barrio. Solo se admiten
// si hay una señal clara de ocio nocturno: música, baile, karaoke o un nombre tipo club/sala.
// Se descartan siempre restaurantes, granjas, tapas y centros culturales.
const NOT_NIGHTLIFE = /(restaur|granja|freidur|bocata|bocadill|cervecer|tapas|menjador|menjar|comedor|centro cultural|agrupaci|casal|panader|pasteler|helader|kebab|pizzer|hamburguesa|pollo|marisquer|mesón|meson|taberna)/i
const NIGHT_NAME = /(music|musical|live|karaoke|lounge|disco|club|sala |cocktail|cocteler|coctel|night|noche|nit|dance|rumba|salsa|latino|latin|jazz|rock|blues|irish|chiringuito|terraza|rooftop)/i

function isNightlifeBar(tags: Record<string, string>): boolean {
  const name = tags.name || ""
  if (NOT_NIGHTLIFE.test(name)) return false
  if (tags.live_music === "yes" || tags.dance === "yes" || tags.karaoke === "yes") return true
  if (tags.music || Object.keys(tags).some((k) => k.startsWith("music:"))) return true
  return NIGHT_NAME.test(name)
}

function cleanUrl(v?: string): string | null {
  if (!v) return null
  const u = v.trim()
  return /^https?:\/\//i.test(u) ? u.slice(0, 300) : null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const areaKey = (searchParams.get("area") || "").toLowerCase()
  const area = AREAS[areaKey]
  if (!area) return NextResponse.json({ error: "area debe ser barcelona, hospitalet o badalona" }, { status: 400 })
  const dry = searchParams.get("dry") !== "0"

  // Consulta ligera: el servidor solo devuelve discotecas/salas de música y los pubs o bares con
  // señales de ocio nocturno (música, baile, karaoke o nombre tipo club/sala). Pedir TODOS los bares
  // de la ciudad saturaba los servidores públicos.
  const nameRx = "music|musical|live|karaoke|lounge|disco|club|sala |cocktail|cocteler|coctel|night|noche|dance|rumba|salsa|latin|jazz|rock|blues|irish|chiringuito|terraza|rooftop"
  const query = `[out:json][timeout:25];
area["boundary"="administrative"]["admin_level"="8"]["name"~"^${area.osmPattern}$"]->.a;
(
  nwr(area.a)["amenity"~"^(nightclub|music_venue)$"]["name"];
  nwr(area.a)["amenity"~"^(pub|bar)$"]["name"]["name"~"${nameRx}",i];
  nwr(area.a)["amenity"~"^(pub|bar)$"]["name"]["live_music"="yes"];
  nwr(area.a)["amenity"~"^(pub|bar)$"]["name"]["dance"="yes"];
  nwr(area.a)["amenity"~"^(pub|bar)$"]["name"]["karaoke"="yes"];
);
out center tags;`

  // Varios servidores espejo: el público de OpenStreetMap se satura a ratos (504).
  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ]
  let elements: any[] | null = null
  const errors: string[] = []
  for (const url of MIRRORS) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 17000)
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NoctuaApp/1.0 (info@noctuaapp.com)" },
        body: "data=" + encodeURIComponent(query),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (!res.ok) {
        const body = (await res.text().catch(() => "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160)
        errors.push(`${new URL(url).host}: ${res.status} ${body}`)
        continue
      }
      const json = await res.json()
      elements = json.elements || []
      break
    } catch (e: any) {
      errors.push(`${new URL(url).host}: ${e.name === "AbortError" ? "tiempo agotado" : e.message}`)
    }
  }
  if (!elements) {
    return NextResponse.json({ error: "Los servidores de OpenStreetMap no respondieron. Prueba otra vez en uno o dos minutos.", detalle: errors }, { status: 502 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing, error: exErr } = await supabase.from("clubs").select("name, latitude, longitude")
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })

  type Seen = { norm: string; lat: number | null; lon: number | null }
  const seen: Seen[] = (existing || []).map((c: any) => ({
    norm: normalize(c.name || ""),
    lat: c.latitude != null ? Number(c.latitude) : null,
    lon: c.longitude != null ? Number(c.longitude) : null,
  }))

  const isDup = (norm: string, lat: number, lon: number) =>
    seen.some((s) => {
      if (!s.norm || !norm) return false
      if (s.norm === norm) return true
      if (s.lat != null && s.lon != null && meters(lat, lon, s.lat, s.lon) < 120) {
        return (s.norm.length >= 5 && norm.includes(s.norm)) || (norm.length >= 5 && s.norm.includes(norm))
      }
      return false
    })

  const rows: any[] = []
  let skippedDup = 0
  let skippedBar = 0
  for (const el of elements) {
    const tags: Record<string, string> = el.tags || {}
    const name = (tags.name || "").trim()
    const lat = Number(el.lat ?? el.center?.lat)
    const lon = Number(el.lon ?? el.center?.lon)
    if (!name || !isFinite(lat) || !isFinite(lon)) continue
    const amenity = tags.amenity
    if (amenity !== "nightclub" && amenity !== "music_venue" && !isNightlifeBar(tags)) { skippedBar++; continue }

    const norm = normalize(name)
    if (isDup(norm, lat, lon)) { skippedDup++; continue }
    seen.push({ norm, lat, lon })

    const street = tags["addr:street"]
    const address = street
      ? [street + (tags["addr:housenumber"] ? ", " + tags["addr:housenumber"] : ""), tags["addr:postcode"], area.city].filter(Boolean).join(", ")
      : null
    const venue_type = amenity === "nightclub" ? "Discoteca" : amenity === "pub" ? "Pub" : "Bar musical"

    rows.push({
      name: name.slice(0, 120),
      neighborhood: tags["addr:suburb"] || tags["addr:district"] || area.city,
      city: area.city,
      address,
      latitude: lat,
      longitude: lon,
      venue_type,
      website: cleanUrl(tags.website || tags["contact:website"]),
      phone: (tags.phone || tags["contact:phone"] || "").slice(0, 30) || null,
      instagram: (tags["contact:instagram"] || "").slice(0, 100) || null,
      hidden: true,
      verified: false,
      import_source: "osm",
    })
  }

  if (dry) {
    return NextResponse.json({
      modo: "VISTA PREVIA (no se ha escrito nada). Añade &dry=0 para importar.",
      area: area.city,
      encontrados_en_osm: elements.length,
      pubs_y_bares_descartados_por_no_ser_nocturnos: skippedBar,
      ya_existian: skippedDup,
      nuevos: rows.length,
      muestra: rows.slice(0, 60).map((r) => `${r.name} (${r.venue_type}) ${r.address || ""}`.trim()),
    })
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error } = await supabase.from("clubs").insert(chunk)
    if (error) {
      return NextResponse.json({ error: error.message, insertados_antes_del_error: inserted, pista: "¿Ejecutaste el SQL 'alter table clubs add column import_source'?" }, { status: 500 })
    }
    inserted += chunk.length
  }
  return NextResponse.json({ area: area.city, insertados: inserted, ocultos: true })
}
