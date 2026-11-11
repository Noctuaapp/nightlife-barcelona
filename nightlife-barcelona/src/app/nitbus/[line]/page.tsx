import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import NitbusLineView from "../../../components/nitbus/NitbusLineView"
import { loadNitbusData, compareLineCodes } from "../../../lib/nitbusRoutes"
import { NIGHT_BUS_LINES, getNightBusLine, parseRoute } from "../../../lib/nightBuses"
import { safeJsonLd } from "../../../lib/structuredData"
import { spanishAlternates } from "../../../lib/intl/site"

// /nitbus/N24: esquema de la línea con todas sus paradas en orden. Se genera al pedirla y se
// regenera cada hora (igual que /barrio/[slug]).
// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ line: string }> }

const getData = cache(async () => loadNitbusData())

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const info = getNightBusLine(code)
  if (!info) {
    // Una línea con paradas en los datos pero fuera del catálogo (N62, N72...): la página se abre, pero sin recorrido
    // descrito no es contenido para Google. Antes salía con el título «Línea no encontrada» y sin noindex, y Google la
    // tomaba por una 404 blanda («Rastreada: actualmente sin indexar», 11/11/2026). Si ni siquiera hay paradas, la página
    // llama a notFound() y responde 404.
    const known = !!(await getData()).lines[code]
    return { title: known ? `Nitbus ${code}: paradas | Noctua` : "Línea no encontrada | Noctua", robots: { index: false, follow: true } }
  }
  const data = await getData()
  const n = data.lines[code]?.stopCount
  const route = parseRoute(info.route)
  const where = route.to ? `${route.from} ↔ ${route.to}` : route.from
  const title = `Nitbus ${code}: paradas y recorrido (${where}) | Noctua`
  const description = `${n ? `Las ${n} paradas` : "Las paradas"} del autobús nocturno ${code} de Barcelona en orden, con transbordos a otras líneas nocturnas y la parada más cercana. ${info.route}.`
  const url = `https://www.noctuaapp.com/nitbus/${code}`
  return { title, description, alternates: spanishAlternates(`/nitbus/${code}`, `/night-bus/${code}`), openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website" } }
}

export default async function NitbusLinePage({ params }: Props) {
  const { line: raw } = await params
  const code = raw.toUpperCase()
  const info = getNightBusLine(code)
  const data = await getData()
  const line = data.lines[code] ?? null
  // Una línea que no está en el catálogo y de la que tampoco hay paradas: no existe.
  if (!info && !line) notFound()

  const allCodes = Array.from(new Set([...Object.keys(NIGHT_BUS_LINES), ...Object.keys(data.lines)])).sort(compareLineCodes)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: "https://www.noctuaapp.com" },
      { "@type": "ListItem", position: 2, name: "Nitbus", item: "https://www.noctuaapp.com/nitbus" },
      { "@type": "ListItem", position: 3, name: `Nitbus ${code}`, item: `https://www.noctuaapp.com/nitbus/${code}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <NitbusLineView code={code} line={line} route={info ? parseRoute(info.route) : null} allCodes={allCodes} />
    </>
  )
}
