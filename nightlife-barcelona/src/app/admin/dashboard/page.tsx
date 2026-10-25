"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, CheckCircle2 } from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { SEASONAL_THEMES } from "../../../lib/nocSeasonal"

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

const isoDay = (d: Date) => d.toLocaleDateString("sv-SE")
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d) }
const daysAhead = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoDay(d) }

type Overview = { sessions: number; page_views: number; tickets: number; daily: { d: string; sessions: number; views: number }[] }
type Pending = { messages: number; reports: number; denials: number; eventsToReview: number; ownerChanges: number }
type System = { maintenance: boolean | null; clubNoctua: boolean | null; season: string | null }
type Upcoming = { id: number; title: string; date: string; kind: "Evento" | "Noche de club"; href: string }
type Signup = { id: string; email: string; username: string | null; created_at: string; last_sign_in_at: string | null }

function delta(now: number, before: number) {
  if (!before) return now ? "Sin datos de la semana anterior" : "—"
  const p = Math.round(((now - before) / before) * 100)
  if (p === 0) return "Igual que la semana anterior"
  return `${p > 0 ? "+" : ""}${p}% frente a la semana anterior`
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  return (
    <div className="mt-4 flex h-10 items-end gap-1" aria-hidden="true">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm bg-brand/70" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [pending, setPending] = useState<Pending | null>(null)
  const [week, setWeek] = useState<Overview | null>(null)
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
    const today = isoDay(new Date())
    const weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString()

    const load = async () => {
      const [
        msgs, reports, denials, review,
        ov, ovPrev, list,
        maint, club, season,
        clubsRows, events30, nights7, nextEvents, nextNights, ownerChanges,
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
        supabase.from("app_settings").select("maintenance_mode").eq("id", true).maybeSingle(),
        supabase.from("club_noctua_settings").select("enabled").eq("id", 1).maybeSingle(),
        supabase.from("noc_seasonal_settings").select("mode").eq("id", 1).maybeSingle(),
        supabase.from("clubs").select("hidden"),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("hidden", false).gte("date", today).lte("date", daysAhead(30)),
        supabase.from("club_events").select("id", { count: "exact", head: true }).gte("date", today).lte("date", daysAhead(7)),
        supabase.from("events").select("id, title, date").eq("hidden", false).gte("date", today).lte("date", daysAhead(7)).order("date").limit(6),
        supabase.from("club_events").select("id, title, date").gte("date", today).lte("date", daysAhead(7)).order("date").limit(6),
        // Cambios hechos por dueños y organizadores en su ficha esta semana (supabase/34).
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true }).gte("at", weekAgoIso).neq("user_email", ADMIN_EMAIL),
      ])

      setPending({
        messages: msgs.count || 0,
        reports: reports.count || 0,
        denials: denials.count || 0,
        eventsToReview: review.count || 0,
        ownerChanges: ownerChanges.error ? 0 : ownerChanges.count || 0,
      })
      setWeek((ov.data as Overview) || null)
      setPrevWeek((ovPrev.data as Overview) || null)

      const all = (list.data || []) as Signup[]
      const weekAgo = Date.now() - 7 * 86400000
      setUsers({
        total: all.length,
        new7: all.filter((u) => new Date(u.created_at).getTime() >= weekAgo).length,
        active7: all.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).getTime() >= weekAgo).length,
      })
      setSignups([...all].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5))

      setSystem({
        maintenance: !!maint.data?.maintenance_mode,
        clubNoctua: club.data?.enabled === true,
        season: (season.data?.mode as string) || "auto",
      })

      const clubs = (clubsRows.data || []) as { hidden: boolean | null }[]
      setContent({
        clubsVisible: clubs.filter((c) => !c.hidden).length,
        clubsHidden: clubs.filter((c) => c.hidden).length,
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

  const traffic = [
    { label: "Visitas", now: week?.sessions || 0, before: prevWeek?.sessions || 0, series: (week?.daily || []).map((d) => d.sessions) },
    { label: "Fichas vistas", now: week?.page_views || 0, before: prevWeek?.page_views || 0, series: (week?.daily || []).map((d) => d.views) },
    { label: "Clics en entradas", now: week?.tickets || 0, before: prevWeek?.tickets || 0, series: [] as number[] },
  ]

  return (
    <AdminShell title="Resumen" subtitle="Lo que pide atención, cómo va la semana y el estado de la web.">
      <div className="grid grid-cols-1 gap-6">
        {/* 1. Pendientes */}
        <section aria-labelledby="pending-h" className="rounded-card border border-white/10 bg-surface p-6">
          <h2 id="pending-h" className="text-sm font-bold text-ink">Pendiente</h2>
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
                    <span className="min-w-[2.5rem] font-display text-2xl text-warn tabular-nums">{q.n}</span>
                    <span className="flex-1 text-sm text-zinc-300 group-hover:text-ink">{q.label}</span>
                    <ArrowUpRight size={18} className="text-zinc-500 group-hover:text-ink" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 2. Tráfico de la semana */}
        <section aria-labelledby="traffic-h">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="traffic-h" className="text-sm font-bold text-ink">Últimos 7 días</h2>
            <Link href="/admin/datos" className="text-xs font-semibold text-zinc-400 hover:text-ink">Ver datos completos</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {traffic.map((t) => (
              <div key={t.label} className="rounded-card border border-white/10 bg-surface p-5">
                <p className="text-xs text-zinc-400">{t.label}</p>
                <p className="mt-1 font-display text-3xl text-ink tabular-nums">{week ? t.now : "…"}</p>
                <p className="mt-1 text-xs text-zinc-500">{week ? delta(t.now, t.before) : ""}</p>
                {t.series.length > 0 && <Sparkline values={t.series} />}
              </div>
            ))}
            <Link href="/admin/users" className="rounded-card border border-white/10 bg-surface p-5 transition hover:border-white/20">
              <p className="text-xs text-zinc-400">Usuarios registrados</p>
              <p className="mt-1 font-display text-3xl text-ink tabular-nums">{users ? users.total : "…"}</p>
              <p className="mt-1 text-xs text-zinc-500">{users ? `${users.new7} nuevos y ${users.active7} activos esta semana` : ""}</p>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 3. Estado */}
          <section aria-labelledby="system-h" className="rounded-card border border-white/10 bg-surface p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="system-h" className="text-sm font-bold text-ink">Estado de la web</h2>
              <Link href="/admin/herramientas" className="text-xs font-semibold text-zinc-400 hover:text-ink">Cambiar</Link>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Modo mantenimiento</dt>
                <dd className={system.maintenance ? "font-semibold text-red-300" : "text-zinc-300"}>
                  {system.maintenance === null ? "…" : system.maintenance ? "Activo: solo tú puedes entrar" : "Apagado"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Club Noctua (XP y misiones)</dt>
                <dd className={system.clubNoctua ? "text-open" : "text-zinc-300"}>{system.clubNoctua === null ? "…" : system.clubNoctua ? "Activo" : "En pausa"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-zinc-400">Disfraz de Noc</dt>
                <dd className="text-zinc-300">{seasonLabel}</dd>
              </div>
            </dl>
          </section>

          {/* Contenido */}
          <section aria-labelledby="content-h" className="rounded-card border border-white/10 bg-surface p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="content-h" className="text-sm font-bold text-ink">Contenido publicado</h2>
              <Link href="/admin/calidad" className="text-xs font-semibold text-zinc-400 hover:text-ink">Revisar calidad de fichas</Link>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><dt className="text-zinc-400">Clubs visibles</dt><dd className="font-display text-2xl text-ink tabular-nums">{content ? content.clubsVisible : "…"}</dd><dd className="text-xs text-zinc-500">{content ? `${content.clubsHidden} ocultos` : ""}</dd></div>
              <div><dt className="text-zinc-400">Eventos próximos 30 días</dt><dd className="font-display text-2xl text-ink tabular-nums">{content ? content.events30 : "…"}</dd></div>
              <div><dt className="text-zinc-400">Noches de club esta semana</dt><dd className="font-display text-2xl text-ink tabular-nums">{content ? content.nights7 : "…"}</dd></div>
            </dl>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 4. Esta semana */}
          <section aria-labelledby="upcoming-h" className="rounded-card border border-white/10 bg-surface p-6">
            <h2 id="upcoming-h" className="text-sm font-bold text-ink">Esta semana</h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No hay eventos ni noches de club en los próximos 7 días.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {upcoming.map((u) => (
                  <li key={`${u.kind}-${u.id}`}>
                    <Link href={u.href} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-16 shrink-0 text-xs capitalize text-zinc-500">
                        {new Date(`${u.date}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })}
                      </span>
                      <span className="flex-1 truncate text-zinc-200">{u.title}</span>
                      <span className="shrink-0 text-xs text-zinc-500">{u.kind}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="signups-h" className="rounded-card border border-white/10 bg-surface p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="signups-h" className="text-sm font-bold text-ink">Últimos registros</h2>
              <Link href="/admin/users" className="text-xs font-semibold text-zinc-400 hover:text-ink">Todos</Link>
            </div>
            {signups.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Todavía no hay usuarios.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/[0.06]">
                {signups.map((s) => (
                  <li key={s.id}>
                    <Link href={`/admin/actividad?user=${s.id}`} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="flex-1 truncate text-zinc-200">{s.username ? `@${s.username}` : s.email}</span>
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
