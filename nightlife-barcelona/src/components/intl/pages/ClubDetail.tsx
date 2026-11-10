import type { Metadata } from "next"
import { cache } from "react"
import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import IntlShell from "../IntlShell"
import { CARD, ClubCard, Crumbs, Fact, Hero, JsonLd, Section } from "../IntlBits"
import { getAllClubs, nightBusesNear, rankClubs } from "../../../lib/intl/data"
import { englishClubEligible } from "../../../lib/intl/clubEligible"
import {
  capitalize,
  clubMetaDescription,
  clubSummary,
  clubTitle,
  dressOf,
  featuresOf,
  hoursOf,
  listOf,
  minAgeOf,
  musicOf,
  priceOf,
  ratingOf,
  streetOf,
  venueKindOf,
} from "../../../lib/intl/clubText"
import { CITY_NAME, type IntlLang } from "../../../lib/intl/lang"
import { intlMetadata } from "../../../lib/intl/meta"
import { breadcrumbLd, langPath, langUrl } from "../../../lib/intl/site"
import { uiOf } from "../../../lib/intl/ui"
import { findBySlug } from "../../../lib/slugLookup"
import { nearestMetroStations } from "../../../lib/metroStations"
import { clubOpeningHoursSpec } from "../../../lib/clubHours"
import { createSlug } from "../../../lib/slug"
import { cleanPriceRange } from "../../../lib/structuredData"

// /{idioma}/clubs/[slug]: ficha del local con los mismos datos que la española, el metro y los autobuses nocturnos para
// volver a casa. Un local con pocos datos se puede abrir pero no se pide indexar (ver lib/intl/clubEligible.ts).

const getClub = cache(async (slug: string) => findBySlug("club", slug))

export async function clubMetadata(lang: IntlLang, slug: string): Promise<Metadata> {
  const match = await getClub(slug)
  if (!match) return { title: uiOf(lang).club.notFoundTitle }
  const club = match.row
  return intlMetadata(lang, {
    title: clubTitle(lang, club),
    description: clubMetaDescription(lang, club),
    sub: `/clubs/${match.canonicalSlug}`,
    esPath: `/clubs/${match.canonicalSlug}`,
    image: typeof club.image === "string" ? club.image : undefined,
    noindex: !englishClubEligible(club),
  })
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : null
}

export default async function ClubDetail({ lang, slug }: { lang: IntlLang; slug: string }) {
  const ui = uiOf(lang)
  const t = ui.club
  const match = await getClub(slug)
  if (!match) notFound()
  if (!match.exact) permanentRedirect(langPath(lang, `/clubs/${match.canonicalSlug}`))
  const club = match.row
  const canonical = match.canonicalSlug
  const url = langUrl(lang, `/clubs/${canonical}`)

  const lat = num(club.latitude)
  const lon = num(club.longitude)
  const [all, buses] = await Promise.all([getAllClubs(), lat !== null && lon !== null ? nightBusesNear(lat, lon, 500) : Promise.resolve([] as string[])])
  const metro = lat !== null && lon !== null ? nearestMetroStations(lat, lon, 900, 2) : []

  const hours = hoursOf(lang, club.hours, club.open_days)
  const price = priceOf(lang, club.price)
  const music = musicOf(lang, club.music)
  const dress = dressOf(lang, club)
  const age = minAgeOf(club)
  const features = featuresOf(lang, club)
  const rating = ratingOf(club)
  const kind = venueKindOf(lang, club.venue_type)
  const street = streetOf(club)
  const area = typeof club.neighborhood === "string" ? club.neighborhood.trim() : ""
  const closed = club.temporarily_closed === true
  const openingHours = closed ? [] : clubOpeningHoursSpec(club.hours, club.open_days)

  const related = rankClubs(
    all.filter((c) => c.id !== club.id && englishClubEligible(c) && (area ? createSlug(c.neighborhood) === createSlug(area) : false))
  ).slice(0, 6)

  const ld = {
    "@context": "https://schema.org",
    "@type": "NightClub",
    name: club.name,
    description: clubSummary(lang, club),
    inLanguage: lang,
    image: [club.image, ...(Array.isArray(club.gallery) ? club.gallery : [])].filter(Boolean).slice(0, 6),
    url,
    ...(club.website ? { sameAs: [club.website, club.instagram].filter(Boolean) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: street || undefined,
      addressLocality: area || "Barcelona",
      addressCountry: "ES",
    },
    ...(lat !== null && lon !== null ? { geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lon } } : {}),
    ...(price?.translated ? { priceRange: cleanPriceRange(price.text) } : {}),
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
  }
  const areaSlug = area ? createSlug(area) : ""
  const crumbs = [
    { name: "Noctua", url: langUrl(lang) },
    { name: ui.shell.navClubs, url: langUrl(lang, "/clubs") },
    ...(areaSlug ? [{ name: area, url: langUrl(lang, `/neighbourhoods/${areaSlug}`) }] : []),
    { name: club.name, url },
  ]

  const mapHref = lat !== null && lon !== null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : null
  const website = typeof club.website === "string" && /^https?:\/\//.test(club.website) ? club.website : null
  const guideHome = langPath(lang, "/guides/how-to-get-home-barcelona-at-night")

  return (
    <IntlShell lang={lang} sub={`/clubs/${canonical}`} esHref={`/clubs/${canonical}`} current="/clubs">
      <JsonLd data={ld} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <Crumbs
        lang={lang}
        items={[
          { name: "Noctua", href: langPath(lang) },
          { name: ui.shell.navClubs, href: langPath(lang, "/clubs") },
          ...(areaSlug ? [{ name: area, href: langPath(lang, `/neighbourhoods/${areaSlug}`) }] : []),
          { name: club.name },
        ]}
      />
      <Hero title={club.name} lead={t.heroLead(capitalize(kind.noun), area || CITY_NAME[lang], street)} tone="violet">
        {closed && <p className="mt-3 inline-block rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-200">{t.temporarilyClosed}</p>}
      </Hero>

      <div className="mx-auto mt-6 grid max-w-6xl gap-8 px-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <p className="text-base leading-relaxed text-zinc-300">{clubSummary(lang, club)}</p>

          {metro.length + buses.length > 0 && (
            <section aria-labelledby="home-title" className="mt-10">
              <h2 id="home-title" className="font-display text-2xl">
                {t.gettingHome(club.name)}
              </h2>
              <div className={`${CARD} mt-4 space-y-3 p-5 text-base leading-relaxed text-zinc-300`}>
                {metro.length > 0 && (
                  <p>
                    {t.nearestMetro}
                    <span className="font-semibold text-ink">{listOf(lang, metro.map((m) => `${m.name} (${t.distance(m.distanceMeters)})`))}</span>.{" "}
                    <Link href={guideHome} className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                      {t.metroHours}
                    </Link>
                  </p>
                )}
                {buses.length > 0 && (
                  <p>
                    {t.nightBusesWithin}
                    <span className="font-semibold text-ink">{buses.slice(0, 8).join(", ")}</span>.{" "}
                    <Link href={langPath(lang, "/night-bus")} className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                      {t.allNightBus}
                    </Link>
                  </p>
                )}
                <p>
                  <Link href={langPath(lang, "/essentials/taxi")} className="underline decoration-white/25 underline-offset-2 hover:text-ink">
                    {t.taxiLink}
                  </Link>
                </p>
              </div>
            </section>
          )}
        </div>

        <aside aria-label={t.factsAria} className={`${CARD} h-fit p-5`}>
          <dl>
            {hours.length > 0 && (
              <Fact label={t.factHours}>
                {hours.map((h) => (
                  <span key={h} className="block">
                    {h}
                  </span>
                ))}
              </Fact>
            )}
            {price && (
              <Fact label={t.factEntry}>
                <span lang={price.translated ? undefined : "es"}>{price.text}</span>
              </Fact>
            )}
            {music.length > 0 && <Fact label={t.factMusic}>{listOf(lang, music.map(capitalize))}</Fact>}
            {dress && <Fact label={t.factDress}>{dress}</Fact>}
            {age && (
              <Fact label={t.factAge}>
                {age}
                {t.ageSuffix}
              </Fact>
            )}
            {features.length > 0 && <Fact label={t.factFacilities}>{capitalize(listOf(lang, features))}</Fact>}
            {rating && <Fact label={t.factRating}>{t.ratingValue(rating.value)}</Fact>}
            {(street || area) && <Fact label={t.factAddress}>{[street, area].filter(Boolean).join(", ")}</Fact>}
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/clubs/${canonical}`} className="btn-pill btn-primary px-5 py-2.5 text-center text-sm">
              {ui.common.openInApp}
            </Link>
            {mapHref && (
              <a href={mapHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-white/10">
                {ui.common.directionsMaps}
              </a>
            )}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="rounded-full border border-white/15 px-5 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-white/10">
                {ui.common.website}
              </a>
            )}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500">{t.hoursNote}</p>
        </aside>
      </div>

      {related.length > 0 && (
        <Section id="related" title={t.moreIn(area)}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => (
              <li key={c.id}>
                <ClubCard club={c} lang={lang} />
              </li>
            ))}
          </ul>
          {areaSlug && (
            <p className="mt-5">
              <Link href={langPath(lang, `/neighbourhoods/${areaSlug}`)} className="font-semibold text-ink underline decoration-white/25 underline-offset-4 transition hover:decoration-white/60">
                {t.allVenuesIn(area)}
              </Link>
            </p>
          )}
        </Section>
      )}
    </IntlShell>
  )
}
