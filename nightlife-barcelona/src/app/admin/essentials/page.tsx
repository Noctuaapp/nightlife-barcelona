"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import Link from "next/link"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"

type Essential = {
  id: number
  name: string
  category: string
  address: string | null
  neighborhood: string | null
  description: string | null
  image: string | null
  open_hours: string | null
  maps_link: string | null
  latitude: number | null
  longitude: number | null
  hidden: boolean | null
}

const emptyForm = {
  name: "",
  category: "",
  address: "",
  neighborhood: "",
  description: "",
  image: "",
  open_hours: "",
  maps_link: "",
  latitude: "",
  longitude: "",
}

const categories = ["Pharmacy", "ATM", "Food", "Transport", "Taxi", "Supermarket", "Hotel", "Casino", "Other"]

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Clubs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/club-events", label: "Club nights" },
  { href: "/admin/essentials", label: "Essentials" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/messages", label: "Messages" },
]

export default function AdminEssentialsPage() {
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [newEssential, setNewEssential] = useState(emptyForm)
  const [editEssential, setEditEssential] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [filterCategory, setFilterCategory] = useState("All")

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

  useEffect(() => { fetchEssentials() }, [])

  const fetchEssentials = async () => {
    const { data } = await supabase.from("essentials").select("*").order("category").order("name")
    if (data) setEssentials(data)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `essentials/${fileName}`
    const { error } = await supabase.storage.from("essential-images").upload(filePath, file)
    setUploading(false)
    if (error) { console.log("UPLOAD ERROR:", error); return null }
    const { data } = supabase.storage.from("essential-images").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleNewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setNewEssential((prev) => ({ ...prev, image: publicUrl }))
  }

  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setEditEssential((prev) => ({ ...prev, image: publicUrl }))
  }

  const addEssential = async () => {
    if (!newEssential.name || !newEssential.category) return
    const { data, error } = await supabase.from("essentials").insert({
      ...newEssential,
      latitude: newEssential.latitude ? parseFloat(newEssential.latitude) : null,
      longitude: newEssential.longitude ? parseFloat(newEssential.longitude) : null,
    }).select().single()
    if (error) { console.log("ADD ERROR:", error); return }
    if (data) setEssentials((prev) => [data, ...prev])
    setNewEssential(emptyForm)
  }

  const startEditing = (item: Essential) => {
    setEditingId(item.id)
    setEditEssential({
      name: item.name || "", category: item.category || "", address: item.address || "",
      neighborhood: item.neighborhood || "", description: item.description || "",
      image: item.image || "", open_hours: item.open_hours || "", maps_link: item.maps_link || "",
      latitude: item.latitude?.toString() || "", longitude: item.longitude?.toString() || "",
    })
  }

  const cancelEditing = () => { setEditingId(null); setEditEssential(emptyForm) }

  const saveEditing = async (id: number) => {
    if (!editEssential.name) return
    const { data, error } = await supabase.from("essentials").update({
      ...editEssential,
      latitude: editEssential.latitude ? parseFloat(editEssential.latitude) : null,
      longitude: editEssential.longitude ? parseFloat(editEssential.longitude) : null,
    }).eq("id", id).select().single()
    if (error) { console.log("EDIT ERROR:", error); return }
    if (data) setEssentials((prev) => prev.map((e) => e.id === id ? data : e))
    cancelEditing()
  }

  const deleteEssential = async (id: number) => {
    const { error } = await supabase.from("essentials").delete().eq("id", id)
    if (error) return
    setEssentials((prev) => prev.filter((e) => e.id !== id))
  }
  const toggleHidden = async (item: Essential) => {
    const newValue = !(item as any).hidden
    const { error } = await supabase.from("essentials").update({ hidden: newValue }).eq("id", item.id)
    if (error) return
    setEssentials((prev) => prev.map((e) => e.id === item.id ? { ...e, hidden: newValue } : e))
  }
  const showAll = async () => {
    const { error } = await supabase.from("essentials").update({ hidden: false }).neq("id", 0)
    if (error) return
    setEssentials((prev) => prev.map((e) => ({ ...e, hidden: false })))
  }

  const hideAll = async () => {
    const { error } = await supabase.from("essentials").update({ hidden: true }).neq("id", 0)
    if (error) return
    setEssentials((prev) => prev.map((e) => ({ ...e, hidden: true })))
  }

  const filteredEssentials = essentials.filter((e) =>
    filterCategory === "All" ? true : e.category === filterCategory
  )

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading admin...</p>
      </main>
    )
  }

  const FormFields = ({ data, setData }: { data: typeof emptyForm; setData: (d: typeof emptyForm) => void }) => (
    <div className="grid gap-4 lg:grid-cols-3">
      <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Name *" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />

      <select value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none text-white">
        <option value="">Category *</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <input value={data.neighborhood} onChange={(e) => setData({ ...data, neighborhood: e.target.value })} placeholder="Neighborhood" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder="Address" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.open_hours} onChange={(e) => setData({ ...data, open_hours: e.target.value })} placeholder="Hours (e.g. 24h)" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.maps_link} onChange={(e) => setData({ ...data, maps_link: e.target.value })} placeholder="Google Maps URL" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.latitude} onChange={(e) => setData({ ...data, latitude: e.target.value })} placeholder="Latitude (e.g. 41.3851)" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.longitude} onChange={(e) => setData({ ...data, longitude: e.target.value })} placeholder="Longitude (e.g. 2.1734)" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Description" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
    </div>
  )

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">Essentials</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Manage pharmacies, ATMs, food, transport and other essential services.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                    link.href === "/admin/essentials"
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ADD FORM */}
        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500 mb-6">Add new essential</p>
            <FormFields data={newEssential} setData={setNewEssential} />
            <div className="mt-4">
              <input type="file" accept="image/*" onChange={handleNewImageUpload} className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none" />
              {newEssential.image && <img src={newEssential.image} alt="Preview" className="mt-4 h-40 w-full rounded-2xl object-cover" />}
            </div>
            <button onClick={addEssential} disabled={uploading} className="mt-4 w-full rounded-2xl bg-white px-8 py-4 font-bold text-black disabled:opacity-50">
              {uploading ? "Uploading..." : "Add essential"}
            </button>
          </div>
        </section>

        {/* FILTER */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  filterCategory === cat ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* LIST */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex gap-3 mb-4">
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">
              👁️ Show all
            </button>
            <button onClick={hideAll} className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-600 hover:text-white transition">
              🙈 Hide all
            </button>
          </div>
          <div className="grid gap-6">
            {filteredEssentials.map((item) => (
              <div key={item.id} className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
                {editingId === item.id ? (
                  <div>
                    <FormFields data={editEssential} setData={setEditEssential} />
                    <div className="mt-4">
                      <input type="file" accept="image/*" onChange={handleEditImageUpload} className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none" />
                      {editEssential.image && <img src={editEssential.image} alt="Preview" className="mt-4 h-40 w-full rounded-2xl object-cover" />}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => saveEditing(item.id)} className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black">Save</button>
                      <button onClick={cancelEditing} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-5 items-start">
                      {item.image && <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover flex-shrink-0" />}
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">{item.category}</span>
                          {item.neighborhood && <span className="text-sm text-zinc-500">📍 {item.neighborhood}</span>}
                        </div>
                        <h2 className="mt-2 text-2xl font-black text-white">{item.name}</h2>
                        {item.address && <p className="mt-1 text-sm text-zinc-400">{item.address}</p>}
                        {item.open_hours && <p className="mt-1 text-sm text-zinc-500">🕒 {item.open_hours}</p>}
                        {item.latitude && item.longitude && (
                          <p className="mt-1 text-xs text-zinc-600">{item.latitude}, {item.longitude}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => startEditing(item)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white hover:text-black transition">
                        ✏️ Edit
                      </button>
                      <button onClick={() => toggleHidden(item)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${(item as any).hidden ? "bg-zinc-600 text-white" : "border border-white/10 bg-white/5 text-white"}`}>
                        {(item as any).hidden ? "👁️ Hidden" : "👁️ Visible"}
                      </button>
                      <button onClick={() => deleteEssential(item.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredEssentials.length === 0 && (
              <p className="text-center text-zinc-500 py-10">No essentials in this category yet.</p>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}