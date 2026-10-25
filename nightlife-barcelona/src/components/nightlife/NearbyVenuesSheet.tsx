"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { getDeniedClubIds, rememberDenied } from "../../lib/deniedVenues"
import { createSlug } from "../../lib/slug"
import { distanceInMeters, formatDistance } from "../../lib/geo"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { useLanguage } from "../../context/LanguageContext"
import AuthGateModal from "../ui/AuthGateModal"
import { DoorClosed, X, Map as MapIcon, Navigation, Lock } from "lucide-react"
import { logError } from "../../lib/log"

type NearbyVenuesSheetProps = {
  // Id del club a excluir de los resultados (si se abre desde la ficha de un club). En la
  // ficha de un evento/festival no hay club propio que excluir, así que es opcional.
  excludeClubId?: number
  // Identifican el local/evento desde el que se abre esto, para poder guardar en
  // entry_denials qué motivo se eligió y en qué sitio. Para una ficha de club son los mismos
  // datos que excludeClubId, pero se piden aparte porque en la ficha de un evento no hay
  // excludeClubId (ahí no se excluye ningún club de los resultados).
  venueType: "club" | "event"
  venueId: number
  name: string
  latitude: number | null
  longitude: number | null
  // Botón discreto (enlace con icono) en vez del botón grande.
  compact?: boolean
}

type ClubRow = {
  id: number
  name: string
  slug?: string | null
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
// Sin cuenta se ven los 3 locales más cercanos gratis; el resto y la selección de motivo
// quedan detrás del modal de registro (decisión de producto: mantener abierto lo que ayuda a
// descubrir/compartir, topar lo que es personal o cuesta recursos).
const FREE_RESULTS = 3
// Antes se cogían los 8 clubs más cercanos de TODA la base de datos, sin tope de distancia: en
// zonas con pocos locales activos, eso podía sugerir sitios a varios km. Si no hay suficientes
// alternativas de verdad cerca, es mejor mostrar pocas (o ninguna, con el aviso de "nearby.empty")
// que mandar a alguien a caminar varios kilómetros.
const MAX_DISTANCE_METERS = 1500

function sortVenues(rows: ClubRow[], fromLat: number, fromLng: number, reason: Reason): VenueResult[] {
  const withDistance: VenueResult[] = rows
    .filter((c) => c.latitude != null && c.longitude != null)
    .map((c) => ({
      ...c,
      distanceMeters: distanceInMeters(fromLat, fromLng, c.latitude as number, c.longitude as number),
      noQueue: !c.queue || /no queue|sin cola/i.test(c.queue),
    }))
    .filter((c) => c.distanceMeters <= MAX_DISTANCE_METERS)

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

export default function NearbyVenuesSheet({
  excludeClubId,
  venueType,
  venueId,
  name,
  latitude,
  longitude,
  compact = false,
}: NearbyVenuesSheetProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [venues, setVenues] = useState<VenueResult[] | null>(null)
  const [reason, setReason] = useState<Reason>(null)
  const [usingLiveLocation, setUsingLiveLocation] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [reasonSaved, setReasonSaved] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const rowsRef = useRef<ClubRow[] | null>(null)
  // Guardamos la posición GPS real (si llega) para poder re-ordenar al cambiar el motivo
  // sin tener que volver a pedir la ubicación.
  const liveOriginRef = useRef<[number, number] | null>(null)
  // La hoja se monta con un portal a document.body (ver más abajo, junto al motivo). document
  // no existe en el render de servidor, así que esperamos a estar en el cliente.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
  }, [])

  const applyReason = (next: Reason) => {
    setReason(next)
    if (!rowsRef.current) return
    const origin = usingLiveLocation ? liveOriginRef.current : null
    const [fromLat, fromLng] = origin || [latitude as number, longitude as number]
    setVenues(sortVenues(rowsRef.current, fromLat, fromLng, next))

    // Guardamos qué motivo se eligió (solo al elegir uno, no al deseleccionarlo) para poder
    // verlo agregado en admin. Es "fire and forget": si falla, no interrumpe la experiencia
    // del usuario ni bloquea el listado de locales cercanos. No hay botón de "enviar" aparte
    // — elegir el chip ya guarda el motivo — así que mostramos una confirmación breve para que
    // quede claro que se ha registrado algo, en vez de no dar ninguna señal.
    if (next) {
      setReasonSaved(false)
      supabase
        .from("entry_denials")
        .insert({ user_id: userId, venue_type: venueType, venue_id: venueId, venue_name: name, reason: next })
        .then(({ error }) => {
          if (error) {
            logError("ENTRY DENIAL INSERT ERROR:", error)
            return
          }
          setReasonSaved(true)
          if (venueType === "club") rememberDenied(venueId)
        })
    } else {
      setReasonSaved(false)
    }
  }

  const handleOpen = useCallback(async () => {
    setOpen(true)
    if (venues !== null) return // ya cargado en una apertura anterior de esta sesión de página

    setLoading(true)

    let query = supabase
      .from("clubs")
      .select("id, name, slug, image, latitude, longitude, music, neighborhood, queue, trending, lgtbi_friendly")
      .eq("hidden", false)
      .not("latitude", "is", null)
      .not("longitude", "is", null)

    if (excludeClubId != null) query = query.neq("id", excludeClubId)

    const { data } = await query

    // Sin los locales donde a esta persona ya no le dejaron entrar (últimos 90 días).
    const denied = await getDeniedClubIds()
    const rows = ((data || []) as ClubRow[]).filter((r) => !denied.has(Number(r.id)))
    rowsRef.current = rows
    setVenues(sortVenues(rows, latitude as number, longitude as number, reason))
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

  // Sin coordenadas no hay nada que mostrar. Va después de todos los hooks (antes estaba antes de
  // useCallback y rompía las reglas de los hooks de React).
  if (!latitude || !longitude) return null

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
        className={
          compact
            ? "mt-3 flex w-full items-center justify-center gap-2 rounded-ctl px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-ink"
            : "flex w-full items-center justify-center gap-2 rounded-ctl border border-white/15 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
        }
      >
        <DoorClosed size={16} /> {t("nearby.triggerButton")}
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-xl sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-card border border-white/10 bg-night sm:max-w-lg sm:rounded-card"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/5 p-6 pb-5">
              <div>
                <h3 className="text-xl font-semibold text-ink">{t("nearby.title")}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {usingLiveLocation ? t("nearby.nearYou") : t("nearby.nearVenue").replace("{name}", name)}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t("clubPage.close")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {/* Solo 4 motivos: mejor que hagan wrap en dos líneas que depender de un scroll
                horizontal que en desktop (sin trackpad) no se puede accionar sin una barra
                visible. Así siempre se ven los 4 sin gestos raros. */}
            <div className="border-b border-white/5 p-4">
              {/* Para qué sirve decir el motivo, ANTES de elegirlo (25/10/2026). */}
              <p className="mb-3 text-xs leading-relaxed text-zinc-400">{t("nearby.reasonWhy")}</p>
              <div className="flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      if (!userId) {
                        setShowAuthGate(true)
                        return
                      }
                      applyReason(reason === r.key ? null : r.key)
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                      reason === r.key
                        ? "border-brand bg-brand text-white"
                        : "border-white/10 text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              {reasonSaved && (
                <p className="mt-2.5 text-xs font-semibold leading-relaxed text-open">
                  {t("nearby.reasonSaved").replace("{name}", name)}
                </p>
              )}
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
                  <MapIcon size={28} className="text-brand-soft" />
                  <p className="max-w-xs text-sm text-zinc-400">{t("nearby.empty")}</p>
                  <Link
                    href="/map"
                    onClick={() => setOpen(false)}
                    className="mt-2 rounded-ctl border border-white/15 px-5 py-2.5 text-sm font-semibold text-ink hover:bg-white/5"
                  >
                    {t("nearby.viewMap")}
                  </Link>
                </div>
              )}

              {venues !== null &&
                (userId ? venues : venues.slice(0, FREE_RESULTS)).map((v) => {
                  const slug = v.slug || createSlug(v.name)
                  return (
                    <div
                      key={v.id}
                      className="group flex items-center gap-4 rounded-ctl border border-white/10 p-3 transition hover:border-white/25"
                    >
                      <Link href={`/clubs/${slug}`} onClick={() => setOpen(false)} className="flex flex-1 items-center gap-4 overflow-hidden">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-ctl bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.image || FALLBACK_IMAGE} alt="" className="h-full w-full object-cover" onError={(e) => { if (!e.currentTarget.src.startsWith("data:")) e.currentTarget.src = FALLBACK_IMAGE }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink">{v.name}</p>
                          </div>
                          <p className="truncate text-xs text-zinc-400">
                            {[v.music, v.neighborhood].filter(Boolean).join(" · ") || "Barcelona"}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                              {formatDistance(v.distanceMeters)}
                            </span>
                            {v.noQueue && (
                              <span className="rounded-full bg-open/15 px-2.5 py-1 text-xs font-semibold text-open">
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
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 text-ink transition hover:bg-white/10"
                          title={t("nearby.directions")}
                          aria-label={t("nearby.directions")}
                        >
                          <Navigation size={16} />
                        </a>
                      )}
                    </div>
                  )
                })}

              {venues !== null && !userId && venues.length > FREE_RESULTS && (
                <button
                  onClick={() => setShowAuthGate(true)}
                  className="flex w-full flex-col items-center gap-2 rounded-ctl border border-dashed border-white/15 p-5 text-center transition hover:bg-white/5"
                >
                  <Lock size={20} className="text-zinc-400" />
                  <p className="text-sm font-semibold text-ink">
                    +{venues.length - FREE_RESULTS} {t("nearby.moreNearby")}
                  </p>
                  <span className="mt-1 rounded-ctl bg-brand px-4 py-2 text-xs font-semibold text-white">
                    {t("nearby.unlockAll")}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <AuthGateModal
        open={showAuthGate}
        onClose={() => setShowAuthGate(false)}
        subtitleKey="authGate.subtitleNearby"
      />
    </>
  )
}
