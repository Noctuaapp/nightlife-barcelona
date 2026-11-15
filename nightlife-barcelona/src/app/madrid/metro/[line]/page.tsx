import type { Metadata } from "next"
import { notFound } from "next/navigation"
import NitbusLineView from "../../../../components/nitbus/NitbusLineView"
import { MADRID_METRO_CODES, buildMadridMetroLine, isMadridMetroCircular, isMadridMetroLine, madridMetroSummary } from "../../../../lib/madridTransit"
import { cityUrl } from "../../../../lib/cities"
import { cityRobots } from "../../../../lib/citySeo"
import { safeJsonLd } from "../../../../lib/structuredData"

// /madrid/metro/L1: esquema de la línea con todas sus estaciones en orden y «Mi trayecto» (subo en / bajo en), igual que
// /metro/L1 de Barcelona (15/11/2026). Los datos son fijos (lib/madridMetro.ts), así que todas las líneas se generan al compilar.
export const dynamicParams = false
export function generateStaticParams() {
  return MADRID_METRO_CODES.map((line) => ({ line }))
}

type Props = { params: Promise<{ line: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const data = buildMadridMetroLine(code)
  if (!data) return { title: "Línea no encontrada | Noctua", robots: { index: false, follow: true } }
  const circular = isMadridMetroCircular(code)
  const title = `Metro de Madrid ${code}: estaciones y recorrido (${madridMetroSummary(code)}) | Noctua`
  const description = `Las ${data.stopCount} estaciones de la línea ${code} del Metro de Madrid${circular ? " (circular)" : ""} en orden, con transbordos a otras líneas y la estación más cercana a ti. Con el horario del metro de noche.`
  const url = cityUrl(`/metro/${code}`, "madrid")
  return {
    title,
    description,
    alternates: { canonical: url },
    ...cityRobots("madrid"),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website" },
  }
}

export default async function MadridMetroLinePage({ params }: Props) {
  const { line: raw } = await params
  const code = raw.toUpperCase()
  if (!isMadridMetroLine(code)) notFound()
  const line = buildMadridMetroLine(code)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", "madrid") },
      { "@type": "ListItem", position: 2, name: "Metro de Madrid", item: cityUrl("/metro", "madrid") },
      { "@type": "ListItem", position: 3, name: `Metro ${code}`, item: cityUrl(`/metro/${code}`, "madrid") },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <NitbusLineView code={code} line={line} route={null} subtitle={madridMetroSummary(code)} allCodes={MADRID_METRO_CODES} kind="metro" />
    </>
  )
}
