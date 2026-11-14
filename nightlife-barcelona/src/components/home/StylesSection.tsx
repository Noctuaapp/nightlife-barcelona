"use client"

import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import Image from "../ui/SafeImage"
import { useLanguage } from "../../context/LanguageContext"
import AutoScrollRow from "./AutoScrollRow"
import { homeStyleCards } from "../../lib/homeStyles"
import { useMemo } from "react"

// «¿Qué te apetece esta noche?» (06/11/2026). Es la forma más rápida de empezar a buscar sin saber el nombre de
// ningún local: se elige un ambiente (techno, reggaetón, latina…) y se abre su página con los locales donde
// suena. Rediseñada el 12/11/2026 («muy simple»): cada tarjeta es un cartel a dos tintas. La foto del mejor local se pasa
// a blanco y negro y se tiñe con los dos colores del estilo (así todas pegan entre sí aunque las fotos sean muy distintas),
// con un punto verde y el número de locales abiertos ahora (solo tras montar: depende de la hora), el nombre grande y, abajo, las
// miniaturas de otros locales del estilo, para ver de un vistazo que hay donde elegir.

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

const CARD = "h-72 sm:h-80"

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
                // Con locales abiertos ahora, la página del estilo se abre ya filtrada a esos (?open=1); sin ninguno, entera.
                href={openNow > 0 ? `/musica/${card.slug}?open=1` : `/musica/${card.slug}`}
                className={`group relative isolate w-[56vw] max-w-[15rem] shrink-0 snap-start overflow-hidden rounded-card border border-white/10 bg-night shadow-[inset_0_1px_0_rgba(255,255,255,.14)] transition-colors hover:border-white/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-60 ${CARD}`}
              >
                {/* Sin foto: solo los dos colores */}
                <span aria-hidden="true" className="absolute inset-0 -z-30" style={{ background: `linear-gradient(160deg, ${a}66 0%, ${b}22 70%, transparent 100%)` }} />
                {card.image && (
                  <Image
                    src={card.image}
                    alt=""
                    fill
                    sizes="240px"
                    className="-z-20 object-cover grayscale contrast-125 transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.06]"
                  />
                )}
                {/* Las dos tintas: el color toma la luz de la foto (blend «color») y un resplandor arriba */}
                <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `linear-gradient(155deg, ${a} 0%, ${b} 100%)`, mixBlendMode: card.image ? "color" : "normal", opacity: card.image ? 0.95 : 0 }} />
                <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: `radial-gradient(90% 60% at 10% 0%, ${a}99 0%, transparent 70%)`, mixBlendMode: "screen" }} />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night from-[6%] via-night/60 via-42% to-night/0 to-75%" />

                {openNow > 0 && (
                  <span
                    className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-night/65 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-open backdrop-blur-md"
                    aria-label={(openNow === 1 ? t("home.liveOpenOne") : t("home.liveOpenMany")).replace("{n}", String(openNow))}
                  >
                    <span aria-hidden="true" className="live-dot h-1.5 w-1.5 rounded-full bg-open" />
                    <span aria-hidden="true">{t("surprise.openCount").replace("{n}", String(openNow))}</span>
                  </span>
                )}
                <span aria-hidden="true" className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-night/45 text-white backdrop-blur-md transition group-hover:bg-white group-hover:text-night">
                  <ArrowUpRight size={17} strokeWidth={2.4} />
                </span>

                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4">
                  <span className="font-display text-[1.55rem] capitalize leading-[1.05] text-white [text-shadow:0_2px_18px_rgba(0,0,0,.55)]">{name}</span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-zinc-200">{t("areas.count").replace("{n}", String(card.count))}</span>
                    {card.thumbs.length > 0 && (
                      <span aria-hidden="true" className="flex -space-x-2">
                        {card.thumbs.map((src) => (
                          <span key={src} className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-night">
                            <Image src={src} alt="" fill sizes="28px" className="object-cover" />
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            )
          })}

          <Link
            href="/clubs"
            className={`group flex w-[40vw] max-w-[11rem] shrink-0 snap-start flex-col items-start justify-end gap-3 rounded-card border border-white/15 bg-white/[0.04] p-4 text-base font-semibold text-ink transition-colors hover:border-white/40 hover:bg-white/[0.08] sm:w-44 ${CARD}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-night transition-transform group-hover:translate-x-1">
              <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
            </span>
            {t("home.seeAll")}
          </Link>
        </AutoScrollRow>
        <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-0 top-0 w-10 bg-gradient-to-l from-night to-transparent sm:hidden" />
      </div>
    </section>
  )
}
