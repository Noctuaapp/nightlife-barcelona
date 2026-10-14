"use client"

import Icon from "../../ui/Icon"
import { useLanguage } from "../../../context/LanguageContext"

// Pedir un coche o un taxi desde la ficha. Antes el bloque "Taxi" llevaba "Ir andando" hasta la
// oficina de Cabify más cercana (un dato de la tabla de esenciales que no es una parada).
// Uber acepta el destino en el enlace; Cabify y FREE NOW abren su app/web; el 033 llama a Radio Taxi.
export default function RideButtons({ name, address, lat, lng }: { name: string; address?: string | null; lat?: number | null; lng?: number | null }) {
  const { t } = useLanguage()
  const uber =
    lat && lng
      ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}`
      : `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(address || name)}`

  const options = [
    { key: "uber", label: "Uber", href: uber },
    { key: "cabify", label: "Cabify", href: "https://cabify.com/es" },
    { key: "freenow", label: "FREE NOW", href: "https://www.free-now.com/es/" },
  ]

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => (
          <a
            key={o.key}
            href={o.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-ctl border border-white/10 bg-white/5 px-2 py-3 text-xs font-semibold text-ink transition hover:bg-white/10"
          >
            <Icon name="car" className="h-4 w-4 text-muted" />
            {o.label}
          </a>
        ))}
      </div>
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
