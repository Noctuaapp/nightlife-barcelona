"use client"

import Link from "next/link"
import Image from "../ui/SafeImage"
import { useLanguage } from "../../context/LanguageContext"
import { createSlug } from "../../lib/slug"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { track } from "../../lib/track"
import type { ActivePicks } from "../../lib/picks"

// Top 3 de Noctua en la portada (25/10/2026). Solo existe si lo habéis puesto desde
// /admin/recomendados: sin recomendados, este bloque no se pinta (ni un hueco vacío).
// Aquí la numeración sí significa algo (es un ranking), por eso el número es lo más grande.
export default function TopPicks({ data }: { data: ActivePicks | null }) {
  const { t } = useLanguage()
  if (!data || data.picks.length === 0) return null

  const title = data.period === "night" ? t("home.picksTonight") : t("home.picksWeek")

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6" aria-labelledby="top-picks-title">
      <div className="rounded-card border border-brand/30 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(124,92,255,0.22),transparent_60%)] p-4 sm:p-6">
        <p className="text-sm font-semibold text-brand-soft">{t("home.picksKicker")}</p>
        <h2 id="top-picks-title" className="font-display mt-1 text-2xl leading-tight sm:text-3xl">
          {title}
        </h2>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {data.picks.map((p) => {
            const href = `/clubs/${p.club.slug || createSlug(p.club.name)}`
            return (
              <li key={p.rank}>
                <Link
                  href={href}
                  onClick={() => track("top_pick_click", { itemType: "club", itemId: p.club.id, itemName: p.club.name, meta: { rank: p.rank, period: data.period } })}
                  className="group flex items-center gap-4 rounded-ctl border border-white/10 bg-night/60 p-3 transition hover:border-white/25 sm:h-full sm:flex-col sm:items-stretch sm:overflow-hidden sm:p-0"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-ctl sm:h-44 sm:w-full sm:rounded-none">
                    <Image
                      src={p.club.image || FALLBACK_IMAGE}
                      alt={p.club.name}
                      fill
                      sizes="(max-width: 640px) 80px, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="font-display absolute bottom-1 left-2 text-4xl leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:bottom-2 sm:left-3 sm:text-6xl"
                    >
                      {p.rank}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 sm:p-4 sm:pt-3">
                    <span className="sr-only">{p.rank}. </span>
                    <p className="truncate text-base font-semibold text-ink">{p.club.name}</p>
                    <p className="truncate text-sm text-zinc-400">
                      {[p.club.neighborhood, p.club.music].filter(Boolean).join(" · ")}
                    </p>
                    {p.note && <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-zinc-200">{p.note}</p>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
