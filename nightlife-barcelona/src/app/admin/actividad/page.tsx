"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { getSortedCountries } from "../../../lib/countries"
import { PARTY_POLLS } from "../../../lib/partyPolls"

// Actividad por usuario (pedido: panel de analítica "detallado por usuario"). Sustituye a la
// antigua /admin/analytics, que no salía en el menú y repetía —peor, trayendo 5.000 filas sueltas
// al navegador— lo que ya hace /admin/datos. Aquí la pregunta es otra: qué hace cada persona
// concreta. Los números agregados para enseñar o vender siguen en /admin/datos.
//
// Datos: supabase/24_actividad_por_usuario.sql (admin_users_activity y admin_user_activity),
// que solo puede ejecutar el admin. Son datos personales: solo para soporte, moderación y
// entender cómo se usa la web — nunca para compartir ni vender.

const ADMIN_COUNTRIES = getSortedCountries("es")

const EVENT_LABELS: Record<string, string> = {
  session_start: "Entra en la web",
  page_nav: "Va a otra página",
  tiktok_click: "Abre TikTok",
  page_view: "Ve la ficha",
  tickets_click: "Pulsa entradas",
  directions_click: "Pulsa cómo llegar",
  website_click: "Abre la web oficial",
  instagram_click: "Abre Instagram",
  share_click: "Comparte",
  favorite_click: "Favorito",
  ride_click: "Pide Uber/Cabify",
  search: "Busca",
  filter_used: "Usa filtros del plan",
  party_poll_vote: "Vota la encuesta del día",
}
const SOURCE_LABELS: Record<string, string> = {
  search: "Google / buscadores",
  instagram: "Instagram",
  tiktok: "TikTok",
  social: "Otras redes",
  messaging: "WhatsApp / Telegram",
  invite: "Enlace de invitación",
  direct: "Directo",
}
const ITEM_LABELS: Record<string, string> = { club: "Club", event: "Evento", club_event: "Noche de club" }

const isoDay = (d: Date) => d.toLocaleDateString("sv-SE")
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDay(d) }
const sourceLabel = (s: string | null) => (s ? SOURCE_LABELS[s] || s.replace(/^other:/, "") : "—")
const deviceLabel = (d: string | null) => (d === "mobile" ? "Móvil" : d === "desktop" ? "Ordenador" : d || "—")
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" })
const relative = (iso: string | null) => {
  if (!iso) return "—"
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `hace ${Math.max(1, mins)} min`
  const h = Math.round(mins / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? "ayer" : `hace ${d} días`
}

type UserInfo = { id: string; email: string; username: string | null; country: string | null; created_at: string }
type Row = {
  user_id: string
  events: number
  sessions: number
  active_days: number
  page_views: number
  tickets: number
  searches: number
  first_seen: string
  last_seen: string
  top_device: string | null
  top_source: string | null
}
type Detail = {
  summary: { events: number; sessions: number; active_days: number; first_seen: string | null; last_seen: string | null }
  by_type: { type: string; n: number }[]
  top_items: { item_type: string; name: string; n: number }[]
  devices: { label: string; n: number }[]
  sources: { label: string; n: number }[]
  hours: { h: number; n: number }[]
  timeline: { created_at: string; event_type: string; item_type: string | null; item_name: string | null; path: string | null; device: string | null; source: string | null; session_id: string | null }[]
  checkins: { date: string; name: string | null }[]
  attendances: { night: string; item_type: string; name: string | null }[]
  favorites: { item_type: string; name: string | null }[]
  polls: { poll_id: string; choice: number; created_at: string }[]
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-card border border-white/10 bg-surface p-4">
      <p className="font-display text-2xl text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-white/10 bg-surface p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function Bars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  if (rows.length === 0) return <p className="text-sm text-zinc-500">Sin datos en este periodo.</p>
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-xs">
            <span className="truncate text-zinc-300">{r.label}</span>
            <span className="tabular-nums text-zinc-400">{r.n}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-white/5">
            <div className="h-1.5 rounded-full bg-brand" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function AdminActividadPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [from, setFrom] = useState(daysAgo(29))
  const [to, setTo] = useState(isoDay(new Date()))
  const [rows, setRows] = useState<Row[]>([])
  const [users, setUsers] = useState<Record<string, UserInfo>>({})
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<keyof Row>("last_seen")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      // Enlace directo desde /admin/users (botón "Actividad"): /admin/actividad?user=ID
      const fromUrl = new URLSearchParams(window.location.search).get("user")
      if (fromUrl) setSelectedId(fromUrl)
      setCheckingAdmin(false)
    })
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    const [act, list] = await Promise.all([
      supabase.rpc("admin_users_activity", { p_from: from, p_to: to }),
      supabase.rpc("admin_list_users"),
    ])
    if (act.error) {
      setError(`No se pudo cargar la actividad: ${act.error.message}. ¿Has ejecutado supabase/24_actividad_por_usuario.sql?`)
    }
    setRows(((act.data || []) as Row[]).map((r) => ({ ...r, events: Number(r.events), sessions: Number(r.sessions), active_days: Number(r.active_days), page_views: Number(r.page_views), tickets: Number(r.tickets), searches: Number(r.searches) })))
    const map: Record<string, UserInfo> = {}
    for (const u of (list.data || []) as UserInfo[]) map[u.id] = u
    setUsers(map)
    setTotalUsers(Object.keys(map).length)
    setLoading(false)
  }, [from, to])

  useEffect(() => {
    if (!checkingAdmin) load()
  }, [checkingAdmin, load])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    let alive = true
    setDetailLoading(true)
    supabase.rpc("admin_user_activity", { p_user: selectedId, p_from: from, p_to: to }).then(({ data, error: err }) => {
      if (!alive) return
      if (err) setError(`No se pudo cargar la ficha: ${err.message}`)
      setDetail((data as Detail) || null)
      setDetailLoading(false)
    })
    return () => { alive = false }
  }, [selectedId, from, to])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter((r) => {
        if (!q) return true
        const u = users[r.user_id]
        return !!u && (u.email?.toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q))
      })
      .sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        if (typeof va === "number" && typeof vb === "number") return vb - va
        return String(vb || "").localeCompare(String(va || ""))
      })
  }, [rows, users, search, sortKey])

  // Primer día en que esa persona se registró — útil para ver si es nueva o veterana.
  const selectedUser = selectedId ? users[selectedId] : null

  // Agrupa la línea de tiempo por día (hora de Barcelona) para leerla como un diario.
  const timelineByDay = useMemo(() => {
    const groups: { day: string; items: Detail["timeline"] }[] = []
    for (const ev of detail?.timeline || []) {
      const day = fmtDay(ev.created_at)
      const last = groups[groups.length - 1]
      if (last && last.day === day) last.items.push(ev)
      else groups.push({ day, items: [ev] })
    }
    return groups
  }, [detail])

  const pollText = (id: string, choice: number) => {
    const p = PARTY_POLLS.find((x) => x.id === id)
    if (!p) return id
    return choice === 0 ? p.es.a : p.es.b
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night text-ink">
        <p className="text-sm text-zinc-400">Cargando…</p>
      </main>
    )
  }

  const presets = [
    { label: "Hoy", f: isoDay(new Date()) },
    { label: "7 días", f: daysAgo(6) },
    { label: "30 días", f: daysAgo(29) },
    { label: "90 días", f: daysAgo(89) },
  ]

  const flag = (country: string | null) => (country ? ADMIN_COUNTRIES.find((c) => c.es === country)?.flag || "🌍" : "")

  const th = (key: keyof Row, label: string) => (
    <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-semibold">
      <button type="button" onClick={() => setSortKey(key)} className={sortKey === key ? "text-brand-soft" : "text-zinc-400 hover:text-ink"}>
        {label}
      </button>
    </th>
  )

  return (
    <AdminShell title="Actividad por usuario" subtitle="Qué hace cada persona con cuenta: de dónde llega, qué fichas mira, qué busca y qué pulsa. Solo para uso interno.">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => { setFrom(p.f); setTo(isoDay(new Date())) }}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${from === p.f && to === isoDay(new Date()) ? "border-white bg-white text-night" : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"}`}
          >
            {p.label}
          </button>
        ))}
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ colorScheme: "dark" }} aria-label="Desde" className="rounded-ctl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300" />
        <span className="text-xs text-zinc-500">a</span>
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ colorScheme: "dark" }} aria-label="Hasta" className="rounded-ctl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-300" />
      </div>

      {error && <p className="mb-6 rounded-card border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

      {!selectedId && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Usuarios con actividad" value={loading ? "…" : rows.length} sub={`de ${totalUsers} registrados`} />
            <Stat label="Visitas (sesiones)" value={loading ? "…" : rows.reduce((s, r) => s + r.sessions, 0)} />
            <Stat label="Fichas vistas" value={loading ? "…" : rows.reduce((s, r) => s + r.page_views, 0)} />
            <Stat label="Clics en entradas" value={loading ? "…" : rows.reduce((s, r) => s + r.tickets, 0)} />
          </div>

          <div className="relative mb-4">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email o usuario"
              aria-label="Buscar usuario"
              className="w-full rounded-ctl border border-white/10 bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-zinc-500"
            />
          </div>

          <div className="overflow-x-auto rounded-card border border-white/10 bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-400">Usuario</th>
                  <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-400">Llega desde</th>
                  {th("sessions", "Visitas")}
                  {th("active_days", "Días")}
                  {th("page_views", "Fichas")}
                  {th("tickets", "Entradas")}
                  {th("searches", "Búsquedas")}
                  {th("last_seen", "Última vez")}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">Cargando…</td></tr>
                )}
                {!loading && visible.map((r) => {
                  const u = users[r.user_id]
                  return (
                    <tr key={r.user_id} onClick={() => setSelectedId(r.user_id)} className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.04]">
                      <td className="max-w-[260px] px-4 py-3">
                        <p className="truncate font-semibold text-ink">{flag(u?.country || null)} {u?.username ? `@${u.username}` : u?.email || "Usuario borrado"}</p>
                        {u?.username && <p className="truncate text-xs text-zinc-500">{u.email}</p>}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-400">{sourceLabel(r.top_source)} · {deviceLabel(r.top_device)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.sessions}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.active_days}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.page_views}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.tickets}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.searches}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-zinc-400">{relative(r.last_seen)}</td>
                    </tr>
                  )
                })}
                {!loading && visible.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">Nadie con sesión ha hecho nada en este periodo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">Solo cuenta lo que hacen con la sesión iniciada. Las visitas anónimas están (agregadas) en Datos de negocio.</p>
        </>
      )}

      {selectedId && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => { setSelectedId(null); window.history.replaceState(null, "", "/admin/actividad") }}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-ink"
              >
                <ArrowLeft size={14} aria-hidden="true" /> Todos los usuarios
              </button>
              <h2 className="mt-2 font-display text-2xl text-ink">
                {flag(selectedUser?.country || null)} {selectedUser?.username ? `@${selectedUser.username}` : selectedUser?.email || "Usuario"}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {selectedUser?.email}
                {selectedUser?.created_at && ` · registrado el ${new Date(selectedUser.created_at).toLocaleDateString("es-ES")}`}
              </p>
            </div>
            <Link href="/admin/users" className="rounded-ctl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 hover:bg-white/10">
              Gestionar en Usuarios
            </Link>
          </div>

          {detailLoading && <p className="text-sm text-zinc-500">Cargando su actividad…</p>}

          {detail && !detailLoading && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Visitas" value={detail.summary.sessions} />
                <Stat label="Días distintos" value={detail.summary.active_days} />
                <Stat label="Acciones" value={detail.summary.events} />
                <Stat label="Última vez" value={relative(detail.summary.last_seen)} sub={detail.summary.first_seen ? `Primera: ${fmtDateTime(detail.summary.first_seen)}` : undefined} />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Panel title="De dónde llega">
                  <Bars rows={detail.sources.map((s) => ({ label: sourceLabel(s.label), n: s.n }))} />
                </Panel>
                <Panel title="Dispositivo">
                  <Bars rows={detail.devices.map((s) => ({ label: deviceLabel(s.label), n: s.n }))} />
                </Panel>
                <Panel title="Qué hace">
                  <Bars rows={detail.by_type.filter((t) => t.type !== "session_start").map((t) => ({ label: EVENT_LABELS[t.type] || t.type, n: t.n }))} />
                </Panel>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Panel title="Fichas que más mira">
                  <Bars rows={detail.top_items.map((t) => ({ label: `${t.name} (${ITEM_LABELS[t.item_type] || t.item_type})`, n: t.n }))} />
                </Panel>
                <Panel title="A qué hora entra (Barcelona)">
                  <div className="flex h-28 items-end gap-0.5">
                    {Array.from({ length: 24 }, (_, h) => {
                      const n = detail.hours.find((x) => x.h === h)?.n || 0
                      const max = Math.max(1, ...detail.hours.map((x) => x.n))
                      return (
                        <div key={h} className="flex h-full flex-1 flex-col items-center justify-end" title={`${h}:00 — ${n}`}>
                          <div className="w-full rounded-t bg-brand/80" style={{ height: `${Math.max(2, (n / max) * 85)}%` }} />
                          <span className="mt-1 h-3 text-[10px] leading-3 text-zinc-500">{h % 6 === 0 ? `${h}h` : ""}</span>
                        </div>
                      )
                    })}
                  </div>
                </Panel>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Panel title={`Check-ins (${detail.checkins.length})`}>
                  {detail.checkins.length === 0 ? <p className="text-sm text-zinc-500">Ninguno.</p> : (
                    <ul className="space-y-1.5 text-sm">{detail.checkins.map((c, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-zinc-300">{c.name || "Club borrado"}</span><span className="shrink-0 text-xs text-zinc-500">{c.date}</span></li>)}</ul>
                  )}
                </Panel>
                <Panel title={`"Asistiré" (${detail.attendances.length})`}>
                  {detail.attendances.length === 0 ? <p className="text-sm text-zinc-500">Ninguno.</p> : (
                    <ul className="space-y-1.5 text-sm">{detail.attendances.map((a, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-zinc-300">{a.name || "—"}</span><span className="shrink-0 text-xs text-zinc-500">{a.night}</span></li>)}</ul>
                  )}
                </Panel>
                <Panel title={`Favoritos (${detail.favorites.length})`}>
                  {detail.favorites.length === 0 ? <p className="text-sm text-zinc-500">Ninguno.</p> : (
                    <ul className="space-y-1.5 text-sm">{detail.favorites.map((f, i) => <li key={i} className="truncate text-zinc-300">{f.name || "—"} <span className="text-xs text-zinc-500">· {ITEM_LABELS[f.item_type] || f.item_type}</span></li>)}</ul>
                  )}
                </Panel>
                <Panel title={`Encuestas (${detail.polls.length})`}>
                  {detail.polls.length === 0 ? <p className="text-sm text-zinc-500">Ninguna.</p> : (
                    <ul className="space-y-1.5 text-sm">{detail.polls.map((p, i) => <li key={i} className="text-zinc-300">{pollText(p.poll_id, p.choice)}</li>)}</ul>
                  )}
                </Panel>
              </div>

              <Panel title="Todo lo que ha hecho, paso a paso">
                {timelineByDay.length === 0 ? (
                  <p className="text-sm text-zinc-500">Sin actividad en este periodo.</p>
                ) : (
                  <div className="space-y-6">
                    {timelineByDay.map((g) => (
                      <div key={g.day}>
                        <p className="mb-2 text-xs font-semibold text-zinc-500 first-letter:uppercase">{g.day}</p>
                        <ol className="space-y-1 border-l border-white/10 pl-4">
                          {g.items.map((ev, i) => (
                            <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                              <span className="w-12 shrink-0 tabular-nums text-xs text-zinc-500">
                                {new Date(ev.created_at).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className={ev.event_type === "session_start" ? "text-zinc-500" : "text-zinc-300"}>
                                {EVENT_LABELS[ev.event_type] || ev.event_type}
                              </span>
                              {ev.event_type === "session_start" ? (
                                <span className="text-xs text-zinc-500">desde {sourceLabel(ev.source)} · {deviceLabel(ev.device)}</span>
                              ) : ev.event_type === "party_poll_vote" ? (
                                <span className="font-semibold text-ink">{ev.item_name}</span>
                              ) : (
                                ev.item_name && <span className="font-semibold text-ink">{ev.event_type === "search" ? `«${ev.item_name}»` : ev.item_name}</span>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </>
          )}
        </div>
      )}
    </AdminShell>
  )
}
