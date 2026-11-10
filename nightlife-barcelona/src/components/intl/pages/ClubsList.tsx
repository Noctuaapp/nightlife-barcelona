import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../IntlShell"
import { Chip, ClubCard, Crumbs, Hero, JsonLd, Section } from "../IntlBits"
import { englishAreas, clubSlugOf, getAllClubs, rankClubs } from "../../../lib/intl/data"
import { englishClubEligible } from "../../../lib/intl/clubEligible"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// /{idioma}/clubs: lista de locales con ficha propia, de los mejor cuidados a los demás. Se renueva cada 12 h.

const MAX = 150

export function clubsMetadata(lang: IntlLang): Metadata {
  const t = uiOf(lang).clubs
  return intlMetadata(lang, { title: t.title, description: t.description, sub: "/clubs", esPath: "/clubs" })
}

export default async function ClubsList({ lang }: { lang: IntlLang }) {
  const ui = uiOf(lang)
  const t = ui.clubs
  const clubs = await getAllClubs()
  const eligible = rankClubs(clubs.filter(englishClubEligible)).slice(0, MAX)
  const areas = englishAreas(clubs)
  const top = eligible.slice(0, 12)
  const rest = eligible.slice(12)

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t.itemListName,
    itemListElement: eligible.slice(0, 30).map((c, i) => ({ "@type": "ListItem", position: i + 1, url: langUrl(lang, `/clubs/${clubSlugOf(c)}`), name: c.name })),
  }

  return (
    <IntlShell lang={lang} sub="/clubs" esHref="/clubs" current="/clubs">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: langUrl(lang) }, { name: ui.shell.navClubs, url: langUrl(lang, "/clubs") }])} />
      {eligible.length > 0 && <JsonLd data={list} />}
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navClubs }]} />
      <Hero title={t.heroTitle} lead={t.heroLead(clubs.length)} tone="pink" />

      {areas.length > 0 && (
        <Section id="areas" title={t.byNeighbourhood}>
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Chip key={a.slug} href={langPath(lang, `/neighbourhoods/${a.slug}`)}>
                {a.name} <span className="ml-1.5 text-zinc-400">{a.count}</span>
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {top.length > 0 && (
        <Section id="top" title={t.bestRated}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <ClubCard club={c} lang={lang} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {rest.length > 0 && (
        <Section id="more" title={t.moreVenues}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((c) => (
              <li key={c.id}>
                <ClubCard club={c} lang={lang} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section>
        <p className="text-sm leading-relaxed text-zinc-400">
          {t.footPre}
          <Link href="/clubs" className="text-ink underline decoration-white/25 underline-offset-2">
            {t.footLink}
          </Link>
          {t.footPost}
        </p>
      </Section>
    </IntlShell>
  )
}
