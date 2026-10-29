"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import ClubCard from "./ClubCard"
import { useLanguage } from "../../context/LanguageContext"
import type { DbRow } from "../../lib/clubQueries"
import type { AreaLink } from "../../lib/areas"
import type { AreaFacts } from "../../lib/areaFacts"

// Listado de una página de barrio (/barrio/[slug]), de zona (/zona/[slug]) o de estilo musical
// (/musica/[slug]). El servidor ya filtra y ordena los locales; aquí solo se pinta con los textos
// traducidos. Desde el 29/10/2026 lleva además un bloque «Datos de…» con lo que sabemos de los
// locales de la zona (entrada, horario, metro...), porque Search Console marcaba estas páginas como
// poco útiles: una frase de introducción y una lista de nombres.

type Props = {
  kind: "barrio" | "musica" | "zona"
  slug: string
  name: string
  clubs: DbRow[]
  neighborhoods: AreaLink[]
  styles: AreaLink[]
  zones?: AreaLink[]
  facts?: AreaFacts | null
}

export default function AreaListing({ kind, slug, name, clubs, neighborhoods, styles, zones = [], facts = null }: Props) {
  const { t, locale } = useLanguage()
  const translated = (key: string, fallback: string) => {
    const v = t(key)
    return v === key ? fallback : v
  }
  const styleName = (s: string, fallback: string) => {
    const v = translated(`areas.style.${s}`, fallback)
    return v.charAt(0).toUpperCase() + v.slice(1)
  }
  const fill = (key: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((text, [k, v]) => text.split(`{${k}}`).join(String(v)), t(key))
  const euros = (n: number) => n.toLocaleString(locale, { maximumFractionDigits: 1 })

  const displayName = kind === "musica" ? translated(`areas.style.${slug}`, name) : name
  const rawTitle = (kind === "barrio" ? t("areas.titleBarrio") : kind === "zona" ? t("areas.titleZona") : t("areas.titleStyle")).replace("{name}", displayName)
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
  const intro =
    kind === "zona"
      ? t("areas.genericZona").replace("{name}", displayName)
      : translated(`areas.intro.${slug}`, (kind === "barrio" ? t("areas.genericBarrio") : t("areas.genericStyle")).replace("{name}", displayName))

  const otherBarrios = neighborhoods.filter((n) => !(kind === "barrio" && n.slug === slug)).slice(0, 14)
  const otherStyles = styles.filter((s) => !(kind === "musica" && s.slug === slug))
  const otherZones = zones.filter((z) => !(kind === "zona" && z.slug === slug))

  const chip = "rounded-full border border-white/10 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/5"

  // Líneas del bloque de datos. Solo salen las que tienen dato; nunca se rellena con algo inventado.
  // Metro, Nitbus y estilos solo en barrios y zonas: en una página de estilo (toda Barcelona) no dicen nada.
  const local = kind !== "musica"
  const facing: ReactNode[] = []
  if (facts) {
    facing.push(
      kind === "musica"
        ? fill("areas.facts.countStyle", { n: clubs.length, name: displayName })
        : fill("areas.facts.count", { n: clubs.length, name: displayName })
    )
    if (facts.price && facts.price.max > 0) {
      facing.push(
        facts.price.min === 0
          ? fill("areas.facts.priceFree", { max: euros(facts.price.max) })
          : fill("areas.facts.price", { min: euros(facts.price.min), max: euros(facts.price.max) })
      )
    }
    if (facts.hours) facing.push(fill("areas.facts.hours", { open: facts.hours.open, close: facts.hours.close }))
    if (facts.late && facts.late.n > 0) facing.push(fill("areas.facts.late", { n: facts.late.n, of: facts.late.of }))
    if (local && facts.styles.length > 0) {
      facing.push(fill("areas.facts.styles", { list: facts.styles.map((s) => translated(`areas.style.${s}`, s)).join(", ") }))
    }
    if (local && facts.metro.length > 0) facing.push(fill("areas.facts.metro", { list: facts.metro.join(", ") }))
    if (local && facts.nitbus.length > 0) facing.push(fill("areas.facts.nitbus", { list: facts.nitbus.join(", ") }))
    if (facts.top.length > 0) {
      // Los mejor valorados son enlaces a su ficha: la frase se parte por {list} y los enlaces van en medio.
      const [before, after = ""] = t("areas.facts.top").split("{list}")
      facing.push(
        <>
          {before}
          {facts.top.map((c, i) => (
            <span key={c.slug}>
              {i > 0 ? ", " : ""}
              <Link href={`/clubs/${c.slug}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                {c.name}
              </Link>{" "}
              ({c.rating.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
            </span>
          ))}
          {after}
        </>
      )
    }
  }

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
        {!facts && <p className="mt-3 text-sm text-zinc-400">{t("areas.count").replace("{n}", String(clubs.length))}</p>}
      </section>

      {facing.length > 0 && (
        <section aria-labelledby="area-facts-title" className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl rounded-card border border-white/10 bg-surface p-5 sm:p-6">
            <h2 id="area-facts-title" className="text-lg font-semibold">
              {t("areas.facts.title").replace("{name}", displayName)}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-300 marker:text-zinc-600">
              {facing.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

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
            showHours
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
        {kind !== "zona" && otherBarrios.length > 0 && (
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
        {otherZones.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold">{t("areas.otherZones")}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {otherZones.map((z) => (
                <Link key={z.slug} href={`/zona/${z.slug}`} className={chip}>
                  {z.name}
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
