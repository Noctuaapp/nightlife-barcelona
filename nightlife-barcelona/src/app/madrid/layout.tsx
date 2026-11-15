import type { Metadata } from "next"
import type { ReactNode } from "react"
import { CityScope } from "../../lib/cityScope"
import CityGate from "../../components/system/CityGate"
import { cityBaseMetadata } from "../../lib/citySeo"

// Todo lo que cuelga de /madrid (Fase E). Pone la ciudad en el contexto (CityScope) para que cada componente y cada enlace
// trabajen con Madrid, y la puerta (CityGate) cierra el paso al público mientras Madrid esté en prelaunch.
// Con Madrid en prelaunch, además, nada de esto se indexa (cityRobots, dentro de cityBaseMetadata). Los metadatos de partida
// (palabras clave, Open Graph, Twitter) son los de Madrid: sin ellos, las páginas que no definen los suyos heredaban los de Barcelona.
export const metadata: Metadata = cityBaseMetadata("madrid")

export default function MadridLayout({ children }: { children: ReactNode }) {
  return (
    <CityScope city="madrid">
      <CityGate city="madrid">{children}</CityGate>
    </CityScope>
  )
}
