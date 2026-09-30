"use client"

import { useState, useCallback, useRef } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { createSlug } from "../../lib/slug"
import { distanceInMeters, formatDistance } from "../../lib/geo"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { useLanguage } from "../../context/LanguageContext"

type NearbyVenuesSheetProps = {
  // Id del club a excluir de los resultados (si se abre desde la ficha de un club). En la
  // ficha de un evento/festival no hay club propio que excluir, así que es opcional.
  excludeClubId?: number
  name: string
  latitude: number | null
  longitude: number | null
}

type ClubRow = {
  id: number
  name: string
  image: string | null
  latitude: number | null
  longitude: number | null
  music: string | null
  neighborhood: string | null
  queue: string | null
  trending: boolean | null
  lgtbi_friendly: boolean | null
}

type VenueResult = ClubRow & { distanceMeters: number; noQueue: boolean }

type Reason = "dress" | "full" | "group" | "other" | null

const MAX_RESULTS = 8

function sortVenues(rows: ClubRow[], fromLat: number, fromLng: number, reason: Reason): VenueResult[] {
  const withDistance: VenueResult[] = rows
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      ...c,
      distanceMeters: distanceInMeters(fromLat, fromLng, c.latitude as number, c.longitude as number),
      noQueue: !c.queue || /no queue|sin cola/i.test(c.queue),
    }))

  const boostNoQueue = reason === "full" || reason === "group"

  return withDistance
    .sort((a, b) => {
      if (boostNoQueue && a.noQueue !== b.noQueue) return a.noQueue ? -1 : 1
      return a.distanceMeters - b.distanceMeters
    })
    .slice(0, MAX_RESULTS)
}

function SkeletonRow({ delay }: { delay: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
      <div className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-white/10" style={{ animationDelay: `${delay}ms` }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" style={{ animationDelay: `${delay}ms` }} />
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/5" style={{ animationDelay: `${delay}ms` }} />
      </div>
      <div className="h-6 w-14 shrink-0 animate-pulse rounded-full bg-white/5" style={{ animationDelay: `${delay}ms` }} />
    </div>
  )
}

export default function NearbyVenuesSheet({ excludeClubId, name, latitude, longitude }: NearbyVenuesSheetProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [venues, setVenues] = useState<VenueResult[] | null>(null)
  const [reason, setReason] = useState<Reason>(null)
  const [usingLiveLocation, setUsingLiveLocation] = useState(false)
  const rowsRef = useRef<ClubRow[] | null>(null)
  // Guardamos la posición GPS real (si llega) para poder re-ordenar al cambiar el motivo
  // sin tener que volver a pedir la ubicación.
  const liveOriginRef = useRef<[number, number] | null>(null)

  if (!latitude || !longitude) return null

  const applyReason = (next: Reason) => {
    setReason(next)
    if (!rowsRef.current) return
    const origin = usingLiveLocation ? liveOriginRef.current : null
    const [fromLat, fromLng] = origin || [latitude, longitude]
    setVenues(sortVenues(rowsRef.current, fromLat, fromLng, next))
  }

  const handleOpen = useCallback(async () => {
    setOpen(true)
    if (venues !== null) return // ya cargado en una apertura anterior de esta sesión de página

    setLoading(true)

    let query = supabase
      .from("clubs")
      .select("id, name, image, latitude, longitude, music, neighborhood, queue, trending, lgtbi_friendly")
      .eq("hidden", false)
      .not("latitude", "is", null)
      .not("longitude", "is", null)

    if (excludeClubId != null) query = query.neq("id", excludeClubId)

    const { data } = await query

    const rows = (data || []) as ClubRow[]
    rowsRef.current = rows
    setVenues(sortVenues(rows, latitude, longitude, reason))
    setLoading(false)

    // Refinado silencioso en segundo plano: si el GPS responde rápido, reordenamos con la
    // posición real del usuario. Si tarda, falla o no hay permiso, nos quedamos tal cual con
    // la posición del propio local — nunca bloqueamos ni mostramos un error por esto.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords
          liveOriginRef.current = [lat, lng]
          setUsingLiveLocation(true)
          setVenues(sortVenues(rows, lat, lng, reason))
        },
        () => {},
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 }
      )
    }
  }, [venues, excludeClubId, latitude, longitude, reason])

  const reasons: { key: Exclude<Reason, null>; label: string }[] = [
    { key: "dress", label: t("nearby.reasonDress") },
    { key: "full", label: t("nearby.reasonFull") },
    { key: "group", label: t("nearby.reasonGroup") },
    { key: "other", label: t("nearby.reasonOther") },
  ]

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:scale-[1.02] hover:bg-white/10"
      >
        🚫 {t("nearby.triggerButton")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-xl sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[#0b0912] sm:max-w-lg sm:rounded-[32px]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6 pb-5">
              <div>
                <p className="text-2xl">🚫✨</p>
                <h3 className="mt-2 text-xl font-black text-white">{t("nearby.title")}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {usingLiveLocation ? t("nearby.nearYou") : t("nearby.nearVenue").replace("{name}", name)}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto border-b border-white/5 p-4">
              {reasons.map((r) => (
                <button
                  key={r.key}
                  onClick={() => applyReason(reason === r.key ? null : r.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    reason === r.key
                      ? "border-purple-400/40 bg-purple-500/20 text-purple-200"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loading && venues === null && (
                <>
                  <SkeletonRow delay={0} />
                  <SkeletonRow delay={80} />
                  <SkeletonRow delay={160} />
                  <SkeletonRow delay={240} />
                </>
              )}

              {venues !== null && venues.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-3xl">🗺️</p>
                  <p className="max-w-xs text-sm text-zinc-400">{t("nearby.empty")}</p>
                  <Link
                    href="/map"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                  >
                    {t("nearby.viewMap")}
                  </Link>
                </div>
              )}

              {venues !== null &&
                venues.map((v) => {
                  const slug = createSlug(v.name)
                  return (
                    <div
                      key={v.id}
                      className="group flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.05]"
                    >
                      <Link href={`/clubs/${slug}`} onClick={() => setOpen(false)} className="flex flex-1 items-center gap-4 overflow-hidden">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                          <img src={v.image || FALLBACK_IMAGE} alt={v.name} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-black text-white">{v.name}</p>
                            {v.trending && <span className="shrink-0 text-xs">🔥</span>}
                          </div>
                          <p className="truncate text-xs text-zinc-500">
                            {[v.music, v.neighborhood].filter(Boolean).join(" · ") || "Barcelona"}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-zinc-200">
                              📍 {formatDistance(v.distanceMeters)}
                            </span>
                            {v.noQueue && (
                              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                {t("club.no_queue")}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                      {v.latitude && v.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                          title={t("nearby.directions")}
                        >
                          🗺️
                        </a>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
