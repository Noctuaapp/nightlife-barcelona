import type { Metadata } from "next"
import ClubDetail, { clubMetadata } from "../../../../components/intl/pages/ClubDetail"

// /it/clubs/[slug]: ruta fina; la página y sus textos están en components/intl/pages/ClubDetail.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 259200
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return await clubMetadata("it", slug)
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  return <ClubDetail lang="it" slug={slug} />
}
