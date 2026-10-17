"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { Star } from "lucide-react"

type Feedback = { id: number; user_id: string | null; rating: number; comment: string | null; created_at: string }
type Person = { email: string; username: string | null }

export default function AdminOpinionPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Feedback[]>([])
  const [peopleById, setPeopleById] = useState<Record<string, Person>>({})

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
    const load = async () => {
      const { data, error } = await supabase
        .from("site_feedback")
        .select("id, user_id, rating, comment, created_at")
        .order("created_at", { ascending: false })
        .limit(500)
      if (error) { logError("OPINION FETCH ERROR:", error); setLoading(false); return }
      const list = (data || []) as Feedback[]
      setRows(list)
      setLoading(false)

      const userIds = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[]
      if (userIds.length === 0) return
      const { data: allUsers } = await supabase.rpc("admin_list_users")
      const map: Record<string, Person> = {}
      for (const u of (allUsers || []) as any[]) {
        if (userIds.includes(u.id)) map[u.id] = { email: u.email, username: u.username }
      }
      setPeopleById(map)
    }
    load()
  }, [checkingAdmin])

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Cargando...</p>
      </main>
    )
  }

  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0
  const distribution = [5, 4, 3, 2, 1].map((n) => ({ n, count: rows.filter((r) => r.rating === n).length }))

  return (
    <AdminShell title="Opiniones" subtitle="Valoraciones enviadas desde /opinion (enlazada en el footer).">
      {loading ? (
        <p className="mt-10 text-center text-zinc-400">Cargando...</p>
      ) : rows.length === 0 ? (
        <section className="mx-auto mt-10 max-w-4xl px-4">
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-3xl">⭐</p>
            <p className="mt-3 text-zinc-400">Todavía no hay ninguna valoración.</p>
          </div>
        </section>
      ) : (
        <section className="mx-auto mt-6 max-w-4xl px-4 pb-10">
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="rounded-card border border-white/10 bg-white/[0.03] p-5 sm:col-span-2">
              <p className="text-xs text-zinc-400">Media</p>
              <p className="mt-2 flex items-center gap-2 text-4xl font-black text-white">
                {avg.toFixed(1)} <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
              </p>
              <p className="mt-1 text-xs text-zinc-400">{rows.length} valoraciones</p>
            </div>
            <div className="rounded-card border border-white/10 bg-white/[0.03] p-5 sm:col-span-4">
              <div className="flex h-full flex-col justify-center gap-1.5">
                {distribution.map((d) => (
                  <div key={d.n} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-3 shrink-0">{d.n}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: rows.length ? `${(d.count / rows.length) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h2 className="mt-8 text-xl font-black">Comentarios recientes</h2>
          <div className="mt-4 grid gap-3">
            {rows.filter((r) => r.comment).slice(0, 100).map((r) => {
              const person = r.user_id ? peopleById[r.user_id] : null
              return (
                <div key={r.id} className="rounded-card border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1 text-sm font-bold text-amber-400">
                      {r.rating} <Star className="h-4 w-4 fill-amber-400" />
                    </span>
                    <span className="text-xs text-zinc-400">{new Date(r.created_at).toLocaleString("es-ES")}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">{r.comment}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {person ? (person.username ? `@${person.username}` : person.email) : r.user_id ? "Usuario eliminado" : "Anónimo"}
                  </p>
                </div>
              )
            })}
            {rows.filter((r) => r.comment).length === 0 && (
              <p className="text-sm text-zinc-400">Nadie ha escrito comentario todavía, solo estrellas.</p>
            )}
          </div>
        </section>
      )}
    </AdminShell>
  )
}
