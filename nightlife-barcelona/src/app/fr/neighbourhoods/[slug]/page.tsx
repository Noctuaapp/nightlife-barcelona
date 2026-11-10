import type { Metadata } from "next"
import Neighbourhood, { neighbourhoodMetadata } from "../../../../components/intl/pages/Neighbourhood"

// /fr/neighbourhoods/[slug]: ruta fina; la página y sus textos están en components/intl/pages/Neighbourhood.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return await neighbourhoodMetadata("fr", slug)
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <Neighbourhood lang="fr" slug={slug} />
}
