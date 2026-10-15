import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { isAdminRequest } from "@/lib/adminAuth"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// Importa las sesiones semanales (club_sessions) de un club leyendo su propia página de venta de
// entradas en Fourvenues (la plataforma de ticketing que usan Wolf y muchos otros clubs de
// Barcelona). No es un scraper de HTML frágil: Fourvenues incrusta en cada página los datos del
// evento como JSON-LD (schema.org Event/MusicEvent, lo que usa Google para las fichas enriquecidas
// de búsqueda), así que se lee ese bloque de datos estructurados en vez de intentar interpretar el
// diseño visual de la página — si Fourvenues rediseña la web, esto sigue funcionando igual.
//
//   Vista previa (no escribe nada):
//   /api/admin/import-fourvenues-sessions?venueUrl=https://site.fourvenues.com/es/wolf-barcelona&club=Wolf Barcelona
//   Importar de verdad:
//   ...&dry=0
//
// Cómo decide qué es una "sesión" recurrente (p.ej. "los jueves es WOLFEO") y qué es un evento
// suelto (un concierto puntual que no se repite): agrupa los próximos eventos de la página por día
// de la semana + nombre exacto. Si el mismo nombre aparece 2 o más veces en el mismo día de la
// semana, se considera una sesión fija de ese día; si solo aparece una vez, se enseña igualmente
// en la vista previa pero no se importa solo, para no colar un concierto suelto como si fuera un
// fijo semanal.

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

type JsonLdEvent = { name?: string; startDate?: string; url?: string; [k: string]: unknown }
type Offer = { name?: string; price?: number | string; priceCurrency?: string }

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]))
    } catch {
      // Bloque de JSON-LD inválido o truncado: se ignora, no se para la importación por esto.
    }
  }
  return blocks
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; NoctuaBot/1.0; +https://noctuaapp.com)" },
    redirect: "follow",
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`)
  return res.text()
}

// El "día" de un evento es el que marca su hora local tal cual la escribe Fourvenues (con su
// propio desfase horario incluido en el ISO, p.ej. "2026-10-16T00:30:00+02:00"): si se convirtiera
// con Date.getDay() saldría el día en la zona horaria del servidor (UTC en Vercel), y una sesión
// que empieza a las 00:30 de la madrugada del jueves aparecería como si fuera miércoles. Se coge
// el trozo de fecha tal cual está escrito y se calcula el día de la semana a partir de ahí.
function weekdayEs(iso: string): string | null {
  const datePart = (iso || "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
  const d = new Date(datePart + "T12:00:00Z")
  if (isNaN(d.getTime())) return null
  return DAY_NAMES[d.getUTCDay()]
}

function findItemList(blocks: unknown[]): JsonLdEvent[] | null {
  for (const b of blocks) {
    const obj = b as Record<string, unknown>
    const items = obj?.itemListElement
    if (Array.isArray(items) && items.length > 0) {
      return items
        .map((it) => (it as Record<string, unknown>)?.item as JsonLdEvent)
        .filter((ev): ev is JsonLdEvent => !!ev && typeof ev.name === "string")
    }
  }
  return null
}

function findEventDetail(blocks: unknown[]): { offers: Offer[]; typicalAgeRange?: string } | null {
  for (const b of blocks) {
    const obj = b as Record<string, unknown>
    const type = String(obj?.["@type"] || "")
    if (/Event/i.test(type) && Array.isArray(obj.offers)) {
      return { offers: obj.offers as Offer[], typicalAgeRange: obj.typicalAgeRange as string | undefined }
    }
  }
  return null
}

function priceSummary(offers: Offer[]): string {
  return offers
    .filter((o) => o && o.name && o.price != null)
    .map((o) => `${String(o.name).trim()} ${o.price}€`)
    .join(" · ")
    .slice(0, 300)
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const venueUrl = searchParams.get("venueUrl") || ""
  const clubQuery = searchParams.get("club") || ""
  const clubIdParam = searchParams.get("clubId")
  const dry = searchParams.get("dry") !== "0"

  if (!venueUrl) return NextResponse.json({ error: "Falta venueUrl (el enlace a la página del club en Fourvenues)." }, { status: 400 })
  let host = ""
  try {
    host = new URL(venueUrl).hostname
  } catch {
    return NextResponse.json({ error: "venueUrl no es una URL válida." }, { status: 400 })
  }
  if (!/fourvenues\.com$/i.test(host)) {
    return NextResponse.json({ error: "Esta herramienta solo sabe leer páginas de Fourvenues (site.fourvenues.com/...)." }, { status: 400 })
  }
  if (!dry && !clubQuery && !clubIdParam) {
    return NextResponse.json({ error: "Para importar de verdad hace falta club (nombre) o clubId." }, { status: 400 })
  }

  let venueHtml: string
  try {
    venueHtml = await fetchHtml(venueUrl)
  } catch (e) {
    return NextResponse.json({ error: `No se pudo leer ${venueUrl}: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 })
  }

  const events = findItemList(extractJsonLdBlocks(venueHtml))
  if (!events) {
    return NextResponse.json({ error: "No se encontraron eventos (JSON-LD) en esa página. ¿Es la página principal del club en Fourvenues?" }, { status: 502 })
  }

  const now = Date.now()
  const upcoming = events
    .map((ev) => ({ ...ev, weekday: ev.startDate ? weekdayEs(ev.startDate) : null }))
    .filter((ev) => ev.weekday && ev.startDate && new Date(ev.startDate).getTime() > now && ev.url)

  // Agrupa por día de la semana + nombre exacto, y se queda con la próxima fecha de cada grupo.
  const groups = new Map<string, { weekday: string; name: string; count: number; nextUrl: string; nextDate: string }>()
  for (const ev of upcoming) {
    const key = `${ev.weekday}||${ev.name}`
    const g = groups.get(key)
    if (!g) {
      groups.set(key, { weekday: ev.weekday as string, name: ev.name as string, count: 1, nextUrl: ev.url as string, nextDate: ev.startDate as string })
    } else {
      g.count++
      if (new Date(ev.startDate as string).getTime() < new Date(g.nextDate).getTime()) {
        g.nextUrl = ev.url as string
        g.nextDate = ev.startDate as string
      }
    }
  }

  const recurring = Array.from(groups.values()).filter((g) => g.count >= 2)
  const oneOff = Array.from(groups.values()).filter((g) => g.count < 2)

  // Para cada sesión recurrente, se lee la próxima fecha concreta para sacar el precio real de
  // las entradas (eso no sale en el listado del club, solo en la ficha de cada evento).
  const preview: { day_of_week: string; name: string; music: null; price: string; dresscode: null; sort_order: number; apariciones_detectadas: number }[] = []
  const dayOrder = (d: string) => (DAY_NAMES.indexOf(d) + 6) % 7 // Lunes primero
  recurring.sort((a, b) => dayOrder(a.weekday) - dayOrder(b.weekday))

  for (let i = 0; i < recurring.length; i++) {
    const g = recurring[i]
    let price = ""
    try {
      const detailHtml = await fetchHtml(g.nextUrl)
      const detail = findEventDetail(extractJsonLdBlocks(detailHtml))
      if (detail) price = priceSummary(detail.offers)
    } catch {
      // Si falla la ficha de un evento concreto, se sigue con el resto en vez de abortar todo.
    }
    preview.push({
      day_of_week: g.weekday,
      name: g.name.trim(),
      music: null,
      price,
      dresscode: null,
      sort_order: i + 1,
      apariciones_detectadas: g.count,
    })
  }

  if (dry) {
    return NextResponse.json({
      modo: "VISTA PREVIA (no se ha escrito nada). Añade &dry=0 (y club=Nombre del club, tal cual está en tu tabla) para importar.",
      eventos_leidos: events.length,
      proximos_eventos: upcoming.length,
      sesiones_recurrentes_detectadas: preview,
      eventos_sueltos_no_importados: oneOff.map((g) => ({ dia: g.weekday, nombre: g.name, proxima_fecha: g.nextDate })),
    })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  let clubId: number | null = clubIdParam ? Number(clubIdParam) : null
  if (!clubId) {
    const { data: matches, error: findErr } = await supabase.from("clubs").select("id, name").ilike("name", `%${clubQuery}%`)
    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
    if (!matches || matches.length === 0) return NextResponse.json({ error: `Ningún club coincide con "${clubQuery}".` }, { status: 404 })
    if (matches.length > 1) {
      return NextResponse.json({ error: `Varios clubs coinciden con "${clubQuery}", usa clubId en vez de club.`, coincidencias: matches }, { status: 409 })
    }
    clubId = matches[0].id
  }

  const { data: already, error: exErr } = await supabase.from("club_sessions").select("day_of_week, name").eq("club_id", clubId)
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })
  const existingKeys = new Set((already || []).map((s) => `${s.day_of_week}||${s.name}`))

  const rows = preview
    .filter((p) => !existingKeys.has(`${p.day_of_week}||${p.name}`))
    .map((p) => ({
      club_id: clubId,
      day_of_week: p.day_of_week,
      name: p.name,
      music: p.music,
      price: p.price,
      dresscode: p.dresscode,
      sort_order: p.sort_order,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ insertadas: 0, motivo: "Todas las sesiones detectadas ya existían para este club (por día + nombre)." })
  }

  const { error: insErr } = await supabase.from("club_sessions").insert(rows)
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  return NextResponse.json({ club_id: clubId, insertadas: rows.length, sesiones: rows })
}
