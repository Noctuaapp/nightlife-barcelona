"use client"

import Link from "next/link"
import { ArrowUpRight, Bus, CalendarHeart, Map as MapIcon, TrainFront } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { SECTION_ICONS } from "../../lib/sectionIcons"

// «Explora Noctua» (06/11/2026). Antes la portada enseñaba locales y, de golpe, una lista de tarjetas iguales:
// quien llegaba no veía que Noctua también tiene mapa, esenciales, metro y bus nocturno. Aquí van las puertas de
// entrada a cada parte, cada una con uno de los colores del titular (cian → azul → violeta → rosa), que es lo
// que une el bloque con el resto de la portada. Sustituye a los botones sueltos que había bajo el carrusel en
// el móvil (en escritorio siguen en la parte de arriba).
//
// Las cuatro puertas son destinos de primer nivel; «Volver a casa» agrupa Metro y NitBus porque a las 4 de la
// mañana es una sola pregunta («¿cómo llego?»), no dos.

type Tone = { glow: string; line: string; chip: string; text: string }

const TONES: Record<"cyan" | "violet" | "pink" | "blue", Tone> = {
  cyan: { glow: "bg-[#6cf2f2]/25", line: "via-[#6cf2f2]", chip: "bg-[#6cf2f2]/15 text-[#6cf2f2]", text: "text-[#6cf2f2]" },
  violet: { glow: "bg-[#a855f7]/30", line: "via-[#a855f7]", chip: "bg-[#a855f7]/15 text-[#c79bff]", text: "text-[#c79bff]" },
  pink: { glow: "bg-[#ec4899]/25", line: "via-[#ec4899]", chip: "bg-[#ec4899]/15 text-[#ff86bf]", text: "text-[#ff86bf]" },
  blue: { glow: "bg-[#3b82ff]/30", line: "via-[#3b82ff]", chip: "bg-[#3b82ff]/15 text-[#7fb0ff]", text: "text-[#7fb0ff]" },
}

const CARD = "group relative flex overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25"

function Glow({ tone }: { tone: Tone }) {
  return (
    <>
      <span aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full blur-2xl ${tone.glow}`} />
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${tone.line} to-transparent`} />
    </>
  )
}

export default function ExploreDoors() {
  const { t } = useLanguage()
  const Essentials = SECTION_ICONS.essentials

  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6" aria-labelledby="explore-title">
      <h2 id="explore-title" className="font-display text-3xl sm:text-4xl">
        {t("home.exploreTitle")}
      </h2>
      <p className="mt-2 text-sm text-zinc-300">{t("home.exploreSub")}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {/* Mapa: la puerta grande, con el trazado de una ruta de noche dibujado detrás */}
        <Link href="/map" className={`${CARD} col-span-2 min-h-[8.5rem] flex-col justify-between p-4 sm:p-5`}>
          <Glow tone={TONES.cyan} />
          <svg
            aria-hidden="true"
            viewBox="0 0 200 100"
            className="pointer-events-none absolute bottom-3 right-4 top-3 w-[40%] max-w-[15rem] opacity-80"
            fill="none"
          >
            <path d="M10 88 C 36 84, 46 54, 72 58 S 112 88, 132 56 S 160 22, 186 18" stroke="url(#door-route)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 7" />
            <circle cx="72" cy="58" r="4" fill="#6cf2f2" />
            <circle cx="132" cy="56" r="4" fill="#3b82ff" />
            <circle cx="186" cy="18" r="9" fill="#ec4899" opacity="0.25" />
            <circle cx="186" cy="18" r="4.5" fill="#ec4899" />
            <defs>
              <linearGradient id="door-route" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#6cf2f2" />
                <stop offset="0.5" stopColor="#3b82ff" />
                <stop offset="1" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          <span className={`relative grid h-10 w-10 place-items-center rounded-xl ${TONES.cyan.chip}`}>
            <MapIcon size={20} aria-hidden="true" />
          </span>
          <span className="relative mt-4 block max-w-[56%] sm:max-w-[16rem]">
            <span className="block text-base font-semibold text-ink">
              {t("home.quickMap")}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{t("home.doorMapText")}</span>
          </span>
        </Link>

        <Link href="/plan" className={`${CARD} flex-col justify-between gap-4 p-4`}>
          <Glow tone={TONES.violet} />
          <ArrowUpRight size={16} aria-hidden="true" className="absolute right-4 top-4 text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
          <span className={`relative grid h-10 w-10 place-items-center rounded-xl ${TONES.violet.chip}`}>
            <CalendarHeart size={20} aria-hidden="true" />
          </span>
          <span className="relative block">
            <span className="block text-base font-semibold leading-tight text-ink">
              {t("home.quickPlan")}
            </span>
            <span className="mt-1 block text-xs leading-snug text-zinc-400">{t("home.doorPlanText")}</span>
          </span>
        </Link>

        <Link href="/essentials" className={`${CARD} flex-col justify-between gap-4 p-4`}>
          <Glow tone={TONES.pink} />
          <ArrowUpRight size={16} aria-hidden="true" className="absolute right-4 top-4 text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
          <span className={`relative grid h-10 w-10 place-items-center rounded-xl ${TONES.pink.chip}`}>
            <Essentials size={20} aria-hidden="true" />
          </span>
          <span className="relative block">
            <span className="block text-base font-semibold leading-tight text-ink">
              {t("home.quickEssentials")}
            </span>
            <span className="mt-1 block text-xs leading-snug text-zinc-400">{t("home.doorEssentialsText")}</span>
          </span>
        </Link>

        {/* Volver a casa: dos accesos en una misma puerta (no se anidan enlaces) */}
        <div className={`${CARD} col-span-2 flex-col gap-4 p-4 sm:p-5 lg:col-span-4 lg:flex-row lg:items-center lg:justify-between`}>
          <Glow tone={TONES.blue} />
          <div className="relative">
            <p className="text-base font-semibold text-ink">{t("home.doorHomeTitle")}</p>
            <p className="mt-0.5 text-xs leading-snug text-zinc-400">{t("home.doorHomeText")}</p>
          </div>
          <div className="relative grid grid-cols-2 gap-2 lg:w-[26rem]">
            <Link
              href="/metro"
              className="flex items-center gap-2.5 rounded-ctl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-ink transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES.blue.chip}`}>
                <TrainFront size={17} aria-hidden="true" />
              </span>
              {t("home.doorMetro")}
            </Link>
            <Link
              href="/nitbus"
              className="flex items-center gap-2.5 rounded-ctl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-ink transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONES.violet.chip}`}>
                <Bus size={17} aria-hidden="true" />
              </span>
              {t("home.doorNitbus")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
