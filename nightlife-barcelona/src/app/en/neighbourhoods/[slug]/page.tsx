import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../../../../components/intl/IntlShell"
import { CARD, Chip, ClubCardEn, Crumbs, Hero, JsonLd, Section, Stat } from "../../../../components/intl/IntlBits"
import { clubSlugOf, englishAreas, getAllClubs, rankClubs } from "../../../../lib/intl/data"
import { enMetadata } from "../../../../lib/intl/meta"
import { breadcrumbLd, enUrl } from "../../../../lib/intl/site"
import { computeAreaFacts } from "../../../../lib/areaFactsData"
import { createSlug } from "../../../../lib/slug"
import { STYLES } from "../../../../lib/areas"
import { englishClubEligible } from "../../../../lib/intl/clubEligible"

// /en/neighbourhoods/[slug]: locales de un barrio con sus datos reales (entrada, horario, metro y Nitbus cerca).
// Solo existe para los barrios que tienen página en español y suficientes locales. Se renueva una vez al día.
export const revalidate = 86400
export async function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ slug: string }> }

const getData = cache(async (slug: string) => {
  const all = await getAllClubs()
  const area = englishAreas(all).find((a) => a.slug === slug)
  if (!area) return null
  const clubs = rankClubs(all.filter((c) => createSlug(c.neighborhood) === slug))
  const facts = await computeAreaFacts(clubs).catch(() => null)
  return { area, clubs, areas: englishAreas(all), facts }
})

const styleLabel = (slug: string) => STYLES.find((s) => s.slug === slug)?.label

const STYLE_EN: Record<string, string> = {
  electronica: "Electronic",
  reggaeton: "Reggaeton",
  comercial: "Commercial",
  latina: "Latin",
  "hip-hop": "Hip-hop",
  "rock-indie": "Rock & indie",
  jazz: "Jazz & soul",
  techno: "Techno",
  house: "House",
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) return { title: "Neighbourhood not found | Noctua" }
  const { area, clubs } = data
  return enMetadata({
    title: `Nightlife in ${area.name}, Barcelona: Clubs & Bars | Noctua`,
    description: `${clubs.length} clubs and bars in ${area.name}, Barcelona, with opening hours, entry prices, music and the metro and night bus to get home.`,
    sub: `/neighbourhoods/${area.slug}`,
    esPath: `/barrio/${area.slug}`,
    image: clubs.find((c) => c.image)?.image,
  })
}

export default async function NeighbourhoodEn({ params }: Props) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()
  const { area, clubs, areas, facts } = data
  const url = enUrl(`/neighbourhoods/${area.slug}`)
  const shown = clubs.slice(0, 60)
  const styles = (facts?.styles ?? []).map((s) => STYLE_EN[s] ?? styleLabel(s)).filter((s): s is string => !!s)

  const stats: { value: string; label: string }[] = []
  stats.push({ value: String(clubs.length), label: `venue${clubs.length === 1 ? "" : "s"} listed` })
  if (facts?.price) stats.push({ value: facts.price.min === 0 ? `Free–€${facts.price.max}` : `€${facts.price.min}–€${facts.price.max}`, label: "entry price range" })
  if (facts?.hours) stats.push({ value: `${facts.hours.open}–${facts.hours.close}`, label: "usual opening hours" })
  if (facts?.late) stats.push({ value: `${facts.late.n} of ${facts.late.of}`, label: "stay open past 02:30" })

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Clubs and bars in ${area.name}`,
    itemListElement: shown.slice(0, 30).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: englishClubEligible(c) ? enUrl(`/clubs/${clubSlugOf(c)}`) : `https://www.noctuaapp.com/clubs/${clubSlugOf(c)}`,
      name: c.name,
    })),
  }

  return (
    <IntlShell esHref={`/barrio/${area.slug}`} current="/en/clubs">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: enUrl("") },
          { name: "Clubs & bars", url: enUrl("/clubs") },
          { name: area.name, url },
        ])}
      />
      <JsonLd data={list} />
      <Crumbs items={[{ name: "Noctua", href: "/en" }, { name: "Clubs & bars", href: "/en/clubs" }, { name: area.name }]} />
      <Hero
        title={`Nightlife in ${area.name}`}
        lead={`${clubs.length} clubs and bars in ${area.name}, Barcelona, with opening hours, entry prices and how to get home.`}
        tone="amber"
      >
        {stats.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        )}
      </Hero>

      {facts && (facts.metro.length > 0 || facts.nitbus.length > 0 || styles.length > 0) && (
        <Section id="getting-there" title={`Getting to and from ${area.name}`}>
          <div className={`${CARD} space-y-3 p-5 text-base leading-relaxed text-zinc-300`}>
            {styles.length > 0 && <p>Music here is mostly {styles.join(", ").toLowerCase()}.</p>}
            {facts.metro.length > 0 && (
              <p>
                Nearest metro stations to the venues: <span className="font-semibold text-ink">{facts.metro.join(", ")}</span>.{" "}
                <Link href="/en/metro" className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                  Metro lines
                </Link>
              </p>
            )}
            {facts.nitbus.length > 0 && (
              <p>
                Night buses nearby: <span className="font-semibold text-ink">{facts.nitbus.join(", ")}</span>.{" "}
                <Link href="/en/night-bus" className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                  Night bus lines
                </Link>
              </p>
            )}
            <p className="text-xs text-zinc-500">Based on the venues listed here: metro stations within 600 m and night bus stops within 500 m.</p>
          </div>
        </Section>
      )}

      <Section id="venues" title={`Clubs and bars in ${area.name}`}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <li key={c.id}>
              <ClubCardEn club={c} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="other-areas" title="Other neighbourhoods">
        <div className="flex flex-wrap gap-2">
          {areas
            .filter((a) => a.slug !== area.slug)
            .slice(0, 14)
            .map((a) => (
              <Chip key={a.slug} href={`/en/neighbourhoods/${a.slug}`}>
                {a.name}
              </Chip>
            ))}
        </div>
      </Section>
    </IntlShell>
  )
}
