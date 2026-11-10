import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../IntlShell"
import { CARD, Crumbs, Hero, JsonLd, Section } from "../IntlBits"
import { guidesOf } from "../../../lib/intl/guides"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/guides: índice de las guías para quien visita Barcelona. No consulta la base de datos, así que se genera al compilar.
// No tiene gemela en español: la versión por defecto (x-default) es la inglesa.

export function guidesIndexMetadata(lang: IntlLang): Metadata {
  const t = uiOf(lang).guidesIdx
  return intlMetadata(lang, { title: t.title, description: t.description, sub: "/guides", esPath: null })
}

export default function GuidesIndex({ lang }: { lang: IntlLang }) {
  const ui = uiOf(lang)
  const t = ui.guidesIdx
  const { GUIDES } = guidesOf(lang)
  return (
    <IntlShell lang={lang} sub="/guides" esHref="/" current="/guides">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: langUrl(lang) },
          { name: ui.shell.navGuides, url: langUrl(lang, "/guides") },
        ])}
      />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navGuides }]} />
      <Hero title={t.heroTitle} lead={t.heroLead} tone="violet" />
      <Section>
        <ul className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={langPath(lang, `/guides/${g.slug}`)} className={`${CARD} block h-full p-5 transition hover:border-white/25`}>
                <span className="block font-display text-xl leading-snug text-ink">{g.h1}</span>
                <span className="mt-2 block text-sm leading-relaxed text-zinc-400">{g.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </IntlShell>
  )
}
