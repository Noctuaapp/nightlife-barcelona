import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../../../components/intl/IntlShell"
import { Chip, ClubCardEn, Crumbs, Hero, JsonLd, Section } from "../../../components/intl/IntlBits"
import { englishAreas, clubSlugOf, getAllClubs, rankClubs } from "../../../lib/intl/data"
import { englishClubEligible } from "../../../lib/intl/clubEligible"
import { enMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../lib/intl/site"

// /en/clubs: lista de locales con ficha propia en inglés, de los mejor cuidados a los demás. Se renueva cada 12 h.
export const revalidate = 43200

export const metadata: Metadata = enMetadata({
  title: "Barcelona Clubs & Bars: Opening Hours, Entry Prices & Music | Noctua",
  description: "Barcelona nightclubs and bars with opening hours, entry prices, music and dress code, plus the night bus and metro to get home. Updated live.",
  sub: "/clubs",
  esPath: "/clubs",
})

const MAX = 150

export default async function ClubsEn() {
  const clubs = await getAllClubs()
  const eligible = rankClubs(clubs.filter(englishClubEligible)).slice(0, MAX)
  const areas = englishAreas(clubs)
  const top = eligible.slice(0, 12)
  const rest = eligible.slice(12)

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Barcelona clubs and bars",
    itemListElement: eligible.slice(0, 30).map((c, i) => ({ "@type": "ListItem", position: i + 1, url: enUrl(`/clubs/${clubSlugOf(c)}`), name: c.name })),
  }

  return (
    <IntlShell esHref="/clubs" current="/en/clubs">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: enUrl("") }, { name: "Clubs & bars", url: enUrl("/clubs") }])} />
      {eligible.length > 0 && <JsonLd data={list} />}
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Clubs & bars" }]} />
      <Hero
        title="Barcelona clubs and bars"
        lead={`${clubs.length} venues listed, with opening hours, entry prices, music and how to get home. Pick a neighbourhood or start with the best-rated.`}
        tone="pink"
      />

      {areas.length > 0 && (
        <Section id="areas" title="By neighbourhood">
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Chip key={a.slug} href={`/en/neighbourhoods/${a.slug}`}>
                {a.name} <span className="ml-1.5 text-zinc-400">{a.count}</span>
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {top.length > 0 && (
        <Section id="top" title="Best-rated and best-documented">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <ClubCardEn club={c} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {rest.length > 0 && (
        <Section id="more" title="More venues">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((c) => (
              <li key={c.id}>
                <ClubCardEn club={c} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section>
        <p className="text-sm leading-relaxed text-zinc-400">
          Looking for something else? The{" "}
          <Link href="/clubs" className="text-ink underline decoration-white/25 underline-offset-2">
            full list in the app
          </Link>{" "}
          has every venue, with live filters for what&apos;s open now.
        </p>
      </Section>
    </IntlShell>
  )
}
