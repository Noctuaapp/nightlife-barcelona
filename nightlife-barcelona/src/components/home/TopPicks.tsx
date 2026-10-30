"use client"

import Link from "next/link"
import Image from "../ui/SafeImage"
import { useLanguage } from "../../context/LanguageContext"
import { createSlug } from "../../lib/slug"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { track } from "../../lib/track"
import type { ActivePicks } from "../../lib/picks"

// Oro, plata y bronce para los tres puestos: se lee como un podio de un vistazo.
const MEDAL = ["#f5c542", "#d6dbe4", "#e0915a"]

// Top 3 de Noctua en la portada (25/10/2026). Solo existe si lo habéis puesto desde
// /admin/recomendados: sin recomendados, este bloque no se pinta (ni un hueco vacío).
// Aquí la numeración sí significa algo (es un ranking), por eso el número es lo más grande.
export default function TopPicks({ data }: { data: ActivePicks | null }) {
  const { t } = useLanguage()
  if (!data || data.picks.length === 0) return null

  const title = data.period === "night" ? t("home.picksTonight") : t("home.picksWeek")

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 pt-2 sm:px-6" aria-labelledby="top-picks-title">
      {/* Borde en degradado fuego → marca, para que destaque sobre el resto de la portada. */}
      <div className="rounded-card p-[1.5px]" style={{ background: "linear-gradient(120deg, #ff7a18 0%, #ec4899 45%, #7c5cff 100%)" }}>
      <div className="rounded-[calc(var(--radius-card)-1.5px)] bg-night bg-[radial-gradient(110%_130%_at_0%_0%,rgba(255,122,24,0.20),transparent_55%),radial-gradient(90%_120%_at_100%_0%,rgba(124,92,255,0.18),transparent_60%)] p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl shadow-[0_0_24px_rgba(255,122,24,0.55)] motion-safe:animate-[topFlame_1.8s_ease-in-out_infinite] sm:h-12 sm:w-12"
            style={{ background: "linear-gradient(135deg, #ff7a18, #ec4899)" }}
          >
            🔥
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: "#ffb36b" }}>{t("home.picksKicker")}</p>
            <h2 id="top-picks-title" className="font-display text-2xl leading-tight sm:text-3xl">
              {title}
            </h2>
          </div>
        </div>

        <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
                      className="font-display absolute bottom-1 left-2 text-4xl leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:bottom-2 sm:left-3 sm:text-6xl"
                      style={{ color: MEDAL[p.rank - 1] || "#fff" }}
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
      </div>
      <style>{`@keyframes topFlame { 0%, 100% { transform: scale(1) rotate(-3deg) } 50% { transform: scale(1.08) rotate(3deg) } }`}</style>
    </section>
  )
}
