import type { Metadata } from "next"
import { StyleView, styleMetadata } from "../../../../components/city/AreaPages"
import { STYLES } from "../../../../lib/areas"

// Estilos de música de Madrid (Fase E): /madrid/musica/techno, /madrid/musica/reggaeton…
export const revalidate = 21600
export function generateStaticParams() {
  return STYLES.map((s) => ({ slug: s.slug }))
}
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  return styleMetadata("madrid", props)
}

export default async function MadridMusicaPage(props: Props) {
  return <StyleView city="madrid" params={props.params} />
}
