"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity, ArrowUpRight, BellRing, CalendarDays, CheckCircle2, Eye, FileText, Layers, MousePointerClick, ShieldCheck,
  TrendingDown, TrendingUp, UserPlus, Users, type LucideIcon,
} from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
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

function delta(now: number, before: number) {
  if (!before) return now ? "Sin datos de la semana anterior" : "—"
  const p = Math.round(((now - before) / before) * 100)
  if (p === 0) return "Igual que la semana anterior"
  return `${p > 0 ? "+" : ""}${p}% frente a la semana anterior`
}

function deltaTone(now: number, before: number): "up" | "down" | "flat" {
  if (!before) return "flat"
  const p = Math.round(((now - before) / before) * 100)
  return p > 0 ? "up" : p < 0 ? "down" : "flat"
}

// Colores del resumen (06/11/2026). Antes todo era gris con un toque de violeta y costaba distinguir un bloque
// de otro. Ahora cada bloque lleva su acento (violeta de marca, rosa y cian neón, coral) y los estados siguen
// siendo verde (bien), ámbar (pendiente) y rojo (aviso), sin mezclarse con los acentos. Los colores de
// identidad nunca van solos: cada bloque tiene su título y su icono.
type Accent = "violet" | "pink" | "cyan" | "coral"
const ACCENT: Record<Accent, { chip: string; text: string; glow: string; line: string; bar: string; barLast: string; tile: string; avatar: string }> = {
  violet: {
    chip: "bg-brand/15 text-brand-soft",
    text: "text-brand-soft",
    glow: "bg-brand/30",
    line: "via-brand",
    bar: "bg-linear-to-t from-brand/25 to-brand/80",
    barLast: "bg-brand-soft shadow-[0_0_14px_rgba(160,139,255,0.8)]",
    tile: "border-brand/25 bg-brand/10",
    avatar: "from-brand to-[#ff4fa3]",
  },
  pink: {
    chip: "bg-[#ff4fa3]/15 text-[#ff86bf]",
    text: "text-[#ff86bf]",
    glow: "bg-[#ff4fa3]/25",
    line: "via-[#ff4fa3]",
    bar: "bg-linear-to-t from-[#ff4fa3]/25 to-[#ff4fa3]/80",
    barLast: "bg-[#ff86bf] shadow-[0_0_14px_rgba(255,79,163,0.8)]",
    tile: "border-[#ff4fa3]/25 bg-[#ff4fa3]/10",
    avatar: "from-[#ff4fa3] to-orange-400",
  },
  cyan: {
    chip: "bg-cyan-400/15 text-cyan-300",
    text: "text-cyan-300",
    glow: "bg-cyan-400/20",
    line: "via-cyan-400",
    bar: "bg-linear-to-t from-cyan-400/25 to-cyan-400/80",
    barLast: "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]",
    tile: "border-cyan-400/25 bg-cyan-400/10",
    avatar: "from-cyan-400 to-brand",
  },
  coral: {
    chip: "bg-orange-400/15 text-orange-300",
    text: "text-orange-300",
    glow: "bg-orange-400/20",
    line: "via-orange-400",
    bar: "bg-linear-to-t from-orange-400/25 to-orange-400/80",
    barLast: "bg-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.8)]",
    tile: "border-orange-400/25 bg-orange-400/10",
    avatar: "from-orange-400 to-[#ff4fa3]",
  },
}
const AVATAR_ORDER: Accent[] = ["violet", "pink", "cyan", "coral"]

const CARD = "relative overflow-hidden rounded-card border border-white/10 bg-surface"

function Sparkline({ values, accent }: { values: number[]; accent: Accent }) {
  const max = Math.max(1, ...values)
  const a = ACCENT[accent]
  return (
    <div className="mt-4 flex h-10 items-end gap-1" aria-hidden="true">
      {values.map((v, i) => (
        <div key={i} className={`flex-1 rounded-t-sm ${i === values.length - 1 ? a.barLast : a.bar}`} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

function SectionTitle({ id, icon: Icon, accent, children }: { id: string; icon: LucideIcon; accent: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-sm font-bold text-ink">
      <span className={`grid h-7 w-7 place-items-center rounded-lg ${accent}`}>
        <Icon size={15} aria-hidden="true" />
      </span>
      {children}
    </h2>
  )
}

type Tone = "up" | "down" | "flat"

function Kpi({
  accent, icon: Icon, label, value, note, tone = "flat", series, href,
}: { accent: Accent; icon: LucideIcon; label: string; value: React.ReactNode; note: string; tone?: Tone; series?: number[]; href?: string }) {
  const a = ACCENT[accent]
  const body = (
    <>
      <span aria-hidden="true" className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl ${a.glow}`} />
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${a.line} to-transparent`} />
      <div className="relative flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${a.chip}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold text-zinc-300">{label}</p>
      </div>
      <p className="relative mt-3 font-display text-3xl text-ink tabular-nums">{value}</p>
      <p className={`relative mt-1 flex items-start gap-1.5 text-xs ${tone === "up" ? "text-open" : tone === "down" ? "text-rose-300" : "text-zinc-500"}`}>
        {tone === "up" && <TrendingUp size={14} className="mt-px shrink-0" aria-hidden="true" />}
        {tone === "down" && <TrendingDown size={14} className="mt-px shrink-0" aria-hidden="true" />}
        <span>{note}</span>
      </p>
      {series && series.length > 0 && <Sparkline values={series} accent={accent} />}
    </>
  )
  const cls = `${CARD} block p-5`
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-white/25`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

const PILL = {
  green: "bg-open/12 text-open",
  amber: "bg-warn/12 text-warn",
  red: "bg-red-500/15 text-red-300",
  violet: "bg-brand/15 text-brand-soft",
  neutral: "bg-white/[0.06] text-zinc-300",
}
const PILL_DOT = { green: "bg-open", amber: "bg-warn", red: "bg-red-400", violet: "bg-brand-soft", neutral: "bg-zinc-500" }

function StatusPill({ tone, children }: { tone: keyof typeof PILL; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${PILL[tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PILL_DOT[tone]}`} />
      {children}
    </span>
  )
}

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
  const [prevWeek, setPrevWeek] = useState<Overview | null>(null)
  const [users, setUsers] = useState<{ total: number; new7: number; active7: number } | null>(null)
  const [signups, setSignups] = useState<Signup[]>([])
  const [system, setSystem] = useState<System>({ maintenance: null, clubNoctua: null, season: null })
  const [content, setContent] = useState<{ clubsVisible: number; clubsHidden: number; events30: number; nights7: number } | null>(null)
  const [upcoming, setUpcoming] = useState<Upcoming[]>([])

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
        ov, ovPrev, list, activity,
        maint, club, season,
        clubsVisibleRes, clubsHiddenRes, events30, nights7, nextEvents, nextNights, ownerChanges, ownerMessages,
      ] = await Promise.all([
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new").or("is_spam.is.null,is_spam.eq.false"),
        supabase.from("club_checkin_reports").select("id", { count: "exact", head: true }).is("reviewed_at", null),
        supabase.from("entry_denials").select("id", { count: "exact", head: true }).gte("created_at", weekAgoIso),
        // Ediciones nuevas de eventos anuales: el cron las pasa al año siguiente y las deja ocultas
        // hasta que las revises (cartel, precio y artistas suelen cambiar de una edición a otra).
        supabase.from("events").select("id", { count: "exact", head: true }).eq("recurring", true).eq("hidden", true).gte("date", today),
        supabase.rpc("admin_data_overview", { p_from: daysAgo(6), p_to: today }),
        supabase.rpc("admin_data_overview", { p_from: daysAgo(13), p_to: daysAgo(7) }),
        supabase.rpc("admin_list_users"),
        // Cuentas con actividad en la web estos 7 días (misma fuente que Admin › Visitas y Actividad).
        supabase.rpc("admin_users_activity", { p_from: daysAgo(6), p_to: today }),
        supabase.from("app_settings").select("maintenance_mode").eq("id", true).maybeSingle(),
        supabase.from("club_noctua_settings").select("enabled").eq("id", 1).maybeSingle(),
        supabase.from("noc_seasonal_settings").select("mode").eq("id", 1).maybeSingle(),
        // Solo se cuentan (head): antes se descargaba el campo de TODOS los clubs, y Supabase corta en 1.000 filas.
        supabase.from("clubs").select("id", { count: "exact", head: true }).eq("hidden", false),
        supabase.from("clubs").select("id", { count: "exact", head: true }).eq("hidden", true),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("hidden", false).gte("date", today).lte("date", daysAhead(30)),
        supabase.from("club_events").select("id", { count: "exact", head: true }).gte("date", today).lte("date", daysAhead(7)),
        supabase.from("events").select("id, title, date").eq("hidden", false).gte("date", today).lte("date", daysAhead(7)).order("date").limit(6),
        supabase.from("club_events").select("id, title, date").gte("date", today).lte("date", daysAhead(7)).order("date").limit(6),
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
      setTrafficFailed(!!ov.error)
      setWeek((ov.data as Overview) || null)
      setPrevWeek((ovPrev.data as Overview) || null)

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

      setContent({
        clubsVisible: clubsVisibleRes.count || 0,
        clubsHidden: clubsHiddenRes.count || 0,
        events30: events30.count || 0,
        nights7: nights7.count || 0,
      })

      const ups: Upcoming[] = [
        ...((nextEvents.data || []) as { id: number; title: string; date: string }[]).map((e) => ({ ...e, kind: "Evento" as const, href: `/admin/events?edit=${e.id}` })),
        ...((nextNights.data || []) as { id: number; title: string; date: string }[]).map((e) => ({ ...e, kind: "Noche de club" as const, href: `/admin/club-events?edit=${e.id}` })),
      ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)
      setUpcoming(ups)
    }
    load()
  }, [checkingAdmin])

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

  const seasonLabel =
    system.season === "auto" ? "Automático por fecha" :
    system.season === "none" ? "Apagado" :
    SEASONAL_THEMES.find((t) => t.key === system.season)?.label || system.season || "…"

  const traffic: { label: string; icon: LucideIcon; accent: Accent; now: number; before: number; series: number[] }[] = [
    { label: "Visitas", icon: Eye, accent: "violet", now: week?.sessions || 0, before: prevWeek?.sessions || 0, series: (week?.daily || []).map((d) => d.sessions) },
    { label: "Fichas vistas", icon: FileText, accent: "pink", now: week?.page_views || 0, before: prevWeek?.page_views || 0, series: (week?.daily || []).map((d) => d.views) },
    { label: "Clics en entradas", icon: MousePointerClick, accent: "cyan", now: week?.tickets || 0, before: prevWeek?.tickets || 0, series: [] as number[] },
  ]

  return (
    <AdminShell title="Resumen" subtitle="Lo que pide atención, cómo va la semana y el estado de la web.">
      <div className="grid grid-cols-1 gap-6">
        {/* 1. Pendientes */}
        <section
          aria-labelledby="pending-h"
          className={`${CARD} p-6 ${queue.length > 0 ? "border-warn/30 bg-linear-to-br from-warn/[0.09] via-surface to-surface" : pending ? "border-open/25 bg-linear-to-br from-open/[0.08] via-surface to-surface" : ""}`}
        >
          <SectionTitle id="pending-h" icon={BellRing} accent="bg-warn/15 text-warn">Pendiente</SectionTitle>
          {!pending ? (
            <p className="mt-3 text-sm text-zinc-500">Cargando…</p>
          ) : queue.length === 0 ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-open">
              <CheckCircle2 size={18} aria-hidden="true" /> Nada pendiente. Todo al día.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-white/[0.06]">
              {queue.map((q) => (
                <li key={q.href}>
                  <Link href={q.href} className="group flex items-center gap-4 py-3">
                    <span className="grid h-10 min-w-10 place-items-center rounded-xl bg-warn/15 px-2 font-display text-xl text-warn tabular-nums shadow-[inset_0_0_0_1px_rgba(251,191,36,0.25)]">{q.n}</span>
                    <span className="flex-1 text-sm text-zinc-200 group-hover:text-ink">{q.label}</span>
                    <ArrowUpRight size={18} className="text-warn/60 transition group-hover:text-warn" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2. Tráfico de la semana */}
        <section aria-labelledby="traffic-h">
          <div className="mb-3 flex items-center justify-between gap-3">
            <SectionTitle id="traffic-h" icon={Activity} accent="bg-brand/15 text-brand-soft">Últimos 7 días</SectionTitle>
            <Link href="/admin/datos" className="text-xs font-semibold text-brand-soft hover:text-ink">Ver datos completos</Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {traffic.map((t) => (
              <Kpi
                key={t.label}
                accent={t.accent}
                icon={t.icon}
                label={t.label}
                value={week ? t.now : trafficFailed ? "—" : "…"}
                note={week ? delta(t.now, t.before) : trafficFailed ? "No se pudo cargar" : ""}
                tone={week ? deltaTone(t.now, t.before) : "flat"}
                series={t.series}
              />
            ))}
            <Kpi
              href="/admin/users"
              accent="coral"
              icon={Users}
              label="Usuarios registrados"
              value={users ? users.total : "…"}
              note={users ? `${users.new7} nuevos y ${users.active7} activos esta semana` : ""}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 3. Estado */}
          <section aria-labelledby="system-h" className={`${CARD} p-6`}>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle id="system-h" icon={ShieldCheck} accent="bg-open/15 text-open">Estado de la web</SectionTitle>
              <Link href="/admin/herramientas" className="text-xs font-semibold text-brand-soft hover:text-ink">Cambiar</Link>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Modo mantenimiento</dt>
                <dd>
                  {system.maintenance === null ? (
                    <StatusPill tone="neutral">…</StatusPill>
                  ) : system.maintenance ? (
                    <StatusPill tone="red">Activo: solo tú puedes entrar</StatusPill>
                  ) : (
                    <StatusPill tone="green">Apagado</StatusPill>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Club Noctua (XP y misiones)</dt>
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
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Disfraz de Noc</dt>
                <dd>
                  <StatusPill tone="violet">{seasonLabel}</StatusPill>
                </dd>
              </div>
            </dl>
          </section>

          {/* Contenido */}
          <section aria-labelledby="content-h" className={`${CARD} p-6`}>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle id="content-h" icon={Layers} accent="bg-[#ff4fa3]/15 text-[#ff86bf]">Contenido publicado</SectionTitle>
              <Link href="/admin/calidad" className="text-right text-xs font-semibold text-brand-soft hover:text-ink">Revisar calidad de fichas</Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className={`rounded-2xl border p-4 ${ACCENT.violet.tile}`}>
                <dt className="text-xs text-zinc-300">Clubs visibles</dt>
                <dd className={`mt-1 font-display text-2xl tabular-nums ${ACCENT.violet.text}`}>{content ? content.clubsVisible : "…"}</dd>
                <dd className="text-xs text-zinc-500">{content ? `${content.clubsHidden} ocultos` : ""}</dd>
              </div>
              <div className={`rounded-2xl border p-4 ${ACCENT.pink.tile}`}>
                <dt className="text-xs text-zinc-300">Eventos próximos 30 días</dt>
                <dd className={`mt-1 font-display text-2xl tabular-nums ${ACCENT.pink.text}`}>{content ? content.events30 : "…"}</dd>
              </div>
              <div className={`rounded-2xl border p-4 ${ACCENT.cyan.tile}`}>
                <dt className="text-xs text-zinc-300">Noches de club esta semana</dt>
                <dd className={`mt-1 font-display text-2xl tabular-nums ${ACCENT.cyan.text}`}>{content ? content.nights7 : "…"}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 4. Esta semana */}
          <section aria-labelledby="upcoming-h" className={`${CARD} p-6`}>
            <SectionTitle id="upcoming-h" icon={CalendarDays} accent="bg-cyan-400/15 text-cyan-300">Esta semana</SectionTitle>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No hay eventos ni noches de club en los próximos 7 días.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {upcoming.map((u) => {
                  const when = new Date(`${u.date}T12:00:00`)
                  const a = ACCENT[u.kind === "Evento" ? "pink" : "violet"]
                  return (
                    <li key={`${u.kind}-${u.id}`}>
                      <Link href={u.href} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${a.chip}`}>
                          <span className="text-[10px] font-semibold capitalize">{when.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")}</span>
                          <span className="mt-0.5 font-display text-base tabular-nums">{when.getDate()}</span>
                        </span>
                        <span className="flex-1 truncate text-zinc-100">{u.title}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.chip}`}>{u.kind}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="signups-h" className={`${CARD} p-6`}>
            <div className="flex items-center justify-between gap-3">
              <SectionTitle id="signups-h" icon={UserPlus} accent="bg-orange-400/15 text-orange-300">Últimos registros</SectionTitle>
              <Link href="/admin/users" className="text-xs font-semibold text-brand-soft hover:text-ink">Todos</Link>
            </div>
            {signups.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Todavía no hay usuarios.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {signups.map((s, i) => (
                  <li key={s.id}>
                    <Link href={`/admin/actividad?user=${s.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                      <span
                        aria-hidden="true"
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-linear-to-br text-xs font-bold text-white ${ACCENT[AVATAR_ORDER[i % AVATAR_ORDER.length]].avatar}`}
                      >
                        {initialOf(s.username || s.email)}
                      </span>
                      <span className="flex-1 truncate text-zinc-100">{s.username ? `@${s.username}` : s.email}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{new Date(s.created_at).toLocaleDateString("es-ES")}</span>
                      <span className="shrink-0 text-xs font-semibold text-brand-soft">Ver actividad</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  )
}
