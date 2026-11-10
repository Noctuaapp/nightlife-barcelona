import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../IntlShell"
import { CARD, Crumbs, Hero, JsonLd, Section } from "../IntlBits"
import { essentialsOf } from "../../../lib/intl/essentialsText"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/essentials: índice de lo que un visitante necesita de madrugada. Sin base de datos: se genera al compilar.

export function essentialsMetadata(lang: IntlLang): Metadata {
  const t = uiOf(lang).ess
  return intlMetadata(lang, { title: t.title, description: t.description, sub: "/essentials", esPath: "/essentials" })
}

export default function EssentialsIndex({ lang }: { lang: IntlLang }) {
  const ui = uiOf(lang)
  const t = ui.ess
  return (
    <IntlShell lang={lang} sub="/essentials" esHref="/essentials" current="/essentials">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: langUrl(lang) }, { name: ui.shell.navEssentials, url: langUrl(lang, "/essentials") }])} />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navEssentials }]} />
      <Hero title={t.heroTitle} lead={t.heroLead} tone="teal" />
      <Section>
        <ul className="grid gap-3 sm:grid-cols-2">
          {essentialsOf(lang).map((e) => (
            <li key={e.slug}>
              <Link href={langPath(lang, `/essentials/${e.slug}`)} className={`${CARD} block h-full p-5 transition hover:border-white/25`}>
                <span className="block font-display text-xl text-ink">{e.h1}</span>
                <span className="mt-2 block text-sm leading-relaxed text-zinc-400">{e.intro}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </IntlShell>
  )
}
