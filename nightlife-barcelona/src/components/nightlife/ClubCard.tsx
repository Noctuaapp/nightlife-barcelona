"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../ui/SafeImage" // <Image> que nunca deja una foto rota
import Icon from "../ui/Icon"
import { createSlug } from "../../lib/slug"
import { activeNotices, effectiveOpenNow } from "../../lib/scheduleNotices"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { useLanguage } from "../../context/LanguageContext"

// Tarjeta de club del listado. Rehecha tras la auditoría de octubre 2026:
// - Antes medía 420 px y llevaba hasta 9 etiquetas con emojis, algunas falsas: "🔥 {people}+ esta
//   noche" mostraba un número fijo de la base de datos como si fuera gente de esta noche, y las
//   etiquetas se podían pulsar para cambiar entre "En directo" y "Trending" sin ningún dato detrás.
// - Ahora: foto, si está abierto (con la hora de Madrid), estado en directo solo si el local lo
//   ha marcado en las últimas 4 h, valoración, precio y como mucho dos etiquetas útiles.
interface ClubCardProps {
  id: number
  name: string
  slug?: string | null
  music?: string | null
  area?: string | null
  price?: string | null
  hours?: string | null
  openDays?: string[] | null
  image?: string | null
  rating?: number | null
  lgtbi_friendly?: boolean
  verified?: boolean
  discountInfo?: string | null
  freeEntryInfo?: string | null
  liveStatus?: string | null
  liveStatusUpdatedAt?: string | null
  // Páginas de barrio, zona y estilo (29/10/2026): enseñan el horario escrito en la tarjeta, para
  // que el HTML que lee Google lleve horario y precio de cada local y no solo el nombre.
  showHours?: boolean
  // «Cerrado temporalmente» (30/10/2026): el local sigue en el listado, pero con su etiqueta y sin
  // el punto verde de «abierto ahora» aunque su horario diga que sí.
  temporarilyClosed?: boolean
  // Avisos del dueño (clubs.schedule_notices, lib/scheduleNotices.ts): «hoy cerramos» tapa la foto con
  // una banda y quita el «abierto ahora»; un horario especial se enseña junto al precio.
  scheduleNotices?: unknown
}

const LIVE_STATUS_MAX_AGE_MS = 4 * 60 * 60 * 1000

export default function ClubCard({
  name,
  slug,
  music,
  area,
  price,
  hours,
  openDays,
  image,
  rating,
  lgtbi_friendly,
  verified,
  discountInfo,
  freeEntryInfo,
  liveStatus,
  liveStatusUpdatedAt,
  showHours = false,
  temporarilyClosed = false,
  scheduleNotices,
}: ClubCardProps) {
  const { t } = useLanguage()
  const [openNow, setOpenNow] = useState<boolean | null>(null)
  const [closedTonight, setClosedTonight] = useState(false)
  const [specialHours, setSpecialHours] = useState<string | null>(null)
  useEffect(() => {
    setOpenNow(effectiveOpenNow({ hours, open_days: openDays, schedule_notices: scheduleNotices }))
    const active = activeNotices(scheduleNotices)
    setClosedTonight(active.some((n) => n.kind === "closed"))
    const sp = active.find((n) => n.kind === "hours" && n.open && n.close)
    setSpecialHours(sp ? `${sp.open}–${sp.close}` : null)
  }, [hours, openDays, scheduleNotices])
  const dimmed = temporarilyClosed || closedTonight

  const LIVE: Record<string, string> = {
    tranquilo: t("clubPage.vibeQuiet"),
    animado: t("clubPage.vibeBusy"),
    lleno: t("clubPage.vibeFull"),
  }
  const live =
    liveStatus && liveStatusUpdatedAt && LIVE[liveStatus] && Date.now() - new Date(liveStatusUpdatedAt).getTime() < LIVE_STATUS_MAX_AGE_MS
      ? LIVE[liveStatus]
      : null

  const tags = [
    freeEntryInfo && t("clubCard.freeEntry"),
    discountInfo && t("clubCard.promoToday"),
    lgtbi_friendly && "LGTBI+",
  ].filter(Boolean).slice(0, 2) as string[]

  return (
    <Link
      href={`/clubs/${slug || createSlug(name)}`}
      className="group block overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25"
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={image || FALLBACK_IMAGE}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          unoptimized={!image}
          className={`object-cover transition duration-500 group-hover:scale-[1.03] ${dimmed ? "opacity-50 grayscale" : ""}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        {/* «Hoy cerramos» (aviso del dueño): banda sobre la foto, solo esta noche. */}
        {closedTonight && !temporarilyClosed && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-night/90 px-3 py-2 text-sm font-bold text-warn">
            <Icon name="clock" className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("notices.closedTonightShort")}</span>
          </div>
        )}
        {/* Cerrado temporalmente (30/10/2026): banda ámbar a lo ancho de la foto para que se vea a primera vista. */}
        {temporarilyClosed && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-warn px-3 py-2 text-sm font-bold text-night">
            <Icon name="hourglass" className="h-4 w-4 shrink-0" />
            <span className="truncate">{t("clubPage.tempClosed")}</span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {dimmed ? null : openNow !== null && (
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${openNow ? "bg-night/80 text-open" : "bg-night/70 text-zinc-300"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${openNow ? "live-dot bg-open" : "bg-off"}`} />
              {openNow ? t("clubPage.openNow") : t("home.closed")}
            </span>
          )}
          {live && !dimmed && (
            <span className="flex items-center gap-1.5 rounded-full bg-night/80 px-2.5 py-1 text-xs font-semibold text-ink">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-open" /> {live}
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-semibold text-ink">
            {name}
            {verified && <Icon name="check" className="ml-1.5 inline h-4 w-4 align-[-2px] text-brand-soft" />}
          </h3>
          {rating ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">
              <Icon name="star" className="h-3.5 w-3.5 text-warn" /> {Number(rating).toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-sm text-zinc-400">{[area || "Barcelona", music].filter(Boolean).join(" · ")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {price && <span className="rounded-full border border-white/10 px-2.5 py-1 font-semibold text-zinc-200">{price}</span>}
          {specialHours && !dimmed && (
            <span className="rounded-full border border-warn/50 px-2.5 py-1 font-semibold text-warn">
              {t("notices.specialHoursChip").replace("{hours}", specialHours)}
            </span>
          )}
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-brand/15 px-2.5 py-1 font-semibold text-brand-soft">
              {tag}
            </span>
          ))}
        </div>
        {showHours && hours && (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400">
            <Icon name="clock" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{hours}</span>
          </p>
        )}
      </div>
    </Link>
  )
}
