import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../../../components/intl/IntlShell"
import { CARD, Crumbs, Hero, JsonLd, Section } from "../../../components/intl/IntlBits"
import { ESSENTIALS_EN } from "../../../lib/intl/en/essentialsText"
import { enMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../lib/intl/site"

// /en/essentials: índice de lo que un visitante necesita de madrugada. Sin base de datos: se genera al compilar.

export const metadata: Metadata = enMetadata({
  title: "Late-Night Essentials in Barcelona: Pharmacies, Taxi, Food & ATMs | Noctua",
  description: "What you need after midnight in Barcelona: 24-hour pharmacies, hospitals, taxis, late-night food, supermarkets and ATMs, with directions.",
  sub: "/essentials",
  esPath: "/essentials",
})

export default function EssentialsEn() {
  return (
    <IntlShell esHref="/essentials" current="/en/essentials">
      <JsonLd data={breadcrumbLd([{ name: "Noctua", url: enUrl("") }, { name: "Essentials", url: enUrl("/essentials") }])} />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Essentials" }]} />
      <Hero title="Late-night essentials in Barcelona" lead="Pharmacies, taxis, food, supermarkets and cash machines for when everything else is closed." tone="teal" />
      <Section>
        <ul className="grid gap-3 sm:grid-cols-2">
          {ESSENTIALS_EN.map((e) => (
            <li key={e.slug}>
              <Link href={`/en/essentials/${e.slug}`} className={`${CARD} block h-full p-5 transition hover:border-white/25`}>
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
