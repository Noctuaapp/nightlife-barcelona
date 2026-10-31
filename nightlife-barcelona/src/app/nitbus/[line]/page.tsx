import type { Metadata } from "next"
import { cache } from "react"
import { notFound } from "next/navigation"
import NitbusLineView from "../../../components/nitbus/NitbusLineView"
import { loadNitbusData, compareLineCodes } from "../../../lib/nitbusRoutes"
import { NIGHT_BUS_LINES, getNightBusLine, parseRoute } from "../../../lib/nightBuses"
import { safeJsonLd } from "../../../lib/structuredData"

// /nitbus/N24: esquema de la línea con todas sus paradas en orden. Se genera al pedirla y se
// regenera cada hora (igual que /barrio/[slug]).
export const revalidate = 3600
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ line: string }> }

const getData = cache(async () => loadNitbusData())

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const info = getNightBusLine(code)
  if (!info) return { title: "Línea no encontrada | Noctua" }
  const data = await getData()
  const n = data.lines[code]?.stopCount
  const route = parseRoute(info.route)
  const where = route.to ? `${route.from} ↔ ${route.to}` : route.from
  const title = `Nitbus ${code}: paradas y recorrido (${where}) | Noctua`
  const description = `${n ? `Las ${n} paradas` : "Las paradas"} del autobús nocturno ${code} de Barcelona en orden, con transbordos a otras líneas nocturnas y la parada más cercana. ${info.route}.`
  const url = `https://www.noctuaapp.com/nitbus/${code}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website" } }
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
