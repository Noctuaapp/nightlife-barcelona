"use client"

import { useEffect, useState } from "react"
import Icon from "../../ui/Icon"
import RideButtons from "./RideButtons"
import { supabase } from "../../../lib/supabase"
import { useLanguage } from "../../../context/LanguageContext"
import { splitNightBusCodes } from "../../../lib/nightBuses"
import { nearestMetroStations } from "../../../lib/metroStations"
import { getMetroTonight } from "../../../lib/transitHours"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../../lib/geo"
import { MetroLineBadge, NitbusRouteRow } from "../../ui/TransitBadge"

// Cómo llegar y, sobre todo, cómo volver: metro (con su horario de esta noche), NitBus y taxi.
const PLACA_CATALUNYA = { lat: 41.3869, lon: 2.1701 }
// En la categoría Taxi de esenciales también hay oficinas de empresas (Cabify, Uber...): no son
// paradas a las que tenga sentido ir andando a buscar un taxi.
const NOT_A_RANK = /cabify|uber|bolt|free\s?now|oficina|office|headquarter/i
const MAX_RANK_METERS = 600

type Rank = { name: string; address: string | null; latitude: number; longitude: number; distanceMeters: number }

type ClubLike = {
  name: string
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  metro_lines?: string | null
  night_buses?: string | null
}

function Row({ badge, children, tone }: { badge: React.ReactNode; children: React.ReactNode; tone: "metro" | "bus" | "taxi" }) {
  const tones = {
    metro: "border-red-400/20 bg-red-400/10 text-red-200",
    bus: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    taxi: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  }
  return (
    <div className="flex items-center gap-3 rounded-ctl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{badge}</span>
      <div className="min-w-0 flex-1 text-sm leading-snug text-zinc-300">{children}</div>
    </div>
  )
}

export default function ClubTransport({ club }: { club: ClubLike }) {
  const { t } = useLanguage()
  const hasCoords = !!club.latitude && !!club.longitude
  const lat = Number(club.latitude)
  const lng = Number(club.longitude)
  const [rank, setRank] = useState<Rank | null>(null)
  const [metroTonight, setMetroTonight] = useState<ReturnType<typeof getMetroTonight> | null>(null)

  useEffect(() => {
    setMetroTonight(getMetroTonight())
    if (!hasCoords) return
    let cancelled = false
    supabase
      .from("essentials")
      .select("name, address, latitude, longitude")
      .eq("category", "Taxi")
      .eq("hidden", false)
      .then(({ data }) => {
        if (cancelled || !data) return
        const best = (data as Record<string, unknown>[])
          .filter((e) => e.latitude && e.longitude && !NOT_A_RANK.test(String(e.name || "")))
          .map((e) => ({
            name: String(e.name),
            address: (e.address as string) || null,
            latitude: Number(e.latitude),
            longitude: Number(e.longitude),
            distanceMeters: distanceInMeters(lat, lng, Number(e.latitude), Number(e.longitude)),
          }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters)[0]
        if (best && best.distanceMeters <= MAX_RANK_METERS) setRank(best)
      })
    return () => {
      cancelled = true
    }
  }, [hasCoords, lat, lng])

  const metro = hasCoords ? nearestMetroStations(lat, lng) : []
  const distCatalunya = hasCoords ? distanceInMeters(lat, lng, PLACA_CATALUNYA.lat, PLACA_CATALUNYA.lon) : null
  const nitbusNearby = hasCoords
    ? `https://www.google.com/maps/search/parada+nitbus/@${lat},${lng},16z`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`parada nitbus ${club.name} Barcelona`)}`

  const metroLabel = !metroTonight
    ? null
    : metroTonight.state === "closed"
    ? t("clubPage.metroClosed")
    : metroTonight.closes === "all-night"
    ? t("clubPage.metroAllNight")
    : t("clubPage.metroUntil").replace("{time}", metroTonight.closes)

  return (
    <div className="space-y-7">
      {(club.metro_lines || metro.length > 0) && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Icon name="train" className="h-4 w-4 text-muted" /> {t("club.metro")}
            </p>
            {metroLabel && (
              <p className={`text-xs font-semibold ${metroTonight?.state === "closed" ? "text-zinc-400" : "text-open"}`}>{metroLabel}</p>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {club.metro_lines
              ? club.metro_lines.split(",").map((l) => l.trim()).filter(Boolean).map((code) => (
                  <div key={code} className="flex items-center gap-2.5 rounded-ctl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                    <MetroLineBadge code={code} />
                    <span className="text-sm text-zinc-300">{t("clubPage.metroLine")}</span>
                  </div>
                ))
              : metro.map((s) => (
                  <div key={s.name} className="flex items-center gap-3 rounded-ctl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                    {s.lines && s.lines.length > 0 && (
                      <div className="flex shrink-0 gap-1">
                        {s.lines.map((l) => (
                          <MetroLineBadge key={l} code={l} />
                        ))}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 text-sm leading-snug">
                      <p className="truncate font-semibold text-ink">{s.name}</p>
                      <p className="text-xs text-zinc-400">{formatDistance(s.distanceMeters)} · {walkingMinutes(s.distanceMeters)} min</p>
                    </div>
                    <a
                      href={walkingDirectionsUrl(lat, lng, s.lat, s.lon)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-red-200 underline underline-offset-2"
                    >
                      {t("clubPage.walk")}
                    </a>
                  </div>
                ))}
          </div>
        </div>
      )}

      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon name="bus" className="h-4 w-4 text-muted" /> {t("club.night_buses")}
        </p>
        <div className="mt-3 flex flex-col gap-2.5">
          {club.night_buses &&
            splitNightBusCodes(club.night_buses).map((raw) => (
              <div key={raw} className="rounded-ctl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <NitbusRouteRow code={raw} seeStopsLabel={t("clubPage.seeStops")} unknownLabel={t("clubPage.lineUnknown")} />
              </div>
            ))}
          <Row tone="bus" badge={<Icon name="map" className="h-3.5 w-3.5" />}>
            <a href={nitbusNearby} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-200 underline underline-offset-2">
              {t("clubPage.nitbusNearby")}
            </a>
          </Row>
          {distCatalunya != null && distCatalunya > 300 && (
            <Row tone="bus" badge={`${formatDistance(distCatalunya)} · ${walkingMinutes(distCatalunya)} min`}>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">{t("clubPage.catalunyaHub")}</span>
                <a
                  href={walkingDirectionsUrl(lat, lng, PLACA_CATALUNYA.lat, PLACA_CATALUNYA.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-sky-200 underline underline-offset-2"
                >
                  {t("clubPage.walk")}
                </a>
              </span>
            </Row>
          )}
        </div>
      </div>

      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon name="car" className="h-4 w-4 text-muted" /> {t("clubPage.taxi")}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {rank && (
            <Row tone="taxi" badge={`${formatDistance(rank.distanceMeters)} · ${walkingMinutes(rank.distanceMeters)} min`}>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  {t("clubPage.taxiRank")}: {rank.name}
                </span>
                <a
                  href={walkingDirectionsUrl(lat, lng, rank.latitude, rank.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-amber-200 underline underline-offset-2"
                >
                  {t("clubPage.walk")}
                </a>
              </span>
            </Row>
          )}
          <RideButtons name={club.name} address={club.address} lat={hasCoords ? lat : null} lng={hasCoords ? lng : null} />
        </div>
      </div>
    </div>
  )
}
