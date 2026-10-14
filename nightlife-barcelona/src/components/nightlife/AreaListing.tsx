"use client"

import Link from "next/link"
import ClubCard from "./ClubCard"
import { useLanguage } from "../../context/LanguageContext"
import type { DbRow } from "../../lib/clubQueries"
import type { AreaLink } from "../../lib/areas"

// Listado de una página de barrio (/barrio/[slug]) o de estilo musical (/musica/[slug]).
// El servidor ya filtra y ordena los locales; aquí solo se pinta con los textos traducidos.

type Props = {
  kind: "barrio" | "musica"
  slug: string
  name: string
  clubs: DbRow[]
  neighborhoods: AreaLink[]
  styles: AreaLink[]
}

export default function AreaListing({ kind, slug, name, clubs, neighborhoods, styles }: Props) {
  const { t } = useLanguage()
  const translated = (key: string, fallback: string) => {
    const v = t(key)
    return v === key ? fallback : v
  }
  const styleName = (s: string, fallback: string) => {
    const v = translated(`areas.style.${s}`, fallback)
    return v.charAt(0).toUpperCase() + v.slice(1)
  }

  const displayName = kind === "musica" ? translated(`areas.style.${slug}`, name) : name
  const rawTitle = (kind === "barrio" ? t("areas.titleBarrio") : t("areas.titleStyle")).replace("{name}", displayName)
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
  const intro = translated(
    `areas.intro.${slug}`,
    (kind === "barrio" ? t("areas.genericBarrio") : t("areas.genericStyle")).replace("{name}", displayName)
  )

  const otherBarrios = neighborhoods.filter((n) => !(kind === "barrio" && n.slug === slug)).slice(0, 14)
  const otherStyles = styles.filter((s) => !(kind === "musica" && s.slug === slug))

  const chip = "rounded-full border border-white/10 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/5"

  return (
    <main className="min-h-screen bg-night pb-32 text-ink">
      <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="breadcrumb" className="text-sm text-zinc-400">
          <Link href="/" className="hover:text-ink">Noctua</Link>
          <span className="mx-2">/</span>
          <Link href="/clubs" className="hover:text-ink">{t("areas.allClubs")}</Link>
          <span className="mx-2">/</span>
          <span className="text-zinc-200">{displayName}</span>
        </nav>

        <h1 className="font-display mt-4 max-w-3xl text-[2rem] leading-[1.08] sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-300">{intro}</p>
        <p className="mt-3 text-sm text-zinc-400">{t("areas.count").replace("{n}", String(clubs.length))}</p>
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {clubs.map((club) => (
          <ClubCard
            key={club.id}
            id={club.id}
            name={club.name}
            slug={club.slug}
            music={club.music}
            area={club.neighborhood}
            price={club.price}
            hours={club.hours}
            openDays={club.open_days}
            image={club.image}
            rating={club.google_rating || club.rating}
            lgtbi_friendly={club.lgtbi_friendly}
            verified={club.verified}
            discountInfo={club.discount_info}
            freeEntryInfo={club.free_entry_info}
            liveStatus={club.live_status}
            liveStatusUpdatedAt={club.live_status_updated_at}
          />
        ))}
      </section>

      <section className="mx-auto mt-14 max-w-6xl space-y-8 px-4 sm:px-6">
        {otherStyles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold">{t("areas.byStyle")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {otherStyles.map((s) => (
                <Link key={s.slug} href={`/musica/${s.slug}`} className={chip}>
                  {styleName(s.slug, s.name)}
                </Link>
              ))}
            </div>
          </div>
        )}
        {otherBarrios.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold">{kind === "barrio" ? t("areas.otherBarrios") : t("areas.byBarrio")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {otherBarrios.map((n) => (
                <Link key={n.slug} href={`/barrio/${n.slug}`} className={chip}>
                  {n.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/clubs" className="rounded-ctl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong">
            {t("areas.seeAll")}
          </Link>
          <Link href="/map" className="rounded-ctl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/10">
            {t("areas.seeMap")}
          </Link>
        </div>
      </section>
    </main>
  )
}
