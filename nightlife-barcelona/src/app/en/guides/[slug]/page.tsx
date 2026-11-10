import type { Metadata } from "next"
import { notFound } from "next/navigation"
import IntlShell from "../../../../components/intl/IntlShell"
import GuideView from "../../../../components/intl/GuideView"
import { GUIDES, GUIDES_REVIEWED, buildGuide, guideMeta } from "../../../../lib/intl/en/guides"
import { loadGuideCtx } from "../../../../lib/intl/guideData"
import { enMetadata } from "../../../../lib/intl/meta"

// /en/guides/[slug]: guías para visitantes con datos de Noctua en vivo. Se genera al pedirla y se renueva una vez al día
// (poca escritura en Vercel: son 7 páginas).
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const meta = guideMeta(slug)
  if (!meta) return { title: "Guide not found | Noctua" }
  return enMetadata({ title: meta.title, description: meta.description, sub: `/guides/${meta.slug}`, esPath: null, type: "article" })
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  if (!GUIDES.some((g) => g.slug === slug)) notFound()
  const ctx = await loadGuideCtx()
  const guide = buildGuide(slug, ctx)
  if (!guide) notFound()
  return (
    <IntlShell esHref="/" current="/en/guides">
      <GuideView guide={guide} updated={GUIDES_REVIEWED} />
    </IntlShell>
  )
}
