import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"
import { hedgedOverpass } from "@/lib/overpassHedged"
import { AREAS, normalize, meters, cityFor } from "@/lib/osmAreas"
import { NIGHT_NAME_OVERPASS, isNightlifeVenue, venueTypeOf, venueFlagsOf } from "@/lib/osmVenues"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Importa discotecas, pubs, salas de música y bares nocturnos desde OpenStreetMap (gratis, sin
// tocar la cuota de Google). Todo entra OCULTO (hidden = true) y marcado con import_source = 'osm'
// para poder revisarlo antes de publicar. Se salta lo que ya existe en la tabla.
//
//   Vista previa (no escribe nada):
//   /api/admin/import-osm-clubs?area=barcelona
//   Importar de verdad:
//   /api/admin/import-osm-clubs?area=barcelona&dry=0
//   area = barcelona | hospitalet | badalona | elprat | santacoloma | cornella | santadria | esplugues | santfeliu | santboi

function cleanUrl(v?: string): string | null {
  if (!v) return null
  const u = v.trim()
  return /^https?:\/\//i.test(u) ? u.slice(0, 300) : null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const areaKey = (searchParams.get("area") || "").toLowerCase()
  const area = AREAS[areaKey]
  if (!area) return NextResponse.json({ error: `area debe ser una de: ${Object.keys(AREAS).join(", ")}` }, { status: 400 })
  const dry = searchParams.get("dry") !== "0"

  // Solo se piden discotecas, salas de música y karaokes, y pubs o bares con señales claras de noche
  // (etiquetas de música/baile/karaoke, o un nombre tipo club/sala/lounge/jazz...). La lista de
  // palabras del nombre está en lib/osmVenues.ts y es la misma con la que luego se filtra.
  const nameRx = NIGHT_NAME_OVERPASS
  const blocksFor = (scope: string) => [
    `nwr${scope}["amenity"~"^(nightclub|music_venue|karaoke_box)$"]["name"];`,
    `nwr${scope}["amenity"~"^(pub|bar)$"]["name"]["live_music"="yes"];`,
    `nwr${scope}["amenity"~"^(pub|bar)$"]["name"]["dance"="yes"];`,
    `nwr${scope}["amenity"~"^(pub|bar)$"]["name"]["karaoke"="yes"];`,
    `nwr${scope}["amenity"~"^(pub|bar)$"]["name"~"${nameRx}",i];`,
  ]

  const MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
  ]

  // Una consulta con varios servidores como respaldo. Devuelve null si ninguno responde a tiempo.
  async function runQuery(query: string, perTryMs: number, errors: string[]): Promise<any[] | null> {
    for (const url of MIRRORS) {
      try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), perTryMs)
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NoctuaApp/1.0 (info@noctuaapp.com)" },
          body: "data=" + encodeURIComponent(query),
          signal: ctrl.signal,
        })
        clearTimeout(timer)
        if (!res.ok) { errors.push(`${new URL(url).host}: ${res.status}`); continue }
        const json = await res.json()
        if (json.remark && /runtime error|timed out|out of memory/i.test(String(json.remark))) {
          errors.push(`${new URL(url).host}: ${String(json.remark).slice(0, 120)}`)
          continue
        }
        return json.elements || []
      } catch (e: any) {
        errors.push(`${new URL(url).host}: ${e.name === "AbortError" ? "tiempo agotado" : e.message}`)
      }
    }
    return null
  }

  const errors: string[] = []
  let elements: any[] = []
  let tilesInfo: { ok: number; failed: number } | null = null

  if (areaKey === "barcelona") {
    // Barcelona por cuadrículas: 12 consultas pequeñas (4 x 3) en vez de una enorme.
    const S = 41.315, N = 41.470, W = 2.050, E = 2.232
    const rows = 3, cols = 4
    const tiles: string[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s0 = S + ((N - S) * r) / rows, n0 = S + ((N - S) * (r + 1)) / rows
        const w0 = W + ((E - W) * c) / cols, e0 = W + ((E - W) * (c + 1)) / cols
        tiles.push(`(${s0.toFixed(5)},${w0.toFixed(5)},${n0.toFixed(5)},${e0.toFixed(5)})`)
      }
    }
    const startedAt = Date.now()
    const seenIds = new Set<string>()
    const BUDGET = 52000
    let pending = [...tiles]
    // Hasta 3 pasadas: lo que falla en una se reintenta en la siguiente, con 4 cuadrículas en paralelo.
    for (let pass = 0; pass < 3 && pending.length > 0; pass++) {
      const stillFailing: string[] = []
      for (let i = 0; i < pending.length; i += 4) {
        const batch = pending.slice(i, i + 4)
        if (Date.now() - startedAt > BUDGET - 9000) { stillFailing.push(...batch); continue }
        const results = await Promise.all(batch.map(async (bb) => {
          const q = `[out:json][timeout:12];\n(\n  ${blocksFor(bb).join("\n  ")}\n);\nout center tags;`
          return { bb, els: await runQuery(q, 9000, errors) }
        }))
        for (const r of results) {
          if (r.els === null) { stillFailing.push(r.bb); continue }
          for (const el of r.els) {
            const id = `${el.type}${el.id}`
            if (seenIds.has(id)) continue
            seenIds.add(id)
            elements.push(el)
          }
        }
      }
      pending = stillFailing
    }
    const failed = pending.length
    const ok = tiles.length - failed
    tilesInfo = { ok, failed }
    if (ok === 0) {
      return NextResponse.json({ error: "Ninguna cuadrícula respondió. OpenStreetMap está caído ahora mismo.", detalle: errors.slice(0, 6) }, { status: 502 })
    }
  } else {
    // Un municipio es una sola consulta. Se pregunta a los servidores en escalón (12 s entre uno y
    // otro) y se corta a los 50 s, para quedar siempre por debajo del minuto de la función: antes un
    // servidor colgado agotaba el minuto y la web devolvía un 504 sin explicación.
    const q = `[out:json][timeout:40];\narea["boundary"="administrative"]["admin_level"="8"]["name"~"^${area.osmPattern}$"]->.a;\n(\n  ${blocksFor("(area.a)").join("\n  ")}\n);\nout center tags;`
    const els = await hedgedOverpass({ mirrors: MIRRORS, query: q, totalMs: 50000, staggerMs: 12000, errors })
    if (els === null) {
      return NextResponse.json({ error: "Los servidores de OpenStreetMap no respondieron. Prueba otra vez en uno o dos minutos.", detalle: errors }, { status: 502 })
    }
    elements = els
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
    if (!isNightlifeVenue(tags)) { skippedBar++; continue }

    const norm = normalize(name)
    if (isDup(norm, lat, lon)) { skippedDup++; continue }
    seen.push({ norm, lat, lon })

    const street = tags["addr:street"]
    const cityName = cityFor(tags, area.city)
    const address = street
      ? [street + (tags["addr:housenumber"] ? ", " + tags["addr:housenumber"] : ""), tags["addr:postcode"], cityName].filter(Boolean).join(", ")
      : null
    const venue_type = venueTypeOf(tags)

    rows.push({
      name: name.slice(0, 120),
      neighborhood: tags["addr:suburb"] || tags["addr:district"] || cityName,
      city: cityName,
      address,
      latitude: lat,
      longitude: lon,
      venue_type,
      ...venueFlagsOf(tags, venue_type),
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
      ...(tilesInfo ? { cuadriculas_ok: tilesInfo.ok, cuadriculas_fallidas: tilesInfo.failed, aviso: tilesInfo.failed ? "Faltan zonas: repite la URL para completar (no se duplica nada al importar)." : undefined } : {}),
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
  return NextResponse.json({
    area: area.city,
    insertados: inserted,
    ocultos: true,
    ...(tilesInfo ? { cuadriculas_ok: tilesInfo.ok, cuadriculas_fallidas: tilesInfo.failed, aviso: tilesInfo.failed ? "Faltan zonas: repite la URL hasta que cuadriculas_fallidas sea 0 (no se duplica nada)." : undefined } : {}),
    ya_existian: skippedDup,
  })
}
