import type { Metadata } from "next"
import BuhoIndexView, { type BuhoIndexLine } from "../../../components/buhos/BuhoIndexView"
import { MADRID_BUHO_CODES, buildMadridBuhoLine, madridBuhoSearch } from "../../../lib/madridTransit"
import { BUHO_LINES } from "../../../lib/madridBuhos"
import { cityUrl } from "../../../lib/cities"
import { cityRobots } from "../../../lib/citySeo"
import { safeJsonLd } from "../../../lib/structuredData"

// /madrid/buhos: las líneas de autobús nocturno de la EMT de Madrid (los búhos) y buscador de parada (15/11/2026). Hermana de
// /nitbus (Barcelona). Los datos son fijos (lib/madridBuhos.ts, GTFS de la EMT), así que la página se genera al compilar.
export const metadata: Metadata = {
  title: "Búhos de Madrid: líneas, paradas y recorrido | Noctua",
  description:
    "Todas las líneas de búhos, el autobús nocturno de la EMT de Madrid (N1 a N32 y las circulares), con sus paradas en orden, transbordos y la parada más cercana. Para volver a casa cuando el metro ya está cerrado.",
  alternates: { canonical: cityUrl("/buhos", "madrid") },
  ...cityRobots("madrid"),
}

export default function MadridBuhosPage() {
  const byCode = new Map(BUHO_LINES.map((l) => [l.code, l]))
  const lines: BuhoIndexLine[] = MADRID_BUHO_CODES.map((code) => {
    const src = byCode.get(code)!
    return { code, from: src.heads[1], to: src.heads[0], count: buildMadridBuhoLine(code)?.stopCount ?? 0 }
  })

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", "madrid") },
      { "@type": "ListItem", position: 2, name: "Búhos de Madrid", item: cityUrl("/buhos", "madrid") },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <BuhoIndexView lines={lines} search={madridBuhoSearch()} />
    </>
  )
}
