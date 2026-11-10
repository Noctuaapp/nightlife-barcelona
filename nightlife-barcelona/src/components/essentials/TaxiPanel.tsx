"use client"

import Icon from "../ui/Icon"
import ArrowIcon from "../ui/ArrowIcon"
import { useLanguage } from "../../context/LanguageContext"
import { track } from "../../lib/track"
import { detectPlatform, openRideApp } from "../../lib/rideLinks"
import { TAXI_APPS, TAXI_PHONES, UBER_PICKUP_LINK, formatPhoneEs, telHref, type TaxiApp } from "../../lib/taxiOptions"

// Pantalla Taxi de Esenciales (11/11/2026). Antes: un solo recuadro con los botones de las apps y los de teléfono
// pegados en una fila, sin logos. Ahora son dos recuadros separados, cada uno con una lista en vertical:
//   1. «Pedir un taxi ahora»: una fila por app, con su logo; abre la app (en el móvil) o su web (en el ordenador).
//   2. «Teléfonos de radio taxi»: una fila por teléfono, que llama al pulsarla.
// Se registra qué app se pulsa (evento «ride_click», igual que en las fichas) y qué teléfono (phone_click).
const ROW =
  "flex min-h-[64px] w-full items-center gap-4 rounded-ctl border border-white/10 bg-surface-2 px-4 py-3 text-left transition hover:border-white/25 active:scale-[0.99] motion-reduce:transition-none"

export default function TaxiPanel() {
  const { t } = useLanguage()

  const openApp = (app: TaxiApp) => {
    track("ride_click", { itemType: "essential", itemName: app.name, meta: { provider: app.id, source: "taxi_page" } })
    if (app.id === "uber") {
      // En el móvil se navega en la misma pestaña para que el enlace universal abra la app de Uber.
      const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints || 0)
      if (platform === "desktop") window.open(UBER_PICKUP_LINK, "_blank", "noopener,noreferrer")
      else window.location.href = UBER_PICKUP_LINK
      return
    }
    openRideApp(app.id)
  }

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4" aria-label={t("essentialsPage.taxiNow")}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-white/10 bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">{t("essentialsPage.taxiNow")}</h2>
          <p className="mt-1 text-sm leading-snug text-zinc-400">{t("essentialsPage.taxiAppsHint")}</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {TAXI_APPS.map((app) => (
              <li key={app.id}>
                <button type="button" onClick={() => openApp(app)} className={ROW}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={app.logo} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" />
                  <span className="min-w-0 flex-1 text-base font-semibold text-ink">{app.name}</span>
                  <ArrowIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-card border border-white/10 bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">{t("essentialsPage.taxiPhonesTitle")}</h2>
          <p className="mt-1 text-sm leading-snug text-zinc-400">{t("essentialsPage.taxiPhonesHint")}</p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {TAXI_PHONES.map((p) => (
              <li key={p.phone}>
                <a
                  href={telHref(p.phone)}
                  onClick={() => track("phone_click", { itemType: "essential", itemName: p.name, meta: { category: "taxi", source: "taxi_page" } })}
                  className={ROW}
                  aria-label={`${t("essentialsPage.call")} ${p.name} ${formatPhoneEs(p.phone)}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-soft">
                    <Icon name="phone" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-ink">{p.name}</span>
                    <span className="block text-sm tabular-nums text-zinc-400">{formatPhoneEs(p.phone)}</span>
                  </span>
                  <span className="btn-pill btn-primary shrink-0 px-4 py-2 text-xs">{t("essentialsPage.call")}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
