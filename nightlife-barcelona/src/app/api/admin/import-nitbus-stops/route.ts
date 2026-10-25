import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Paradas de Nitbus desde OpenStreetMap (25/10/2026, "arreglar todo el tema Nitbus").
//
// Antes la web solo conocía la lista de líneas: no había paradas, así que la página de Nitbus no
// tenía mapa ni "parada más cercana", y las fichas de club solo enseñaban líneas que alguien
// hubiese escrito a mano. Las paradas oficiales (AMB/TMB) solo se publican como plano en imagen
// o en un servicio con clave, pero OpenStreetMap tiene cada línea N con sus paradas en orden.
//
// Qué hace: pide a OpenStreetMap todas las líneas de bus con número N (N0...N28) del área de
// Barcelona, junta las paradas de todas ellas (una parada por la que pasan varias líneas queda
// como una sola, con todas sus líneas) y las guarda como esenciales de la categoría "Nitbus",
// marcadas con import_source = 'osm'. Cada vez que se ejecuta, REEMPLAZA las importadas antes
// (las que hayas creado tú a mano en el admin no se tocan).
//
//   Vista previa (no escribe nada):  /api/admin/import-nitbus-stops
//   Importar de verdad:              /api/admin/import-nitbus-stops?dry=0

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

// Área metropolitana (de Castelldefels/aeropuerto a Montgat/Tiana).
const BBOX = "41.24,1.92,41.56,2.33"

type OsmMember = { type: string; ref: number; role: string }
type OsmElement = {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  tags?: Record<string, string>
  members?: OsmMember[]
}

function meters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const rad = (v: number) => (v * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function lineSort(a: string, b: string): number {
  return Number(a.slice(1)) - Number(b.slice(1))
}

function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").replace(/^(parada|stop)\s*[:\-]?\s*/i, "").trim()
}

// Se pregunta a los tres servidores A LA VEZ y vale la primera respuesta buena. Antes se probaban
// uno detrás de otro con 25 s cada uno: si el primero iba lento, se pasaba del minuto que Vercel
// deja a cada petición y salía "Respuesta no válida (504)".
async function runQuery(query: string, errors: string[]): Promise<OsmElement[] | null> {
  const controllers = MIRRORS.map(() => new AbortController())
  const attempt = async (url: string, i: number): Promise<OsmElement[]> => {
    const timer = setTimeout(() => controllers[i].abort(), 40000)
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NoctuaApp/1.0 (info@noctuaapp.com)" },
        body: "data=" + encodeURIComponent(query),
        signal: controllers[i].signal,
      })
      if (!res.ok) throw new Error(`${new URL(url).host}: ${res.status}`)
      const json = await res.json()
      if (json.remark && /runtime error|timed out|out of memory/i.test(String(json.remark))) {
        throw new Error(`${new URL(url).host}: ${String(json.remark).slice(0, 120)}`)
      }
      return (json.elements || []) as OsmElement[]
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string }
      const msg = err.name === "AbortError" ? `${new URL(url).host}: tiempo agotado` : String(err.message)
      errors.push(msg)
      throw e
    } finally {
      clearTimeout(timer)
    }
  }
  // La primera que responda bien gana; si fallan las tres, null.
  return new Promise<OsmElement[] | null>((resolve) => {
    let pending = MIRRORS.length
    let done = false
    MIRRORS.forEach((url, i) => {
      attempt(url, i)
        .then((els) => {
          if (done) return
          done = true
          controllers.forEach((c, j) => j !== i && c.abort()) // las otras ya no hacen falta
          resolve(els)
        })
        .catch(() => {
          pending -= 1
          if (pending === 0 && !done) resolve(null)
        })
    })
  })
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const dry = new URL(req.url).searchParams.get("dry") !== "0"

  // Las líneas (relaciones de ruta) con sus miembros, y los nodos de esas líneas.
  // "out;" (no "out tags;") en los nodos: sin eso OpenStreetMap no manda las coordenadas.
  const query = `[out:json][timeout:35];
rel["type"="route"]["route"~"^(bus|night_bus)$"]["ref"~"^N[0-9]{1,2}$"](${BBOX})->.lines;
.lines out body;
node(r.lines);
out;`

  const errors: string[] = []
  const elements = await runQuery(query, errors)
  if (elements === null) {
    return NextResponse.json(
      { error: "Los servidores de OpenStreetMap no respondieron. Prueba otra vez en uno o dos minutos.", detalle: errors },
      { status: 502 }
    )
  }

  const nodes = new Map<number, OsmElement>()
  const routes: OsmElement[] = []
  for (const el of elements) {
    if (el.type === "node") nodes.set(el.id, el)
    else if (el.type === "relation") routes.push(el)
  }
  if (routes.length === 0) {
    return NextResponse.json({ error: "OpenStreetMap no ha devuelto ninguna línea N. Prueba otra vez más tarde.", detalle: errors }, { status: 502 })
  }

  // Nodo de parada → líneas que paran ahí. Se usan las "platform" (el poste/marquesina, donde
  // espera la gente); si una línea no tiene ninguna, sus "stop" (punto en la calzada).
  const linesByNode = new Map<number, Set<string>>()
  const linesFound = new Set<string>()
  for (const r of routes) {
    const ref = (r.tags?.ref || "").toUpperCase().trim()
    if (!/^N\d{1,2}$/.test(ref)) continue
    linesFound.add(ref)
    const members = (r.members || []).filter((m) => m.type === "node")
    const platforms = members.filter((m) => /^platform/.test(m.role))
    const chosen = platforms.length > 0 ? platforms : members.filter((m) => /^stop/.test(m.role))
    for (const m of chosen) {
      if (!nodes.has(m.ref)) continue
      if (!linesByNode.has(m.ref)) linesByNode.set(m.ref, new Set())
      linesByNode.get(m.ref)!.add(ref)
    }
  }

  // Agrupar: la misma parada a veces aparece dos veces (una por sentido, o poste + punto de
  // calzada). Se juntan las que están a menos de 30 m con el mismo nombre (o sin nombre).
  type Stop = { name: string; code: string | null; lat: number; lon: number; lines: Set<string> }
  const stops: Stop[] = []
  for (const [id, lineSet] of linesByNode) {
    const n = nodes.get(id)!
    if (typeof n.lat !== "number" || typeof n.lon !== "number") continue
    const name = cleanName(n.tags?.name || n.tags?.["name:ca"] || n.tags?.["name:es"] || "")
    const code = (n.tags?.ref || n.tags?.["ref:tmb"] || n.tags?.["ref:amb"] || "").trim() || null
    const twin = stops.find(
      (s) => meters(s.lat, s.lon, n.lat!, n.lon!) < 30 && (!name || !s.name || s.name.toLowerCase() === name.toLowerCase())
    )
    if (twin) {
      lineSet.forEach((l) => twin.lines.add(l))
      if (!twin.name && name) twin.name = name
      if (!twin.code && code) twin.code = code
      continue
    }
    stops.push({ name, code, lat: n.lat, lon: n.lon, lines: new Set(lineSet) })
  }

  const rows = stops.map((s) => {
    const lines = Array.from(s.lines).sort(lineSort)
    return {
      name: (s.name || `Parada Nitbus ${lines.join(" · ")}`).slice(0, 120),
      category: "Nitbus",
      subcategory: lines.join(", "),
      latitude: Number(s.lat.toFixed(6)),
      longitude: Number(s.lon.toFixed(6)),
      description: s.code ? `Parada ${s.code}` : null,
      open_hours: null,
      hidden: false,
      // Que la tarea nocturna de Google NO busque cada parada (serían ~1.000 búsquedas de pago al
      // día para nada: una parada de bus no tiene fotos ni reseñas útiles).
      manual_photos: true,
      import_source: "osm",
    }
  })

  const perLine: Record<string, number> = {}
  for (const r of rows) for (const l of r.subcategory.split(", ")) perLine[l] = (perLine[l] || 0) + 1
  const lineasOrdenadas = Object.keys(perLine).sort(lineSort)

  if (dry) {
    return NextResponse.json({
      modo: "VISTA PREVIA (no se ha escrito nada). Marca «Importar de verdad» para guardarlas.",
      lineas_encontradas: lineasOrdenadas.length,
      paradas: rows.length,
      paradas_por_linea: Object.fromEntries(lineasOrdenadas.map((l) => [l, perLine[l]])),
      muestra: rows.slice(0, 25).map((r) => `${r.name} (${r.subcategory})`),
    })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Reemplazar las importadas antes (las creadas a mano no llevan import_source = 'osm').
  const { error: delErr } = await supabase.from("essentials").delete().eq("category", "Nitbus").eq("import_source", "osm")
  if (delErr) {
    return NextResponse.json(
      { error: delErr.message, pista: "¿Has ejecutado supabase/32_analitica_y_nitbus.sql? Crea la columna import_source en essentials." },
      { status: 500 }
    )
  }

  let inserted = 0
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    const { error } = await supabase.from("essentials").insert(chunk)
    if (error) {
      return NextResponse.json({ error: error.message, insertadas_antes_del_error: inserted }, { status: 500 })
    }
    inserted += chunk.length
  }

  return NextResponse.json({
    lineas: lineasOrdenadas.length,
    paradas_guardadas: inserted,
    paradas_por_linea: Object.fromEntries(lineasOrdenadas.map((l) => [l, perLine[l]])),
  })
}
