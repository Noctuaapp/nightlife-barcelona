import type { Metadata } from "next"
import { notFound } from "next/navigation"
import IntlShell from "../IntlShell"
import GuideView from "../GuideView"
import { guidesOf } from "../../../lib/intl/guides"
import { loadGuideCtx } from "../../../lib/intl/guideData"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/guides/[slug]: guías para visitantes con datos de Noctua en vivo. Se genera al pedirla y se renueva una vez al día
// (poca escritura en Vercel: son 7 páginas por idioma).

export function guideMetadata(lang: IntlLang, slug: string): Metadata {
  const meta = guidesOf(lang).guideMeta(slug)
  if (!meta) return { title: uiOf(lang).guideView.notFoundTitle }
  return intlMetadata(lang, { title: meta.title, description: meta.description, sub: `/guides/${meta.slug}`, esPath: null, type: "article" })
}

export default async function GuidePage({ lang, slug }: { lang: IntlLang; slug: string }) {
  const { GUIDES, GUIDES_REVIEWED, buildGuide } = guidesOf(lang)
  if (!GUIDES.some((g) => g.slug === slug)) notFound()
  const ctx = await loadGuideCtx(lang)
  const guide = buildGuide(slug, ctx)
  if (!guide) notFound()
  return (
    <IntlShell lang={lang} sub={`/guides/${slug}`} esHref="/" current="/guides">
      <GuideView guide={guide} updated={GUIDES_REVIEWED} lang={lang} />
    </IntlShell>
  )
}
