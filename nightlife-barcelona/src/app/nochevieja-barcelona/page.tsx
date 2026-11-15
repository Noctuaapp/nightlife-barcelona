import type { Metadata } from "next"
import Link from "next/link"
import Header from "@/components/layout/Header"
import Footer from "@/components/layout/Footer"
import BottomNav from "@/components/layout/BottomNav"
import { BlockView } from "@/components/intl/GuideView"
import { CARD, FaqBlock, Hero, JsonLd, Section, SourceList } from "@/components/intl/IntlBits"
import { NYE_CHECKED, NYE_ES_PATH, NYE_SLUG, nyeGuide, nyeMeta } from "@/lib/intl/nye"
import { breadcrumbLd, esUrl, faqLd, spanishAlternates, SITE } from "@/lib/intl/site"

// /nochevieja-barcelona (15/11/2026): guía de Nochevieja con lo confirmado y lo pendiente. El texto y las fuentes
// viven en lib/intl/nye.ts, que también alimenta las guías en inglés, alemán, francés e italiano (hreflang entre
// las cinco). Es una página estática: no consulta la base de datos. Cuando el Ajuntament y TMB publiquen el plan de
// 2026, se actualiza ese archivo (fecha NYE_CHECKED y las filas de la tabla «Qué está confirmado»).

const META = nyeMeta("es")
const GUIDE = nyeGuide("es")
const URL = esUrl(NYE_ES_PATH)

export const metadata: Metadata = {
  title: META.title,
  description: META.description,
  alternates: spanishAlternates(NYE_ES_PATH, `/guides/${NYE_SLUG}`),
  openGraph: {
    title: META.title,
    description: META.description,
    url: URL,
    siteName: "Noctua",
    locale: "es_ES",
    type: "article",
    images: [{ url: `${SITE}/hero/skyline_barcelona.jpeg`, alt: META.title }],
  },
}

const DATE = new Date(NYE_CHECKED).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

export default function NocheviejaBarcelonaPage() {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: GUIDE.h1,
    description: GUIDE.description,
    inLanguage: "es",
    mainEntityOfPage: URL,
    dateModified: NYE_CHECKED,
    author: { "@type": "Organization", name: "Noctua", url: SITE },
    publisher: { "@type": "Organization", name: "Noctua", url: SITE },
  }
  const crumbs = [
    { name: "Noctua", url: SITE },
    { name: GUIDE.h1, url: URL },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-night text-ink">
      <Header />
      <main className="flex-1 pb-28">
        <JsonLd data={article} />
        <JsonLd data={breadcrumbLd(crumbs)} />
        <JsonLd data={faqLd(GUIDE.faq)} />

        <Hero title={GUIDE.h1} lead={GUIDE.lead} tone="blue">
          <p className="mt-4 text-xs text-zinc-500">
            Datos comprobados el <time dateTime={NYE_CHECKED}>{DATE}</time>. Las fuentes oficiales están al final.
          </p>
        </Hero>

        <div className="mx-auto max-w-3xl px-4">
          <nav aria-label="En esta guía" className={`${CARD} mt-8 p-4`}>
            <p className="text-sm font-semibold text-ink">En esta guía</p>
            <ol className="mt-2 space-y-1.5 text-sm">
              {GUIDE.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-zinc-300 underline decoration-white/20 underline-offset-2 transition hover:text-ink">
                    {s.h2}
                  </a>
                </li>
              ))}
              <li>
                <a href="#faq" className="text-zinc-300 underline decoration-white/20 underline-offset-2 transition hover:text-ink">
                  Preguntas frecuentes
                </a>
              </li>
            </ol>
          </nav>

          {GUIDE.sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="mt-12 scroll-mt-28">
              <h2 id={`${s.id}-title`} className="font-display text-2xl sm:text-3xl">
                {s.h2}
              </h2>
              {s.blocks.map((b, i) => (
                <BlockView key={i} b={b} />
              ))}
            </section>
          ))}

          <div className={`${CARD} mt-12 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
            <p className="text-base font-semibold text-ink">Noctua lleva todo esto en el bolsillo, al momento.</p>
            <Link href={GUIDE.cta.href} className="btn-pill btn-primary shrink-0 px-5 py-2.5 text-sm">
              {GUIDE.cta.label}
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <Section id="faq" title="Preguntas frecuentes">
            <FaqBlock items={GUIDE.faq} />
          </Section>
          <Section id="sources" title="Fuentes">
            <SourceList items={GUIDE.sources} />
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              Las normas, tarifas y horarios cambian. Comprueba la fuente oficial antes de fiarte de una cifra.
            </p>
          </Section>
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
