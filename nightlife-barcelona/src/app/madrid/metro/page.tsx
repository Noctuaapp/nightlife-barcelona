import type { Metadata } from "next"
import MetroIndexView, { type MetroIndexLine } from "../../../components/metro/MetroIndexView"
import { MADRID_METRO_CODES, buildMadridMetroLine, madridMetroSearch, madridMetroSummary } from "../../../lib/madridTransit"
import { cityUrl } from "../../../lib/cities"
import { cityRobots } from "../../../lib/citySeo"
import { safeJsonLd } from "../../../lib/structuredData"

// /madrid/metro: las líneas del Metro de Madrid (L1 a L12 y el Ramal) y buscador de estación (15/11/2026). Hermana de /metro
// (Barcelona). Los datos son fijos (lib/madridMetro.ts, del CRTM), así que la página se genera al compilar. Mientras Madrid
// esté en prelaunch no se indexa (cityRobots) y el layout de /madrid solo deja pasar al admin.
export const metadata: Metadata = {
  title: "Metro de Madrid: líneas, estaciones y recorrido | Noctua",
  description:
    "Las líneas del Metro de Madrid (L1 a L12 y el Ramal) con sus estaciones en orden, transbordos y un planificador de trayecto: elige dónde subes y dónde bajas. Con el horario del metro de noche.",
  alternates: { canonical: cityUrl("/metro", "madrid") },
  ...cityRobots("madrid"),
}

export default function MadridMetroPage() {
  const lines: MetroIndexLine[] = MADRID_METRO_CODES.map((code) => ({
    code,
    routes: [madridMetroSummary(code)],
    count: buildMadridMetroLine(code)?.stopCount ?? 0,
  }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", "madrid") },
      { "@type": "ListItem", position: 2, name: "Metro de Madrid", item: cityUrl("/metro", "madrid") },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MetroIndexView lines={lines} search={madridMetroSearch()} />
    </>
  )
}
