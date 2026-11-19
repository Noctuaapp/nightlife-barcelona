"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarCheck, CheckCircle2, Eye, Globe, MapPin, Ticket, type LucideIcon } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { rpcByCity } from "../../lib/adminRpc"
import { destinationRows, type DestinationCount } from "../../lib/clickDetail"
import { Panel, SectionTitle, Segmented, TONE_RGB, BTN_GHOST_SM, type Accent } from "./ui"
import { useAdminCity } from "./AdminCity"

// Admin › Datos › Resumen › «Qué locales lo generan» (19/11/2026). Las cifras de arriba del Resumen son totales y para saber
// DE QUÉ LOCAL salían había que ir pestaña por pestaña. Aquí eliges la cifra (entradas, web, cómo llegar, asistiré, check-ins o
// visitas) y ves los locales que la generan, de más a menos, con su parte del total. En entradas y web se ve además A QUÉ WEB van
// (el dominio de destino, de admin_interaction_stats). Los datos por local ya estaban cargados en la pantalla: no hay consultas nuevas
// salvo la de las webs de destino, y solo cuando eliges entradas o web.
// Lo que NO se guarda es el cruce «local × web» (qué web desde qué local): cada clic apunta el local por un lado y el dominio por otro.

type Row = { id: number | string; name: string; [key: string]: unknown }
type Metric = { key: string; label: string; icon: LucideIcon; accent: Accent; kind?: "tickets_click" | "website_click"; events: boolean; hint: string }

const METRICS: Metric[] = [
  { key: "tickets", label: "Entradas", icon: Ticket, accent: "cyan", kind: "tickets_click", events: true, hint: "Clics en el botón de entradas" },
  { key: "website", label: "Web / Instagram", icon: Globe, accent: "violet", kind: "website_click", events: true, hint: "Clics en la web o el Instagram del local" },
  { key: "directions", label: "Cómo llegar", icon: MapPin, accent: "coral", events: true, hint: "Clics en «Cómo llegar»" },
  { key: "attendances", label: "Asistiré", icon: CalendarCheck, accent: "pink", events: true, hint: "Marcas de «Asistiré» hechas en sus noches" },
  { key: "checkins", label: "Check-ins", icon: CheckCircle2, accent: "cyan", events: false, hint: "Check-ins reales hechos en el local" },
  { key: "views", label: "Visitas", icon: Eye, accent: "pink", events: true, hint: "Visitas a su ficha" },
]

const nf = (n: number) => n.toLocaleString("es-ES")

export default function LocalBreakdown({
  clubRows,
  eventRows,
  from,
  to,
  onOpen,
  onTable,
  onClicks,
}: {
  clubRows: Row[]
  eventRows: Row[]
  from: string
  to: string
  onOpen: (type: "club" | "event", id: number, name: string) => void
  onTable: (type: "club" | "event", sort: string) => void
  onClicks: (kind: "tickets_click" | "website_click") => void
}) {
  const [city] = useAdminCity()
  const [metricKey, setMetricKey] = useState("tickets")
  const [type, setType] = useState<"club" | "event">("club")
  const [all, setAll] = useState(false)
  const metric = METRICS.find((m) => m.key === metricKey) ?? METRICS[0]
  // Los eventos no tienen check-ins: si estás en ese caso, se pasa a clubs.
  const effType = type === "event" && !metric.events ? "club" : type
  const source = effType === "club" ? clubRows : eventRows

  const ranked = useMemo(
    () =>
      source
        .map((r) => ({ id: Number(r.id), name: String(r.name), n: Number(r[metric.key]) || 0 }))
        .filter((r) => r.n > 0)
        .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "es")),
    [source, metric.key]
  )
  const total = ranked.reduce((s, r) => s + r.n, 0)
  const shown = ranked.slice(0, all ? 40 : 10)
  const topShare = total > 0 ? Math.round((ranked.slice(0, 3).reduce((s, r) => s + r.n, 0) / total) * 100) : 0
  const max = Math.max(1, ...shown.map((r) => r.n))
  const tone = TONE_RGB[metric.accent]

  // A qué webs van (solo entradas y web). Se pide al elegirlo, no antes.
  const [dest, setDest] = useState<DestinationCount[] | null | "error">(null)
  const kind = metric.kind
  useEffect(() => {
    if (!kind) return
    let current = true
    setDest(null)
    rpcByCity<{ destinations?: DestinationCount[] }>(supabase, "admin_interaction_stats", { p_from: from, p_to: to }, city).then((r) => {
      if (!current) return
      setDest(r.error ? "error" : r.data?.destinations ?? [])
    })
    return () => {
      current = false
    }
  }, [kind, from, to, city])
  const hosts = kind && Array.isArray(dest) ? destinationRows(dest, kind) : []
  const hostTotal = hosts.reduce((s, h) => s + h.n, 0)
  const hostMax = Math.max(1, ...hosts.map((h) => h.n))
  const onlyUnknown = hosts.length > 0 && hosts.every((h) => h.label === "Sin registrar")

  return (
    <Panel>
      <SectionTitle icon={MapPin} right={<Segmented label="Clubs o eventos" value={effType} onChange={setType} options={[{ value: "club", label: "Clubs" }, { value: "event", label: "Eventos", count: undefined }]} />}>
        Qué locales lo generan
      </SectionTitle>
      <p className="mt-1.5 text-xs text-zinc-300/80">Elige la cifra y mira de qué locales sale, de más a menos.</p>

      <div className="mt-4">
        <Segmented
          label="Cifra a desglosar"
          value={metric.key}
          onChange={(v) => {
            setMetricKey(v)
            setAll(false)
          }}
          options={METRICS.filter((m) => effType === "club" || m.events).map((m) => ({ value: m.key, label: m.label }))}
        />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-white">
              {metric.hint}: <span className="tabular-nums" style={{ color: `rgb(${tone})` }}>{nf(total)}</span>
            </p>
            {ranked.length > 3 && <p className="text-xs text-zinc-300/80">Los 3 primeros suman el {topShare}%</p>}
          </div>
          {ranked.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-zinc-300">Ningún {effType === "club" ? "club" : "evento"} tiene {metric.label.toLowerCase()} en este periodo.</p>
          ) : (
            <ol className="space-y-1">
              {shown.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(effType, r.id, r.name)}
                    className="group block w-full rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06]"
                    aria-label={`${r.name}: ${r.n}. Ver su detalle`}
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-semibold text-white">
                        <span className="mr-2 inline-block w-5 text-right text-xs tabular-nums text-zinc-400">{i + 1}</span>
                        {r.name}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <strong className="font-extrabold text-white">{nf(r.n)}</strong>
                        <span className="ml-2 text-xs text-zinc-400">{total > 0 ? Math.round((r.n / total) * 100) : 0}%</span>
                      </span>
                    </span>
                    <span className="mt-1.5 block h-2 rounded-full bg-white/[0.07]">
                      <span className="block h-2 rounded-full" style={{ width: `${Math.max(3, (r.n / max) * 100)}%`, background: `linear-gradient(90deg, rgb(${tone} / 0.55), rgb(${tone}))` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ranked.length > 10 && (
              <button type="button" onClick={() => setAll((v) => !v)} className={BTN_GHOST_SM}>
                {all ? "Ver solo los 10 primeros" : `Ver más (${Math.min(40, ranked.length)} de ${ranked.length})`}
              </button>
            )}
            <button type="button" onClick={() => onTable(effType, metric.key)} className={BTN_GHOST_SM}>
              Ver tabla completa ›
            </button>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {kind ? (
            <>
              <p className="text-sm font-extrabold text-white">{kind === "tickets_click" ? "A qué web van al pedir entradas" : "A qué web van desde el botón Web"}</p>
              {dest === null && <p className="mt-3 text-sm text-zinc-300">Cargando…</p>}
              {dest === "error" && <p className="mt-3 text-sm text-amber-200">No se pudo cargar a qué webs van. ¿Está el SQL 87 ejecutado?</p>}
              {Array.isArray(dest) && hosts.length === 0 && <p className="mt-3 text-sm text-zinc-300">Sin clics en este periodo.</p>}
              {hosts.length > 0 && (
                <ol className="mt-3 space-y-2.5">
                  {hosts.slice(0, 8).map((h) => (
                    <li key={h.label}>
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="min-w-0 truncate text-zinc-100">{h.label}</span>
                        <span className="shrink-0 tabular-nums">
                          <strong className="font-bold text-white">{nf(h.n)}</strong>
                          <span className="ml-1.5 text-zinc-400">{hostTotal > 0 ? Math.round((h.n / hostTotal) * 100) : 0}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/[0.07]">
                        <div className="h-1.5 rounded-full" style={{ width: `${Math.max(3, (h.n / hostMax) * 100)}%`, background: `rgb(${tone})` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {onlyUnknown && <p className="mt-3 text-xs text-zinc-400">Los clics anteriores a noviembre no guardan la web de destino.</p>}
              <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                Cada clic apunta el local por un lado y la web por otro, así que no se puede cruzar «qué web desde qué local».
              </p>
              <button type="button" onClick={() => onClicks(kind)} className={`${BTN_GHOST_SM} mt-3`}>
                Ver más detalle ›
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-extrabold text-white">En resumen</p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-zinc-300">Locales con al menos uno</dt>
                  <dd className="tabular-nums"><strong className="font-extrabold text-white">{ranked.length}</strong> <span className="text-zinc-400">de {source.length}</span></dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-zinc-300">Media por local activo</dt>
                  <dd className="font-extrabold tabular-nums text-white">{ranked.length ? (total / ranked.length).toLocaleString("es-ES", { maximumFractionDigits: 1 }) : "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-zinc-300">Los 3 primeros suman</dt>
                  <dd className="font-extrabold tabular-nums text-white">{ranked.length > 3 ? `${topShare}%` : "—"}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}
