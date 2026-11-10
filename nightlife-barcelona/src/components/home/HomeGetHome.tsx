"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CarTaxiFront, Bus, TrainFront, X } from "lucide-react"
import InstallAppButton from "../system/InstallAppButton"
import { useLanguage } from "../../context/LanguageContext"
import { useInstallPrompt } from "../../lib/useInstallPrompt"
import { getMetroTonight, type MetroTonight } from "../../lib/transitHours"

// «Cómo volver a casa esta noche» en la portada (10/11/2026). Volver a casa era una puerta pequeña al final de
// «Explora Noctua», y es justo lo que más busca quien viene de fuera: a qué hora cierra el metro, si hay
// NitBus, cómo pedir un taxi. Aquí va justo debajo del carrusel de «Esta noche»: el estado del metro de hoy
// (mismo cálculo que la ficha de cada local) y tres accesos: Metro, NitBus y Taxi.
//
// Debajo, en el móvil y mientras la app no esté instalada, la tarjeta de «Instala Noctua» (la misma de Perfil),
// con una X para cerrarla: no vuelve a salir en 14 días. Sigue disponible en el menú ☰ y en Perfil.

const DISMISS_KEY = "noctua_home_install_dismissed"
const SNOOZE_MS = 14 * 24 * 3600 * 1000

const BTN =
  "flex flex-col items-start gap-2 rounded-ctl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm font-semibold text-ink transition hover:border-white/25 hover:bg-white/[0.08]"

export default function HomeGetHome() {
  const { t } = useLanguage()
  const install = useInstallPrompt()
  const [metro, setMetro] = useState<MetroTonight | null>(null)
  const [snoozed, setSnoozed] = useState(true) // oculto hasta saber si se cerró (evita un parpadeo al cargar)

  useEffect(() => {
    setMetro(getMetroTonight())
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0)
      setSnoozed(Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS)
    } catch {
      setSnoozed(false)
    }
  }, [])

  const dismiss = () => {
    setSnoozed(true)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* sin almacenamiento: se oculta solo esta visita */
    }
  }

  const metroLabel = !metro
    ? null
    : metro.state === "closed"
      ? t("clubPage.metroClosed")
      : metro.closes === "all-night"
        ? t("clubPage.metroAllNight")
        : t("clubPage.metroUntil").replace("{time}", metro.closes)

  const showInstall = !snoozed && install.isMobile && !install.installed

  return (
    <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6" aria-labelledby="gethome-title">
      <div className="relative overflow-hidden rounded-card border border-white/10 bg-surface p-4 sm:p-5">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#3b82ff]/30 blur-2xl" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#3b82ff] to-transparent" />

        <div className="relative lg:flex lg:items-center lg:justify-between lg:gap-8">
          <div>
            <h2 id="gethome-title" className="font-display text-2xl sm:text-3xl">
              {t("home.getHomeTitle")}
            </h2>
            <p className="mt-1.5 text-sm leading-snug text-zinc-300">{t("home.getHomeText")}</p>
            {metroLabel && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-ink">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${metro?.state === "closed" ? "bg-rose-400" : "bg-emerald-400"}`} />
                {t("home.doorMetro")}: {metroLabel}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 lg:mt-0 lg:w-[28rem]">
            <Link href="/metro" className={BTN}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3b82ff]/15 text-[#7fb0ff]">
                <TrainFront size={17} aria-hidden="true" />
              </span>
              {t("home.doorMetro")}
            </Link>
            <Link href="/nitbus" className={BTN}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#a855f7]/15 text-[#c79bff]">
                <Bus size={17} aria-hidden="true" />
              </span>
              {t("home.doorNitbus")}
            </Link>
            <Link href="/essentials/taxi" className={BTN}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#ec4899]/15 text-[#ff86bf]">
                <CarTaxiFront size={17} aria-hidden="true" />
              </span>
              {t("home.getHomeTaxi")}
            </Link>
          </div>
        </div>

        {showInstall && (
          <div className="relative mt-4">
            <InstallAppButton from="home" variant="card" cardClass="rounded-ctl p-4 pr-10" titleClass="text-base font-semibold text-ink" />
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("common.close")}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
