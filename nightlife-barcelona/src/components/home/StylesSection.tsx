"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import Image from "../ui/SafeImage"
import { useLanguage } from "../../context/LanguageContext"
import AutoScrollRow from "./AutoScrollRow"
import { homeStyleCards } from "../../lib/homeStyles"
import { useMemo } from "react"

// «¿Qué te apetece esta noche?» (06/11/2026). Es la forma más rápida de empezar a buscar sin saber el nombre de
// ningún local: se elige un ambiente (techno, reggaetón, latina…) y se abre su página con los locales donde
// suena. Cada tarjeta lleva la foto del mejor local de ese estilo, teñida con uno de los colores del titular,
// y un punto verde si hay alguno abierto ahora (solo tras montar: depende de la hora).

type Club = Record<string, any>

// Dos colores de la marca por estilo (los del degradado del titular: cian, azul, violeta, rosa, más el coral del admin).
const HUES: Record<string, [string, string]> = {
  techno: ["#6cf2f2", "#3b82ff"],
  house: ["#a855f7", "#3b82ff"],
  reggaeton: ["#ec4899", "#fb923c"],
  latina: ["#fb923c", "#ec4899"],
  "hip-hop": ["#a855f7", "#ec4899"],
  "rock-indie": ["#3b82ff", "#a855f7"],
  comercial: ["#ec4899", "#a855f7"],
  jazz: ["#fbbf24", "#fb923c"],
}
const FALLBACK_HUE: [string, string] = ["#a855f7", "#3b82ff"]

export default function StylesSection({
  clubs,
  openMap,
  mounted,
}: {
  clubs: Club[]
  openMap: Record<string, boolean | null>
  mounted: boolean
}) {
  const { t } = useLanguage()
  const cards = useMemo(() => homeStyleCards(clubs), [clubs])
  if (cards.length === 0) return null

  return (
    <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6" aria-labelledby="styles-title">
      <h2 id="styles-title" className="font-display text-3xl sm:text-4xl">
        {t("home.stylesTitle")}
      </h2>
      <p className="mt-2 text-sm text-zinc-300">{t("home.stylesSub")}</p>

      <div className="relative -mx-4 mt-6 sm:mx-0">
        {/* Se desliza solo, despacio (se para al tocarlo o con el ratón encima); la tarjeta «Ver todos» entra en el bucle */}
        <AutoScrollRow className="scroll-x-thin flex gap-3 overflow-x-auto px-4 pb-3 sm:px-0">
          {cards.map((card) => {
            const [a, b] = HUES[card.slug] ?? FALLBACK_HUE
            const openNow = mounted ? card.ids.filter((id) => openMap[String(id)] === true).length : 0
            const name = t(`areas.style.${card.slug}`)
            return (
              <Link
                key={card.slug}
                href={`/musica/${card.slug}`}
                className="group relative h-64 w-[46vw] max-w-[13rem] shrink-0 snap-start overflow-hidden rounded-card border border-white/10 bg-surface sm:h-72 sm:w-52"
              >
                {card.image && (
                  <Image
                    src={card.image}
                    alt=""
                    fill
                    sizes="208px"
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                )}
                {/* El color del estilo: se funde con la foto (screen) y deja la zona de abajo oscura para el texto */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(160deg, ${a}8c 0%, ${b}33 55%, transparent 100%)`, mixBlendMode: card.image ? "screen" : "normal" }}
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night via-night/55 to-night/5" />
                {openNow > 0 && (
                  <span
                    className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-night/80 px-2 py-0.5 text-[11px] font-semibold text-open"
                    aria-label={(openNow === 1 ? t("home.liveOpenOne") : t("home.liveOpenMany")).replace("{n}", String(openNow))}
                  >
                    <span aria-hidden="true" className="live-dot h-1.5 w-1.5 rounded-full bg-open" />
                    {openNow}
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <p className="font-display text-xl capitalize leading-[1.05] text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.6)]">{name}</p>
                  <p className="mt-1.5 text-xs text-zinc-300">{t("areas.count").replace("{n}", String(card.count))}</p>
                </div>
              </Link>
            )
          })}

          <Link
            href="/clubs"
            className="group flex h-64 w-[38vw] max-w-[10rem] shrink-0 snap-start flex-col items-start justify-end gap-3 rounded-card border border-dashed border-white/20 p-4 text-sm font-semibold text-zinc-200 transition hover:border-white/40 hover:text-white sm:h-72 sm:w-40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 transition group-hover:translate-x-0.5">
              <ArrowRight size={16} aria-hidden="true" />
            </span>
            {t("home.seeAll")}
          </Link>
        </AutoScrollRow>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-0 top-0 w-10 bg-gradient-to-l from-night to-transparent sm:hidden" />
      </div>
    </section>
  )
}
