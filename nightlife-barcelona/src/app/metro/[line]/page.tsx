import type { Metadata } from "next"
import { notFound } from "next/navigation"
import NitbusLineView from "../../../components/nitbus/NitbusLineView"
import { METRO_LINE_CODES, buildMetroLine, isMetroLine, metroLineSummary } from "../../../lib/metroLines"
import { safeJsonLd } from "../../../lib/structuredData"

// /metro/L1: esquema de la línea con todas sus estaciones en orden y «Mi trayecto» (subo en / bajo en),
// igual que /nitbus/N24 (06/11/2026). Los datos son fijos (lib/metroLines.ts), así que todas las líneas
// se generan al compilar.
export const dynamicParams = false
export function generateStaticParams() {
  return METRO_LINE_CODES.map((line) => ({ line }))
}

type Props = { params: Promise<{ line: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const data = buildMetroLine(code)
  if (!data) return { title: "Línea no encontrada | Noctua" }
  const title = `Metro ${code}: estaciones y recorrido (${metroLineSummary(code)}) | Noctua`
  const description = `Las ${data.stopCount} estaciones de la línea ${code} del metro de Barcelona en orden, con transbordos a otras líneas, la estación más cercana a ti y un planificador de trayecto: elige dónde subes y dónde bajas.`
  const url = `https://www.noctuaapp.com/metro/${code}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website" } }
}

export default async function MetroLinePage({ params }: Props) {
  const { line: raw } = await params
  const code = raw.toUpperCase()
  if (!isMetroLine(code)) notFound()
  const line = buildMetroLine(code)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: "https://www.noctuaapp.com" },
      { "@type": "ListItem", position: 2, name: "Metro", item: "https://www.noctuaapp.com/essentials/metro" },
      { "@type": "ListItem", position: 3, name: `Metro ${code}`, item: `https://www.noctuaapp.com/metro/${code}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <NitbusLineView code={code} line={line} route={null} subtitle={metroLineSummary(code)} allCodes={METRO_LINE_CODES} kind="metro" />
    </>
  )
}
