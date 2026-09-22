"use client"

import { useEffect, useState } from "react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"

type User = {
  id: string
  email: string
  username: string | null
  created_at: string
  last_sign_in_at: string | null
}

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Clubs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/club-events", label: "Club nights" },
  { href: "/admin/essentials", label: "Essentials" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/messages", label: "Messages" },
]

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
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight">Users</h1>
            <p className="mt-6 max-w-2xl text-lg text-zinc-400">
              {users.length} usuarios registrados en Noctua.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {adminLinks.map((link) => (
                <a key={link.href} href={link.href}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    link.href === "/admin/users" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
                  }`}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
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
      </main>
      <BottomNav />
    </>
  )
}