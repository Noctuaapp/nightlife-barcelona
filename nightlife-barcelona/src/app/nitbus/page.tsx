import type { Metadata } from "next"
import NitbusIndexView from "../../components/nitbus/NitbusIndexView"
import { loadNitbusData } from "../../lib/nitbusRoutes"

// /nitbus: todas las líneas de autobús nocturno y buscador de parada. Se regenera cada hora.
export const revalidate = 3600

export const metadata: Metadata = {
  title: "Nitbus Barcelona: líneas, paradas y recorrido | Noctua",
  description:
    "Todas las líneas del autobús nocturno de Barcelona (N0 a N28) con sus paradas en orden, transbordos y la parada más cercana. Para volver a casa cuando el metro ya está cerrado.",
  alternates: { canonical: "https://www.noctuaapp.com/nitbus" },
}

export default async function NitbusPage() {
  const data = await loadNitbusData()
  const counts: Record<string, number> = {}
  for (const line of Object.values(data.lines)) counts[line.code] = line.stopCount
  return <NitbusIndexView counts={counts} search={data.search} />
}
