"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Icon from "../ui/Icon"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { useFavorites } from "../../context/FavoritesContext"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"
import { useInstallPrompt } from "../../lib/useInstallPrompt"

// Primer reto tras registrarse (27/10/2026): «guarda tus 3 primeros sitios». Quien acaba de crear
// la cuenta aterriza en la web sin saber qué hacer, y sin sitios guardados Noctua no tiene nada
// suyo que enseñarle (planes, "Tu mes en Noctua"). Es el mismo hueco en el que los visitantes sin
// cuenta ven el bloque de registro: aquí lo ve quien ya tiene cuenta, con menos de 14 días y menos
// de 3 clubs guardados. Se puede cerrar ("Ahora no"); al llegar a 3 se celebra una vez y
// desaparece. Si el navegador deja instalar la app (o es iPhone), se ofrece también.

const GOAL = 3
const MAX_ACCOUNT_AGE_DAYS = 14
const DISMISS_KEY = "noctua_welcome_dismissed"

export default function WelcomeChallenge({ wide = false }: { wide?: boolean }) {
  const { t } = useLanguage()
  const { favorites, loadingFavorites } = useFavorites()
  const install = useInstallPrompt()
  const [eligible, setEligible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [reached, setReached] = useState(false)
  const prevCount = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    const check = (session: { user: { created_at?: string } } | null) => {
      if (!alive) return
      if (!session) {
        setEligible(false)
        return
      }
      const created = Date.parse(session.user.created_at || "")
      setEligible(Number.isFinite(created) && Date.now() - created < MAX_ACCOUNT_AGE_DAYS * 86400000)
      try {
        setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1")
      } catch {
        /* sin almacenamiento: se enseña igualmente */
      }
    }
    supabase.auth.getSession().then(({ data }) => check(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => check(session))
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const count = favorites.filter((f) => f.item_type === "club").length

  // Se celebra solo si el tercero se guarda estando en la página (un solo toque), no cuando la lista
  // se carga entera de golpe.
  useEffect(() => {
    if (loadingFavorites) return
    if (prevCount.current !== null && prevCount.current < GOAL && count >= GOAL && count - prevCount.current <= 1) setReached(true)
    prevCount.current = count
  }, [count, loadingFavorites])

  if (!eligible || dismissed || loadingFavorites) return null
  if (!reached && count >= GOAL) return null

  const dismiss = () => {
    track("welcome_click", { meta: { to: "dismiss" } })
    try {
      window.localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      /* da igual */
    }
    setDismissed(true)
  }

  // Solo en móvil: el texto habla de «tu móvil», y en ordenador Chrome ya enseña su propio icono de instalar.
  const showInstall = !install.installed && install.isMobile && (install.canPrompt || install.isIos)

  return (
    <section className={`mx-auto mt-6 px-4 sm:px-6 ${wide ? "max-w-7xl" : "max-w-6xl"}`} aria-labelledby="welcome-challenge-title">
      <div className="relative overflow-hidden rounded-card border border-brand/40 bg-gradient-to-br from-[#1b1244] via-surface to-[#2b1038] p-4 sm:p-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:items-start sm:gap-3.5">
            <div className="shrink-0 rounded-full bg-white/[0.06] p-1.5">
              <NocOwl size={40} mood={reached ? "party" : "wink"} />
            </div>
            <div className="min-w-0">
              <h2 id="welcome-challenge-title" className="text-base font-extrabold leading-snug text-ink sm:text-xl">
                {reached ? t("welcome.doneTitle") : t("welcome.title")}
              </h2>
              <p className="mt-1 text-sm leading-snug text-zinc-300">{reached ? t("welcome.doneBody") : t("welcome.sub")}</p>
            </div>
          </div>

          <div className="shrink-0">
            <div className="flex items-center gap-2.5">
              <Link
                href={reached ? "/mi-mes" : "/clubs"}
                onClick={() => track("welcome_click", { meta: { to: reached ? "month" : "search" } })}
                className="flex flex-1 items-center justify-center rounded-ctl px-6 py-3 text-center text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(236,72,153,0.7)] transition hover:opacity-90 sm:flex-none"
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
              >
                {reached ? t("welcome.doneCta") : t("welcome.cta")}
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-ctl px-3 py-3 text-xs font-semibold text-zinc-400 transition hover:text-ink"
              >
                {t("welcome.dismiss")}
              </button>
            </div>
          </div>
        </div>

        {!reached && (
          <div className="relative mt-4 flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={GOAL}
              aria-valuenow={Math.min(count, GOAL)}
              className="flex items-center gap-1.5"
            >
              {Array.from({ length: GOAL }, (_, i) => (
                <Icon
                  key={i}
                  name="heart"
                  className={`h-6 w-6 ${i < count ? "fill-pink-400 text-pink-400" : "text-zinc-600"}`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-zinc-300">{t("welcome.progress").replace("{n}", String(Math.min(count, GOAL)))}</span>
          </div>
        )}

        {!reached && (
          <p className="relative mt-3 text-xs leading-snug text-zinc-400">
            {t("welcome.foot")}{" "}
            <Link href="/mi-mes" onClick={() => track("welcome_click", { meta: { to: "month" } })} className="font-semibold text-brand-soft hover:underline">
              {t("welcome.footLink")}
            </Link>
          </p>
        )}

        {showInstall && (
          <div className="relative mt-4 flex items-center gap-3 rounded-ctl border border-white/10 bg-white/[0.04] px-3.5 py-3">
            <Icon name="phone" className="h-5 w-5 shrink-0 text-brand-soft" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{t("welcome.installTitle")}</p>
              {!install.canPrompt && <p className="mt-0.5 text-xs leading-snug text-zinc-400">{t("welcome.installIos")}</p>}
            </div>
            {install.canPrompt && (
              <button
                type="button"
                onClick={() => {
                  track("install_click", { meta: { from: "welcome" } })
                  install.install()
                }}
                className="shrink-0 rounded-ctl bg-white px-4 py-2 text-xs font-bold text-night transition hover:opacity-90"
              >
                {t("welcome.installBtn")}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
