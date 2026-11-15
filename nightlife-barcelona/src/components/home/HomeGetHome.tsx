"use client"

import { useEffect, useState } from "react"
import Link from "../system/CityLink"
import { Bus, CarTaxiFront, ChevronRight, TrainFront, type LucideIcon } from "lucide-react"
import { MetroLineBadge, NitbusBadge } from "../ui/TransitBadge"
import { useLanguage } from "../../context/LanguageContext"
import { getMetroTonight, type MetroTonight } from "../../lib/transitHours"
import { METRO_LINE_CODES } from "../../lib/metroLines"

// «Cómo volver a casa esta noche» en la portada (10/11/2026). Rediseñado el 12/11/2026 como un panel de
// información de transporte, como los rótulos de la estación: tres filas separadas por una línea fina, cada una con
// el color de su señal (rojo del metro, placa azul y amarilla del NitBus, amarillo del taxi) y, en las de metro y
// NitBus, las insignias reales de las líneas. Antes eran tres botones iguales con un icono; ahora cada fila dice
// algo: el estado del metro de hoy (mismo cálculo que la ficha de cada local), las líneas y a dónde lleva.
// La tarjeta de «Instala Noctua» que había debajo se quitó: ahora es la franja de arriba del todo (InstallBanner).

type Row = {
  href: string
  Icon: LucideIcon
  tile: { bg: string; fg: string }
  title: string
  note: string
  status?: { label: string; ok: boolean } | null
  badges?: React.ReactNode
}

const NITBUS_SAMPLE = ["N0", "N1", "N2", "N3", "N4", "N5"]
const MAX_METRO_BADGES = 7

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
  const rows: Row[] = [
    {
      href: "/metro",
      Icon: TrainFront,
      tile: { bg: "#d9261c", fg: "#fff" },
      title: t("home.doorMetro"),
      note: "",
      status: metroLabel ? { label: metroLabel, ok: metro?.state !== "closed" } : null,
      badges: (
        <span className="mt-2 flex flex-wrap items-center gap-1">
          {metroCodes.map((c) => (
            <MetroLineBadge key={c} code={c} />
          ))}
          {METRO_LINE_CODES.length > metroCodes.length && <span className="ml-0.5 text-xs font-semibold text-zinc-500">+{METRO_LINE_CODES.length - metroCodes.length}</span>}
        </span>
      ),
    },
    {
      href: "/nitbus",
      Icon: Bus,
      tile: { bg: "#1b2559", fg: "#ffd166" },
      title: t("home.doorNitbus"),
      note: t("home.getHomeNitbusHint"),
      badges: (
        <span className="mt-2 flex flex-wrap items-center gap-1">
          {NITBUS_SAMPLE.map((c) => (
            <NitbusBadge key={c} code={c} />
          ))}
          <span className="ml-0.5 text-xs font-semibold text-zinc-500">…</span>
        </span>
      ),
    },
    {
      href: "/essentials/taxi",
      Icon: CarTaxiFront,
      tile: { bg: "#f5c451", fg: "#0a0910" },
      title: t("home.getHomeTaxi"),
      note: t("home.getHomeTaxiHint"),
    },
  ]

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6" aria-labelledby="gethome-title">
      <div className="relative overflow-hidden rounded-card border border-white/10" style={{ background: "linear-gradient(180deg, #0c1234 0%, #080a1c 100%)" }}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(108,242,242,0.6) 20%, rgba(29,107,255,0.8) 50%, rgba(168,85,247,0.6) 80%, transparent)" }} />
        <div className="px-4 pb-3 pt-5 sm:px-5">
          <h2 id="gethome-title" className="font-display text-2xl sm:text-3xl">
            {t("home.getHomeTitle")}
          </h2>
          <p className="mt-1.5 text-sm leading-snug text-zinc-300">{t("home.getHomeText")}</p>
        </div>

        <ul className="divide-y divide-white/10 border-t border-white/10 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="group flex h-full items-start gap-3.5 px-4 py-4 transition hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white sm:px-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: r.tile.bg, color: r.tile.fg }}>
                  <r.Icon size={22} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold leading-tight text-ink">{r.title}</span>
                  {r.status && (
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${r.status.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                      {r.status.label}
                    </span>
                  )}
                  {r.note && <span className="mt-1 block text-xs leading-snug text-zinc-400">{r.note}</span>}
                  {r.badges}
                </span>
                <ChevronRight size={18} aria-hidden="true" className="mt-3 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
