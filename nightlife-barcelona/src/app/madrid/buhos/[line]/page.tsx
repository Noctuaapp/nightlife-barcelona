import type { Metadata } from "next"
import { notFound } from "next/navigation"
import NitbusLineView from "../../../../components/nitbus/NitbusLineView"
import { MADRID_BUHO_CODES, buildMadridBuhoLine, isMadridBuhoLine, madridBuhoFrequency, madridBuhoSummary } from "../../../../lib/madridTransit"
import { cityUrl } from "../../../../lib/cities"
import { cityRobots } from "../../../../lib/citySeo"
import { safeJsonLd } from "../../../../lib/structuredData"

// /madrid/buhos/N1: esquema de la línea con todas sus paradas en orden, igual que /nitbus/N24 de Barcelona (15/11/2026). Los
// datos son fijos (lib/madridBuhos.ts), así que todas las líneas se generan al compilar.
export const dynamicParams = false
export function generateStaticParams() {
  return MADRID_BUHO_CODES.map((line) => ({ line }))
}

type Props = { params: Promise<{ line: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { line } = await params
  const code = line.toUpperCase()
  const data = buildMadridBuhoLine(code)
  if (!data) return { title: "Línea no encontrada | Noctua", robots: { index: false, follow: true } }
  const where = madridBuhoSummary(code)
  const title = `Búho ${code}: paradas y recorrido (${where}) | Noctua`
  const description = `Las ${data.stopCount} paradas del búho ${code}, el autobús nocturno de la EMT de Madrid, en orden, con transbordos a otros búhos y la parada más cercana a ti. ${where}.`
  const url = cityUrl(`/buhos/${code}`, "madrid")
  return {
    title,
    description,
    alternates: { canonical: url },
    ...cityRobots("madrid"),
    openGraph: { title, description, url, siteName: "Noctua", locale: "es_ES", type: "website" },
  }
}

export default async function MadridBuhoLinePage({ params }: Props) {
  const { line: raw } = await params
  const code = raw.toUpperCase()
  if (!isMadridBuhoLine(code)) notFound()
  const line = buildMadridBuhoLine(code)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", "madrid") },
      { "@type": "ListItem", position: 2, name: "Búhos de Madrid", item: cityUrl("/buhos", "madrid") },
      { "@type": "ListItem", position: 3, name: `Búho ${code}`, item: cityUrl(`/buhos/${code}`, "madrid") },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <NitbusLineView
        code={code}
        line={line}
        route={null}
        subtitle={madridBuhoSummary(code)}
        freq={madridBuhoFrequency(code) ?? undefined}
        allCodes={MADRID_BUHO_CODES}
      />
    </>
  )
}
