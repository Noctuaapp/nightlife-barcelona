import type { Metadata } from "next"
import { BarrioView, barrioMetadata } from "../../../../components/city/AreaPages"

// Barrios (zonas) de Madrid (Fase E): /madrid/barrio/malasana, /madrid/barrio/chueca… Mismas páginas que las de Barcelona,
// con los locales de Madrid.
export const revalidate = 21600
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  return barrioMetadata("madrid", props)
}

export default async function MadridBarrioPage(props: Props) {
  return <BarrioView city="madrid" params={props.params} />
}
