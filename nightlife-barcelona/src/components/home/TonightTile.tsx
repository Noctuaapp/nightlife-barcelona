"use client"

import Link from "next/link"
import Image from "../ui/SafeImage"
import Icon from "../ui/Icon"
import FavoriteButton from "../favorites/FavoriteButton"
import { useLanguage } from "../../context/LanguageContext"
import { useClubText } from "../../lib/useClubText"
import { clubHoursStatus, madridClock } from "../../lib/clubHours"
import { createSlug } from "../../lib/slug"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { track } from "../../lib/track"

// Tarjeta del carrusel «Abierto ahora» de la portada (12/11/2026). La anterior era un rectángulo bajo con el nombre y tres
// datos en una línea gris. Esta es un cartel vertical: la foto manda y encima va lo que decide si te acercas, la hora a la
// que cierra (o abre) el local, el barrio y la distancia, los estilos como etiquetas, la valoración y el precio en una
// pastilla clara. «Cierra pronto» aparece cuando falta menos de una hora. Las horas salen del horario del local
// (lib/clubHours.ts) y solo se calculan tras montar, como el estado de abierto.

type Club = Record<string, any>

const MUSIC_SPLIT = /\s*(?:,|\/|·|&|\by\b|\band\b)\s*/i

export default function TonightTile({ club, openNow, distance }: { club: Club; openNow: boolean | null; distance?: string | null }) {
  const { t } = useLanguage()
  const ct = useClubText()
  const rating = club.google_rating || club.rating
  const genres = ct
    .music(club.music)
    .split(MUSIC_SPLIT)
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 2)
  const price = club.price ? ct.price(club.price) : ""

  // Estado: «Abierto · hasta 06:00», «Cierra pronto · 05:30», «Cerrado · abre 23:30». Antes de montar no hay nada.
  let label: string | null = null
  let tone: "open" | "soon" | "closed" = "closed"
  if (openNow !== null) {
    const st = clubHoursStatus(club.hours, club.open_days)
    if (openNow) {
      tone = "open"
      label = t("clubPage.openNow")
      if (st?.open) {
        const [h, m] = st.at.split(":").map(Number)
        const left = (h * 60 + m - madridClock().minutes + 1440) % 1440
        if (left <= 60) {
          tone = "soon"
          label = t("openStatus.closesSoon").replace("{time}", st.at)
        } else label = t("openStatus.openUntil").replace("{time}", st.at)
      }
    } else {
      label = st && !st.open ? t("openStatus.closedOpens").replace("{time}", st.at) : t("home.closed")
    }
  }

  return (
    <div className="relative h-[19rem] w-[66vw] max-w-[260px] shrink-0 snap-start sm:h-[21rem] sm:w-[270px] sm:max-w-none">
      <Link
        href={`/clubs/${club.slug || createSlug(club.name)}`}
        onClick={() => track("home_tile_click", { itemType: "club", itemId: club.id, itemName: club.name, meta: { section: "tonight" } })}
        className="group relative isolate flex h-full w-full flex-col justify-end overflow-hidden rounded-card border border-white/10 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,.12)] transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Image
          src={club.image || FALLBACK_IMAGE}
          alt={club.name}
          fill
          sizes="270px"
          unoptimized={!club.image}
          className="-z-20 object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.05]"
        />
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night from-[4%] via-night/65 via-42% to-night/5 to-72%" />

        {label && (
          <span
            className={`absolute left-3 top-3 flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-full border border-white/15 bg-night/65 px-2.5 py-1.5 text-[11px] font-semibold leading-none backdrop-blur-md ${
              tone === "open" ? "text-open" : tone === "soon" ? "text-warn" : "text-zinc-300"
            }`}
          >
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone === "open" ? "live-dot bg-open" : tone === "soon" ? "live-dot bg-warn" : "bg-off"}`} />
            <span className="truncate">{label}</span>
          </span>
        )}

        <span className="relative flex flex-col gap-1.5 p-3.5">
          <span className="line-clamp-2 font-display text-[1.05rem] leading-[1.15] text-ink [text-shadow:0_2px_14px_rgba(0,0,0,.55)]">{club.name}</span>
          <span className="truncate text-xs text-zinc-300">{[club.neighborhood || "Barcelona", distance].filter(Boolean).join(" · ")}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {rating ? (
              <span className="flex items-center gap-1 text-xs font-bold text-ink">
                <Icon name="star" className="h-3 w-3 text-warn" /> {Number(rating).toFixed(1)}
              </span>
            ) : null}
            {genres.map((g) => (
              <span key={g} className="whitespace-nowrap rounded-full border border-white/20 bg-night/40 px-2 py-0.5 text-[11px] font-semibold text-zinc-100 backdrop-blur-sm">
                {g}
              </span>
            ))}
            {price && <span className="ml-auto max-w-[5.5rem] truncate rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-bold text-night">{price}</span>}
          </span>
        </span>
      </Link>
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton itemType="club" itemId={club.id} variant="overlay" />
      </div>
    </div>
  )
}
