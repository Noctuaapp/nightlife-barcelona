import type { Metadata } from "next"
import GuidePage, { guideMetadata } from "../../../../components/intl/pages/GuidePage"

// /en/guides/[slug]: ruta fina; la página y sus textos están en components/intl/pages/GuidePage.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return guideMetadata("en", slug)
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <GuidePage lang="en" slug={slug} />
}
