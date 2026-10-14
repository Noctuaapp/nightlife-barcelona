import { NextResponse } from "next/server"
import { isAdminRequest } from "@/lib/adminAuth"
import { isInServiceArea } from "@/lib/coords"

export const dynamic = "force-dynamic"

// Dirección → coordenadas, para el botón "Buscar por la dirección" de los editores del admin.
// Usa OpenStreetMap (Nominatim), como /api/admin/geocode-clubs: sus datos se pueden guardar en la
// base de datos (los del geocodificador gratuito de Mapbox no). Solo para la cuenta de admin.
export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim()
  if (q.length < 4) return NextResponse.json({ error: "Escribe primero la dirección." }, { status: 400 })

  // Si la dirección no dice ciudad, se busca en Barcelona.
  const query = /barcelona|hospitalet|badalona|sitges|lloret|blanes|salou|tarragona|girona|catalu/i.test(q)
    ? q
    : `${q}, Barcelona`

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es" +
      `&viewbox=0.15,42.95,3.35,40.45&q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: { "User-Agent": "NoctuaApp/1.0 (info@noctuaapp.com)", "Accept-Language": "es" },
      cache: "no-store",
    })
    const json = await res.json()
    const hit = Array.isArray(json) ? json[0] : null
    if (!hit) return NextResponse.json({ error: "No se ha encontrado esa dirección." }, { status: 404 })

    const lat = Math.round(Number(hit.lat) * 1e6) / 1e6
    const lng = Math.round(Number(hit.lon) * 1e6) / 1e6
    return NextResponse.json({
      lat,
      lng,
      label: String(hit.display_name || ""),
      inArea: isInServiceArea({ lat, lng }),
    })
  } catch {
    return NextResponse.json({ error: "El buscador de direcciones no responde. Prueba en un rato." }, { status: 502 })
  }
}
