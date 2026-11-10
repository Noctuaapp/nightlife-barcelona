import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import IntlShell from "../IntlShell"
import { CARD, Chip, ClubCard, Crumbs, Hero, JsonLd, Section, Stat } from "../IntlBits"
import { clubSlugOf, englishAreas, getAllClubs, rankClubs } from "../../../lib/intl/data"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"
import { computeAreaFacts } from "../../../lib/areaFactsData"
import { createSlug } from "../../../lib/slug"
import { STYLES } from "../../../lib/areas"
import { englishClubEligible } from "../../../lib/intl/clubEligible"

// /{idioma}/neighbourhoods/[slug]: locales de un barrio con sus datos reales (entrada, horario, metro y Nitbus cerca).
// Solo existe para los barrios que tienen página en español y suficientes locales. Se renueva una vez al día.

const getData = cache(async (slug: string) => {
  const all = await getAllClubs()
  const area = englishAreas(all).find((a) => a.slug === slug)
  if (!area) return null
  const clubs = rankClubs(all.filter((c) => createSlug(c.neighborhood) === slug))
  const facts = await computeAreaFacts(clubs).catch(() => null)
  return { area, clubs, areas: englishAreas(all), facts }
})

const styleLabel = (slug: string) => STYLES.find((s) => s.slug === slug)?.label

export async function neighbourhoodMetadata(lang: IntlLang, slug: string): Promise<Metadata> {
  const t = uiOf(lang).area
  const data = await getData(slug)
  if (!data) return { title: t.notFoundTitle }
  const { area, clubs } = data
  return intlMetadata(lang, {
    title: t.metaTitle(area.name),
    description: t.metaDescription(clubs.length, area.name),
    sub: `/neighbourhoods/${area.slug}`,
    esPath: `/barrio/${area.slug}`,
    image: clubs.find((c) => c.image)?.image,
  })
}

export default async function Neighbourhood({ lang, slug }: { lang: IntlLang; slug: string }) {
  const ui = uiOf(lang)
  const t = ui.area
  const data = await getData(slug)
  if (!data) notFound()
  const { area, clubs, areas, facts } = data
  const url = langUrl(lang, `/neighbourhoods/${area.slug}`)
  const shown = clubs.slice(0, 60)
  const styles = (facts?.styles ?? []).map((s) => t.styles[s] ?? styleLabel(s)).filter((s): s is string => !!s)

  const stats: { value: string; label: string }[] = []
  stats.push({ value: String(clubs.length), label: t.statVenues(clubs.length) })
  if (facts?.price) stats.push({ value: t.priceRange(facts.price.min, facts.price.max), label: t.statPrice })
  if (facts?.hours) stats.push({ value: `${facts.hours.open}–${facts.hours.close}`, label: t.statHours })
  if (facts?.late) stats.push({ value: t.statLateValue(facts.late.n, facts.late.of), label: t.statLate })

  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t.itemListName(area.name),
    itemListElement: shown.slice(0, 30).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: englishClubEligible(c) ? langUrl(lang, `/clubs/${clubSlugOf(c)}`) : `https://www.noctuaapp.com/clubs/${clubSlugOf(c)}`,
      name: c.name,
    })),
  }

  return (
    <IntlShell lang={lang} sub={`/neighbourhoods/${area.slug}`} esHref={`/barrio/${area.slug}`} current="/clubs">
      <JsonLd
        data={breadcrumbLd([
          { name: "Noctua", url: langUrl(lang) },
          { name: ui.shell.navClubs, url: langUrl(lang, "/clubs") },
          { name: area.name, url },
        ])}
      />
      <JsonLd data={list} />
      <Crumbs lang={lang} items={[{ name: "Noctua", href: langPath(lang) }, { name: ui.shell.navClubs, href: langPath(lang, "/clubs") }, { name: area.name }]} />
      <Hero title={t.heroTitle(area.name)} lead={t.heroLead(clubs.length, area.name)} tone="amber">
        {stats.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <Stat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        )}
      </Hero>

      {facts && (facts.metro.length > 0 || facts.nitbus.length > 0 || styles.length > 0) && (
        <Section id="getting-there" title={t.gettingThere(area.name)}>
          <div className={`${CARD} space-y-3 p-5 text-base leading-relaxed text-zinc-300`}>
            {styles.length > 0 && <p>{t.musicHere(styles)}</p>}
            {facts.metro.length > 0 && (
              <p>
                {t.nearestMetro} <span className="font-semibold text-ink">{facts.metro.join(", ")}</span>.{" "}
                <Link href={langPath(lang, "/metro")} className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                  {t.metroLines}
                </Link>
              </p>
            )}
            {facts.nitbus.length > 0 && (
              <p>
                {t.busesNearby} <span className="font-semibold text-ink">{facts.nitbus.join(", ")}</span>.{" "}
                <Link href={langPath(lang, "/night-bus")} className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                  {t.busLines}
                </Link>
              </p>
            )}
            <p className="text-xs text-zinc-500">{t.basedOn}</p>
          </div>
        </Section>
      )}

      <Section id="venues" title={t.venuesIn(area.name)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <li key={c.id}>
              <ClubCard club={c} lang={lang} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="other-areas" title={t.otherAreas}>
        <div className="flex flex-wrap gap-2">
          {areas
            .filter((a) => a.slug !== area.slug)
            .slice(0, 14)
            .map((a) => (
              <Chip key={a.slug} href={langPath(lang, `/neighbourhoods/${a.slug}`)}>
                {a.name}
              </Chip>
            ))}
        </div>
      </Section>
    </IntlShell>
  )
}
