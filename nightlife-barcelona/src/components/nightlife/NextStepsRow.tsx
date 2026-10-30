"use client"

import Link from "next/link"
import Icon from "../ui/Icon"
import { useLanguage } from "../../context/LanguageContext"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"
import { createSlug } from "../../lib/slug"
import { STYLES } from "../../lib/areas"
import { track } from "../../lib/track"

// «Sigue la noche» (27/10/2026): fila de accesos en la ficha de un club o evento. Casi todas las
// visitas llegan desde Google a una ficha, ven el dato y se van; esta fila les da una segunda
// página a un toque, sin pedir cuenta:
//  · Más locales del mismo barrio y del mismo estilo (también refuerzan los enlaces internos).
//  · Planifica tu noche (/plan) y, en un evento, todos los eventos.
// Cada pulsación se anota en Admin › Visitas como "next_click".
// (El botón de compartir ya existe en la cabecera de la ficha y en la barra fija: no se repite aquí.)

type Props = {
  kind: "club" | "event"
  itemId: number
  name: string
  neighborhood?: string | null
  music?: string | null
}

export default function NextStepsRow({ kind, itemId, name, neighborhood, music }: Props) {
  const { t } = useLanguage()

  const hoodSlug = neighborhood ? createSlug(neighborhood) : ""
  // El estilo más concreto primero (techno antes que "música electrónica"): el orden de STYLES.
  const style = music ? STYLES.find((s) => s.rx.test(music)) : undefined

  const track_ = (to: string) => track("next_click", { itemType: kind, itemId, itemName: name, meta: { to } })

  const pill =
    "flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-cyan-300/50 hover:bg-white/10"

  return (
    <section className="mx-auto mt-6 max-w-6xl px-4 sm:px-6" aria-label={t("home.quickTitle")}>
      <ul className="flex flex-wrap gap-2">
        {hoodSlug && neighborhood && (
          <li>
            <Link href={`/barrio/${hoodSlug}`} onClick={() => track_("hood")} className={pill}>
              <Icon name="map" className="h-3.5 w-3.5 text-cyan-300" /> {t("nextSteps.moreInHood").replace("{name}", neighborhood)}
            </Link>
          </li>
        )}
        {style && (
          <li>
            <Link href={`/musica/${style.slug}`} onClick={() => track_("style")} className={pill}>
              <Icon name="music" className="h-3.5 w-3.5 text-cyan-300" />{" "}
              {t("nextSteps.moreStyle").replace("{style}", t(`areas.style.${style.slug}`))}
            </Link>
          </li>
        )}
        <li>
          <Link href="/plan" onClick={() => track_("plan")} className={pill}>
            <Icon name="calendar" className="h-3.5 w-3.5 text-cyan-300" /> {t("home.quickPlan")}
          </Link>
        </li>
        {kind === "event" && !EVENTS_HIDDEN && (
          <li>
            <Link href="/events" onClick={() => track_("events")} className={pill}>
              <Icon name="ticket" className="h-3.5 w-3.5 text-cyan-300" /> {t("home.quickEvents")}
            </Link>
          </li>
        )}
      </ul>
    </section>
  )
}
