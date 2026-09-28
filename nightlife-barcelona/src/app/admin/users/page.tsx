"use client"

import { useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"

type User = {
  id: string
  email: string
  username: string | null
  created_at: string
  last_sign_in_at: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.email !== "info@noctuaapp.com") {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("users_view").select("*").order("created_at", { ascending: false })
      if (error) { console.log("USERS ERROR:", error); return }
      if (data) setUsers(data)
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q)
  })

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading admin...</p>
      </main>
    )
  }

  return (
    <AdminShell title="Users" subtitle={`${users.length} usuarios registrados en Noctua.`}>
      <>
        <section className="mx-auto max-w-7xl">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o username..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 outline-none mb-6"
          />

          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">Cargando usuarios...</p>
          ) : (
            <div className="grid gap-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 font-black text-sm">
                        {user.email?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{user.email}</p>
                        {user.username && <p className="text-sm text-zinc-400">@{user.username}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      📅 Registrado: {new Date(user.created_at).toLocaleDateString("es-ES")}
                    </span>
                    {user.last_sign_in_at && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                        🕒 Último acceso: {new Date(user.last_sign_in_at).toLocaleDateString("es-ES")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-20">No se encontraron usuarios.</p>
              )}
            </div>
          )}
        </section>
      </>
    </AdminShell>
  )
}