"use client"

import { useEffect, useState } from "react"
import { Navigation, ExternalLink } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { useIsAdmin } from "../../lib/useIsAdmin"
import { supabase } from "../../lib/supabase"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { mananeoDirectionsUrl, mananeoHoursState, mananeoVisible, type MananeoPlace } from "../../lib/mananeo"
import { socialUrl } from "./club/SocialLinks"

// Apartado «Mañaneo» de Eventos (05/11/2026): sitios de afterhour para seguir cuando sale el sol. Los añade
// el admin en Admin › Mañaneo. Con MANANEO_HIDDEN (lib/featureFlags.ts) en true solo lo ve el admin, con un aviso;
// los demás no lo ven ni se les piden los datos (y la base de datos solo les devolvería los no ocultos).
export default function MananeoSection() {
  const { t } = useLanguage()
  const isAdmin = useIsAdmin()
  const show = mananeoVisible(isAdmin)
  const [places, setPlaces] = useState<MananeoPlace[] | null>(null)

  useEffect(() => {
    if (!show) return
    let alive = true
    supabase
      .from("mananeo_places")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (alive) setPlaces((data || []) as MananeoPlace[])
      })
    return () => {
      alive = false
    }
  }, [show])

  if (!show) return null
  if (places === null) return null
  if (places.length === 0 && !isAdmin) return null

  return (
    <section className="mx-auto mt-14 max-w-6xl px-4 pb-36 sm:px-6" aria-labelledby="mananeo-title">
      <h2 id="mananeo-title" className="font-display text-2xl leading-tight text-ink sm:text-3xl">
        {t("mananeo.title")}
      </h2>
      <p className="mt-2 max-w-xl text-sm text-zinc-400">{t("mananeo.subtitle")}</p>
      {isAdmin && (
        <p className="mt-3 text-xs font-semibold text-warn" role="note">
          Solo lo ves tú. Los sitios se añaden en Admin › Mañaneo.
        </p>
      )}

      {places.length === 0 ? (
        <p className="mt-6 rounded-card border border-white/10 bg-surface px-5 py-8 text-center text-sm text-zinc-400">
          Todavía no has añadido ningún sitio.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {places.map((p) => {
            const hours = mananeoHoursState(p.hours)
            const maps = mananeoDirectionsUrl(p)
            const ig = socialUrl("instagram", p.instagram)
            const web = socialUrl("website", p.website)
            const meta = [p.neighborhood, p.music, p.price].filter(Boolean).join(" · ")
            return (
              <li key={p.id} className="rounded-card border border-white/10 bg-surface p-4">
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image || FALLBACK_IMAGE}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-ctl object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">
                      {p.name}
                      {p.hidden && <span className="ml-2 text-xs font-semibold text-zinc-400">(oculto)</span>}
                    </p>
                    {hours ? (
                      <p className={`mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold ${hours.state === "open" ? "text-open" : "text-zinc-400"}`}>
                        {hours.state === "open" && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-open" />}
                        {hours.state === "open"
                          ? hours.at
                            ? t("mananeo.openUntil").replace("{t}", hours.at)
                            : t("mananeo.openNow")
                          : hours.at
                            ? t("mananeo.opensAt").replace("{t}", hours.at)
                            : t("mananeo.closedNow")}
                      </p>
                    ) : (
                      p.hours && <p className="mt-0.5 text-[13px] font-semibold text-zinc-300">{p.hours}</p>
                    )}
                    {meta && <p className="mt-0.5 truncate text-sm text-zinc-400">{meta}</p>}
                  </div>
                </div>
                {p.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-300">{p.description}</p>}
                {(maps || ig || web) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {maps && (
                      <a href={maps} target="_blank" rel="noopener noreferrer" className="btn-pill btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs">
                        <Navigation size={14} aria-hidden="true" /> {t("mananeo.directions")}
                      </a>
                    )}
                    {ig && (
                      <a href={ig} target="_blank" rel="noopener noreferrer" className="btn-pill btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs">
                        <ExternalLink size={14} aria-hidden="true" /> Instagram
                      </a>
                    )}
                    {web && (
                      <a href={web} target="_blank" rel="noopener noreferrer" className="btn-pill btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs">
                        <ExternalLink size={14} aria-hidden="true" /> Web
                      </a>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
