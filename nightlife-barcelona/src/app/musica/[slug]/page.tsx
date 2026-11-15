import type { Metadata } from "next"
import { StyleView, styleMetadata } from "../../../components/city/AreaPages"
import { STYLES } from "../../../lib/areas"

// /musica/techno, /musica/reggaeton… Una página por estilo con los locales que lo pinchan. Los de Madrid viven en
// /madrid/musica/[slug] (ver src/components/city/AreaPages.tsx).
// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600
export function generateStaticParams() {
  return STYLES.map((s) => ({ slug: s.slug }))
}
export const dynamicParams = false

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  return styleMetadata("barcelona", props)
}

export default async function MusicaPage(props: Props) {
  return <StyleView city="barcelona" params={props.params} />
}
