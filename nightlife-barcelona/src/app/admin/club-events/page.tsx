"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import { supabase } from "../../../lib/supabase"

type Club = {
  id: number
  name: string
}

type ClubEvent = {
  id: number
  club_id: number | null
  club_name: string | null
  title: string
  artist: string | null
  music: string | null
  date: string | null
  start_time: string | null
  end_time: string | null
  price: string | null
  ticket_url: string | null
  image: string | null
  description: string | null
  featured: boolean | null
  sold_out: boolean | null
  age_min: number | null
}

export default function AdminClubEventsPage() {
  const emptyClubEvent = {
    club_id: "", club_name: "", title: "", artist: "", music: "", date: "",
    start_time: "", end_time: "", price: "", ticket_url: "", image: "", description: "", age_min: 18,
  }

  const [clubs, setClubs] = useState<Club[]>([])
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([])
  const [newClubEvent, setNewClubEvent] = useState({ ...emptyClubEvent })
  const [editClubEvent, setEditClubEvent] = useState({ ...emptyClubEvent })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const ageLevels = [18, 21, 25]

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
    fetchClubs()
    fetchClubEvents()
  }, [])

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name")
    if (data) setClubs(data)
  }

  const fetchClubEvents = async () => {
    const { data } = await supabase.from("club_events").select("*").order("date", { ascending: true })
    if (data) setClubEvents(data)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `club-events/${fileName}`
    const { error } = await supabase.storage.from("event-images").upload(filePath, file)
    setUploading(false)
    if (error) { console.log("UPLOAD ERROR:", error); return null }
    const { data } = supabase.storage.from("event-images").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleNewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setNewClubEvent((prev: any) => ({ ...prev, image: publicUrl }))
  }

  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setEditClubEvent((prev: any) => ({ ...prev, image: publicUrl }))
  }

  const handleNewClubChange = (clubId: string) => {
    const selectedClub = clubs.find((club) => club.id === Number(clubId))
    setNewClubEvent({ ...newClubEvent, club_id: clubId, club_name: selectedClub?.name || "" })
  }

  const handleEditClubChange = (clubId: string) => {
    const selectedClub = clubs.find((club) => club.id === Number(clubId))
    setEditClubEvent({ ...editClubEvent, club_id: clubId, club_name: selectedClub?.name || "" })
  }

  const addClubEvent = async () => {
    if (!newClubEvent.club_id || !newClubEvent.title) return
    const { data, error } = await supabase.from("club_events").insert({
      club_id: Number(newClubEvent.club_id),
      club_name: newClubEvent.club_name,
      title: newClubEvent.title,
      artist: newClubEvent.artist,
      music: newClubEvent.music,
      date: newClubEvent.date || null,
      start_time: newClubEvent.start_time,
      end_time: newClubEvent.end_time,
      price: newClubEvent.price,
      ticket_url: newClubEvent.ticket_url,
      image: newClubEvent.image,
      description: newClubEvent.description,
      featured: false,
      sold_out: false,
      age_min: newClubEvent.age_min || 18,
    }).select().single()
    if (error) { console.log("ADD CLUB EVENT ERROR:", error); return }
    if (data) setClubEvents((prev) => [data, ...prev])
    setNewClubEvent(emptyClubEvent)
  }

  const startEditing = (clubEvent: ClubEvent) => {
    setEditingId(clubEvent.id)
    setEditClubEvent({
      club_id: clubEvent.club_id ? String(clubEvent.club_id) : "",
      club_name: clubEvent.club_name || "",
      title: clubEvent.title || "",
      artist: clubEvent.artist || "",
      music: clubEvent.music || "",
      date: clubEvent.date || "",
      start_time: clubEvent.start_time || "",
      end_time: clubEvent.end_time || "",
      price: clubEvent.price || "",
      ticket_url: clubEvent.ticket_url || "",
      image: clubEvent.image || "",
      description: clubEvent.description || "",
      age_min: clubEvent.age_min || 18,
    })
  }

  const cancelEditing = () => { setEditingId(null); setEditClubEvent(emptyClubEvent) }

  const saveEditing = async (id: number) => {
    if (!editClubEvent.club_id || !editClubEvent.title) return
    const { data, error } = await supabase.from("club_events").update({
      club_id: Number(editClubEvent.club_id),
      club_name: editClubEvent.club_name,
      title: editClubEvent.title,
      artist: editClubEvent.artist,
      music: editClubEvent.music,
      date: editClubEvent.date || null,
      start_time: editClubEvent.start_time,
      end_time: editClubEvent.end_time,
      price: editClubEvent.price,
      ticket_url: editClubEvent.ticket_url,
      image: editClubEvent.image,
      description: editClubEvent.description,
      age_min: editClubEvent.age_min || 18,
    }).eq("id", id).select().single()
    if (error) { console.log("EDIT CLUB EVENT ERROR:", error); return }
    if (data) setClubEvents((prev) => prev.map((e) => e.id === id ? data : e))
    cancelEditing()
  }

  const toggleFeatured = async (clubEvent: ClubEvent) => {
    const newValue = !clubEvent.featured
    const { error } = await supabase.from("club_events").update({ featured: newValue }).eq("id", clubEvent.id)
    if (error) return
    setClubEvents((prev) => prev.map((e) => e.id === clubEvent.id ? { ...e, featured: newValue } : e))
  }

  const toggleSoldOut = async (clubEvent: ClubEvent) => {
    const newValue = !clubEvent.sold_out
    const { error } = await supabase.from("club_events").update({ sold_out: newValue }).eq("id", clubEvent.id)
    if (error) return
    setClubEvents((prev) => prev.map((e) => e.id === clubEvent.id ? { ...e, sold_out: newValue } : e))
  }

  const updateAgeMin = async (clubEvent: ClubEvent, age: number) => {
    const { error } = await supabase.from("club_events").update({ age_min: age }).eq("id", clubEvent.id)
    if (error) return
    setClubEvents((prev) => prev.map((e) => e.id === clubEvent.id ? { ...e, age_min: age } : e))
  }

  const deleteClubEvent = async (id: number) => {
    const { error } = await supabase.from("club_events").delete().eq("id", id)
    if (error) return
    setClubEvents((prev) => prev.filter((e) => e.id !== id))
  }

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
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin club nights</p>
            <h1 className="mt-4 text-6xl font-black tracking-tight">Club nights control</h1>
            <p className="mt-6 max-w-2xl text-lg text-zinc-400">Create, edit and manage nights inside each club.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/admin" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">Clubs admin</a>
              <a href="/admin/events" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">Events admin</a>
              <a href="/admin/tickets" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">Tickets admin</a>
              <a href="/admin/club-events" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black">Club nights admin</a>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <div className="grid gap-4 lg:grid-cols-3">
              <select value={newClubEvent.club_id} onChange={(e) => handleNewClubChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none">
                <option value="">Select club</option>
                {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
              </select>
              <input value={newClubEvent.title} onChange={(e) => setNewClubEvent({ ...newClubEvent, title: e.target.value })} placeholder="Night title" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input value={newClubEvent.artist} onChange={(e) => setNewClubEvent({ ...newClubEvent, artist: e.target.value })} placeholder="Artist" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input value={newClubEvent.music} onChange={(e) => setNewClubEvent({ ...newClubEvent, music: e.target.value })} placeholder="Music" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input type="date" value={newClubEvent.date} onChange={(e) => setNewClubEvent({ ...newClubEvent, date: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input value={newClubEvent.start_time} onChange={(e) => setNewClubEvent({ ...newClubEvent, start_time: e.target.value })} placeholder="Start time" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input value={newClubEvent.end_time} onChange={(e) => setNewClubEvent({ ...newClubEvent, end_time: e.target.value })} placeholder="End time" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input value={newClubEvent.price} onChange={(e) => setNewClubEvent({ ...newClubEvent, price: e.target.value })} placeholder="Price" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <input value={newClubEvent.ticket_url} onChange={(e) => setNewClubEvent({ ...newClubEvent, ticket_url: e.target.value })} placeholder="Ticket URL" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
              <div>
                <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Minimum age</p>
                <div className="flex gap-2">
                  {ageLevels.map((age) => (
                    <button key={age} onClick={() => setNewClubEvent({ ...newClubEvent, age_min: age })}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${newClubEvent.age_min === age ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>
                      +{age}
                    </button>
                  ))}
                </div>
              </div>
              <input value={newClubEvent.image} onChange={(e) => setNewClubEvent({ ...newClubEvent, image: e.target.value })} placeholder="Image URL" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3" />
              <input type="file" accept="image/*" onChange={handleNewImageUpload} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none lg:col-span-3" />
              {newClubEvent.image && <img src={newClubEvent.image} alt="Preview" className="h-44 w-full rounded-2xl object-cover lg:col-span-3" />}
              <textarea value={newClubEvent.description} onChange={(e) => setNewClubEvent({ ...newClubEvent, description: e.target.value })} placeholder="Description" className="min-h-[120px] rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3" />
              <button onClick={addClubEvent} disabled={uploading} className="rounded-2xl bg-white px-8 py-4 font-bold text-black disabled:opacity-50 lg:col-span-3">
                {uploading ? "Uploading..." : "Add club night"}
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-6">
            {clubEvents.map((clubEvent) => (
              <div key={clubEvent.id} className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
                {editingId === clubEvent.id ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <select value={editClubEvent.club_id} onChange={(e) => handleEditClubChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none">
                      <option value="">Select club</option>
                      {clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}
                    </select>
                    <input value={editClubEvent.title} onChange={(e) => setEditClubEvent({ ...editClubEvent, title: e.target.value })} placeholder="Night title" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input value={editClubEvent.artist} onChange={(e) => setEditClubEvent({ ...editClubEvent, artist: e.target.value })} placeholder="Artist" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input value={editClubEvent.music} onChange={(e) => setEditClubEvent({ ...editClubEvent, music: e.target.value })} placeholder="Music" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input type="date" value={editClubEvent.date} onChange={(e) => setEditClubEvent({ ...editClubEvent, date: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input value={editClubEvent.start_time} onChange={(e) => setEditClubEvent({ ...editClubEvent, start_time: e.target.value })} placeholder="Start time" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input value={editClubEvent.end_time} onChange={(e) => setEditClubEvent({ ...editClubEvent, end_time: e.target.value })} placeholder="End time" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input value={editClubEvent.price} onChange={(e) => setEditClubEvent({ ...editClubEvent, price: e.target.value })} placeholder="Price" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <input value={editClubEvent.ticket_url} onChange={(e) => setEditClubEvent({ ...editClubEvent, ticket_url: e.target.value })} placeholder="Ticket URL" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
                    <div>
                      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Minimum age</p>
                      <div className="flex gap-2">
                        {ageLevels.map((age) => (
                          <button key={age} onClick={() => setEditClubEvent({ ...editClubEvent, age_min: age })}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${editClubEvent.age_min === age ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>
                            +{age}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input value={editClubEvent.image} onChange={(e) => setEditClubEvent({ ...editClubEvent, image: e.target.value })} placeholder="Image URL" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3" />
                    <input type="file" accept="image/*" onChange={handleEditImageUpload} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none lg:col-span-3" />
                    {editClubEvent.image && <img src={editClubEvent.image} alt="Preview" className="h-52 w-full rounded-2xl object-cover lg:col-span-3" />}
                    <textarea value={editClubEvent.description} onChange={(e) => setEditClubEvent({ ...editClubEvent, description: e.target.value })} placeholder="Description" className="min-h-[120px] rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3" />
                    <button onClick={() => saveEditing(clubEvent.id)} disabled={uploading} className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black disabled:opacity-50">Save changes</button>
                    <button onClick={cancelEditing} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold">Cancel</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      {clubEvent.image && <img src={clubEvent.image} alt={clubEvent.title} className="mb-6 h-48 w-full rounded-3xl object-cover lg:w-[420px]" />}
                      <p className="text-sm uppercase tracking-wide text-zinc-500">{clubEvent.club_name} · {clubEvent.music}</p>
                      <h2 className="mt-2 text-3xl font-black">{clubEvent.title}</h2>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🎧 {clubEvent.artist || "TBA"}</span>
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">📅 {clubEvent.date || "TBA"}</span>
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🕒 {clubEvent.start_time || "TBA"} - {clubEvent.end_time || "TBA"}</span>
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🎟 {clubEvent.price || "TBA"}</span>
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🔞 +{clubEvent.age_min || 18}</span>
                      </div>
                      <p className="mt-5 max-w-2xl text-zinc-400">{clubEvent.description}</p>
                      <div className="mt-4">
                        <p className="mb-3 text-sm uppercase tracking-wide text-zinc-500">Minimum age</p>
                        <div className="flex gap-2">
                          {ageLevels.map((age) => (
                            <button key={age} onClick={() => updateAgeMin(clubEvent, age)}
                              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${clubEvent.age_min === age ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white"}`}>
                              +{age}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => startEditing(clubEvent)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white hover:text-black transition">✏️ Edit</button>
                      <button onClick={() => toggleFeatured(clubEvent)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${clubEvent.featured ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5"}`}>🔥 Featured</button>
                      <button onClick={() => toggleSoldOut(clubEvent)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${clubEvent.sold_out ? "bg-red-500 text-white" : "border border-white/10 bg-white/5"}`}>🚫 Sold out</button>
                      <button onClick={() => deleteClubEvent(clubEvent.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition">Delete</button>
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