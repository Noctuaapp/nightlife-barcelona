import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../../../components/intl/IntlShell"
import { CARD, Crumbs, Hero, JsonLd, Section } from "../../../components/intl/IntlBits"
import { GUIDES } from "../../../lib/intl/en/guides"
import { enMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../lib/intl/site"

// /en/guides: índice de las guías para quien visita Barcelona. No consulta la base de datos, así que se genera al compilar.

export const metadata: Metadata = enMetadata({
  title: "Barcelona Nightlife Guides: Getting Home, Entry, Safety & More | Noctua",
  description: "Practical guides for a night out in Barcelona: how to get home, club entry and dress code, what's open late, 24-hour pharmacies and the rules to know.",
  sub: "/guides",
  esPath: null,
})

export default function GuidesIndex() {
  return (
    <IntlShell esHref="/" current="/en/guides">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: enUrl("") },
          { name: "Guides", url: enUrl("/guides") },
        ])}
      />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Guides" }]} />
      <Hero title="Barcelona nightlife guides" lead="Everything a visitor needs for a night out in Barcelona, written with live data from Noctua and official sources." tone="violet" />
      <Section>
        <ul className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/en/guides/${g.slug}`} className={`${CARD} block h-full p-5 transition hover:border-white/25`}>
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
