"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, BusFront, CarTaxiFront } from "lucide-react"
import { MetroLineBadge, NitbusBadge } from "../ui/TransitBadge"
import { NITBUS_PLATE } from "../../lib/transitColors"
import { useLanguage } from "../../context/LanguageContext"
import { getMetroTonight, type MetroTonight } from "../../lib/transitHours"
import { METRO_LINE_CODES } from "../../lib/metroLines"
import TransitNetwork from "./art/TransitNetwork"

// «Cómo volver a casa esta noche» en la portada (10/11/2026). Rediseñado el 12/11/2026, cuarta versión: sin fotografía. Las dos
// primeras usaban la foto de la portada y la tercera un amanecer dibujado (se veía cutre). Ahora el fondo es un plano de metro
// esquemático con los colores oficiales de las líneas (art/TransitNetwork.tsx, SVG en línea). Arriba, el titular; abajo, tres
// láminas de cristal, una por cada forma de volver, con su señal de la calle: el rombo rojo del metro, la placa azul del NitBus
// y el amarillo del taxi. El estado del metro es el mismo cálculo que la ficha de cada local.
// La tarjeta de «Instala Noctua» que había debajo se quitó: ahora es la franja de arriba del todo (InstallBanner).

const NITBUS_SAMPLE = ["N0", "N1", "N2", "N3", "N4", "N5"]
const MAX_METRO_BADGES = 7

// Rombo rojo con la M, el rótulo del metro en la calle.
function MetroSign() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true" focusable="false" className="h-11 w-11 drop-shadow-[0_0_14px_rgba(226,35,26,.55)] md:col-start-1 md:row-start-1">
      <rect x="7" y="7" width="30" height="30" rx="4.5" transform="rotate(45 22 22)" fill="#e2231a" />
      <text x="22" y="28.2" textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff" fontFamily="inherit">
        M
      </text>
    </svg>
  )
}

function Sign({ bg, fg, glow, children }: { bg: string; fg: string; glow: string; children: React.ReactNode }) {
  return (
    <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 md:col-start-1 md:row-start-1" style={{ background: bg, color: fg, boxShadow: `0 0 16px ${glow}` }}>
      {children}
    </span>
  )
}

export default function HomeGetHome() {
  const { t } = useLanguage()
  const [metro, setMetro] = useState<MetroTonight | null>(null)

  useEffect(() => {
    setMetro(getMetroTonight())
  }, [])

  const metroLabel = !metro
    ? null
    : metro.state === "closed"
      ? t("clubPage.metroClosed")
      : metro.closes === "all-night"
        ? t("clubPage.metroAllNight")
        : t("clubPage.metroUntil").replace("{time}", metro.closes)

  const metroCodes = METRO_LINE_CODES.slice(0, MAX_METRO_BADGES)

  const cardClass =
    "group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-3 rounded-2xl border border-white/20 bg-night/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_20px_44px_-20px_rgba(0,0,0,.85)] backdrop-blur-xl transition-colors hover:border-white/40 hover:bg-night/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:p-5 md:grid-cols-[1fr_auto] md:grid-rows-[auto_1fr]"
  // Texto de la tarjeta: en móvil va entre la señal y la flecha; desde md, debajo de las dos.
  const bodyClass = "col-start-2 row-start-1 flex min-w-0 flex-col gap-1 md:col-span-2 md:col-start-1 md:row-start-2 md:h-full"
  const arrow = (
    <ArrowUpRight size={20} strokeWidth={2.4} aria-hidden="true" className="col-start-3 row-start-1 shrink-0 text-zinc-300 md:col-start-2 md:row-start-1 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
  )

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6" aria-labelledby="gethome-title">
      <div className="relative isolate flex min-h-[38rem] flex-col justify-between gap-16 overflow-hidden rounded-card border border-white/10 bg-night px-4 pb-4 pt-6 shadow-[inset_0_1px_0_rgba(255,255,255,.14)] sm:min-h-[36rem] sm:gap-24 sm:px-6 sm:pb-6 sm:pt-8 lg:min-h-[33rem] lg:gap-0 lg:px-8 lg:pb-8 lg:pt-10">
        {/* En el móvil el dibujo sube para que el intercambiador quede entre el titular y las láminas, no detrás de ellas. */}
        <TransitNetwork className="absolute inset-x-0 -top-60 -z-20 h-[calc(100%+15rem)] w-full sm:-top-24 sm:h-[calc(100%+6rem)] lg:inset-0 lg:top-0 lg:h-full" />
        {/* Lectura del texto: oscuro arriba (el titular) y abajo (las láminas); en medio se ve el intercambiador */}
        <span aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: "linear-gradient(180deg, rgba(10,9,16,.9) 0%, rgba(10,9,16,.5) 22%, rgba(10,9,16,.05) 40%, rgba(10,9,16,.15) 75%, rgba(10,9,16,.4) 100%)" }} />

        <div>
          <h2 id="gethome-title" className="max-w-xl font-display text-[1.9rem] leading-[1.08] text-white [text-shadow:0_2px_26px_rgba(0,0,0,.55)] sm:text-4xl lg:text-5xl">
            {t("home.getHomeTitle")}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-100 [text-shadow:0_1px_14px_rgba(0,0,0,.6)] sm:text-base">{t("home.getHomeText")}</p>
        </div>

        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <li className="flex">
            <Link href="/metro" className={`${cardClass} w-full`}>
              <MetroSign />
              <span className={bodyClass}>
                <span className="block text-lg font-bold leading-tight text-ink">{t("home.doorMetro")}</span>
                {metroLabel && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${metro?.state !== "closed" ? "bg-open shadow-[0_0_8px_rgba(52,211,153,.9)]" : "bg-rose-400"}`} />
                    {metroLabel}
                  </span>
                )}
                <span className="mt-1 flex flex-wrap items-center gap-1 md:mt-auto md:pt-2">
                  {metroCodes.map((c) => (
                    <MetroLineBadge key={c} code={c} />
                  ))}
                  {METRO_LINE_CODES.length > metroCodes.length && <span className="ml-0.5 text-xs font-semibold text-zinc-300">+{METRO_LINE_CODES.length - metroCodes.length}</span>}
                </span>
              </span>
              {arrow}
            </Link>
          </li>
          <li className="flex">
            <Link href="/nitbus" className={`${cardClass} w-full`}>
              <Sign bg={NITBUS_PLATE.bg} fg={NITBUS_PLATE.fg} glow="rgba(255,209,102,.3)">
                <BusFront size={24} strokeWidth={2.2} />
              </Sign>
              <span className={bodyClass}>
                <span className="block text-lg font-bold leading-tight text-ink">{t("home.doorNitbus")}</span>
                <span className="block text-xs leading-snug text-zinc-200">{t("home.getHomeNitbusHint")}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1 md:mt-auto md:pt-2">
                  {NITBUS_SAMPLE.map((c) => (
                    <NitbusBadge key={c} code={c} />
                  ))}
                  <span className="ml-0.5 text-xs font-semibold text-zinc-300">…</span>
                </span>
              </span>
              {arrow}
            </Link>
          </li>
          <li className="flex">
            <Link href="/essentials/taxi" className={`${cardClass} w-full`}>
              <Sign bg="#f5c451" fg="#0a0910" glow="rgba(245,196,81,.35)">
                <CarTaxiFront size={24} strokeWidth={2.2} />
              </Sign>
              <span className={bodyClass}>
                <span className="block text-lg font-bold leading-tight text-ink">{t("home.getHomeTaxi")}</span>
                <span className="block text-xs leading-snug text-zinc-200">{t("home.getHomeTaxiHint")}</span>
              </span>
              {arrow}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
