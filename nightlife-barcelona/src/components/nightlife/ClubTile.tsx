"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../ui/SafeImage" // <Image> que nunca deja una foto rota
import Icon from "../ui/Icon"
import { createSlug } from "../../lib/slug"
import { activeNotices, effectiveOpenNow } from "../../lib/scheduleNotices"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { useLanguage } from "../../context/LanguageContext"
import { useClubText } from "../../lib/useClubText"

// Tarjeta compacta del listado /clubs (03/11/2026). La anterior (ClubCard) mide más de 300 px de alto
// con la foto a un lado y los datos debajo, y en el móvil sale de una en una: tres clubs ocupaban
// casi una pantalla entera. Esta es vertical y va de dos en dos: la foto manda y encima, sobre un
// degradado, el nombre, la valoración, el barrio, el estilo, el precio y como mucho una etiqueta. Un toque lleva a
// la ficha. ClubCard sigue siendo la de las páginas de barrio, zona y estilo (llevan el horario
// escrito para Google).
//
// El estado de arriba a la izquierda es uno solo, por este orden: cerrado temporalmente · hoy
// cerramos (aviso del dueño) · en directo (tranquilo / animado / lleno, si el local lo marcó en las
// últimas 4 h) · abierto ahora · cerrado. Misma lógica que ClubCard.
interface ClubTileProps {
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
  temporarilyClosed?: boolean
  scheduleNotices?: unknown
  // Las primeras tarjetas (lo que se ve nada más entrar) cargan la foto con prioridad.
  priority?: boolean
  // Proporción de la tarjeta (clases de Tailwind). Por defecto la del listado; «Locales parecidos» la usa más apaisada.
  ratio?: string
}

const LIVE_STATUS_MAX_AGE_MS = 4 * 60 * 60 * 1000

export default function ClubTile({
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
  temporarilyClosed = false,
  scheduleNotices,
  priority = false,
  ratio = "aspect-[4/5] md:aspect-square",
}: ClubTileProps) {
  const { t } = useLanguage()
  const ct = useClubText()
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
  const lastSpace = name.lastIndexOf(" ")
  const nameHead = lastSpace > 0 ? name.slice(0, lastSpace + 1) : ""
  const nameLast = lastSpace > 0 ? name.slice(lastSpace + 1) : name

  const LIVE: Record<string, string> = {
    tranquilo: t("clubPage.vibeQuiet"),
    animado: t("clubPage.vibeBusy"),
    lleno: t("clubPage.vibeFull"),
  }
  const live =
    liveStatus && liveStatusUpdatedAt && LIVE[liveStatus] && Date.now() - new Date(liveStatusUpdatedAt).getTime() < LIVE_STATUS_MAX_AGE_MS
      ? LIVE[liveStatus]
      : null

  // Un único estado visible.
  let status: { label: string; tone: "warn" | "open" | "dim"; live?: boolean } | null = null
  if (temporarilyClosed) status = { label: t("clubPage.tempClosed"), tone: "warn" }
  else if (closedTonight) status = { label: t("notices.closedTonightShort"), tone: "warn" }
  else if (live) status = { label: live, tone: "open", live: true }
  else if (openNow === true) status = { label: t("clubPage.openNow"), tone: "open", live: true }
  else if (openNow === false) status = { label: t("home.closed"), tone: "dim" }

  const statusClass = {
    warn: "bg-warn text-night",
    open: "bg-night/80 text-open",
    dim: "bg-night/70 text-zinc-300",
  }

  // Como mucho una etiqueta, la más útil para decidir: entrada gratis, promo de hoy, horario especial, ambiente.
  const tag = freeEntryInfo
    ? t("clubCard.freeEntry")
    : discountInfo
      ? t("clubCard.promoToday")
      : specialHours && !dimmed
        ? t("notices.specialHoursChip").replace("{hours}", specialHours)
        : lgtbi_friendly
          ? "LGTBI+"
          : null

  return (
    <Link
      href={`/clubs/${slug || createSlug(name)}`}
      className={`group relative block overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25 ${ratio}`}
    >
      <Image
        src={image || FALLBACK_IMAGE}
        alt={name}
        fill
        priority={priority}
        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
        unoptimized={!image}
        className={`object-cover transition duration-500 group-hover:scale-[1.04] ${dimmed ? "opacity-50 grayscale" : ""}`}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night via-night/55 via-45% to-transparent to-75%" />

      {status && (
        <span className={`absolute left-2.5 top-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass[status.tone]}`}>
          {status.live && <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-open" />}
          <span className="truncate">{status.label}</span>
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-2 font-display text-[15px] leading-tight text-ink">
          {nameHead}
          {/* La marca de verificado va pegada a la última palabra para que nunca quede sola en otra línea. */}
          <span className="whitespace-nowrap">
            {nameLast}
            {verified && <Icon name="check" className="ml-1 inline h-3.5 w-3.5 align-[-1px] text-brand-soft" />}
          </span>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-300">
          {rating ? (
            <span className="flex shrink-0 items-center gap-0.5 font-semibold text-ink">
              <Icon name="star" className="h-3 w-3 text-warn" /> {Number(rating).toFixed(1)}
            </span>
          ) : null}
          <span className="truncate">{[area || "Barcelona", ct.music(music)].filter(Boolean).join(" · ")}</span>
        </p>
        {(price || tag) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            {price && <span className="rounded-full border border-white/20 bg-night/50 px-2 py-0.5 text-zinc-100">{ct.price(price)}</span>}
            {tag && <span className="rounded-full bg-brand/80 px-2 py-0.5 text-white">{tag}</span>}
          </div>
        )}
      </div>
    </Link>
  )
}
