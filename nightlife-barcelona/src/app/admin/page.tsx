"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

type Club = {
  id: number
  name: string
  neighborhood: string
  music: string
  hidden: boolean
  trending: boolean
  sold_out: boolean
  lgtbi_friendly: boolean
  verified?: boolean
  image?: string
  rating?: number
}

const adminLinks = [
  { href: "/admin", label: "Clubs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/club-events", label: "Club nights" },
  { href: "/admin/essentials", label: "Essentials" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/analytics", label: "Analytics" },
]

export default function AdminPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

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
    const fetchClubs = async () => {
      const { data } = await supabase.from("clubs").select("*").order("name")
      if (data) setClubs(data)
      setLoading(false)
    }
    fetchClubs()
  }, [])

  const toggleField = async (club: Club, field: keyof Club) => {
    const newValue = !club[field]
    const { error } = await supabase.from("clubs").update({ [field]: newValue }).eq("id", club.id)
    if (error) return
    setClubs((prev) => prev.map((c) => c.id === club.id ? { ...c, [field]: newValue } : c))
  }

  const deleteClub = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este club?")) return
    await supabase.from("clubs").delete().eq("id", id)
    setClubs((prev) => prev.filter((c) => c.id !== id))
  }

  const showAll = async () => {
    await supabase.from("clubs").update({ hidden: false }).neq("id", 0)
    setClubs((prev) => prev.map((c) => ({ ...c, hidden: false })))
  }

  const hideAll = async () => {
    await supabase.from("clubs").update({ hidden: true }).neq("id", 0)
    setClubs((prev) => prev.map((c) => ({ ...c, hidden: true })))
  }

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = !search.trim() ||
      club.name?.toLowerCase().includes(search.toLowerCase()) ||
      club.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
      club.music?.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === "all" ||
      (filter === "visible" && !club.hidden) ||
      (filter === "hidden" && club.hidden) ||
      (filter === "verified" && club.verified) ||
      (filter === "trending" && club.trending)

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: clubs.length,
    visible: clubs.filter(c => !c.hidden).length,
    verified: clubs.filter(c => c.verified).length,
    trending: clubs.filter(c => c.trending).length,
  }

  if (checkingAdmin) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Verificando acceso...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black pb-40 text-white">
      <section className="px-4 pt-10">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Noctua Admin</p>
              <h1 className="mt-2 text-5xl font-black tracking-tight">Clubs</h1>
            </div>
            <a href="/" className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white hover:text-black transition">
              ← Web
            </a>
          </div>

          {/* Nav */}
          <div className="flex flex-wrap gap-2 mb-8">
            {adminLinks.map((link) => (
              <a key={link.href} href={link.href}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  link.href === "/admin" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
                }`}>
                {link.label}
              </a>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
            {[
              { label: "Total clubs", value: stats.total, color: "text-white" },
              { label: "Visibles", value: stats.visible, color: "text-emerald-400" },
              { label: "Verificados", value: stats.verified, color: "text-purple-400" },
              { label: "Trending", value: stats.trending, color: "text-orange-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5 text-center">
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-3 mb-6 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar clubs..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 outline-none focus:border-purple-500/50 transition"
            />
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "Todos" },
                { value: "visible", label: "Visibles" },
                { value: "hidden", label: "Ocultos" },
                { value: "verified", label: "Verificados" },
                { value: "trending", label: "Trending" },
              ].map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    filter === f.value ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-3 mb-6">
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">
              ✓ Mostrar todos
            </button>
            <button onClick={hideAll} className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500 hover:text-white transition">
              ✕ Ocultar todos
            </button>
            <p className="ml-auto text-xs text-zinc-500 self-center">{filteredClubs.length} clubs</p>
          </div>

          {/* Clubs list */}
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">Cargando clubs...</p>
          ) : (
            <div className="grid gap-4">
              {filteredClubs.map((club) => (
                <div key={club.id}
                  className={`rounded-[24px] border p-5 transition ${club.hidden ? "border-white/5 bg-white/[0.01] opacity-50" : "border-white/10 bg-white/[0.03]"}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      {club.image && (
                        <img src={club.image} alt={club.name} className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-white">{club.name}</h3>
                          {club.verified && <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-300">N Verified</span>}
                          {club.trending && <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-xs font-bold text-orange-300">🔥 Trending</span>}
                          {club.hidden && <span className="rounded-full bg-zinc-500/20 border border-zinc-500/30 px-2 py-0.5 text-xs font-bold text-zinc-400">Oculto</span>}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {club.neighborhood} · {club.music} {club.rating ? `· ⭐ ${club.rating}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a href={`/admin/clubs/${club.id}/edit`}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white hover:text-black transition">
                        ✏️ Editar
                      </a>
                      <button onClick={() => toggleField(club, "trending")}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.trending ? "bg-orange-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                        🔥 Trending
                      </button>
                      <button onClick={() => toggleField(club, "sold_out")}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.sold_out ? "bg-red-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                        🚫 Sold out
                      </button>
                      <button onClick={() => toggleField(club, "hidden")}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${!club.hidden ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                        👁️ {club.hidden ? "Oculto" : "Visible"}
                      </button>
                      <button onClick={() => toggleField(club, "lgtbi_friendly")}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.lgtbi_friendly ? "bg-pink-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                        🏳️‍🌈 LGTBI+
                      </button>
                      <button onClick={() => toggleField(club, "verified")}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.verified ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                        ✓ Verified
                      </button>
                      <button onClick={() => deleteClub(club.id)}
                        className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition">
                        🗑️ Borrar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredClubs.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-20">No se encontraron clubs.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}