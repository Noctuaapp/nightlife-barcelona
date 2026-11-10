import type { Metadata } from "next"
import Link from "next/link"
import IntlShell from "../IntlShell"
import { CARD, Chip, ClubCard, FaqBlock, Hero, JsonLd, Section, Stat } from "../IntlBits"
import { guidesOf } from "../../../lib/intl/guides"
import { englishAreas, getAllClubs, rankClubs } from "../../../lib/intl/data"
import { englishClubEligible } from "../../../lib/intl/clubEligible"
import { loadGuideCtx } from "../../../lib/intl/guideData"
import type { IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { faqLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"

// Portada de cada idioma (/en, /de, /fr, /it). Se genera al pedirla y se renueva una vez al día.

export function homeMetadata(lang: IntlLang): Metadata {
  const t = uiOf(lang).home
  return intlMetadata(lang, { title: t.title, description: t.description, sub: "", esPath: "" })
}

export default async function IntlHome({ lang }: { lang: IntlLang }) {
  const ui = uiOf(lang)
  const t = ui.home
  const { GUIDES, buildGuide } = guidesOf(lang)
  const [ctx, clubs] = await Promise.all([loadGuideCtx(lang), getAllClubs()])
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

  const getHome = [
    { href: langPath(lang, "/metro"), ...t.cardMetro },
    { href: langPath(lang, "/night-bus"), ...t.cardBus },
    { href: langPath(lang, "/essentials/taxi"), ...t.cardTaxi },
  ]

  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Noctua",
    url: langUrl(lang),
    inLanguage: lang,
    description: t.siteDescription,
  }

  return (
    <IntlShell lang={lang} sub="" esHref="/">
      <JsonLd data={site} />
      {faq.length > 0 && <JsonLd data={faqLd(faq)} />}

      <Hero title={t.heroTitle} lead={t.heroLead} tone="violet">
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={langPath(lang, "/clubs")} className="btn-pill btn-primary px-6 py-3 text-base">
            {t.browseClubs}
          </Link>
          <Link
            href={langPath(lang, "/guides/how-to-get-home-barcelona-at-night")}
            className="btn-pill px-6 py-3 text-base text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition hover:bg-white/10"
          >
            {t.howToGetHome}
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ctx.total > 0 && <Stat value={String(ctx.total)} label={t.statClubs} />}
          {ctx.busLines.length > 0 && <Stat value={String(ctx.busLines.length)} label={t.statBus} />}
          {ctx.pharmacies24Total > 0 && <Stat value={String(ctx.pharmacies24Total)} label={t.statPharmacies} />}
          {ctx.facts?.hours && <Stat value={ctx.facts.hours.open} label={t.statOpening} />}
        </div>
      </Hero>

      <Section id="get-home" title={t.getHomeTitle}>
        <p className="max-w-2xl text-base leading-relaxed text-zinc-300">{t.getHomeText}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {getHome.map((g) => (
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
        <Section id="top-clubs" title={t.topClubs}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <ClubCard club={c} lang={lang} />
              </li>
            ))}
          </ul>
          <p className="mt-5">
            <Link href={langPath(lang, "/clubs")} className="font-semibold text-ink underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60">
              {t.seeAllClubs}
            </Link>
          </p>
        </Section>
      )}

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

      <Section id="guides" title={t.guidesForVisitors}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={langPath(lang, `/guides/${g.slug}`)} className={`${CARD} block h-full p-4 transition hover:border-white/25`}>
                <span className="block text-base font-semibold text-ink">{g.h1}</span>
                <span className="mt-1 block text-sm text-zinc-400">{g.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="essentials" title={t.essentialsTitle}>
        <div className="flex flex-wrap gap-2">
          <Chip href={langPath(lang, "/essentials/pharmacy")}>{t.chipPharmacy}</Chip>
          <Chip href={langPath(lang, "/essentials/hospital")}>{t.chipHospital}</Chip>
          <Chip href={langPath(lang, "/essentials/taxi")}>{t.chipTaxi}</Chip>
          <Chip href={langPath(lang, "/essentials/food")}>{t.chipFood}</Chip>
          <Chip href={langPath(lang, "/essentials/supermarket")}>{t.chipSupermarket}</Chip>
          <Chip href={langPath(lang, "/essentials/atm")}>{t.chipAtm}</Chip>
          <Chip href={langPath(lang, "/essentials/gas-station")}>{t.chipGas}</Chip>
        </div>
      </Section>

      {faq.length > 0 && (
        <Section id="faq" title={ui.common.faqTitle} narrow>
          <FaqBlock items={faq} />
        </Section>
      )}
    </IntlShell>
  )
}
