"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { zoneOf } from "../../../lib/zones"
import { ADMIN_EMAIL } from "../../../lib/admin"

// Panel "Datos": métricas agregadas de Noctua pensadas para enseñar a clubs y managers (y para
// venderlas). Todo se calcula en Supabase con funciones que solo el admin puede ejecutar y que
// devuelven números, nunca datos de personas concretas.

type Tab = "resumen" | "clubs" | "eventos" | "busquedas" | "audiencia"

const SOURCE_LABELS: Record<string, string> = {
  search: "Buscadores (Google...)",
  instagram: "Instagram",
  tiktok: "TikTok",
  social: "Otras redes",
  messaging: "WhatsApp / Telegram",
  invite: "Enlace de invitación",
  direct: "Directo",
}
const WEEKDAYS = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const RIDE_PROVIDER_LABELS: Record<string, string> = { uber: "Uber", cabify: "Cabify", freenow: "FREE NOW" }

const isoDay = (d: Date) => d.toLocaleDateString("sv-SE")
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d) }
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Bars({ data, color = "#7c5cff" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => (
        <div key={d.label} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end" title={`${d.label}: ${d.value}`}>
          <div className="w-full rounded-t" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} />
          <span className="mt-1 w-full truncate text-center text-xs text-zinc-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function ListBars({ rows, suffix = "" }: { rows: { label: string; n: number | null }[]; suffix?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.n || 0))
  if (rows.length === 0) return <p className="text-sm text-zinc-400">Sin datos todavía.</p>
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-300">{r.label}</span>
            <span className="text-zinc-400">{r.n === null ? "<5" : `${r.n}${suffix}`}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/5">
            <div className="h-2 rounded-full bg-purple-500" style={{ width: `${((r.n || 0) / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDatosPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [tab, setTab] = useState<Tab>("resumen")
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(isoDay(new Date()))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [overview, setOverview] = useState<any>(null)
  const [clubItems, setClubItems] = useState<any[]>([])
  const [eventItems, setEventItems] = useState<any[]>([])
  const [searches, setSearches] = useState<any[]>([])
  const [audience, setAudience] = useState<any>(null)
  const [clubsMeta, setClubsMeta] = useState<Record<string, any>>({})
  const [rideClicks, setRideClicks] = useState<{ provider: string; n: number }[]>([])

  const [selected, setSelected] = useState<{ type: "club" | "event"; id: number; name: string } | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailAud, setDetailAud] = useState<any>(null)
  const [sortKey, setSortKey] = useState("views")
  const [onlyZeroSearches, setOnlyZeroSearches] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const range = { p_from: from, p_to: to }
    const [ov, ci, ei, se, au, clubs, rc] = await Promise.all([
      supabase.rpc("admin_data_overview", range),
      supabase.rpc("admin_data_items", { p_type: "club", ...range }),
      supabase.rpc("admin_data_items", { p_type: "event", ...range }),
      supabase.rpc("admin_data_searches", range),
      supabase.rpc("admin_data_audience", { ...range, p_type: null, p_id: null }),
      supabase.from("clubs").select("id, name, city, neighborhood, address, venue_type"),
      supabase.rpc("admin_ride_clicks", range),
    ])
    const firstErr = [ov, ci, ei, se, au].find((r) => r.error)?.error
    if (firstErr) setError(`No se pudieron cargar los datos: ${firstErr.message}. ¿Has ejecutado datos_funciones.sql en Supabase?`)
    setOverview(ov.data)
    setClubItems(ci.data || [])
    setEventItems(ei.data || [])
    setSearches(se.data || [])
    setAudience(au.data)
    setRideClicks(rc.data || [])
    const meta: Record<string, any> = {}
    for (const c of clubs.data || []) meta[String(c.id)] = { ...c, zone: zoneOf(c) }
    setClubsMeta(meta)
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    if (!checkingAdmin) load()
  }, [checkingAdmin, load])

  useEffect(() => {
    if (!selected) { setDetail(null); setDetailAud(null); return }
    const range = { p_from: from, p_to: to }
    supabase.rpc("admin_data_item_detail", { p_type: selected.type, p_id: selected.id, ...range }).then((r) => setDetail(r.data))
    supabase.rpc("admin_data_audience", { ...range, p_type: selected.type, p_id: selected.id }).then((r) => setDetailAud(r.data))
  }, [selected, from, to])

  const sortRows = (rows: any[]) =>
    [...rows].sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0))

  const clubRows = useMemo(
    () =>
      sortRows(
        clubItems.map((c) => ({
          ...c,
          zone: clubsMeta[String(c.id)]?.zone || "—",
          venue_type: clubsMeta[String(c.id)]?.venue_type || "—",
          conv: pct(c.tickets, c.views),
          fulfil: pct(c.checkins, c.attendances),
        }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clubItems, clubsMeta, sortKey]
  )
  const eventRows = useMemo(
    () => sortRows(eventItems.map((e) => ({ ...e, conv: pct(e.tickets, e.views) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventItems, sortKey]
  )

  // Comparativa: media de visitas / entradas / conversión de los clubs de la misma zona y tipo.
  const benchmark = (zone: string, type: string, excludeId: number) => {
    const avg = (rows: any[]) => {
      if (rows.length === 0) return null
      const views = rows.reduce((s, r) => s + r.views, 0) / rows.length
      const tickets = rows.reduce((s, r) => s + r.tickets, 0) / rows.length
      const totalViews = rows.reduce((s, r) => s + r.views, 0)
      const totalTickets = rows.reduce((s, r) => s + r.tickets, 0)
      return { n: rows.length, views: Math.round(views), tickets: Math.round(tickets * 10) / 10, conv: pct(totalTickets, totalViews) }
    }
    return {
      zone: avg(clubRows.filter((r) => r.zone === zone && r.id !== excludeId)),
      type: type !== "—" ? avg(clubRows.filter((r) => r.venue_type === type && r.id !== excludeId)) : null,
    }
  }

  const exportClubsCsv = () =>
    downloadCsv(`noctua_clubs_${from}_${to}.csv`,
      ["Club", "Zona", "Tipo", "Visitas", "Visitantes", "Clics entradas", "Conversion %", "Como llegar", "Compartir", "Favoritos", "Web/Instagram", "Asistire", "Check-ins", "Cumplimiento %"],
      clubRows.map((c) => [c.name, c.zone, c.venue_type, c.views, c.visitors, c.tickets, c.conv, c.directions, c.shares, c.favorites, c.website, c.attendances, c.checkins, c.fulfil]))
  const exportEventsCsv = () =>
    downloadCsv(`noctua_eventos_${from}_${to}.csv`,
      ["Evento", "Visitas", "Visitantes", "Clics entradas", "Conversion %", "Como llegar", "Compartir", "Favoritos", "Asistire"],
      eventRows.map((e) => [e.name, e.views, e.visitors, e.tickets, e.conv, e.directions, e.shares, e.favorites, e.attendances]))
  const exportSearchesCsv = () =>
    downloadCsv(`noctua_busquedas_${from}_${to}.csv`, ["Busqueda", "Veces", "Resultados medios", "Veces sin resultados"],
      searches.map((s) => [s.term, s.n, s.avg_results, s.zero]))
  const exportOverviewCsv = () =>
    downloadCsv(`noctua_resumen_${from}_${to}.csv`, ["Fecha", "Sesiones", "Visitas a fichas"],
      (overview?.daily || []).map((d: any) => [d.d, d.sessions, d.views]))
  const exportDetailCsv = () => {
    if (!selected || !detail) return
    const rows: (string | number | null)[][] = []
    rows.push(["Informe", selected.name, `${from} a ${to}`])
    rows.push([])
    rows.push(["Dia", "Visitas", "Clics entradas"])
    detail.daily.forEach((d: any) => rows.push([d.d, d.views, d.tickets]))
    rows.push([])
    rows.push(["Hora", "Visitas"])
    detail.hours.forEach((h: any) => rows.push([`${h.h}:00`, h.n]))
    rows.push([])
    rows.push(["Origen", "Visitas"])
    detail.sources.forEach((s: any) => rows.push([SOURCE_LABELS[s.source] || s.source, s.n]))
    rows.push([])
    rows.push(["Noche", "Asistire", "Check-ins reales"])
    detail.nights.forEach((n: any) => rows.push([n.night, n.asistire, n.checkins]))
    if (detailAud) {
      rows.push([])
      rows.push(["Edad", "Usuarios (agregado)"])
      detailAud.ages.forEach((a: any) => rows.push([a.label, a.n ?? "<5"]))
      rows.push(["Genero", "Usuarios (agregado)"])
      detailAud.genders.forEach((a: any) => rows.push([a.label, a.n ?? "<5"]))
    }
    downloadCsv(`noctua_informe_${selected.name.replace(/\W+/g, "_")}_${from}_${to}.csv`, ["", "", ""], rows)
  }

  if (checkingAdmin)
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Cargando...</p>
      </main>
    )

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "clubs", label: "Clubs" },
    { key: "eventos", label: "Eventos" },
    { key: "busquedas", label: "Búsquedas" },
    { key: "audiencia", label: "Audiencia" },
  ]
  const presets = [
    { label: "7 días", f: daysAgo(6) },
    { label: "30 días", f: daysAgo(29) },
    { label: "90 días", f: daysAgo(89) },
    { label: "Este año", f: `${new Date().getFullYear()}-01-01` },
  ]

  const th = (key: string, label: string) => (
    <th
      onClick={() => setSortKey(key)}
      className={`cursor-pointer whitespace-nowrap px-3 py-2 text-right text-xs font-semibold ${sortKey === key ? "text-purple-300" : "text-zinc-400"}`}
    >
      {label}
    </th>
  )

  const sel = selected && selected.type === "club" ? clubRows.find((c) => c.id === selected.id) : null
  const bench = sel ? benchmark(sel.zone, sel.venue_type, sel.id) : null

  return (
    <AdminShell title="Datos de negocio" subtitle="Métricas agregadas para clubs, managers y compradores de datos.">
      <section className="mx-auto max-w-7xl px-4 pb-16">
        {/* Rango de fechas */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.f); setTo(isoDay(new Date())) }}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${from === p.f && to === isoDay(new Date()) ? "border-white bg-white text-black" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"}`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300" />
          <span className="text-xs text-zinc-400">→</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelected(null) }}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${tab === t.key ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
        {loading && <p className="text-sm text-zinc-400">Cargando datos...</p>}

        {!loading && overview && tab === "resumen" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Sesiones" value={overview.sessions} />
              <Stat label="Visitas a fichas" value={overview.page_views} />
              <Stat label="Clics en entradas" value={overview.tickets} sub={`Conversión ${pct(overview.tickets, overview.page_views)}%`} />
              <Stat label="Cómo llegar" value={overview.directions} />
              <Stat label="Compartidos" value={overview.shares} />
              <Stat label="Búsquedas" value={overview.searches} sub={`${overview.searches_zero} sin resultados`} />
              <Stat label="Asistiré" value={overview.attendances} />
              <Stat label="Check-ins reales" value={overview.checkins} sub={`Cumplimiento ${pct(overview.checkins, overview.attendances)}%`} />
            </div>
            <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">Visitas por día</p>
                <button onClick={exportOverviewCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
              </div>
              <Bars data={(overview.daily || []).map((d: any) => ({ label: d.d.slice(5), value: d.views }))} />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-4 text-sm font-bold">Origen del tráfico (sesiones)</p>
                <ListBars rows={(overview.sources || []).map((s: any) => ({ label: SOURCE_LABELS[s.source] || s.source, n: s.sessions }))} />
              </div>
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-4 text-sm font-bold">Dispositivo</p>
                <ListBars rows={(overview.devices || []).map((s: any) => ({ label: s.device === "mobile" ? "Móvil" : s.device === "desktop" ? "Ordenador" : s.device, n: s.sessions }))} />
              </div>
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-4 text-sm font-bold">Visitas por hora del día</p>
                <Bars color="#7c5cff" data={Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: (overview.hours || []).find((x: any) => x.h === h)?.n || 0 }))} />
              </div>
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-4 text-sm font-bold">Visitas por día de la semana</p>
                <Bars color="#f59e0b" data={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ label: WEEKDAYS[d], value: (overview.weekdays || []).find((x: any) => x.d === d)?.n || 0 }))} />
              </div>
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-4 text-sm font-bold">Clics en Uber / Cabify / FREE NOW</p>
                <ListBars rows={rideClicks.map((r) => ({ label: RIDE_PROVIDER_LABELS[r.provider] || r.provider, n: r.n }))} />
              </div>
            </div>
          </div>
        )}

        {!loading && (tab === "clubs" || tab === "eventos") && !selected && (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-xs text-zinc-400">Pulsa un encabezado para ordenar y una fila para ver el detalle.</p>
              <button onClick={tab === "clubs" ? exportClubsCsv : exportEventsCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">{tab === "clubs" ? "Club" : "Evento"}</th>
                    {tab === "clubs" && <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">Zona</th>}
                    {th("views", "Visitas")}
                    {th("visitors", "Visitantes")}
                    {th("tickets", "Entradas")}
                    {th("conv", "Conv. %")}
                    {th("directions", "Llegar")}
                    {th("shares", "Compart.")}
                    {th("attendances", "Asistiré")}
                    {tab === "clubs" && th("checkins", "Check-ins")}
                    {tab === "clubs" && th("fulfil", "Cumpl. %")}
                  </tr>
                </thead>
                <tbody>
                  {(tab === "clubs" ? clubRows : eventRows).map((r) => (
                    <tr key={r.id} onClick={() => setSelected({ type: tab === "clubs" ? "club" : "event", id: r.id, name: r.name })} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.04]">
                      <td className="max-w-[220px] truncate px-3 py-2 font-semibold text-white">{r.name}</td>
                      {tab === "clubs" && <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{r.zone}</td>}
                      <td className="px-3 py-2 text-right">{r.views}</td>
                      <td className="px-3 py-2 text-right">{r.visitors}</td>
                      <td className="px-3 py-2 text-right">{r.tickets}</td>
                      <td className="px-3 py-2 text-right text-purple-300">{r.conv}</td>
                      <td className="px-3 py-2 text-right">{r.directions}</td>
                      <td className="px-3 py-2 text-right">{r.shares}</td>
                      <td className="px-3 py-2 text-right">{r.attendances}</td>
                      {tab === "clubs" && <td className="px-3 py-2 text-right">{r.checkins}</td>}
                      {tab === "clubs" && <td className="px-3 py-2 text-right">{r.attendances ? r.fulfil : "—"}</td>}
                    </tr>
                  ))}
                  {(tab === "clubs" ? clubRows : eventRows).length === 0 && (
                    <tr><td colSpan={11} className="px-3 py-8 text-center text-zinc-400">Todavía no hay datos en este periodo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && selected && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <button onClick={() => setSelected(null)} className="text-xs font-bold text-zinc-400 hover:text-white">← Volver al listado</button>
                <h2 className="mt-1 text-2xl font-black">{selected.name}</h2>
                <p className="text-xs text-zinc-400">{from} → {to}</p>
              </div>
              <button onClick={exportDetailCsv} className="rounded-full bg-purple-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-400">Descargar informe (CSV)</button>
            </div>

            {sel && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Visitas" value={sel.views} />
                <Stat label="Clics en entradas" value={sel.tickets} sub={`Conversión ${sel.conv}%`} />
                <Stat label="Asistiré" value={sel.attendances} />
                <Stat label="Check-ins" value={sel.checkins} sub={sel.attendances ? `Cumplimiento ${sel.fulfil}%` : undefined} />
              </div>
            )}

            {sel && bench && (bench.zone || bench.type) && (
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-3 text-sm font-bold">Comparativa</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-zinc-400"><th className="py-1 text-left"></th><th className="py-1 text-right">Visitas</th><th className="py-1 text-right">Entradas</th><th className="py-1 text-right">Conv. %</th></tr></thead>
                    <tbody>
                      <tr><td className="py-1 font-semibold">Este club</td><td className="text-right">{sel.views}</td><td className="text-right">{sel.tickets}</td><td className="text-right text-purple-300">{sel.conv}</td></tr>
                      {bench.zone && <tr><td className="py-1 text-zinc-400">Media {sel.zone} ({bench.zone.n} clubs)</td><td className="text-right">{bench.zone.views}</td><td className="text-right">{bench.zone.tickets}</td><td className="text-right">{bench.zone.conv}</td></tr>}
                      {bench.type && <tr><td className="py-1 text-zinc-400">Media {sel.venue_type} ({bench.type.n} clubs)</td><td className="text-right">{bench.type.views}</td><td className="text-right">{bench.type.tickets}</td><td className="text-right">{bench.type.conv}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detail && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-card border border-white/10 bg-white/[0.03] p-6 md:col-span-2">
                  <p className="mb-4 text-sm font-bold">Visitas por día</p>
                  <Bars data={detail.daily.map((d: any) => ({ label: d.d.slice(5), value: d.views }))} />
                </div>
                <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                  <p className="mb-4 text-sm font-bold">Visitas por hora</p>
                  <Bars color="#7c5cff" data={Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: detail.hours.find((x: any) => x.h === h)?.n || 0 }))} />
                </div>
                <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                  <p className="mb-4 text-sm font-bold">De dónde llegan</p>
                  <ListBars rows={detail.sources.map((s: any) => ({ label: SOURCE_LABELS[s.source] || s.source, n: s.n }))} />
                </div>
                <div className="rounded-card border border-white/10 bg-white/[0.03] p-6 md:col-span-2">
                  <p className="mb-3 text-sm font-bold">Asistencia por noche: dicen que van vs. van de verdad</p>
                  {detail.nights.length === 0 ? <p className="text-sm text-zinc-400">Sin datos todavía.</p> : (
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-zinc-400"><th className="py-1 text-left">Noche</th><th className="py-1 text-right">Asistiré</th><th className="py-1 text-right">Check-ins</th></tr></thead>
                      <tbody>{detail.nights.map((n: any) => <tr key={n.night} className="border-t border-white/5"><td className="py-1">{n.night}</td><td className="text-right">{n.asistire}</td><td className="text-right">{n.checkins}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {detailAud && (
              <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                <p className="mb-1 text-sm font-bold">Audiencia con cuenta ({detailAud.users} usuarios)</p>
                <p className="mb-4 text-xs text-zinc-400">Solo usuarios registrados; los grupos de menos de 5 personas se ocultan.</p>
                <div className="grid gap-6 md:grid-cols-3">
                  <div><p className="mb-2 text-xs text-zinc-400">Edad</p><ListBars rows={detailAud.ages} /></div>
                  <div><p className="mb-2 text-xs text-zinc-400">Género</p><ListBars rows={detailAud.genders} /></div>
                  <div><p className="mb-2 text-xs text-zinc-400">País</p><ListBars rows={detailAud.countries} /></div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && tab === "busquedas" && (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={onlyZeroSearches} onChange={(e) => setOnlyZeroSearches(e.target.checked)} className="accent-purple-500" />
                Solo las que dieron 0 resultados (demanda sin cubrir)
              </label>
              <button onClick={exportSearchesCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-xs text-zinc-400"><th className="px-3 py-2 text-left">Búsqueda</th><th className="px-3 py-2 text-right">Veces</th><th className="px-3 py-2 text-right">Resultados medios</th><th className="px-3 py-2 text-right">Sin resultados</th></tr></thead>
              <tbody>
                {searches.filter((s) => !onlyZeroSearches || s.zero > 0).map((s) => (
                  <tr key={s.term} className="border-b border-white/5">
                    <td className="px-3 py-2 font-semibold">{s.term}</td>
                    <td className="px-3 py-2 text-right">{s.n}</td>
                    <td className="px-3 py-2 text-right">{s.avg_results ?? "—"}</td>
                    <td className={`px-3 py-2 text-right ${s.zero > 0 ? "text-amber-300" : ""}`}>{s.zero}</td>
                  </tr>
                ))}
                {searches.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-zinc-400">Todavía no hay búsquedas registradas.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === "audiencia" && audience && (
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
            <p className="mb-1 text-sm font-bold">Usuarios con cuenta activos en el periodo: {audience.users}</p>
            <p className="mb-5 text-xs text-zinc-400">Datos agregados y anónimos. Los grupos de menos de 5 personas se ocultan.</p>
            <div className="grid gap-6 md:grid-cols-3">
              <div><p className="mb-2 text-xs text-zinc-400">Edad</p><ListBars rows={audience.ages} /></div>
              <div><p className="mb-2 text-xs text-zinc-400">Género</p><ListBars rows={audience.genders} /></div>
              <div><p className="mb-2 text-xs text-zinc-400">País</p><ListBars rows={audience.countries} /></div>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
