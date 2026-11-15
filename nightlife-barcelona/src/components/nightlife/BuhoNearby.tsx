"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "../../context/LanguageContext"
import { formatDistance, walkingMinutes, walkingDirectionsUrl } from "../../lib/geo"
import { NitbusBadge } from "../ui/TransitBadge"
import type { BuhoRow } from "../../lib/buhos"
import type { NitbusSummary } from "./NitbusNearby"

// Búhos (bus nocturno de Madrid) cerca de un local: una fila por línea con a dónde va, en qué parada cogerla, cuánto se tarda andando y cada
// cuánto pasa. Es el equivalente de NitbusNearby para Madrid, con los datos de la EMT (lib/madridBuhos.ts), que se cargan solo aquí.
export default function BuhoNearby({
  lat,
  lng,
  emptyFallback,
  onSummary,
}: {
  lat: number
  lng: number
  emptyFallback?: React.ReactNode
  onSummary?: (s: NitbusSummary) => void
}) {
  const { t } = useLanguage()
  const [rows, setRows] = useState<BuhoRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    import("../../lib/buhos").then((m) => {
      if (cancelled) return
      const list = m.nearbyBuhos(lat, lng)
      setRows(list)
      onSummary?.({ codes: Array.from(new Set(list.map((r) => r.code))), first: list[0] ? { stop: list[0].stopName, d: list[0].distanceMeters } : null })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  if (!rows) return null
  if (rows.length === 0) return <>{emptyFallback ?? null}</>

  const range = (r: readonly [number, number] | null) => (r ? (r[0] === r[1] ? String(r[0]) : `${r[0]}–${r[1]}`) : "")

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div key={`${r.code}-${r.toward}`} className="flex items-start gap-3 rounded-ctl border border-white/10 bg-white/[0.02] px-3 py-2.5">
          <NitbusBadge code={r.code} size="md" />
          <div className="min-w-0 flex-1 text-sm leading-snug">
            <p className="font-semibold text-ink">
              <span className="mr-1 text-zinc-500">→</span>
              {r.toward}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              <span className="text-zinc-300">{t("clubPage.stopAt").replace("{name}", r.stopName)}</span>
              <span className="block">
                {formatDistance(r.distanceMeters)} · {walkingMinutes(r.distanceMeters)} min
              </span>
            </p>
            {r.weekend && r.weeknight && (
              <p className="mt-0.5 text-xs text-zinc-500">
                {t("clubPage.buhoFreq").replace("{a}", range(r.weekend)).replace("{b}", range(r.weeknight))}
              </p>
            )}
          </div>
          <a
            href={walkingDirectionsUrl(lat, lng, r.lat, r.lon)}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 self-center text-xs font-semibold text-sky-200 underline underline-offset-2"
          >
            {t("clubPage.walk")}
          </a>
        </div>
      ))}
      {/* Fuente de los datos: portal de datos abiertos de la EMT. No sugiere que la EMT respalde la web. */}
      <p className="px-1 text-[11px] leading-snug text-zinc-500">
        {t("clubPage.buhoSource")}{" "}
        <a href="https://www.emtmadrid.es" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          emtmadrid.es
        </a>
      </p>
    </div>
  )
}
