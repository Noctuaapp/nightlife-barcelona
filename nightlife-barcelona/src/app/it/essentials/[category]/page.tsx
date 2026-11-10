import type { Metadata } from "next"
import EssentialCategory, { essentialCategoryMetadata } from "../../../../components/intl/pages/EssentialCategory"

// /it/essentials/[category]: ruta fina; la página y sus textos están en components/intl/pages/EssentialCategory.tsx
// (archivo generado por scripts/make-intl-pages.mjs: no se edita a mano).
export const revalidate = 43200
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ category: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  return essentialCategoryMetadata("it", category)
}

export default async function Page({ params }: Props) {
  const { category } = await params
  return <EssentialCategory lang="it" category={category} />
}
