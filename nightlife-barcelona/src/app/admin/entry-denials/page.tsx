"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import AdminShell from "../../../components/admin/AdminShell"

import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { createSlug } from "../../../lib/slug"

// "No te dejan entrar" (rehecho el 25/10/2026: "ver los usuarios en cuestión, qué les ha
// ocurrido"). Ahora se ve quién fue en cada caso (con enlace a su actividad), cuántas veces le ha
// pasado, a quién le ha pasado en cada local, y quién lo usa más — por si es un caso real que
// merece hablar con el local, o alguien que lo usa de broma.

type EntryDenial = {
  id: number
  user_id: string | null
  venue_type: "club" | "event"
  venue_id: number
  venue_name: string
  reason: "dress" | "full" | "group" | "other"
  created_at: string
}

type DenialUser = { email: string; username: string | null }

const REASON_LABELS: Record<EntryDenial["reason"], string> = {
  dress: "👗 Vestimenta",
  full: "🚪 Aforo lleno",
  group: "👥 Somos muchos",
  other: "🤷 Otro motivo",
}

const REASON_ORDER: EntryDenial["reason"][] = ["dress", "full", "group", "other"]

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const venueHref = (d: { type?: string; venue_type?: string; name?: string; venue_name?: string }) => {
  const type = d.venue_type || d.type
  const name = d.venue_name || d.name || ""
  return type === "club" ? `/clubs/${createSlug(name)}` : `/event/${createSlug(name)}`
}

export default function AdminEntryDenialsPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [denials, setDenials] = useState<EntryDenial[]>([])
  const [usersById, setUsersById] = useState<Record<string, DenialUser>>({})
  const [loading, setLoading] = useState(true)
  const [reasonFilter, setReasonFilter] = useState<EntryDenial["reason"] | "all">("all")
  const [q, setQ] = useState("")

  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error || data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    if (checkingAdmin) return
    const fetchDenials = async () => {
      const { data, error } = await supabase
        .from("entry_denials")
        .select("id, user_id, venue_type, venue_id, venue_name, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(1000)
      if (error) {
        logError("ENTRY DENIALS FETCH ERROR:", error)
        setLoading(false)
        return
      }
      const rows = (data || []) as EntryDenial[]
      setDenials(rows)
      setLoading(false)

      const userIds = new Set(rows.map((d) => d.user_id).filter(Boolean) as string[])
      if (userIds.size === 0) return
      // admin_list_users(): función solo para admin con email y usuario de cada cuenta.
      const { data: allUsers, error: usersError } = await supabase.rpc("admin_list_users")
      if (usersError) {
        logError("ENTRY DENIALS USERS FETCH ERROR:", usersError)
        return
      }
      const map: Record<string, DenialUser> = {}
      for (const u of (allUsers || []) as { id: string; email: string; username: string | null }[]) {
        if (userIds.has(u.id)) map[u.id] = { email: u.email, username: u.username }
      }
      setUsersById(map)
    }
    fetchDenials()
  }, [checkingAdmin])

  // Cuántas veces ha usado cada persona "no me dejan entrar" (en total).
  const countByUser = useMemo(() => {
    const m = new Map<string, number>()
    for (const d of denials) if (d.user_id) m.set(d.user_id, (m.get(d.user_id) || 0) + 1)
    return m
  }, [denials])

  const userLabel = (id: string | null) => {
    if (!id) return "Anónimo"
    const u = usersById[id]
    if (!u) return "Usuario eliminado"
    return u.username ? `@${u.username}` : u.email
  }

  if (checkingAdmin) {
    return (
      <AdminShell title="No dejan entrar">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  // Por local: total, por motivo, y a quién le ha pasado.
  type VenueAgg = { key: string; name: string; type: "club" | "event"; total: number; byReason: Record<string, number>; users: Map<string, number>; last: string }
  const byVenue = new Map<string, VenueAgg>()
  for (const d of denials) {
    const key = `${d.venue_type}-${d.venue_id}`
    if (!byVenue.has(key)) byVenue.set(key, { key, name: d.venue_name, type: d.venue_type, total: 0, byReason: {}, users: new Map(), last: d.created_at })
    const v = byVenue.get(key)!
    v.total += 1
    v.byReason[d.reason] = (v.byReason[d.reason] || 0) + 1
    if (d.user_id) v.users.set(d.user_id, (v.users.get(d.user_id) || 0) + 1)
  }
  const topVenues = Array.from(byVenue.values()).sort((a, b) => b.total - a.total).slice(0, 10)

  const topUsers = Array.from(countByUser.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const reasonCounts = REASON_ORDER.reduce((acc, r) => {
    acc[r] = denials.filter((d) => d.reason === r).length
    return acc
  }, {} as Record<string, number>)

  const needle = q.trim().toLowerCase()
  const filteredDenials = denials.filter(
    (d) =>
      (reasonFilter === "all" || d.reason === reasonFilter) &&
      (!needle ||
        d.venue_name.toLowerCase().includes(needle) ||
        userLabel(d.user_id).toLowerCase().includes(needle) ||
        (!!d.user_id && !!usersById[d.user_id] && usersById[d.user_id].email.toLowerCase().includes(needle)))
  )

  const userLink = (id: string | null) =>
    id && usersById[id] ? (
      <Link href={`/admin/actividad?user=${id}`} className="font-semibold text-purple-200 underline-offset-2 hover:underline">
        {userLabel(id)}
      </Link>
    ) : (
      <span className="text-zinc-400">{userLabel(id)}</span>
    )

  return (
    <AdminShell title="No dejan entrar" subtitle="A quién no le han dejado entrar, dónde, cuándo y por qué. Toca un usuario para ver toda su actividad.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={denials.length} active={reasonFilter === "all"} onClick={() => setReasonFilter("all")} />
        {REASON_ORDER.map((r) => (
          <StatCard key={r} label={REASON_LABELS[r]} value={reasonCounts[r]} active={reasonFilter === r} onClick={() => setReasonFilter(r)} />
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Cargando registros…</p>
      ) : denials.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-3xl">🚫</p>
          <p className="mt-3 text-zinc-400">Todavía no se ha usado «No te dejan entrar» en ningún local.</p>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-black">Últimos casos{reasonFilter !== "all" && ` · ${REASON_LABELS[reasonFilter]}`}</h2>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar local, usuario o email"
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white outline-none focus:border-purple-400/60 sm:max-w-sm"
            />
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredDenials.slice(0, 100).map((d) => {
                const times = d.user_id ? countByUser.get(d.user_id) || 0 : 0
                const u = d.user_id ? usersById[d.user_id] : null
                return (
                  <li key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-bold text-white">{REASON_LABELS[d.reason]}</p>
                      <p className="text-xs text-zinc-500">{fmt(d.created_at)}</p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">
                      en{" "}
                      <Link href={venueHref(d)} target="_blank" className="font-semibold text-white underline-offset-2 hover:underline">
                        {d.venue_name}
                      </Link>{" "}
                      <span className="text-xs text-zinc-500">({d.venue_type === "club" ? "club" : "evento"})</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-sm">
                      {userLink(d.user_id)}
                      {u && u.username && <span className="text-xs text-zinc-500">{u.email}</span>}
                      {times >= 2 && (
                        <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-bold text-amber-300">{times} veces en total</span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            {filteredDenials.length > 100 && <p className="mt-3 text-center text-xs text-zinc-400">Mostrando los 100 más recientes de {filteredDenials.length}.</p>}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-black">Locales con más casos</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {topVenues.map((v) => (
                <div key={v.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={venueHref(v)} target="_blank" className="font-bold text-white underline-offset-2 hover:underline">
                        {v.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {v.type === "club" ? "Club" : "Evento"} · último caso {fmt(v.last)}
                      </p>
                    </div>
                    <p className="text-2xl font-black tabular-nums">{v.total}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {REASON_ORDER.filter((r) => v.byReason[r]).map((r) => (
                      <span key={r} className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-zinc-300">
                        {REASON_LABELS[r]} · {v.byReason[r]}
                      </span>
                    ))}
                  </div>
                  {v.users.size > 0 && (
                    <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                      Le pasó a:{" "}
                      {Array.from(v.users.entries()).slice(0, 8).map(([id, n], i) => (
                        <span key={id}>
                          {i > 0 && ", "}
                          {userLink(id)}
                          {n > 1 ? ` (×${n})` : ""}
                        </span>
                      ))}
                      {v.users.size > 8 && ` y ${v.users.size - 8} más`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {topUsers.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-black">Quién lo usa más</h2>
              <p className="mt-1 text-sm text-zinc-400">Personas con 2 o más casos: puede ser un problema real con un local… o alguien que lo usa de broma.</p>
              <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
                {topUsers.map(([id, n]) => {
                  const places = Array.from(new Set(denials.filter((d) => d.user_id === id).map((d) => d.venue_name)))
                  return (
                    <li key={id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span>
                        {userLink(id)}
                        <span className="ml-2 text-xs text-zinc-500">
                          {places.slice(0, 3).join(", ")}
                          {places.length > 3 ? "…" : ""}
                        </span>
                      </span>
                      <span className="font-bold tabular-nums">{n}</span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </AdminShell>
  )
}

function StatCard({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${active ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"}`}
    >
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
    </button>
  )
}
