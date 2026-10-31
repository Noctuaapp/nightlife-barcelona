"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import Icon from "../ui/Icon"
import { supabase } from "../../lib/supabase"
import { fetchAllPages } from "../../lib/fetchAll"
import { getNightBusLine, parseRoute, splitNightBusCodes } from "../../lib/nightBuses"
import { summarizeRoutes, type RouteRow, type RouteStats } from "../../lib/nitbusRoutes"
import { distanceInMeters, formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"
import { NitbusBadge } from "../ui/TransitBadge"
import { useLanguage } from "../../context/LanguageContext"

// Nitbus para volver de un club, evento o noche de club (25/10/2026).
//
// Antes salían dos listas mezcladas (las paradas cercanas por un lado y las líneas por otro, unas
// con "Ver paradas", otras con "Línea sin datos"), y no se entendía qué bus coger ni dónde. Ahora
// es UNA fila por línea, ordenadas de la parada más cercana a la más lejana:
//
//   [N7]  Fòrum → Pedralbes
//         Parada Santaló - Trav de Gràcia · 101 m · 1 min        Ir andando
//
// Las líneas salen de las paradas a menos de 700 m del sitio, más las que se hayan escrito a mano
// en la ficha (si son líneas que existen). Una línea escrita a mano que no existe (p. ej. "N50")
// ya no se enseña al público; solo a quien puede editar, para que la corrija.
const NEAR_METERS = 700
const MAX_STOP_FOR_LINE_METERS = 1500
const MAX_LINES = 6

// Resumen para una cabecera plegada: las líneas cercanas y la parada más próxima.
export type NitbusSummary = { codes: string[]; first: { stop: string; d: number } | null }

type StopRow = { name: string; lines: string[]; lat: number; lon: number }
type LineRow = { code: string; stop: (StopRow & { d: number }) | null }

// Paradas en memoria durante la visita: si se abren varias fichas seguidas no se vuelven a pedir.
let stopsCache: StopRow[] | null = null
async function loadStops(): Promise<StopRow[]> {
  if (stopsCache) return stopsCache
  const data = await fetchAllPages((from, to) =>
    supabase.from("essentials").select("name, subcategory, latitude, longitude").eq("category", "Nitbus").eq("hidden", false).order("id").range(from, to)
  )
  stopsCache = (data as Record<string, unknown>[])
    .filter((e) => e.latitude && e.longitude && e.subcategory)
    .map((e) => ({
      name: String(e.name || ""),
      lines: splitNightBusCodes(String(e.subcategory)).map((c) => c.toUpperCase()),
      lat: Number(e.latitude),
      lon: Number(e.longitude),
    }))
  return stopsCache
}

// Paradas y tiempo aproximado de cada línea (tabla de recorridos, supabase/61). Solo se piden las
// líneas que se van a enseñar y se recuerdan durante la visita. Si la tabla no existe o está vacía,
// simplemente no sale esa línea de datos.
const statsCache: Record<string, RouteStats | null> = {}
async function loadRouteStats(codes: string[]): Promise<Record<string, RouteStats>> {
  const missing = codes.filter((c) => !(c in statsCache))
  if (missing.length > 0) {
    try {
      const rows = await fetchAllPages<RouteRow>((from, to) =>
        supabase
          .from("nitbus_line_stops")
          .select("line, direction, seq, name, latitude, longitude")
          .in("line", missing)
          .order("line")
          .order("direction")
          .order("seq")
          .range(from, to)
      )
      const sum = summarizeRoutes(rows, distanceInMeters)
      for (const c of missing) statsCache[c] = sum[c] ?? null
    } catch {
      for (const c of missing) statsCache[c] = null
    }
  }
  const out: Record<string, RouteStats> = {}
  for (const c of codes) {
    const v = statsCache[c]
    if (v) out[c] = v
  }
  return out
}

export default function NitbusNearby({
  lat,
  lng,
  manualLines,
  canEdit = false,
  showTitle = true,
  emptyFallback,
  onSummary,
}: {
  lat: number
  lng: number
  manualLines?: string | null // líneas escritas a mano en la ficha ("N24, N28")
  canEdit?: boolean
  showTitle?: boolean
  emptyFallback?: React.ReactNode // qué enseñar si no hay ninguna línea (p. ej. un enlace de búsqueda)
  onSummary?: (s: NitbusSummary) => void
}) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<LineRow[] | null>(null)
  const [unknown, setUnknown] = useState<string[]>([])
  const [stats, setStats] = useState<Record<string, RouteStats>>({})

  useEffect(() => {
    let cancelled = false
    loadStops().then((stops) => {
      if (cancelled) return
      const withDist = stops.map((s) => ({ ...s, d: distanceInMeters(lat, lng, s.lat, s.lon) }))
      const codes = new Set<string>()
      for (const s of withDist) if (s.d <= NEAR_METERS) s.lines.forEach((l) => codes.add(l))
      const bad: string[] = []
      for (const raw of manualLines ? splitNightBusCodes(manualLines) : []) {
        const code = raw.trim().toUpperCase()
        if (getNightBusLine(code)) codes.add(code)
        else bad.push(code)
      }
      const list: LineRow[] = Array.from(codes)
        .filter((code) => getNightBusLine(code))
        .map((code) => {
          const nearest = withDist.filter((s) => s.lines.includes(code)).sort((a, b) => a.d - b.d)[0]
          return { code, stop: nearest && nearest.d <= MAX_STOP_FOR_LINE_METERS ? nearest : null }
        })
        .sort((a, b) => (a.stop?.d ?? Infinity) - (b.stop?.d ?? Infinity) || Number(a.code.slice(1)) - Number(b.code.slice(1)))
        .slice(0, MAX_LINES)
      setRows(list)
      setUnknown(bad)
      const firstWithStop = list.find((r) => r.stop)
      onSummary?.({ codes: list.map((r) => r.code), first: firstWithStop?.stop ? { stop: firstWithStop.stop.name, d: firstWithStop.stop.d } : null })
      loadRouteStats(list.map((r) => r.code)).then((st) => {
        if (!cancelled) setStats(st)
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, manualLines])

  if (!rows) return null
  if (rows.length === 0 && !(canEdit && unknown.length > 0)) return <>{emptyFallback ?? null}</>

  // Al tocar una línea se abre su página (/nitbus/N24) con la parada más cercana a este sitio
  // marcada: la página lee ?lat y ?lon (ver NitbusLineView).
  const lineHref = (code: string) => `/nitbus/${code}?lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`
  const anyTime = rows.some((r) => stats[r.code]?.minutes != null)

  return (
    <div>
      {showTitle && (
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon name="bus" className="h-4 w-4 text-muted" /> {t("club.night_buses")}
        </p>
      )}
      <div className="flex flex-col gap-2.5">
        {rows.map(({ code, stop }) => {
          const line = getNightBusLine(code)!
          const { from, to } = parseRoute(line.route)
          return (
            <div key={code} className="flex items-start gap-3 rounded-ctl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-white/25 hover:bg-white/[0.05]">
              <Link href={lineHref(code)} className="flex min-w-0 flex-1 items-start gap-3">
                <NitbusBadge code={code} size="md" />
                <div className="min-w-0 flex-1 text-sm leading-snug">
                  <p className="font-semibold text-ink">
                    {from}
                    {to && (
                      <>
                        <span className="mx-1 text-zinc-500">→</span>
                        {to}
                      </>
                    )}
                  </p>
                  {stats[code] && (
                    <p className="mt-0.5 text-xs text-zinc-300">
                      {stats[code].minutes != null
                        ? t("nitbusPage.routeSummary").replace("{n}", String(stats[code].stops)).replace("{min}", String(stats[code].minutes))
                        : t("nitbusPage.stopsCount").replace("{n}", String(stats[code].stops))}
                    </p>
                  )}
                  {stop && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      <span className="text-zinc-300">{t("clubPage.stopAt").replace("{name}", stop.name)}</span>
                      <span className="block">{formatDistance(stop.d)} · {walkingMinutes(stop.d)} min</span>
                    </p>
                  )}
                  <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-sky-300">
                    {t("nitbusPage.seeRoute")}
                    <ChevronRight size={14} aria-hidden="true" />
                  </span>
                </div>
              </Link>
              {stop && (
                <a
                  href={walkingDirectionsUrl(lat, lng, stop.lat, stop.lon)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 self-center text-xs font-semibold text-sky-200 underline underline-offset-2"
                >
                  {t("clubPage.walk")}
                </a>
              )}
            </div>
          )
        })}
        {anyTime && <p className="px-1 text-xs text-zinc-500">{t("nitbusPage.estimateNote")}</p>}
        {canEdit && unknown.length > 0 && (
          <p className="rounded-ctl border border-dashed border-warn/40 px-3 py-2 text-xs text-warn">
            {unknown.join(", ")}: no existe en la red Nitbus, el público no lo ve. Corrígelo abajo (solo tú lo ves).
          </p>
        )}
      </div>
    </div>
  )
}
