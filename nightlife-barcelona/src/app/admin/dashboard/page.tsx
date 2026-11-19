"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity, ArrowUpRight, BellRing, CalendarDays, CheckCircle2, ChevronRight, Layers, ShieldCheck, TrendingDown, TrendingUp, Users,
} from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { AdminCityBadge, useAdminCity } from "../../../components/admin/AdminCity"
import { BTN_GHOST_SM, LINK, Panel, SectionTitle, StatusPill } from "../../../components/admin/ui"
import { CompareBars, WeekChart, type DayPoint } from "../../../components/admin/WeekChart"
import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/fetchAll"
import { clubCityIndex, cityOfEvent, rowsOfCity, rowsOfCityByClub } from "../../../lib/adminCity"
import { cityFlags, cityFlagsNote, NO_CITY_FLAGS, rpcByCity, type CityFlags } from "../../../lib/adminRpc"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { SEASONAL_THEMES } from "../../../lib/nocSeasonal"
import { madridDaysAgo, madridDaysAhead, madridToday } from "../../../lib/madridDay"

// Resumen del admin, rehecho el 24/10/2026 tras el análisis del panel. Antes esta pantalla abría
// con el interruptor de mantenimiento (el botón más peligroso del admin, en el sitio más visible)
// y seguía con contadores que no llevan a ninguna acción: total de favoritos, clubs "trending",
// esenciales por categoría, "clubs sin dueño" (que son casi todos, así que no avisa de nada)...
// Ahora responde, por orden, a lo que hay que saber al entrar:
//   1. ¿Hay algo que me esté esperando? (bandeja de pendientes, con enlace directo)
//   2. ¿Cómo va la web esta semana frente a la anterior?
//   3. ¿En qué estado están los interruptores? (mantenimiento, Club Noctua, Noc de temporada)
//   4. ¿Qué viene esta semana y quién se ha registrado?
// El interruptor de mantenimiento se ha movido a Ajustes y herramientas, junto a los otros dos.

const daysAgo = madridDaysAgo
const daysAhead = madridDaysAhead

type Overview = { sessions: number; page_views: number; tickets: number; daily: { d: string; sessions: number; views: number }[] }
type Pending = { messages: number; ownerMessages: number; reports: number; denials: number; eventsToReview: number; ownerChanges: number }
type System = { maintenance: boolean | null; clubNoctua: boolean | null; season: string | null }
type Upcoming = { id: number; title: string; date: string; kind: "Evento" | "Noche de club"; href: string }
type Signup = { id: string; email: string; username: string | null; created_at: string; last_sign_in_at: string | null }
// Resumen por usuario de admin_users_activity (supabase/24): solo lo que hace falta aquí.
type ActivityRow = { user_id: string; last_seen: string | null }

// Variación de una cifra frente a la semana anterior. Flecha y signo, nunca solo color; con el valor de antes a la vista.
function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-zinc-500">{now ? "Sin semana anterior" : "—"}</span>
  const p = Math.round(((now - before) / before) * 100)
  if (p === 0) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs font-bold text-zinc-300 ring-1 ring-inset ring-white/10">= igual</span>
        <span className="hidden text-xs text-zinc-500 sm:inline">antes {before}</span>
      </span>
    )
  }
  const up = p > 0
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold ring-1 ring-inset ${up ? "bg-open/10 text-open ring-open/20" : "bg-red-500/10 text-red-300 ring-red-400/25"}`}
      >
        {up ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
        {up ? "+" : ""}
        {p} %
      </span>
      <span className="hidden text-xs text-zinc-500 sm:inline">antes {before}</span>
    </span>
  )
}

type MetricKey = "sessions" | "views" | "tickets"

function initialOf(text: string) {
  return (text.match(/[A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/)?.[0] || "?").toUpperCase()
}

export default function AdminDashboardPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [pending, setPending] = useState<Pending | null>(null)
  const [week, setWeek] = useState<Overview | null>(null)
  // Si la función de datos falla (no está en Supabase, sesión caducada...), antes los números se
  // quedaban en «…» para siempre sin decir nada.
  const [trafficFailed, setTrafficFailed] = useState(false)
  const [metricKey, setMetricKey] = useState<MetricKey>("sessions")
  const [prevWeek, setPrevWeek] = useState<Overview | null>(null)
  const [users, setUsers] = useState<{ total: number; new7: number; active7: number } | null>(null)
  const [signups, setSignups] = useState<Signup[]>([])
  const [system, setSystem] = useState<System>({ maintenance: null, clubNoctua: null, season: null })
  const [content, setContent] = useState<{ clubsVisible: number; clubsHidden: number; events30: number; nights7: number } | null>(null)
  const [upcoming, setUpcoming] = useState<Upcoming[]>([])
  // Ciudad del admin (15/11/2026). Tráfico y contenido son de la ciudad elegida; pendientes, estado de la web y usuarios son comunes.
  // Si el SQL por ciudad aún no está, en Barcelona se ve toda la web junta y en Madrid no se enseña tráfico (con aviso).
  const [city] = useAdminCity()
  const [trafficFlags, setTrafficFlags] = useState<CityFlags>(NO_CITY_FLAGS)

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  useEffect(() => {
    if (checkingAdmin) return
    const today = madridToday()
    const weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString()

    const load = async () => {
      const [
        msgs, reports, denials, review,
        list, activity,
        maint, club, season,
        ownerChanges, ownerMessages,
      ] = await Promise.all([
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new").or("is_spam.is.null,is_spam.eq.false"),
        supabase.from("club_checkin_reports").select("id", { count: "exact", head: true }).is("reviewed_at", null),
        supabase.from("entry_denials").select("id", { count: "exact", head: true }).gte("created_at", weekAgoIso),
        // Ediciones nuevas de eventos anuales: el cron las pasa al año siguiente y las deja ocultas
        // hasta que las revises (cartel, precio y artistas suelen cambiar de una edición a otra).
        supabase.from("events").select("id", { count: "exact", head: true }).eq("recurring", true).eq("hidden", true).gte("date", today),
        supabase.rpc("admin_list_users"),
        // Cuentas con actividad en la web estos 7 días (misma fuente que Admin › Visitas y Actividad).
        supabase.rpc("admin_users_activity", { p_from: daysAgo(6), p_to: today }),
        supabase.from("app_settings").select("maintenance_mode").eq("id", true).maybeSingle(),
        supabase.from("club_noctua_settings").select("enabled").eq("id", 1).maybeSingle(),
        supabase.from("noc_seasonal_settings").select("mode").eq("id", 1).maybeSingle(),
        // Cambios hechos por dueños y organizadores en su ficha esta semana (supabase/34).
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).gte("at", weekAgoIso).neq("user_email", ADMIN_EMAIL),
        // Mensajes de dueños sin leer (supabase/59). Si la tabla aún no existe, cuenta 0.
        supabase.from("owner_messages").select("id", { count: "exact", head: true }).eq("sender", "owner").is("read_at", null),
      ])

      setPending({
        messages: msgs.count || 0,
        ownerMessages: ownerMessages.error ? 0 : ownerMessages.count || 0,
        reports: reports.count || 0,
        denials: denials.count || 0,
        eventsToReview: review.count || 0,
        ownerChanges: ownerChanges.error ? 0 : ownerChanges.count || 0,
      })

      const all = (list.data || []) as Signup[]
      const weekAgo = Date.now() - 7 * 86400000
      // 05/11/2026: «activos» contaba las cuentas con un inicio de sesión esta semana (last_sign_in_at), pero
      // quien ya tiene la sesión abierta entra cada día sin «iniciar sesión» y no contaba. Ahora cuenta las
      // cuentas con actividad registrada en la web en los últimos 7 días (como Admin › Visitas). Si esa función
      // falla, se usa el criterio antiguo. Tu propia cuenta no cuenta (tus pruebas inflaban las cifras).
      const others = all.filter((u) => u.email !== ADMIN_EMAIL)
      const otherIds = new Set(others.map((u) => u.id))
      const activeByActivity = activity.error
        ? null
        : new Set(((activity.data || []) as ActivityRow[]).filter((r) => otherIds.has(r.user_id)).map((r) => r.user_id)).size
      setUsers({
        total: all.length,
        new7: others.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
        active7:
          activeByActivity ?? others.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= weekAgo).length,
      })
      setSignups([...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5))

      setSystem({
        maintenance: !!maint.data?.maintenance_mode,
        clubNoctua: club.data?.enabled === true,
        season: (season.data?.mode as string) || "auto",
      })

    }
    load()
  }, [checkingAdmin])

  // Lo que depende de la ciudad: tráfico de la semana, clubs, eventos y noches. Se vuelve a pedir al cambiar de ciudad.
  useEffect(() => {
    if (checkingAdmin) return
    let current = true
    const today = madridToday()
    setWeek(null)
    setPrevWeek(null)
    setTrafficFailed(false)
    setContent(null)
    setUpcoming([])

    const load = async () => {
      const [ov, ovPrev, clubs, events, nights] = await Promise.all([
        rpcByCity<Overview>(supabase, "admin_data_overview", { p_from: daysAgo(6), p_to: today }, city, "105_datos_por_ciudad.sql"),
        rpcByCity<Overview>(supabase, "admin_data_overview", { p_from: daysAgo(13), p_to: daysAgo(7) }, city, "105_datos_por_ciudad.sql"),
        // Por páginas: Supabase corta en 1.000 filas y, con Madrid, entre las dos ciudades se pasa de ahí.
        fetchAllPages((lo, hi) =>
          supabase.from("clubs").select("id, name, city, latitude, longitude, hidden").order("id").range(lo, hi)
        ),
        fetchAllPages((lo, hi) =>
          supabase.from("events").select("id, title, date, club_name, latitude, longitude").eq("hidden", false).gte("date", today).lte("date", daysAhead(30)).order("date").order("id").range(lo, hi)
        ),
        fetchAllPages((lo, hi) =>
          supabase.from("club_events").select("id, title, date, club_id").gte("date", today).lte("date", daysAhead(7)).order("date").order("id").range(lo, hi)
        ),
      ])
      if (!current) return

      const flags = cityFlags([], [ov, ovPrev])
      setTrafficFlags(flags)
      setTrafficFailed(!!ov.error)
      setWeek(ov.error ? null : ov.data || null)
      setPrevWeek(ovPrev.error ? null : ovPrev.data || null)

      type ClubRow = { id: number; name: string; city: string | null; latitude: number | null; longitude: number | null; hidden: boolean | null }
      type EventRow = { id: number; title: string; date: string; club_name: string | null; latitude: number | null; longitude: number | null }
      type NightRow = { id: number; title: string; date: string; club_id: number | null }
      const clubRows = clubs as ClubRow[]
      const mine = rowsOfCity(clubRows, city)
      const index = clubCityIndex(clubRows)
      const myEvents = (events as EventRow[]).filter((e) => cityOfEvent(e, index) === city)
      const weekLimit = daysAhead(7)
      const myNights = rowsOfCityByClub(nights as NightRow[], new Set(mine.map((c) => c.id)), new Set(clubRows.map((c) => c.id)), city)

      setContent({
        clubsVisible: mine.filter((c) => !c.hidden).length,
        clubsHidden: mine.filter((c) => c.hidden).length,
        events30: myEvents.length,
        nights7: myNights.length,
      })

      const ups: Upcoming[] = [
        ...myEvents.filter((e) => e.date <= weekLimit).slice(0, 6).map((e) => ({ id: e.id, title: e.title, date: e.date, kind: "Evento" as const, href: `/admin/events?edit=${e.id}` })),
        ...myNights.slice(0, 6).map((e) => ({ id: e.id, title: e.title, date: e.date, kind: "Noche de club" as const, href: `/admin/club-events?edit=${e.id}` })),
      ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
      setUpcoming(ups)
    }
    load()
    return () => {
      current = false
    }
  }, [checkingAdmin, city])

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night text-ink">
        <p className="text-sm text-zinc-400">Cargando…</p>
      </main>
    )
  }

  const queue = pending
    ? [
        { n: pending.messages, label: "mensajes sin leer", href: "/admin/messages" },
        { n: pending.ownerMessages, label: "mensajes de propietarios sin leer", href: "/admin/buzon" },
        { n: pending.reports, label: "notas denunciadas por revisar", href: "/admin/notas" },
        { n: pending.eventsToReview, label: "ediciones nuevas de eventos anuales por revisar y publicar", href: "/admin/events" },
        { n: pending.denials, label: "avisos de \"no me dejan entrar\" esta semana", href: "/admin/entry-denials" },
        { n: pending.ownerChanges, label: "cambios de dueños u organizadores en sus fichas esta semana", href: "/admin/cambios" },
      ].filter((q) => q.n > 0)
    : []

  const trafficNote = cityFlagsNote(trafficFlags)

  const seasonLabel =
    system.season === "auto" ? "Automático por fecha" :
    system.season === "none" ? "Apagado" :
    SEASONAL_THEMES.find((t) => t.key === system.season)?.label || system.season || "…"


  // Lo que enseña la gráfica grande: tres cifras con pestaña. Las dos primeras tienen desglose por día; los clics en
  // entradas no (solo el total de cada semana).
  const weekDaily = week?.daily || []
  const prevDaily = prevWeek?.daily || []
  const daysOf = (pick: (d: { sessions: number; views: number }) => number): DayPoint[] =>
    weekDaily.map((d, i) => ({ d: d.d, v: pick(d), prev: prevDaily[i] ? pick(prevDaily[i]) : null }))
  const metrics: { key: MetricKey; label: string; short: string; unit: string; now: number; before: number; days: DayPoint[] | null }[] = [
    { key: "sessions", label: "Visitas", short: "Visitas", unit: "visitas", now: week?.sessions || 0, before: prevWeek?.sessions || 0, days: daysOf((d) => d.sessions) },
    { key: "views", label: "Fichas vistas", short: "Fichas", unit: "fichas vistas", now: week?.page_views || 0, before: prevWeek?.page_views || 0, days: daysOf((d) => d.views) },
    { key: "tickets", label: "Clics en entradas", short: "Entradas", unit: "clics", now: week?.tickets || 0, before: prevWeek?.tickets || 0, days: null },
  ]
  const metric = metrics.find((m) => m.key === metricKey) || metrics[0]
  const queueTotal = queue.reduce((sum, q) => sum + q.n, 0)

  return (
    <AdminShell title="Resumen" subtitle="Lo que pide atención, cómo va la semana y el estado de la web.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 1. Pendiente: lo primero en móvil; a la derecha de la gráfica en ordenador */}
        <Panel aria-labelledby="pending-h" pad="p-0" className="lg:col-start-2 lg:row-start-1">
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
            <SectionTitle id="pending-h" icon={BellRing}>Pendiente</SectionTitle>
            {queueTotal > 0 && <span className="rounded-full bg-warn/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-warn ring-1 ring-inset ring-warn/25">{queueTotal}</span>}
          </div>
          {!pending ? (
            <p className="px-5 pb-5 text-sm text-zinc-500 sm:px-6">Cargando…</p>
          ) : queue.length === 0 ? (
            <div className="flex items-center gap-3 px-5 pb-6 pt-1 sm:px-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-open/10 text-open">
                <CheckCircle2 size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Todo al día</p>
                <p className="text-xs text-zinc-500">No hay nada esperándote.</p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {queue.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="ui-row group flex items-center gap-3 px-5 py-3 transition sm:px-6">
                    <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-lg bg-warn/10 px-1.5 text-sm font-extrabold tabular-nums text-warn ring-1 ring-inset ring-warn/25">{q.n}</span>
                    <span className="flex-1 text-sm leading-snug text-zinc-200 group-hover:text-ink">{q.label}</span>
                    <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* 2. La semana: una gráfica con tres pestañas */}
        <Panel aria-labelledby="traffic-h" pad="p-0" className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-5 sm:px-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <SectionTitle id="traffic-h" icon={Activity}>Últimos 7 días</SectionTitle>
              <AdminCityBadge />
            </div>
            <Link href="/admin/datos" className={BTN_GHOST_SM}>
              Ver datos completos <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          {trafficNote && (
            <p role="status" className="mx-5 mb-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn sm:mx-6">{trafficNote.text}</p>
          )}
          <div role="tablist" aria-label="Qué enseña la gráfica" className="grid grid-cols-3 divide-x divide-white/[0.06] border-y border-white/[0.06]">
            {metrics.map((m) => {
              const on = m.key === metric.key
              return (
                <button
                  key={m.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setMetricKey(m.key)}
                  className={`px-3.5 py-4 text-left transition sm:px-6 ${on ? "bg-linear-to-b from-brand/[0.16] to-transparent shadow-[inset_0_2px_0_0_var(--color-brand-soft)]" : "hover:bg-white/[0.025]"}`}
                >
                  <span className={`block text-xs font-medium ${on ? "text-zinc-200" : "text-zinc-500"}`}>
                    <span className="sm:hidden">{m.short}</span>
                    <span className="hidden sm:inline">{m.label}</span>
                  </span>
                  <span className={`mt-1.5 block text-[26px] font-extrabold leading-none tracking-tight sm:text-4xl ${on ? "text-ink" : "text-zinc-400"}`}>
                    {week ? m.now : trafficFailed ? "—" : "…"}
                  </span>
                  <span className="mt-2 block">{week ? <Delta now={m.now} before={m.before} /> : <span className="text-xs text-zinc-500">{trafficFailed ? (trafficNote ? "Falta el SQL" : "No se pudo cargar") : ""}</span>}</span>
                </button>
              )
            })}
          </div>
          <div className="px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
            {!week ? (
              <p className="py-20 text-center text-sm text-zinc-500">{trafficFailed ? "No hay datos de la semana." : "Cargando…"}</p>
            ) : metric.days ? (
              <WeekChart days={metric.days} unit={metric.unit} />
            ) : (
              <CompareBars now={metric.now} before={metric.before} unit={metric.unit} />
            )}
          </div>
        </Panel>

        {/* 3. Estado de la web: bajo «Pendiente» en ordenador, tras la gráfica en móvil */}
        <Panel aria-labelledby="system-h" className="lg:col-start-2 lg:row-start-2">
          <SectionTitle id="system-h" icon={ShieldCheck} right={<Link href="/admin/herramientas" className={LINK}>Cambiar</Link>}>Estado de la web</SectionTitle>
          <dl className="mt-4 divide-y divide-white/[0.06] text-sm">
            <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <dt className="text-zinc-400">Mantenimiento</dt>
              <dd>
                {system.maintenance === null ? (
                  <StatusPill tone="neutral">…</StatusPill>
                ) : system.maintenance ? (
                  <StatusPill tone="red">Activo: solo tú entras</StatusPill>
                ) : (
                  <StatusPill tone="green">Apagado</StatusPill>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <dt className="text-zinc-400">Club Noctua</dt>
              <dd>
                {system.clubNoctua === null ? (
                  <StatusPill tone="neutral">…</StatusPill>
                ) : system.clubNoctua ? (
                  <StatusPill tone="green">Activo</StatusPill>
                ) : (
                  <StatusPill tone="amber">En pausa</StatusPill>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <dt className="text-zinc-400">Disfraz de Noc</dt>
              <dd>
                <StatusPill tone="violet">{seasonLabel}</StatusPill>
              </dd>
            </div>
          </dl>
        </Panel>

        {/* 4. Contenido publicado: una franja ancha con tres cifras */}
        <Panel aria-labelledby="content-h" className="lg:col-span-2">
          <div className="lg:flex lg:items-center lg:gap-12">
            <div className="flex items-start justify-between gap-3 lg:block lg:w-56 lg:shrink-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:block">
                <SectionTitle id="content-h" icon={Layers}>Contenido publicado</SectionTitle>
                <div className="lg:mt-3"><AdminCityBadge /></div>
              </div>
              <Link href="/admin/calidad" className={`${LINK} shrink-0 lg:mt-3`}>Revisar calidad</Link>
            </div>
            <dl className="mt-5 grid flex-1 grid-cols-3 divide-x divide-white/[0.06] lg:mt-0">
              {[
                { label: "Clubs visibles", value: content?.clubsVisible, note: content ? `${content.clubsHidden} ocultos` : "" },
                { label: "Eventos en 30 días", value: content?.events30, note: "" },
                { label: "Noches de club esta semana", value: content?.nights7, note: "" },
              ].map((c) => (
                <div key={c.label} className="px-3 first:pl-0 last:pr-0 lg:px-8 lg:first:pl-8">
                  <dt className="text-xs leading-snug text-zinc-400">{c.label}</dt>
                  <dd className="mt-2 text-3xl font-extrabold leading-none tracking-tight text-ink lg:text-4xl">{content ? c.value : "…"}</dd>
                  {c.note && <dd className="mt-1.5 text-xs text-zinc-500">{c.note}</dd>}
                </div>
              ))}
            </dl>
          </div>
        </Panel>

        {/* 5. Agenda y usuarios, alineados con las columnas de arriba */}
        <div className="grid grid-cols-1 gap-5 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel aria-labelledby="upcoming-h">
            <SectionTitle id="upcoming-h" icon={CalendarDays}>Esta semana</SectionTitle>
            {upcoming.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No hay eventos ni noches de club en los próximos 7 días.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {upcoming.map((u) => {
                  const when = new Date(`${u.date}T12:00:00`)
                  return (
                    <li key={`${u.kind}-${u.id}`}>
                      <Link href={u.href} className="ui-row group -mx-3 flex items-center gap-4 rounded-xl px-3 py-3 text-sm">
                        <span className="ui-well flex h-12 w-11 shrink-0 flex-col items-center justify-center leading-none">
                          <span className="text-[11px] font-medium capitalize text-zinc-500">{when.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")}</span>
                          <span className="mt-1 text-lg font-extrabold tabular-nums text-ink">{when.getDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-100 group-hover:text-ink">{u.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${u.kind === "Evento" ? "bg-zinc-500" : "bg-brand"}`} />
                            {u.kind}
                          </span>
                        </span>
                        <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>

          <Panel aria-labelledby="users-h">
            <SectionTitle id="users-h" icon={Users} right={<Link href="/admin/users" className={LINK}>Ver todos</Link>}>Usuarios</SectionTitle>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-4xl font-extrabold leading-none tracking-tight text-ink">{users ? users.total : "…"}</p>
              <p className="pb-0.5 text-xs text-zinc-500">registrados en toda la web</p>
            </div>
            <dl className="ui-well mt-4 grid grid-cols-2 divide-x divide-white/[0.06] text-sm">
              <div className="px-4 py-3">
                <dt className="text-xs text-zinc-400">Nuevos esta semana</dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums text-ink">{users ? users.new7 : "…"}</dd>
              </div>
              <div className="px-4 py-3">
                <dt className="text-xs text-zinc-400">Activos esta semana</dt>
                <dd className="mt-1 text-xl font-extrabold tabular-nums text-ink">{users ? users.active7 : "…"}</dd>
              </div>
            </dl>
            <h3 className="mt-5 text-xs font-semibold text-zinc-500">Últimos registros</h3>
            {signups.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Todavía no hay usuarios.</p>
            ) : (
              <ul className="mt-1 divide-y divide-white/[0.06]">
                {signups.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/actividad?user=${s.id}`} className="ui-row group -mx-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm">
                      <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#8f73ff] to-[#5b3fd6] text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                        {initialOf(s.username || s.email)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-zinc-100 group-hover:text-ink">{s.username ? `@${s.username}` : s.email}</span>
                        <span className="block text-xs text-zinc-500">{new Date(s.created_at).toLocaleDateString("es-ES")}</span>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AdminShell>
  )
}
