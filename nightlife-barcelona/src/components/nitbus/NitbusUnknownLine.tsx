"use client"

import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { supabase } from "../../lib/supabase"
import { lineEnds, type LineEnds } from "../../lib/nitbusRoutes"

// Fila de una línea Nitbus que NO está en el catálogo escrito a mano (lib/nightBuses.ts) pero sí tiene
// paradas cargadas desde OpenStreetMap (N62 y otras de fuera de la red de Barcelona ciudad). Antes salía
// «Línea sin datos en Noctua» aunque la línea tuviera su página con todas las paradas (10/11/2026).
// Aquí se sacan las cabeceras de las propias paradas de la línea (nada inventado) y se enlaza a su página.
// Si el texto ni siquiera parece un código de línea (algo mal escrito a mano en el admin), se queda el aviso.

const cache = new Map<string, Promise<LineEnds | null>>()

function loadEnds(code: string): Promise<LineEnds | null> {
  let p = cache.get(code)
  if (!p) {
    p = (async () => {
      try {
        const { data, error } = await supabase
          .from("nitbus_line_stops")
          .select("direction, seq, name")
          .eq("line", code)
          .order("direction")
          .order("seq")
          .limit(600)
        if (error || !data) return null
        return lineEnds(data as { direction: number; seq: number; name: string }[])
      } catch {
        return null
      }
    })()
    cache.set(code, p)
    // Un fallo no se recuerda: la próxima vez que se abra la parada se vuelve a intentar.
    p.then((v) => {
      if (v === null) cache.delete(code)
    })
  }
  return p
}

export default function NitbusUnknownLine({
  code,
  badge,
  seeStopsLabel,
  unknownLabel,
  onLinkClick,
}: {
  code: string
  badge: ReactNode
  seeStopsLabel: string
  unknownLabel: string
  onLinkClick?: (e: MouseEvent) => void
}) {
  const valid = /^N\d{1,3}$/.test(code)
  const [ends, setEnds] = useState<LineEnds | null>(null)

  useEffect(() => {
    if (!valid) return
    let alive = true
    loadEnds(code).then((e) => {
      if (alive) setEnds(e)
    })
    return () => {
      alive = false
    }
  }, [code, valid])

  if (!valid) {
    return (
      <div className="flex items-center gap-2.5">
        {badge}
        <p className="text-xs text-zinc-400">{unknownLabel}</p>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5">
      {badge}
      <div className="min-w-0 text-xs leading-snug">
        {ends && (
          <p className="font-semibold text-ink">
            {ends.from}
            {ends.to !== ends.from && (
              <>
                <span className="mx-1 text-zinc-500">↔</span>
                {ends.to}
              </>
            )}
          </p>
        )}
        <p className={ends ? "mt-0.5 text-zinc-400" : "text-zinc-400"}>
          <a href={`/nitbus/${encodeURIComponent(code)}`} onClick={onLinkClick} className="font-semibold text-sky-300 underline underline-offset-2">
            {seeStopsLabel}
          </a>
        </p>
      </div>
    </div>
  )
}
