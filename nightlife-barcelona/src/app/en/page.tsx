import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../../components/intl/IntlShell"
import { CARD, Chip, ClubCardEn, FaqBlock, Hero, JsonLd, Section, Stat } from "../../components/intl/IntlBits"
import { GUIDES, buildGuide } from "../../lib/intl/en/guides"
import { englishAreas, getAllClubs, rankClubs } from "../../lib/intl/data"
import { englishClubEligible } from "../../lib/intl/clubEligible"
import { loadGuideCtx } from "../../lib/intl/guideData"
import { enMetadata } from "../../lib/intl/meta"
import { faqLd, SITE } from "../../lib/intl/site"

// /en: portada en inglés. Se genera al pedirla y se renueva una vez al día.
export const revalidate = 86400

export const metadata: Metadata = enMetadata({
  title: "Barcelona Nightlife Guide: Clubs, Bars, Night Bus & Metro | Noctua",
  description:
    "Find Barcelona clubs and bars with opening hours and entry prices, then get home with the night bus, metro and taxi. Live nightlife guide for visitors.",
  sub: "",
  esPath: "",
})

const GET_HOME = [
  { href: "/en/metro", title: "Metro", text: "Lines and stations. Runs until 02:00 on Fridays and non-stop on Saturdays." },
  { href: "/en/night-bus", title: "Night bus", text: "The N-lines take over when the metro closes. Routes, stops and transfers." },
  { href: "/en/essentials/taxi", title: "Taxi", text: "Ranks and phone numbers, plus the 2026 official fares." },
]

export default async function EnglishHome() {
  const [ctx, clubs] = await Promise.all([loadGuideCtx(), getAllClubs()])
  const ranked = rankClubs(clubs.filter(englishClubEligible))
  const top = ranked.slice(0, 12)
  const areas = englishAreas(clubs).slice(0, 14)
  const guideBy = (slug: string) => buildGuide(slug, ctx)
  const faq = [
    guideBy(GUIDES[0].slug)?.faq[0],
    guideBy(GUIDES[2].slug)?.faq[0],
    guideBy(GUIDES[1].slug)?.faq[0],
    guideBy(GUIDES[3].slug)?.faq[0],
  ].filter((f): f is { q: string; a: string } => !!f)

  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Noctua",
    url: `${SITE}/en`,
    inLanguage: "en",
    description: "Live Barcelona nightlife guide: clubs and bars, night bus, metro and late-night essentials.",
  }

  return (
    <IntlShell esHref="/" current="/en">
      <JsonLd data={site} />
      {faq.length > 0 && <JsonLd data={faqLd(faq)} />}

      <Hero
        title="Barcelona nightlife, live"
        lead="Clubs and bars with opening hours and entry prices, the night bus and metro to get you home, and the late-night essentials you will need: pharmacies, food and cash."
        tone="violet"
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/en/clubs" className="btn-pill btn-primary px-6 py-3 text-base">
            Browse clubs &amp; bars
          </Link>
          <Link
            href="/en/guides/how-to-get-home-barcelona-at-night"
            className="btn-pill px-6 py-3 text-base text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition hover:bg-white/10"
          >
            How to get home
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ctx.total > 0 && <Stat value={String(ctx.total)} label="clubs and bars listed" />}
          {ctx.busLines.length > 0 && <Stat value={String(ctx.busLines.length)} label="night bus lines" />}
          {ctx.pharmacies24Total > 0 && <Stat value={String(ctx.pharmacies24Total)} label="24-hour pharmacies" />}
          {ctx.facts?.hours && <Stat value={ctx.facts.hours.open} label="most common opening time" />}
        </div>
      </Hero>

      <Section id="get-home" title="Getting home after a night out">
        <p className="max-w-2xl text-base leading-relaxed text-zinc-300">
          The metro stops at midnight from Sunday to Thursday, runs until 02:00 on Fridays and all night on Saturdays. After that, night buses and taxis take over.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {GET_HOME.map((g) => (
            <li key={g.href}>
              <Link href={g.href} className={`${CARD} block h-full p-5 transition hover:border-white/25`}>
                <span className="block font-display text-xl text-ink">{g.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-zinc-400">{g.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {top.length > 0 && (
        <Section id="top-clubs" title="Top clubs and bars">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <ClubCardEn club={c} />
              </li>
            ))}
          </ul>
          <p className="mt-5">
            <Link href="/en/clubs" className="font-semibold text-ink underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60">
              See all clubs and bars
            </Link>
          </p>
        </Section>
      )}

      {areas.length > 0 && (
        <Section id="areas" title="Nightlife by neighbourhood">
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <Chip key={a.slug} href={`/en/neighbourhoods/${a.slug}`}>
                {a.name} <span className="ml-1.5 text-zinc-400">{a.count}</span>
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section id="guides" title="Guides for visitors">
        <ul className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/en/guides/${g.slug}`} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                <span className="block text-base font-semibold text-ink">{g.h1}</span>
                <span className="mt-1 block text-sm text-zinc-400">{g.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="essentials" title="Late-night essentials">
        <div className="flex flex-wrap gap-2">
          <Chip href="/en/essentials/pharmacy">24-hour pharmacies</Chip>
          <Chip href="/en/essentials/hospital">Hospitals</Chip>
          <Chip href="/en/essentials/taxi">Taxi</Chip>
          <Chip href="/en/essentials/food">Late-night food</Chip>
          <Chip href="/en/essentials/supermarket">Supermarkets</Chip>
          <Chip href="/en/essentials/atm">ATMs</Chip>
          <Chip href="/en/essentials/gas-station">Petrol stations</Chip>
        </div>
      </Section>

      {faq.length > 0 && (
        <Section id="faq" title="Frequently asked questions" narrow>
          <FaqBlock items={faq} />
        </Section>
      )}
    </IntlShell>
  )
}
