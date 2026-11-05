"use client"

import Icon from "../../ui/Icon"
import { useLanguage } from "../../../context/LanguageContext"
import { toast } from "../../ui/Toast"
import { detectPlatform, openRideApp, uberLink } from "../../../lib/rideLinks"

// Pedir un coche o un taxi desde la ficha. Antes Cabify y FREE NOW llevaban a su web aunque
// tuvieras la app instalada. Ahora en el móvil se abre la app (ver src/lib/rideLinks.ts):
// - Uber, con el destino ya puesto.
// - Cabify, con el destino ya puesto (su enlace documentado cabify://cabify/journey). Además se
//   copia la dirección, por si la versión instalada no lo lee.
// - FREE NOW, que no tiene enlace con destino: se copia la dirección para pegarla en la app.
// El 033 llama a Radio Taxi.
//
// Se registra qué app de VTC/taxi se pulsa (evento "ride_click" con el proveedor en `meta`, ver
// src/lib/track.ts) por si en el futuro hay acuerdo comercial con alguna de ellas — se puede ver
// el desglose en /admin/datos.
export default function RideButtons({
  name,
  address,
  lat,
  lng,
  onRideClick,
}: {
  name: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  onRideClick?: (provider: "uber" | "cabify" | "freenow") => void
}) {
  const { t } = useLanguage()
  const destination = [name, address].filter(Boolean).join(", ")

  const openUber = () => {
    onRideClick?.("uber")
    const href = uberLink(name, address, lat, lng)
    const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints || 0)
    // En el móvil se navega en la misma pestaña: así el enlace universal abre la app de Uber.
    if (platform === "desktop") window.open(href, "_blank", "noopener,noreferrer")
    else window.location.href = href
  }

  const openOther = (app: "cabify" | "freenow") => {
    onRideClick?.(app)
    // La copia tiene que pasar dentro del toque, antes de salir hacia la app.
    try {
      navigator.clipboard?.writeText(destination).then(() => toast(t("clubPage.rideCopied"), 4000)).catch(() => {})
    } catch {
      /* sin portapapeles: se abre la app igualmente */
    }
    openRideApp(app, { name, lat, lng })
  }

  // Estilo «píldora» (04/11/2026, ver .act en globals.css) con el logo oficial de cada app
  // (public/brands/, a partir de los logos que pasó Jordi).
  const btn = "act act-ride flex flex-col items-center justify-center gap-1.5 rounded-ctl px-1.5 py-3 text-xs font-semibold"

  return (
    <div>
      {address && (
        <div className="mb-3 flex items-start gap-2.5 rounded-ctl bg-white/[0.04] px-3.5 py-3">
          <Icon name="map" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-400">{t("clubPage.rideTo")}</p>
            <p className="text-sm font-semibold leading-snug text-ink">{address}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={openUber} className={`${btn} act-uber`}>
          <img src="/brands/uber.png" alt="" className="brand-logo" />
          Uber
        </button>
        <button type="button" onClick={() => openOther("cabify")} className={`${btn} act-cabify`}>
          <img src="/brands/cabify.png" alt="" className="brand-logo" />
          Cabify
        </button>
        <button type="button" onClick={() => openOther("freenow")} className={`${btn} act-freenow`}>
          <img src="/brands/freenow.png" alt="" className="brand-logo" />
          FREE NOW
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-zinc-400">{t("clubPage.rideHint")}</p>
      <a
        href="tel:933033033"
        className="act act-ride act-taxi mt-3 flex items-center justify-center gap-2 rounded-ctl px-4 py-3 text-xs font-semibold"
      >
        <Icon name="phone" className="h-4 w-4" />
        {t("clubPage.callTaxi")}
      </a>
    </div>
  )
}
