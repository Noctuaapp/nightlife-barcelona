"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

type Club = {
  id: number
  name: string
  music: string | null
  neighborhood: string | null
  image: string | null
  live_status: string | null
  queue: string | null
  price: string | null
  hours: string | null
  trending: boolean | null
  sold_out: boolean | null
  hidden: boolean | null
}

type EditClub = {
  name: string
  music: string
  neighborhood: string
  price: string
  hours: string
  image: string
  live_status: string
}

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Clubs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/club-events", label: "Club nights" },
  { href: "/admin/essentials", label: "Essentials" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/messages", label: "Messages" },
]

export default function AdminPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [editClub, setEditClub] = useState<EditClub>({
    name: "", music: "", neighborhood: "", price: "", hours: "", image: "", live_status: "",
  })

  const [newClub, setNewClub] = useState({
    name: "", music: "", neighborhood: "", price: "", hours: "", image: "",
  })

  const queueLevels = ["No queue", "Short queue", "Medium queue", "Long queue", "Massive queue"]

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

  useEffect(() => { fetchClubs() }, [])

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("*").order("id")
    if (data) setClubs(data)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `clubs/${fileName}`
    const { error } = await supabase.storage.from("club-images").upload(filePath, file)
    setUploading(false)
    if (error) { console.log("UPLOAD ERROR:", error); return null }
    const { data } = supabase.storage.from("club-images").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleNewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setNewClub((prev) => ({ ...prev, image: publicUrl }))
  }

  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setEditClub((prev) => ({ ...prev, image: publicUrl }))
  }

  const addClub = async () => {
    if (!newClub.name || !newClub.music || !newClub.neighborhood) return
    const { data, error } = await supabase.from("clubs").insert({
      ...newClub,
      price: newClub.price || "€20",
      hours: newClub.hours || "00:00 - 06:00",
      image: newClub.image || "/clubs/razz.jpg",
      live_status: "Getting busy",
      queue: "No queue",
      trending: false,
      sold_out: false,
      hidden: false,
    }).select().single()
    if (error) { console.log("ADD ERROR:", error); return }
    if (data) setClubs((prev) => [data, ...prev])
    setNewClub({ name: "", music: "", neighborhood: "", price: "", hours: "", image: "" })
  }

  const startEditing = (club: Club) => {
    setEditingId(club.id)
    setEditClub({
      name: club.name || "", music: club.music || "", neighborhood: club.neighborhood || "",
      price: club.price || "", hours: club.hours || "", image: club.image || "", live_status: club.live_status || "",
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditClub({ name: "", music: "", neighborhood: "", price: "", hours: "", image: "", live_status: "" })
  }

  const saveEditing = async (id: number) => {
    if (!editClub.name.trim()) return
    const { data, error } = await supabase.from("clubs").update(editClub).eq("id", id).select().single()
    if (error) { console.log("EDIT ERROR:", error); return }
    if (data) setClubs((prev) => prev.map((c) => c.id === id ? data : c))
    cancelEditing()
  }

  const toggleTrending = async (club: Club) => {
    const newValue = !club.trending
    const { error } = await supabase.from("clubs").update({ trending: newValue }).eq("id", club.id)
    if (error) return
    setClubs((prev) => prev.map((c) => c.id === club.id ? { ...c, trending: newValue } : c))
  }

  const toggleSoldOut = async (club: Club) => {
    const newValue = !club.sold_out
    const { error } = await supabase.from("clubs").update({ sold_out: newValue }).eq("id", club.id)
    if (error) return
    setClubs((prev) => prev.map((c) => c.id === club.id ? { ...c, sold_out: newValue } : c))
  }

  const toggleHidden = async (club: Club) => {
    const newValue = !club.hidden
    const { error } = await supabase.from("clubs").update({ hidden: newValue }).eq("id", club.id)
    if (error) return
    setClubs((prev) => prev.map((c) => c.id === club.id ? { ...c, hidden: newValue } : c))
  }

  const updateQueue = async (club: Club, level: string) => {
    const { error } = await supabase.from("clubs").update({ queue: level }).eq("id", club.id)
    if (error) return
    setClubs((prev) => prev.map((c) => c.id === club.id ? { ...c, queue: level } : c))
  }

  const deleteClub = async (id: number) => {
    const { error } = await supabase.from("clubs").delete().eq("id", id)
    if (error) return
    setClubs((prev) => prev.filter((c) => c.id !== id))
  }

  const filteredClubs = clubs.filter((club) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return club.name?.toLowerCase().includes(q) || club.music?.toLowerCase().includes(q) || club.neighborhood?.toLowerCase().includes(q)
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
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">Clubs</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">Create, edit and manage clubs across Barcelona.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {adminLinks.map((link) => (
                <a key={link.href} href={link.href}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    link.href === "/admin" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
                  }`}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 mb-6">Add new club</p>
            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { key: "name", placeholder: "Club name" },
                { key: "music", placeholder: "Music type" },
                { key: "neighborhood", placeholder: "Neighborhood" },
                { key: "price", placeholder: "Price (e.g. €20)" },
                { key: "hours", placeholder: "Hours (e.g. 00:00 - 06:00)" },
                { key: "image", placeholder: "Image URL (optional)" },
              ].map(({ key, placeholder }) => (
                <input key={key} value={(newClub as any)[key]}
                  onChange={(e) => setNewClub({ ...newClub, [key]: e.target.value })}
                  placeholder={placeholder} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              ))}
              <div className="lg:col-span-3">
                <input type="file" accept="image/*" onChange={handleNewImageUpload}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none" />
                {newClub.image && <img src={newClub.image} alt="Preview" className="mt-4 h-40 w-full rounded-2xl object-cover" />}
              </div>
              <button onClick={addClub} disabled={uploading}
                className="rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:scale-[1.02] disabled:opacity-50 lg:col-span-3">
                {uploading ? "Uploading..." : "Add club"}
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clubs..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 outline-none" />
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="grid gap-6">
            {filteredClubs.map((club) => (
              <div key={club.id} className={`rounded-[32px] border bg-white/[0.03] p-6 transition ${club.hidden ? "border-zinc-700 opacity-50" : "border-white/10"}`}>
                {editingId === club.id ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {[
                      { key: "name", placeholder: "Club name" },
                      { key: "music", placeholder: "Music" },
                      { key: "neighborhood", placeholder: "Neighborhood" },
                      { key: "price", placeholder: "Price" },
                      { key: "hours", placeholder: "Hours" },
                      { key: "image", placeholder: "Image URL" },
                    ].map(({ key, placeholder }) => (
                      <input key={key} value={(editClub as any)[key]}
                        onChange={(e) => setEditClub({ ...editClub, [key]: e.target.value })}
                        placeholder={placeholder} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    ))}
                    <input value={editClub.live_status} onChange={(e) => setEditClub({ ...editClub, live_status: e.target.value })}
                      placeholder="Live status" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3" />
                    <div className="lg:col-span-3">
                      <input type="file" accept="image/*" onChange={handleEditImageUpload}
                        className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none" />
                      {editClub.image && <img src={editClub.image} alt="Preview" className="mt-4 h-52 w-full rounded-2xl object-cover" />}
                    </div>
                    <button onClick={() => saveEditing(club.id)} disabled={uploading} className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black disabled:opacity-50">Save changes</button>
                    <button onClick={cancelEditing} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold">Cancel</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      {club.image && <img src={club.image} alt={club.name} className="mb-6 h-48 w-full rounded-3xl object-cover lg:w-[420px]" />}
                      <p className="text-sm uppercase tracking-wide text-zinc-500">{club.music}</p>
                      <h2 className="mt-2 text-3xl font-black text-white">{club.name}</h2>
                      {club.hidden && <span className="mt-2 inline-block rounded-full bg-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300">Hidden from public</span>}
                      <div className="mt-5 flex flex-wrap gap-3">
                        {[`📍 ${club.neighborhood}`, `🔥 ${club.live_status}`, `⏳ ${club.queue}`, `💸 ${club.price}`, `🕒 ${club.hours}`].map((tag) => (
                          <div key={tag} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">{tag}</div>
                        ))}
                      </div>
                      <div className="mt-6">
                        <p className="mb-3 text-sm uppercase tracking-wide text-zinc-500">Queue control</p>
                        <div className="flex flex-wrap gap-2">
                          {queueLevels.map((level) => (
                            <button key={level} onClick={() => updateQueue(club, level)}
                              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${club.queue === level ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => startEditing(club)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white hover:text-black transition">✏️ Edit</button>
                      <button onClick={() => toggleTrending(club)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${club.trending ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white"}`}>🔥 Trending</button>
                      <button onClick={() => toggleSoldOut(club)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${club.sold_out ? "bg-red-500 text-white" : "border border-white/10 bg-white/5 text-white"}`}>🚫 Sold out</button>
                      <button onClick={() => toggleHidden(club)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${club.hidden ? "bg-zinc-600 text-white" : "border border-white/10 bg-white/5 text-white"}`}>
                        {club.hidden ? "👁️ Hidden" : "👁️ Visible"}
                      </button>
                      <button onClick={() => deleteClub(club.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}