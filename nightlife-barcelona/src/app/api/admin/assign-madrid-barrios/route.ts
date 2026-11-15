import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"
import { cityOfClub } from "@/lib/cities"
import { madridZoneOf } from "@/lib/madridZones"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Barrios de Madrid para los locales que ya están en la tabla (14/11/2026, Fase C de Madrid).
//
// El importador de OpenStreetMap ya pone el barrio «de toda la vida» (Malasaña, Chueca, La Latina…, ver lib/madridZones.ts) a los
// locales NUEVOS de Madrid. Esta herramienta hace lo mismo con los que ya importaste antes: según sus coordenadas, los que caen en una
// de las 12 zonas reciben su nombre.
//
// Qué toca y qué no:
//   - Por defecto SOLO locales de Madrid con el barrio vacío o «Madrid» (el que pone el importador cuando OpenStreetMap no trae barrio).
//     Cualquier barrio que hayas escrito a mano se queda como está.
//   - Con &osm=1 entran también los importados de OpenStreetMap (import_source = 'osm') aunque traigan otro barrio (p. ej. «Universidad»):
//     útil para unificarlos, pero pisa un barrio que hubieras corregido a mano en uno de ellos. Mira la vista previa antes.
//   - Los locales que no caen en ninguna de las 12 zonas no se tocan.
//
//   Vista previa (no escribe nada):  /api/admin/assign-madrid-barrios
//   Aplicar de verdad:               /api/admin/assign-madrid-barrios?dry=0
//   Incluir los de OpenStreetMap:    añade &osm=1

type Row = {
  id: string | number
  name: string | null
  neighborhood: string | null
  city: string | null
  latitude: number | string | null
  longitude: number | string | null
  import_source: string | null
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const dry = searchParams.get("dry") !== "0"
  const includeOsm = searchParams.get("osm") === "1"

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Todos los locales de Madrid, de mil en mil (Supabase devuelve como mucho 1000 filas por petición).
  const madrid: Row[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, neighborhood, city, latitude, longitude, import_source")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const r of (data || []) as Row[]) if (cityOfClub(r) === "madrid") madrid.push(r)
    if (!data || data.length < PAGE) break
  }

  const isEmpty = (v: string | null) => !v || !v.trim() || /^\s*madrid\s*$/i.test(v)
  const byZone: Record<string, (string | number)[]> = {}
  const sample: string[] = []
  let eligible = 0
  let outsideZones = 0
  let unchanged = 0
  let keptManual = 0
  for (const r of madrid) {
    const canChange = isEmpty(r.neighborhood) || (includeOsm && r.import_source === "osm")
    if (!canChange) { keptManual++; continue }
    eligible++
    const zone = madridZoneOf(r.latitude, r.longitude)
    if (!zone) { outsideZones++; continue }
    if (zone === (r.neighborhood || "").trim()) { unchanged++; continue }
    ;(byZone[zone] ||= []).push(r.id)
    if (sample.length < 40) sample.push(`${r.name || "(sin nombre)"}: ${r.neighborhood?.trim() || "(vacío)"} → ${zone}`)
  }
  const toChange = Object.values(byZone).reduce((n, ids) => n + ids.length, 0)
  const countsByZone = Object.fromEntries(Object.entries(byZone).map(([z, ids]) => [z, ids.length]))

  if (dry) {
    return NextResponse.json({
      modo: "VISTA PREVIA (no se ha escrito nada). Añade &dry=0 para aplicar.",
      incluye_importados_de_osm: includeOsm,
      locales_de_madrid: madrid.length,
      candidatos: eligible,
      con_barrio_propio_que_no_se_toca: keptManual,
      fuera_de_las_12_zonas: outsideZones,
      ya_correctos: unchanged,
      se_cambiarian: toChange,
      por_zona: countsByZone,
      muestra: sample,
    })
  }

  let updated = 0
  for (const [zone, ids] of Object.entries(byZone)) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100)
      const { error } = await supabase.from("clubs").update({ neighborhood: zone }).in("id", chunk)
      if (error) return NextResponse.json({ error: error.message, actualizados_antes_del_error: updated }, { status: 500 })
      updated += chunk.length
    }
  }
  return NextResponse.json({
    incluye_importados_de_osm: includeOsm,
    locales_de_madrid: madrid.length,
    actualizados: updated,
    por_zona: countsByZone,
    fuera_de_las_12_zonas: outsideZones,
    con_barrio_propio_que_no_se_toca: keptManual,
  })
}
