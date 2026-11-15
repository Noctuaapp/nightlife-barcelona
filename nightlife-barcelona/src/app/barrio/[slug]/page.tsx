import type { Metadata } from "next"
import { BarrioView, barrioMetadata } from "../../../components/city/AreaPages"

// /barrio/el-born, /barrio/poblenou… Una página por barrio con sus discotecas (ver src/lib/areas.ts y
// src/components/city/AreaPages.tsx). Los barrios de Madrid viven en /madrid/barrio/[slug].
// 05/11/2026: antes 3600 s. Subido a 6 h para gastar menos «ISR Writes» de Vercel (ver src/app/clubs/[slug]/page.tsx).
export const revalidate = 21600
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  return barrioMetadata("barcelona", props)
}

export default async function BarrioPage(props: Props) {
  return <BarrioView city="barcelona" params={props.params} />
}
