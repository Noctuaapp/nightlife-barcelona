import type { Metadata } from "next"
import BuhoMapView from "../../../../components/buhos/BuhoMapView"
import { cityUrl } from "../../../../lib/cities"
import { cityRobots } from "../../../../lib/citySeo"
import { safeJsonLd } from "../../../../lib/structuredData"

// /madrid/buhos/mapa: el mapa de las paradas de los búhos de Madrid (16/11/2026), hermano del mapa de paradas de Nitbus de Barcelona
// (Esenciales › Nitbus). Las paradas se cargan en el navegador (lib/madridBuhos.ts, GTFS de la EMT), así que la página es estática.
// Una ruta fija como esta gana a /madrid/buhos/[line], que solo reconoce los códigos de línea.
export const metadata: Metadata = {
  title: "Mapa de los búhos de Madrid: todas las paradas del autobús nocturno | Noctua",
  description:
    "Todas las paradas de los búhos, el autobús nocturno de la EMT de Madrid, en un mapa: filtra por línea y mira las tres paradas más cercanas a ti para volver a casa cuando el metro ya ha cerrado.",
  alternates: { canonical: cityUrl("/buhos/mapa", "madrid") },
  ...cityRobots("madrid"),
}

export default function MadridBuhosMapPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Noctua", item: cityUrl("/", "madrid") },
      { "@type": "ListItem", position: 2, name: "Búhos de Madrid", item: cityUrl("/buhos", "madrid") },
      { "@type": "ListItem", position: 3, name: "Mapa de paradas", item: cityUrl("/buhos/mapa", "madrid") },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <BuhoMapView />
    </>
  )
}
