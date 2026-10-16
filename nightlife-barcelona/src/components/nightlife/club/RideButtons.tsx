"use client"

import Icon from "../../ui/Icon"
import { useLanguage } from "../../../context/LanguageContext"
import { toast } from "../../ui/Toast"
import { detectPlatform, openRideApp, uberLink } from "../../../lib/rideLinks"

// Pedir un coche o un taxi desde la ficha. Antes Cabify y FREE NOW llevaban a su web aunque
// tuvieras la app instalada. Ahora en el móvil se abre la app (ver src/lib/rideLinks.ts):
// - Uber, con el destino ya puesto.
// - Cabify y FREE NOW, que no aceptan el destino desde fuera: se copia la dirección del local
//   para pegarla en la app.
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
    openRideApp(app)
  }

  const btn =
    "flex items-center justify-center gap-1.5 rounded-ctl border border-white/10 bg-white/5 px-2 py-3 text-xs font-semibold text-ink transition hover:bg-white/10"

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={openUber} className={btn}>
          <Icon name="car" className="h-4 w-4 text-muted" />
          Uber
        </button>
        <button type="button" onClick={() => openOther("cabify")} className={btn}>
          <Icon name="car" className="h-4 w-4 text-muted" />
          Cabify
        </button>
        <button type="button" onClick={() => openOther("freenow")} className={btn}>
          <Icon name="car" className="h-4 w-4 text-muted" />
          FREE NOW
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-zinc-400">{t("clubPage.rideHint")}</p>
      <a
        href="tel:933033033"
        className="mt-2 flex items-center justify-center gap-2 rounded-ctl border border-white/10 px-4 py-3 text-xs font-semibold text-ink transition hover:bg-white/5"
      >
        <Icon name="phone" className="h-4 w-4 text-muted" />
        {t("clubPage.callTaxi")}
      </a>
    </div>
  )
}
