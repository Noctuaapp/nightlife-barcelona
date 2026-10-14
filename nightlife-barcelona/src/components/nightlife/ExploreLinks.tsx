"use client"

import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import type { AreaLink } from "../../lib/areas"

// Enlaces a las páginas de barrio y de estilo al final de /clubs: dan a Google (y a quien
// prefiera navegar así) un camino directo a "discotecas en Gràcia" o "discotecas de techno".
export default function ExploreLinks({ neighborhoods, styles }: { neighborhoods: AreaLink[]; styles: AreaLink[] }) {
  const { t } = useLanguage()
  if (neighborhoods.length === 0 && styles.length === 0) return null
  const styleName = (slug: string, fallback: string) => {
    const v = t(`areas.style.${slug}`)
    const out = v === `areas.style.${slug}` ? fallback : v
    return out.charAt(0).toUpperCase() + out.slice(1)
  }
  const chip = "rounded-full border border-white/10 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:bg-white/5"
  return (
    <section className="mx-auto max-w-7xl space-y-6 border-t border-white/10 bg-night px-4 pb-40 pt-10">
      <h2 className="text-xl font-semibold text-ink">{t("areas.exploreTitle")}</h2>
      {neighborhoods.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400">{t("areas.byBarrio")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {neighborhoods.map((n) => (
              <Link key={n.slug} href={`/barrio/${n.slug}`} className={chip}>
                {n.name} <span className="ml-1 font-normal text-zinc-400">{n.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {styles.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400">{t("areas.byStyle")}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {styles.map((s) => (
              <Link key={s.slug} href={`/musica/${s.slug}`} className={chip}>
                {styleName(s.slug, s.name)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
