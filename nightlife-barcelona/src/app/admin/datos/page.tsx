"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { FilterChip, Panel, SectionTitle, StatTile, TrendRangeContext, type Accent, type TrendInfo } from "../../../components/admin/ui"
import { BarChart3, CalendarCheck, CalendarDays, Car, CheckCircle2, Clock, Eye, Layers, MapPin, Scale, Search, Share2, Smartphone, Ticket, Users, type LucideIcon } from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { zoneOf } from "../../../lib/zones"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { essentialSlugLabelEs } from "../../../lib/essentialCategories"
import { madridDaysAgo, madridToday, madridYear } from "../../../lib/madridDay"
import InteractionStats, { type Kind as ClickKind } from "../../../components/admin/InteractionStats"
import { CountryPanel, FunnelPanel, LanguagePanel, SourcePanel } from "../../../components/admin/DataInsights"
import { NeedSql } from "../../../components/admin/insights"
import {
  actionIndex, actionsPer100, compareValues, fillDays, hoursSeries, isDeadItem, previousRange, rangeLength, searchRows, totalActions, weekdaySeries,
  DEAD_MIN_VIEWS, type ClubActionRow, type CountryRow, type FunnelRow, type HourRow, type LanguageRow, type SearchDetailTerm, type SignupErrorRow, type SourceQualityRow, type WeekdayRow,
} from "../../../lib/dataInsights"

// Panel "Datos": métricas agregadas de Noctua pensadas para enseñar a clubs y managers (y para
// venderlas). Todo se calcula en Supabase con funciones que solo el admin puede ejecutar y que
// devuelven números, nunca datos de personas concretas.

type Tab = "resumen" | "clubs" | "eventos" | "esenciales" | "clics" | "busquedas" | "audiencia"

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

const daysAgo = madridDaysAgo
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => {
    let s = v === null || v === undefined ? "" : String(v)
    // Excel y Google Sheets tratan como fórmula lo que empieza por = + - @ (y las búsquedas las escribe
    // cualquier visitante). Con una comilla delante se abre como texto y no se ejecuta nada.
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = "﻿" + [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n")
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Barras. Arreglo del 30/10/2026: las barras no se veían (solo las etiquetas) porque el alto en % de la
// barra no tenía contra qué calcularse; ahora cada columna ocupa todo el alto y la barra se mide contra
// su hueco. Con muchas barras (30 días) solo se escribe una etiqueta de cada pocas, en vez de "1..".
function Bars({ data, color = "#7c5cff" }: { data: { label: string; value: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const step = data.length > 12 ? Math.ceil(data.length / 6) : 1
  return (
    <div className="flex h-32 items-stretch gap-1">
      {data.map((d, i) => (
        <div key={d.label} className="group relative flex min-w-0 flex-1 flex-col items-center" title={`${d.label}: ${d.value}`}>
          <div className="flex min-h-0 w-full flex-1 items-end">
            <div className="w-full rounded-t" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: color }} />
          </div>
          <span className="mt-1 h-4 w-full text-center text-xs leading-4 text-zinc-400">
            {i % step === 0 ? <span className="whitespace-nowrap">{d.label}</span> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

function Stat({ label, value, sub, icon, accent, onClick, cue, trend }: { label: string; value: string | number; sub?: string; icon?: LucideIcon; accent?: Accent; onClick?: () => void; cue?: string; trend?: TrendInfo | null }) {
  return <StatTile label={label} value={value} note={sub} icon={icon} accent={accent} onClick={onClick} cue={cue} trend={trend} />
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

type Insights = {
  funnel: { browse: FunnelRow[]; signup: FunnelRow[]; errors: SignupErrorRow[] } | null
  sources: SourceQualityRow[] | null
  hours: { views: HourRow[]; sessions: HourRow[]; weekdays: WeekdayRow[] } | null
  clubActions: ClubActionRow[] | null
  searchDetail: { terms: SearchDetailTerm[]; daily: { day: string; n: number; zero: number }[]; total: number; total_opened: number } | null
  languages: LanguageRow[] | null
  countries: CountryRow[] | null
}

export default function AdminDatosPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [tab, setTab] = useState<Tab>("resumen")
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(madridToday())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [overview, setOverview] = useState<any>(null)
  const [clubItems, setClubItems] = useState<any[]>([])
  const [eventItems, setEventItems] = useState<any[]>([])
  const [searches, setSearches] = useState<any[]>([])
  const [audience, setAudience] = useState<any>(null)
  const [clubsMeta, setClubsMeta] = useState<Record<string, any>>({})
  const [rideClicks, setRideClicks] = useState<{ provider: string; n: number }[]>([])
  // Esenciales (30/10/2026): se carga aparte para que, si aún no se ha ejecutado el SQL 54, el resto de
  // pestañas sigan funcionando y solo esta avise.
  const [essStats, setEssStats] = useState<any>(null)
  const [essError, setEssError] = useState("")
  // Si cambias las fechas rápido, solo vale la última consulta (antes una respuesta lenta de un rango
  // anterior podía pisar a la nueva y enseñar números de otro periodo).
  const loadSeq = useRef(0)

  const [selected, setSelected] = useState<{ type: "club" | "event"; id: number; name: string } | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailAud, setDetailAud] = useState<any>(null)
  const [sortKey, setSortKey] = useState("views")
  const [onlyZeroSearches, setOnlyZeroSearches] = useState(false)
  // Tipo de clic que se ve en «Clics y tiempo»: lo elegido allí, o el de la cifra del Resumen que se ha pulsado.
  const [clickKind, setClickKind] = useState<ClickKind>("directions_click")
  // Más información (11/11/2026): periodo anterior para comparar y lo que añade supabase/88_datos_comparativas.sql.
  // Se carga aparte para que las pestañas de siempre no esperen; cada pieza vale null si su función aún no existe.
  const [prevOverview, setPrevOverview] = useState<any>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const insightsSeq = useRef(0)
  const [onlyDead, setOnlyDead] = useState(false)
  const [moreCols, setMoreCols] = useState(false)

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
    const seq = ++loadSeq.current
    setLoading(true)
    setError("")
    const range = { p_from: from, p_to: to }
    const [ov, ci, ei, se, au, clubs, rc, es] = await Promise.all([
      supabase.rpc("admin_data_overview", range),
      supabase.rpc("admin_data_items", { p_type: "club", ...range }),
      supabase.rpc("admin_data_items", { p_type: "event", ...range }),
      supabase.rpc("admin_data_searches", range),
      supabase.rpc("admin_data_audience", { ...range, p_type: null, p_id: null }),
      supabase.from("clubs").select("id, name, city, neighborhood, address, venue_type"),
      supabase.rpc("admin_ride_clicks", range),
      supabase.rpc("admin_essentials_stats", range),
    ])
    if (seq !== loadSeq.current) return
    const firstErr = [ov, ci, ei, se, au].find((r) => r.error)?.error
    if (firstErr) {
      const m = firstErr.message || ""
      const hint = /no autorizado/i.test(m)
        ? "Entra con la cuenta de administrador."
        : /function|schema cache|does not exist/i.test(m)
          ? "Parece que falta alguna de las funciones admin_data_* en Supabase."
          : "Vuelve a intentarlo en un momento."
      setError(`No se pudieron cargar los datos (${m}). ${hint}`)
    }
    setOverview(ov.data)
    setClubItems(ci.data || [])
    setEventItems(ei.data || [])
    setSearches(se.data || [])
    setAudience(au.data)
    setRideClicks(rc.data || [])
    setEssError(es.error ? es.error.message : "")
    setEssStats(es.error ? null : es.data)
    const meta: Record<string, any> = {}
    for (const c of clubs.data || []) meta[String(c.id)] = { ...c, zone: zoneOf(c) }
    setClubsMeta(meta)
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    if (!checkingAdmin) load()
  }, [checkingAdmin, load])

  useEffect(() => {
    if (checkingAdmin) return
    const seq = ++insightsSeq.current
    setInsightsLoading(true)
    const range = { p_from: from, p_to: to }
    const prev = previousRange(from, to)
    Promise.all([
      supabase.rpc("admin_data_overview", { p_from: prev.from, p_to: prev.to }),
      supabase.rpc("admin_funnel", range),
      supabase.rpc("admin_source_quality", range),
      supabase.rpc("admin_hours_madrid", range),
      supabase.rpc("admin_club_actions", range),
      supabase.rpc("admin_search_detail", range),
      supabase.rpc("admin_visitor_languages", range),
      supabase.rpc("admin_visitor_countries", range),
    ]).then(([po, fu, so, ho, ca, sd, la, co]) => {
      // Si cambias las fechas rápido, solo vale la última respuesta.
      if (seq !== insightsSeq.current) return
      setPrevOverview(po.error ? null : po.data)
      setInsights({
        funnel: fu.error ? null : fu.data,
        sources: so.error ? null : so.data,
        hours: ho.error ? null : ho.data,
        clubActions: ca.error ? null : ca.data,
        searchDetail: sd.error ? null : sd.data,
        languages: la.error ? null : la.data,
        countries: co.error ? null : co.data,
      })
      setInsightsLoading(false)
    })
  }, [checkingAdmin, from, to])

  useEffect(() => {
    if (!selected) { setDetail(null); setDetailAud(null); return }
    const range = { p_from: from, p_to: to }
    supabase.rpc("admin_data_item_detail", { p_type: selected.type, p_id: selected.id, ...range }).then((r) => setDetail(r.data))
    supabase.rpc("admin_data_audience", { ...range, p_type: selected.type, p_id: selected.id }).then((r) => setDetailAud(r.data))
  }, [selected, from, to])

  const sortRows = (rows: any[]) =>
    [...rows].sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0))

  // Acciones por ficha (11/11/2026): todo lo que hace la gente en ella, y por cada 100 visitas. «dead» = ficha con
  // visitas y ninguna acción; solo se sabe con certeza cuando está el SQL 88 (sin él faltarían taxi, llamadas y TikTok).
  const hasActionExtras = !!insights?.clubActions
  const clubActionIdx = useMemo(() => actionIndex(insights?.clubActions, "club"), [insights?.clubActions])
  const eventActionIdx = useMemo(() => actionIndex(insights?.clubActions, "event"), [insights?.clubActions])
  const withActions = (row: any, extra: ClubActionRow | undefined) => {
    const actions = totalActions(row, extra)
    return {
      actions,
      apv: actionsPer100(actions, Number(row.views) || 0) ?? 0,
      rides: (extra?.rides ?? 0) + (extra?.taxi_calls ?? 0),
      phone: extra?.phone ?? 0,
      dead: hasActionExtras && isDeadItem(Number(row.views) || 0, actions),
    }
  }

  const clubRows = useMemo(
    () =>
      sortRows(
        clubItems.map((c) => ({
          ...c,
          zone: clubsMeta[String(c.id)]?.zone || "—",
          venue_type: clubsMeta[String(c.id)]?.venue_type || "—",
          conv: pct(c.tickets, c.views),
          fulfil: pct(c.checkins, c.attendances),
          ...withActions(c, clubActionIdx.get(String(c.id))),
        }))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clubItems, clubsMeta, sortKey, clubActionIdx, hasActionExtras]
  )
  const eventRows = useMemo(
    () => sortRows(eventItems.map((e) => ({ ...e, conv: pct(e.tickets, e.views), ...withActions(e, eventActionIdx.get(String(e.id))) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventItems, sortKey, eventActionIdx, hasActionExtras]
  )
  const shownRows = (tab === "clubs" ? clubRows : eventRows).filter((r) => !onlyDead || r.dead)
  const deadCount = (tab === "clubs" ? clubRows : eventRows).filter((r) => r.dead).length

  // Comparación con el periodo anterior de la misma duración (solo las cifras de Resumen que existen en los dos).
  const prevRange = previousRange(from, to)
  const tr = (key: string) => (prevOverview && overview ? compareValues(Number(overview[key]) || 0, Number(prevOverview[key]) || 0) : null)
  const fmtDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  const searchList = useMemo(() => searchRows(searches, insights?.searchDetail?.terms), [searches, insights?.searchDetail])

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
      ["Club", "Zona", "Tipo", "Visitas", "Visitantes", "Clics entradas", "Clics en entradas % (de visitas)", "Como llegar", "Compartir", "Favoritos", "Web/Instagram", "Asistire", "Check-ins", "Cumplimiento %", "Acciones", "Acciones por 100 visitas", "Taxi/VTC", "Llamadas"],
      clubRows.map((c) => [c.name, c.zone, c.venue_type, c.views, c.visitors, c.tickets, c.conv, c.directions, c.shares, c.favorites, c.website, c.attendances, c.checkins, c.fulfil, c.actions, c.apv, c.rides, c.phone]))
  const exportEventsCsv = () =>
    downloadCsv(`noctua_eventos_${from}_${to}.csv`,
      ["Evento", "Visitas", "Visitantes", "Clics entradas", "Clics en entradas % (de visitas)", "Como llegar", "Compartir", "Favoritos", "Asistire", "Acciones", "Acciones por 100 visitas", "Taxi/VTC", "Llamadas"],
      eventRows.map((e) => [e.name, e.views, e.visitors, e.tickets, e.conv, e.directions, e.shares, e.favorites, e.attendances, e.actions, e.apv, e.rides, e.phone]))
  const exportEssCategoriesCsv = () =>
    downloadCsv(`noctua_esenciales_categorias_${from}_${to}.csv`,
      ["Categoria", "Visitas", "Visitantes", "Locales abiertos", "Como llegar", "Google Maps", "Desde fichas de club"],
      (essStats?.categories || []).map((c: any) => [essentialSlugLabelEs(c.cat), c.views, c.visitors, c.opens, c.directions, c.maps, c.nearby]))
  const exportEssItemsCsv = () =>
    downloadCsv(`noctua_esenciales_locales_${from}_${to}.csv`,
      ["Local", "Categoria", "Abierto", "Visitantes", "Como llegar", "Google Maps", "Llegar / abierto %"],
      (essStats?.items || []).map((i: any) => [i.name, essentialSlugLabelEs(i.category), i.opens, i.visitors, i.directions, i.maps, pct(i.directions, i.opens)]))
  const exportSearchesCsv = () =>
    downloadCsv(`noctua_busquedas_${from}_${to}.csv`, ["Busqueda", "Veces", "Resultados medios", "Veces sin resultados", "Despues abren algo %"],
      searchList.map((s) => [s.term, s.n, s.avg_results, s.zero, s.openedPct]))
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
    { key: "esenciales", label: "Esenciales" },
    { key: "clics", label: "Clics y tiempo" },
    { key: "busquedas", label: "Búsquedas" },
    { key: "audiencia", label: "Audiencia" },
  ]
  const presets = [
    { label: "7 días", f: daysAgo(6) },
    { label: "30 días", f: daysAgo(29) },
    { label: "90 días", f: daysAgo(89) },
    { label: "Este año", f: `${madridYear()}-01-01` },
  ]

  const th = (key: string, label: string) => (
    <th aria-sort={sortKey === key ? "descending" : "none"} className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold">
      {/* Un botón de verdad: se ordena también con el teclado (Tab + Enter). */}
      <button
        type="button"
        onClick={() => setSortKey(key)}
        className={`cursor-pointer text-xs font-semibold hover:text-white focus-visible:outline-2 focus-visible:outline-purple-300 ${sortKey === key ? "text-purple-300" : "text-zinc-400"}`}
      >
        {label}
      </button>
    </th>
  )

  // Las cifras del Resumen son solo totales: pulsarlas lleva al detalle (11/11/2026).
  const goClicks = (kind: ClickKind) => {
    setClickKind(kind)
    setSelected(null)
    setTab("clics")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const goTab = (next: Tab, sort?: string) => {
    if (sort) setSortKey(sort)
    setSelected(null)
    setTab(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const sel = selected && selected.type === "club" ? clubRows.find((c) => c.id === selected.id) : null
  const bench = sel ? benchmark(sel.zone, sel.venue_type, sel.id) : null

  return (
    <AdminShell title="Datos de negocio" subtitle="Métricas agregadas para clubs, managers y compradores de datos.">
      <section className="mx-auto max-w-7xl pb-16">
        {/* Rango de fechas */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => { setFrom(p.f); setTo(madridToday()) }}
              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${from === p.f && to === madridToday() ? "border-brand/60 bg-brand/20 text-white" : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"}`}
            >
              {p.label}
            </button>
          ))}
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-white/10 bg-night/70 px-3 py-2 text-xs text-zinc-300" />
          <span className="text-xs text-zinc-400">→</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ colorScheme: "dark" }} className="rounded-xl border border-white/10 bg-night/70 px-3 py-2 text-xs text-zinc-300" />
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
        {loading && tab !== "clics" && <p className="text-sm text-zinc-400">Cargando datos...</p>}
        {/* Clics y tiempo carga lo suyo aparte (SQL 84), así que no espera a las demás pestañas. */}
        {tab === "clics" && <InteractionStats from={from} to={to} kind={clickKind} onKindChange={setClickKind} />}

        {!loading && overview && tab === "resumen" && (
          <div className="space-y-6">
            <TrendRangeContext.Provider value={prevOverview ? `${fmtDay(prevRange.from)} al ${fmtDay(prevRange.to)}` : null}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Sesiones" icon={Users} accent="violet" value={overview.sessions} trend={tr("sessions")} />
              <Stat label="Visitas a fichas" icon={Eye} accent="pink" value={overview.page_views} trend={tr("page_views")} onClick={() => goTab("clubs", "views")} cue="Ver qué fichas" />
              <Stat label="Clics en entradas" icon={Ticket} accent="cyan" value={overview.tickets} trend={tr("tickets")} sub={`${pct(overview.tickets, overview.page_views)} % de las visitas a fichas`} onClick={() => goClicks("tickets_click")} cue="Ver dónde y a qué web" />
              <Stat label="Cómo llegar" icon={MapPin} accent="coral" value={overview.directions} trend={tr("directions")} onClick={() => goClicks("directions_click")} cue="Ver a qué sitios" />
              <Stat label="Compartidos" icon={Share2} accent="violet" value={overview.shares} trend={tr("shares")} onClick={() => goClicks("share_click")} cue="Ver qué y cómo" />
              <Stat label="Búsquedas" icon={Search} accent="pink" value={overview.searches} trend={tr("searches")} sub={`${overview.searches_zero} sin resultados`} onClick={() => goTab("busquedas")} cue="Ver cuáles" />
              <Stat label="Asistiré" icon={CalendarCheck} accent="cyan" value={overview.attendances} trend={tr("attendances")} onClick={() => goClicks("attendance")} cue="Ver a qué noches" />
              <Stat label="Check-ins reales" icon={CheckCircle2} accent="coral" value={overview.checkins} trend={tr("checkins")} sub={`Cumplimiento ${pct(overview.checkins, overview.attendances)}%`} onClick={() => goTab("clubs", "checkins")} cue="Ver en qué locales" />
            </div>
            </TrendRangeContext.Provider>
            {prevOverview && (
              <p className="-mt-2 text-xs text-zinc-400">
                Comparado con los {rangeLength(from, to)} {rangeLength(from, to) === 1 ? "día" : "días"} anteriores ({fmtDay(prevRange.from)}–{fmtDay(prevRange.to)}).
                {to === madridToday() ? " Hoy aún no ha terminado, así que el periodo actual sale algo más corto de lo que será." : ""}
              </p>
            )}
            <Panel>
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionTitle icon={BarChart3} accent="violet">Visitas por día</SectionTitle>
                <button onClick={exportOverviewCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
              </div>
              <Bars data={(overview.daily || []).map((d: any) => ({ label: d.d.slice(5), value: d.views }))} />
            </Panel>
            {insights?.funnel ? (
              <FunnelPanel browse={insights.funnel.browse} signup={insights.funnel.signup} errors={insights.funnel.errors} />
            ) : insightsLoading ? (
              <p className="text-sm text-zinc-400">Cargando embudo...</p>
            ) : (
              <NeedSql file="88_datos_comparativas.sql" what="el embudo, qué origen convierte y las horas en hora de Madrid" />
            )}
            {insights?.sources && <SourcePanel rows={insights.sources} />}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Panel accent="pink">
                <SectionTitle icon={Share2} accent="pink" className="mb-4">Origen del tráfico (sesiones)</SectionTitle>
                <ListBars rows={(overview.sources || []).map((s: any) => ({ label: SOURCE_LABELS[s.source] || s.source, n: s.sessions }))} />
              </Panel>
              <Panel accent="cyan">
                <SectionTitle icon={Smartphone} accent="cyan" className="mb-4">Dispositivo</SectionTitle>
                <ListBars rows={(overview.devices || []).map((s: any) => ({ label: s.device === "mobile" ? "Móvil" : s.device === "desktop" ? "Ordenador" : s.device, n: s.sessions }))} />
              </Panel>
              <Panel accent="violet">
                <SectionTitle icon={Clock} accent="violet" className="mb-4">Visitas por hora del día{insights?.hours ? " (hora de Madrid)" : ""}</SectionTitle>
                <Bars color="#7c5cff" data={Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: insights?.hours ? hoursSeries(insights.hours.views)[h] : (overview.hours || []).find((x: any) => x.h === h)?.n || 0 }))} />
              </Panel>
              <Panel accent="coral">
                <SectionTitle icon={CalendarDays} accent="coral" className="mb-4">Visitas por día de la semana{insights?.hours ? " (hora de Madrid)" : ""}</SectionTitle>
                <Bars color="#f59e0b" data={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ label: WEEKDAYS[d], value: insights?.hours ? weekdaySeries(insights.hours.weekdays)[d - 1] : (overview.weekdays || []).find((x: any) => x.d === d)?.n || 0 }))} />
              </Panel>
              <Panel accent="cyan">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <SectionTitle icon={Car} accent="cyan">Clics en Uber / Cabify / FREE NOW</SectionTitle>
                  <button onClick={() => goClicks("ride_click")} className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-zinc-300 hover:bg-white/10">Ver taxi y VTC ›</button>
                </div>
                <ListBars rows={rideClicks.map((r) => ({ label: RIDE_PROVIDER_LABELS[r.provider] || r.provider, n: r.n }))} />
              </Panel>
            </div>
          </div>
        )}

        {!loading && (tab === "clubs" || tab === "eventos") && !selected && (
          <div className="rounded-card border border-white/10 bg-surface p-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-xs text-zinc-400">Pulsa un encabezado para ordenar y una fila para ver el detalle. «Acciones» suma entradas, llegar, compartir, favoritos, web, taxi, llamadas y asistiré.</p>
              <button onClick={tab === "clubs" ? exportClubsCsv : exportEventsCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 px-2">
              {hasActionExtras ? (
                <FilterChip active={onlyDead} onClick={() => setOnlyDead((v) => !v)} count={deadCount}>Con {DEAD_MIN_VIEWS}+ visitas y ninguna acción</FilterChip>
              ) : (
                !insightsLoading && <span className="text-xs text-amber-200">Para ver las fichas sin acciones y el taxi por club, ejecuta el SQL 88 (88_datos_comparativas.sql).</span>
              )}
              <FilterChip active={moreCols} onClick={() => setMoreCols((v) => !v)}>Más columnas</FilterChip>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">{tab === "clubs" ? "Club" : "Evento"}</th>
                    {tab === "clubs" && <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-400">Zona</th>}
                    {th("views", "Visitas")}
                    {th("visitors", "Visitantes")}
                    {th("actions", "Acciones")}
                    {th("apv", "Acc. / 100 vis.")}
                    {th("tickets", "Entradas")}
                    {th("conv", "Clic entrada %")}
                    {th("directions", "Llegar")}
                    {th("shares", "Compart.")}
                    {th("attendances", "Asistiré")}
                    {tab === "clubs" && th("checkins", "Check-ins")}
                    {tab === "clubs" && th("fulfil", "Cumpl. %")}
                    {moreCols && th("favorites", "Favoritos")}
                    {moreCols && th("website", "Web / IG")}
                    {moreCols && hasActionExtras && th("rides", "Taxi / VTC")}
                    {moreCols && hasActionExtras && th("phone", "Llamar")}
                  </tr>
                </thead>
                <tbody>
                  {shownRows.map((r) => (
                    <tr key={r.id} onClick={() => setSelected({ type: tab === "clubs" ? "club" : "event", id: r.id, name: r.name })} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.04]">
                      <td className="max-w-[220px] truncate px-3 py-2 font-semibold text-white">
                        {/* El nombre es un botón para abrir el detalle con el teclado; el clic en la fila sigue funcionando con el ratón. */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelected({ type: tab === "clubs" ? "club" : "event", id: r.id, name: r.name }) }}
                          className="max-w-full truncate text-left hover:underline focus-visible:outline-2 focus-visible:outline-purple-300"
                        >
                          {r.name}
                        </button>
                        {/* En el móvil las columnas de acciones quedan fuera de pantalla: se resumen bajo el nombre. */}
                        <span className={`mt-0.5 block truncate text-xs font-normal sm:hidden ${r.dead ? "text-amber-300" : "text-zinc-500"}`}>
                          {r.actions} {r.actions === 1 ? "acción" : "acciones"}{r.views > 0 ? ` · ${String(r.apv).replace(".", ",")} por 100 visitas` : ""}
                        </span>
                      </td>
                      {tab === "clubs" && <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{r.zone}</td>}
                      <td className="px-3 py-2 text-right">{r.views}</td>
                      <td className="px-3 py-2 text-right">{r.visitors}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.actions}</td>
                      <td className={`px-3 py-2 text-right ${r.dead ? "text-amber-300" : "text-purple-300"}`}>{r.views > 0 ? r.apv : "—"}</td>
                      <td className="px-3 py-2 text-right">{r.tickets}</td>
                      <td className="px-3 py-2 text-right text-purple-300">{r.conv}</td>
                      <td className="px-3 py-2 text-right">{r.directions}</td>
                      <td className="px-3 py-2 text-right">{r.shares}</td>
                      <td className="px-3 py-2 text-right">{r.attendances}</td>
                      {tab === "clubs" && <td className="px-3 py-2 text-right">{r.checkins}</td>}
                      {tab === "clubs" && <td className="px-3 py-2 text-right">{r.attendances ? r.fulfil : "—"}</td>}
                      {moreCols && <td className="px-3 py-2 text-right">{r.favorites ?? 0}</td>}
                      {moreCols && <td className="px-3 py-2 text-right">{r.website ?? 0}</td>}
                      {moreCols && hasActionExtras && <td className="px-3 py-2 text-right">{r.rides}</td>}
                      {moreCols && hasActionExtras && <td className="px-3 py-2 text-right">{r.phone}</td>}
                    </tr>
                  ))}
                  {shownRows.length === 0 && (
                    <tr><td colSpan={17} className="px-3 py-8 text-center text-zinc-400">{onlyDead ? `Ninguna ficha con ${DEAD_MIN_VIEWS} o más visitas se queda sin acciones.` : "Todavía no hay datos en este periodo."}</td></tr>
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
                <Stat label="Visitas" icon={Eye} accent="pink" value={sel.views} />
                <Stat label="Clics en entradas" icon={Ticket} accent="cyan" value={sel.tickets} sub={`${sel.conv} % de las visitas`} />
                <Stat label="Asistiré" icon={CalendarCheck} accent="cyan" value={sel.attendances} />
                <Stat label="Check-ins" icon={CheckCircle2} accent="coral" value={sel.checkins} sub={sel.attendances ? `Cumplimiento ${sel.fulfil}%` : undefined} />
              </div>
            )}

            {sel && bench && (bench.zone || bench.type) && (
              <Panel accent="violet">
                <SectionTitle icon={Scale} accent="violet" className="mb-4">Comparativa</SectionTitle>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-zinc-400"><th className="py-1 text-left"></th><th className="py-1 text-right">Visitas</th><th className="py-1 text-right">Entradas</th><th className="py-1 text-right">Clic entrada %</th></tr></thead>
                    <tbody>
                      <tr><td className="py-1 font-semibold">Este club</td><td className="text-right">{sel.views}</td><td className="text-right">{sel.tickets}</td><td className="text-right text-purple-300">{sel.conv}</td></tr>
                      {bench.zone && <tr><td className="py-1 text-zinc-400">Media {sel.zone} ({bench.zone.n} clubs)</td><td className="text-right">{bench.zone.views}</td><td className="text-right">{bench.zone.tickets}</td><td className="text-right">{bench.zone.conv}</td></tr>}
                      {bench.type && <tr><td className="py-1 text-zinc-400">Media {sel.venue_type} ({bench.type.n} clubs)</td><td className="text-right">{bench.type.views}</td><td className="text-right">{bench.type.tickets}</td><td className="text-right">{bench.type.conv}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            {detail && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Panel accent="violet" className="md:col-span-2">
                  <SectionTitle icon={BarChart3} accent="violet" className="mb-4">Visitas por día</SectionTitle>
                  <Bars data={detail.daily.map((d: any) => ({ label: d.d.slice(5), value: d.views }))} />
                </Panel>
                <Panel accent="violet">
                  <SectionTitle icon={Clock} accent="violet" className="mb-4">Visitas por hora</SectionTitle>
                  <Bars color="#7c5cff" data={Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: detail.hours.find((x: any) => x.h === h)?.n || 0 }))} />
                </Panel>
                <Panel accent="pink">
                  <SectionTitle icon={Share2} accent="pink" className="mb-4">De dónde llegan</SectionTitle>
                  <ListBars rows={detail.sources.map((s: any) => ({ label: SOURCE_LABELS[s.source] || s.source, n: s.n }))} />
                </Panel>
                <Panel accent="cyan" className="md:col-span-2">
                  <SectionTitle icon={CalendarCheck} accent="cyan" className="mb-4">Asistencia por noche: dicen que van vs. van de verdad</SectionTitle>
                  {detail.nights.length === 0 ? <p className="text-sm text-zinc-400">Sin datos todavía.</p> : (
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-zinc-400"><th className="py-1 text-left">Noche</th><th className="py-1 text-right">Asistiré</th><th className="py-1 text-right">Check-ins</th></tr></thead>
                      <tbody>{detail.nights.map((n: any) => <tr key={n.night} className="border-t border-white/5"><td className="py-1">{n.night}</td><td className="text-right">{n.asistire}</td><td className="text-right">{n.checkins}</td></tr>)}</tbody>
                    </table>
                  )}
                </Panel>
              </div>
            )}

            {detailAud && (
              <Panel accent="cyan">
                <SectionTitle icon={Users} accent="cyan" className="mb-4">Audiencia con cuenta ({detailAud.users} usuarios)</SectionTitle>
                <p className="mb-4 text-xs text-zinc-400">Solo usuarios registrados; los grupos de menos de 5 personas se ocultan.</p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div><p className="mb-2 text-xs text-zinc-400">Edad</p><ListBars rows={detailAud.ages} /></div>
                  <div><p className="mb-2 text-xs text-zinc-400">Género</p><ListBars rows={detailAud.genders} /></div>
                  <div><p className="mb-2 text-xs text-zinc-400">País</p><ListBars rows={detailAud.countries} /></div>
                </div>
              </Panel>
            )}
          </div>
        )}

        {!loading && tab === "esenciales" && (
          <div className="space-y-6">
            {essError && (
              <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                No se pudieron cargar las estadísticas de esenciales: {essError}. ¿Has ejecutado el SQL 54 (54_estadisticas_esenciales.sql) en Supabase?
              </p>
            )}
            {essStats && (
              <>
                <p className="text-xs text-zinc-400">
                  Cuenta desde que se publicó la web con el registro de esenciales (30/10/2026). No incluye tu actividad de admin, bots ni pruebas, y no guarda datos de personas.
                  {(new Date(to).getTime() - new Date(from).getTime()) / 86400000 > 366 && " Esta pestaña muestra como máximo los últimos 12 meses del periodo elegido."}
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <Stat label="Visitas a categorías" icon={Eye} accent="pink" value={essStats.totals?.category_views ?? 0} />
                  <Stat label="Visitantes distintos" icon={Users} accent="violet" value={essStats.totals?.visitors ?? 0} />
                  <Stat label="Locales abiertos" icon={MapPin} accent="cyan" value={essStats.totals?.opens ?? 0} sub="tarjeta o chincheta del mapa" />
                  <Stat label="Cómo llegar" icon={MapPin} accent="coral" value={essStats.totals?.directions ?? 0} sub={`${pct(essStats.totals?.directions ?? 0, essStats.totals?.opens ?? 0)}% de los abiertos`} />
                  <Stat label="Google Maps" icon={MapPin} accent="coral" value={essStats.totals?.maps ?? 0} />
                  <Stat label="Desde fichas de club" icon={Share2} accent="violet" value={essStats.totals?.nearby ?? 0} sub="esenciales cercanos" />
                </div>
                <Panel accent="violet">
                  <SectionTitle icon={BarChart3} accent="violet" className="mb-4">Visitas a categorías por día</SectionTitle>
                  <Bars data={(essStats.daily || []).map((d: any) => ({ label: d.d.slice(5), value: d.category_views }))} />
                </Panel>
                <div className="rounded-card border border-white/10 bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <SectionTitle icon={Layers} accent="coral">Por categoría</SectionTitle>
                    <button onClick={exportEssCategoriesCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-zinc-400">
                          <th className="px-3 py-2 text-left font-semibold">Categoría</th>
                          <th className="px-3 py-2 text-right font-semibold">Visitas</th>
                          <th className="px-3 py-2 text-right font-semibold">Visitantes</th>
                          <th className="px-3 py-2 text-right font-semibold">Abiertos</th>
                          <th className="px-3 py-2 text-right font-semibold">Llegar</th>
                          <th className="px-3 py-2 text-right font-semibold">Maps</th>
                          <th className="px-3 py-2 text-right font-semibold">Desde fichas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(essStats.categories || []).map((c: any) => (
                          <tr key={c.cat} className="border-b border-white/5">
                            <td className="px-3 py-2 font-semibold text-white">{essentialSlugLabelEs(c.cat)}</td>
                            <td className="px-3 py-2 text-right">{c.views}</td>
                            <td className="px-3 py-2 text-right">{c.visitors}</td>
                            <td className="px-3 py-2 text-right">{c.opens}</td>
                            <td className="px-3 py-2 text-right">{c.directions}</td>
                            <td className="px-3 py-2 text-right">{c.maps}</td>
                            <td className="px-3 py-2 text-right">{c.nearby}</td>
                          </tr>
                        ))}
                        {(essStats.categories || []).length === 0 && (
                          <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-400">Todavía no hay datos de esenciales en este periodo.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-card border border-white/10 bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <SectionTitle icon={MapPin} accent="cyan">Locales más abiertos</SectionTitle>
                    <button onClick={exportEssItemsCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-zinc-400">
                          <th className="px-3 py-2 text-left font-semibold">Local</th>
                          <th className="px-3 py-2 text-left font-semibold">Categoría</th>
                          <th className="px-3 py-2 text-right font-semibold">Abierto</th>
                          <th className="px-3 py-2 text-right font-semibold">Visitantes</th>
                          <th className="px-3 py-2 text-right font-semibold">Llegar</th>
                          <th className="px-3 py-2 text-right font-semibold">Maps</th>
                          <th className="px-3 py-2 text-right font-semibold">Llegar %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(essStats.items || []).map((i: any) => (
                          <tr key={i.item_id} className="border-b border-white/5">
                            <td className="max-w-[240px] truncate px-3 py-2 font-semibold text-white">{i.name || `#${i.item_id}`}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{essentialSlugLabelEs(i.category)}</td>
                            <td className="px-3 py-2 text-right">{i.opens}</td>
                            <td className="px-3 py-2 text-right">{i.visitors}</td>
                            <td className="px-3 py-2 text-right">{i.directions}</td>
                            <td className="px-3 py-2 text-right">{i.maps}</td>
                            <td className="px-3 py-2 text-right text-purple-300">{i.opens > 0 ? pct(i.directions, i.opens) : "—"}</td>
                          </tr>
                        ))}
                        {(essStats.items || []).length === 0 && (
                          <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-400">Todavía no hay locales abiertos en este periodo.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && tab === "busquedas" && (
          <div className="rounded-card border border-white/10 bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={onlyZeroSearches} onChange={(e) => setOnlyZeroSearches(e.target.checked)} className="accent-purple-500" />
                Solo las que dieron 0 resultados (demanda sin cubrir)
              </label>
              <button onClick={exportSearchesCsv} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10">Descargar CSV</button>
            </div>
            {insights?.searchDetail && insights.searchDetail.total > 0 && (
              <div className="mb-5 px-2">
                <p className="mb-3 text-xs text-zinc-300">
                  De {insights.searchDetail.total} búsquedas, <span className="font-semibold text-ink">{insights.searchDetail.total_opened}</span> ({String(pct(insights.searchDetail.total_opened, insights.searchDetail.total)).replace(".", ",")} %) acaban abriendo una ficha o haciendo un clic en los 5 minutos siguientes.
                  Las demás, o no encuentran lo que buscan o se van.
                </p>
                <Bars color="#ec4899" data={fillDays(from, to, insights.searchDetail.daily, (d) => d.n)} />
                <p className="mt-2 text-xs text-zinc-500">Búsquedas por día.</p>
              </div>
            )}
            {!insights?.searchDetail && !insightsLoading && <NeedSql className="mx-2 mb-4" file="88_datos_comparativas.sql" what="cuántas búsquedas acaban en algo y su evolución por día" />}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead><tr className="border-b border-white/10 text-xs text-zinc-400"><th className="px-3 py-2 text-left">Búsqueda</th><th className="px-3 py-2 text-right">Veces</th><th className="px-3 py-2 text-right">Resultados medios</th><th className="px-3 py-2 text-right">Sin resultados</th>{insights?.searchDetail && <th className="px-3 py-2 text-right">Después abren algo</th>}</tr></thead>
                <tbody>
                  {searchList.filter((s) => !onlyZeroSearches || s.zero > 0).map((s) => (
                    <tr key={s.term} className="border-b border-white/5">
                      <td className="px-3 py-2 font-semibold">{s.term}</td>
                      <td className="px-3 py-2 text-right">{s.n}</td>
                      <td className="px-3 py-2 text-right">{s.avg_results ?? "—"}</td>
                      <td className={`px-3 py-2 text-right ${s.zero > 0 ? "text-amber-300" : ""}`}>{s.zero}</td>
                      {insights?.searchDetail && <td className="px-3 py-2 text-right tabular-nums">{s.openedPct === null ? "—" : `${String(s.openedPct).replace(".", ",")} %`}</td>}
                    </tr>
                  ))}
                  {searchList.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-400">Todavía no hay búsquedas registradas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tab === "audiencia" && (
          <div className="space-y-6">
            {insights?.countries ? (
              <CountryPanel rows={insights.countries} />
            ) : insightsLoading ? (
              <p className="text-sm text-zinc-400">Cargando países...</p>
            ) : (
              <NeedSql file="89_pais_visitantes.sql" what="el país de los visitantes" />
            )}
            {insights?.languages ? (
              <LanguagePanel rows={insights.languages} />
            ) : insightsLoading ? (
              <p className="text-sm text-zinc-400">Cargando idiomas...</p>
            ) : (
              <NeedSql file="88_datos_comparativas.sql" what="el idioma de los visitantes" />
            )}
            {audience && (
              <Panel accent="cyan">
                <SectionTitle icon={Users} accent="cyan" className="mb-4">Usuarios con cuenta activos en el periodo: {audience.users}</SectionTitle>
                <p className="mb-5 text-xs text-zinc-400">Datos agregados y anónimos. Los grupos de menos de 5 personas se ocultan.</p>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div><p className="mb-2 text-xs text-zinc-400">Edad</p><ListBars rows={audience.ages} /></div>
                  <div><p className="mb-2 text-xs text-zinc-400">Género</p><ListBars rows={audience.genders} /></div>
                  <div><p className="mb-2 text-xs text-zinc-400">País (el que indican en su cuenta)</p><ListBars rows={audience.countries} /></div>
                </div>
              </Panel>
            )}
          </div>
        )}
      </section>
    </AdminShell>
  )
}
