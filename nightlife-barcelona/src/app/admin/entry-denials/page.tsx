"use client"

import { useEffect, useState } from "react"

import AdminShell from "../../../components/admin/AdminShell"

import { supabase } from "../../../lib/supabase"

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

export default function AdminEntryDenialsPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [denials, setDenials] = useState<EntryDenial[]>([])
  const [usersById, setUsersById] = useState<Record<string, DenialUser>>({})
  const [loading, setLoading] = useState(true)
  const [reasonFilter, setReasonFilter] = useState<EntryDenial["reason"] | "all">("all")

  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error || data.session?.user.email !== "info@noctuaapp.com") {
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
        .limit(500)

      if (error) {
        console.log("ENTRY DENIALS FETCH ERROR:", error)
        setLoading(false)
        return
      }

      const rows = (data || []) as EntryDenial[]
      setDenials(rows)
      setLoading(false)

      // Quién fue cada denuncia: se resuelve aparte contra users_view (la misma vista que usa
      // /admin/users) en vez de guardar el email duplicado en entry_denials.
      const userIds = Array.from(new Set(rows.map((d) => d.user_id).filter(Boolean))) as string[]
      if (userIds.length === 0) return

      // admin_list_users() es una función solo para admin (antes era la vista users_view, que
      // Supabase marcaba como exposición de auth.users).
      const { data: allUsers, error: usersError } = await supabase.rpc("admin_list_users")

      if (usersError) {
        console.log("ENTRY DENIALS USERS FETCH ERROR:", usersError)
        return
      }

      const map: Record<string, DenialUser> = {}
      for (const u of (allUsers || []) as any[]) {
        if (!userIds.includes(u.id)) continue
        map[u.id] = { email: u.email, username: u.username }
      }
      setUsersById(map)
    }

    fetchDenials()
  }, [checkingAdmin])

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Cargando...</p>
      </main>
    )
  }

  // Recuento por local: cuántas veces se ha usado "no me dejan entrar" en cada sitio, y con
  // qué motivo — así se ve de un vistazo qué locales tienen más incidencias y por qué.
  const byVenue = new Map<string, { name: string; type: "club" | "event"; total: number; byReason: Record<string, number> }>()
  for (const d of denials) {
    const key = `${d.venue_type}-${d.venue_id}`
    if (!byVenue.has(key)) {
      byVenue.set(key, { name: d.venue_name, type: d.venue_type, total: 0, byReason: {} })
    }
    const entry = byVenue.get(key)!
    entry.total += 1
    entry.byReason[d.reason] = (entry.byReason[d.reason] || 0) + 1
  }
  const topVenues = Array.from(byVenue.values()).sort((a, b) => b.total - a.total).slice(0, 10)

  const reasonCounts = REASON_ORDER.reduce((acc, r) => {
    acc[r] = denials.filter((d) => d.reason === r).length
    return acc
  }, {} as Record<string, number>)

  const filteredDenials = reasonFilter === "all" ? denials : denials.filter((d) => d.reason === reasonFilter)

  return (
    <AdminShell
      title="No dejan entrar"
      subtitle="Registros de la función 'No te dejan entrar' — qué locales tienen más incidencias y por qué motivo."
    >
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total" value={denials.length} active={reasonFilter === "all"} onClick={() => setReasonFilter("all")} />
          {REASON_ORDER.map((r) => (
            <StatCard
              key={r}
              label={REASON_LABELS[r]}
              value={reasonCounts[r]}
              active={reasonFilter === r}
              onClick={() => setReasonFilter(r)}
            />
          ))}
        </div>
      </section>

      {loading ? (
        <p className="mt-10 text-center text-zinc-500">Cargando registros...</p>
      ) : denials.length === 0 ? (
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-3xl">🚫</p>
            <p className="mt-3 text-zinc-400">Todavía no se ha usado la función "No te dejan entrar" en ningún local.</p>
          </div>
        </section>
      ) : (
        <>
          <section className="mx-auto mt-10 max-w-7xl px-4">
            <h2 className="text-xl font-black">Locales con más incidencias</h2>
            <div className="mt-4 grid gap-3">
              {topVenues.map((v) => (
                <div key={v.name} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase text-zinc-400">
                        {v.type === "club" ? "Club" : "Evento"}
                      </span>
                      <p className="font-bold text-white">{v.name}</p>
                    </div>
                    <p className="text-2xl font-black">{v.total}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REASON_ORDER.filter((r) => v.byReason[r]).map((r) => (
                      <span key={r} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-zinc-300">
                        {REASON_LABELS[r]} · {v.byReason[r]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-10 max-w-7xl px-4 pb-10">
            <h2 className="text-xl font-black">Registros recientes {reasonFilter !== "all" && `— ${REASON_LABELS[reasonFilter]}`}</h2>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3">Local</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Motivo</th>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDenials.slice(0, 100).map((d) => {
                    const user = d.user_id ? usersById[d.user_id] : null
                    return (
                      <tr key={d.id} className="border-b border-white/5 last:border-0">
                        <td className="px-5 py-3 font-semibold text-white">{d.venue_name}</td>
                        <td className="px-5 py-3 text-zinc-400">{d.venue_type === "club" ? "Club" : "Evento"}</td>
                        <td className="px-5 py-3 text-zinc-300">{REASON_LABELS[d.reason]}</td>
                        <td className="px-5 py-3 text-zinc-400">
                          {!d.user_id ? (
                            <span className="text-zinc-600">Anónimo</span>
                          ) : user ? (
                            user.username ? `@${user.username}` : user.email
                          ) : (
                            <span className="text-zinc-600">Usuario eliminado</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-zinc-500">{new Date(d.created_at).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {filteredDenials.length > 100 && (
              <p className="mt-3 text-center text-xs text-zinc-600">Mostrando los 100 más recientes de {filteredDenials.length}.</p>
            )}
          </section>
        </>
      )}
    </AdminShell>
  )
}

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-[24px] border p-5 text-left transition hover:scale-[1.02] ${
        active ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.03] text-white"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.2em] opacity-70">{label}</p>
      <h2 className="mt-2 text-4xl font-black">{value}</h2>
    </button>
  )
}
