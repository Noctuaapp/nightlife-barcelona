"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"

import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"

import { supabase } from "../../../lib/supabase"

type Event = {
  id: number
  title: string
  club_name: string | null
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
  hidden: boolean | null
  vip_tables: boolean | null
  gallery: string[] | null
  manual_photos: boolean | null
  google_rating: number | null
  google_review_count: number | null
}

export default function AdminEventsPage() {
  const router = useRouter()

  const emptyEvent = {
    title: "",
    club_name: "",
    artist: "",
    music: "",
    date: "",
    start_time: "",
    end_time: "",
    price: "",
    ticket_url: "",
    image: "",
    description: "",
  }

  const [events, setEvents] = useState<Event[]>([])
  const [newEvent, setNewEvent] = useState(emptyEvent)
  const [editEvent, setEditEvent] = useState(emptyEvent)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")

  // Galería manual — fotos que subes tú a mano cuando el pipeline de Google no trae las correctas.
  const [newGallery, setNewGallery] = useState<string[]>([])
  const [newManualPhotos, setNewManualPhotos] = useState(false)
  const [editGallery, setEditGallery] = useState<string[]>([])
  const [editManualPhotos, setEditManualPhotos] = useState(false)

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

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true })

    if (error) {
      console.log("EVENTS ADMIN ERROR:", error)
      return
    }

    if (data) setEvents(data)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const uploadImage = async (file: File) => {
    setUploading(true)

    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `events/${fileName}`

    const { error } = await supabase.storage.from("event-images").upload(filePath, file)

    setUploading(false)

    if (error) {
      console.log("UPLOAD ERROR:", error)
      return null
    }

    const { data } = supabase.storage.from("event-images").getPublicUrl(filePath)

    return data.publicUrl
  }

  // Subida múltiple a la galería manual. Usa el bucket "event-photos" (el mismo que usa el
  // pipeline automático de Google), así que estas fotos conviven con las automáticas sin líos.
  const uploadGalleryFiles = async (files: FileList): Promise<string[]> => {
    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop()
      const fileName = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const filePath = `admin/${fileName}`
      const { error } = await supabase.storage.from("event-photos").upload(filePath, file)
      if (error) {
        console.log("GALLERY UPLOAD ERROR:", error)
        continue
      }
      const { data } = supabase.storage.from("event-photos").getPublicUrl(filePath)
      urls.push(data.publicUrl)
    }
    setUploading(false)
    return urls
  }

  const handleNewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const publicUrl = await uploadImage(file)

    if (publicUrl) {
      setNewEvent((prev) => ({ ...prev, image: publicUrl }))
    }
  }

  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const publicUrl = await uploadImage(file)

    if (publicUrl) {
      setEditEvent((prev) => ({ ...prev, image: publicUrl }))
    }
  }

  const handleNewGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const urls = await uploadGalleryFiles(files)
    setNewGallery((prev) => [...prev, ...urls])
    e.target.value = ""
  }

  const handleEditGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const urls = await uploadGalleryFiles(files)
    setEditGallery((prev) => [...prev, ...urls])
    e.target.value = ""
  }

  const removeNewGalleryPhoto = (url: string) => setNewGallery((prev) => prev.filter((u) => u !== url))
  const removeEditGalleryPhoto = (url: string) => setEditGallery((prev) => prev.filter((u) => u !== url))

  const addEvent = async () => {
    if (!newEvent.title) return

    const { data, error } = await supabase
      .from("events")
      .insert({
        ...newEvent,
        image: newEvent.image || newGallery[0] || "",
        gallery: newGallery.length > 0 ? newGallery : null,
        manual_photos: newManualPhotos,
        date: newEvent.date || null,
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        featured: false,
        sold_out: false,
        vip_tables: false,
      })
      .select()
      .single()

    if (error) {
      console.log("Add club night ERROR:", error)
      return
    }

    if (data) setEvents((prev) => [data, ...prev])

    setNewEvent(emptyEvent)
    setNewGallery([])
    setNewManualPhotos(false)
  }

  const startEditing = (event: Event) => {
    setEditingId(event.id)

    setEditEvent({
      title: event.title || "",
      club_name: event.club_name || "",
      artist: event.artist || "",
      music: event.music || "",
      date: event.date || "",
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      price: event.price || "",
      ticket_url: event.ticket_url || "",
      image: event.image || "",
      description: event.description || "",
    })
    setEditGallery(Array.isArray(event.gallery) ? event.gallery : [])
    setEditManualPhotos(!!event.manual_photos)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditEvent(emptyEvent)
    setEditGallery([])
    setEditManualPhotos(false)
  }

  const saveEditing = async (id: number) => {
    if (!editEvent.title) return

    const { data, error } = await supabase
      .from("events")
      .update({
        ...editEvent,
        image: editEvent.image || editGallery[0] || "",
        gallery: editGallery.length > 0 ? editGallery : null,
        manual_photos: editManualPhotos,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.log("EDIT EVENT ERROR:", error)
      return
    }

    if (data) {
      setEvents((prev) => prev.map((event) => (event.id === id ? data : event)))
    }

    cancelEditing()
  }

  const toggleFeatured = async (event: Event) => {
    const newValue = !event.featured

    const { error } = await supabase.from("events").update({ featured: newValue }).eq("id", event.id)

    if (error) return console.log("FEATURED ERROR:", error)

    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, featured: newValue } : item)))
  }

  const toggleSoldOut = async (event: Event) => {
    const newValue = !event.sold_out
    const { error } = await supabase.from("events").update({ sold_out: newValue }).eq("id", event.id)
    if (error) return console.log("SOLD OUT ERROR:", error)
    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, sold_out: newValue } : item)))
  }

  const toggleVipTables = async (event: Event) => {
    const newValue = !event.vip_tables
    const { error } = await supabase.from("events").update({ vip_tables: newValue }).eq("id", event.id)
    if (error) return console.log("VIP TABLES ERROR:", error)
    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, vip_tables: newValue } : item)))
  }

  const toggleHidden = async (event: Event) => {
    const newValue = !event.hidden
    const { error } = await supabase.from("events").update({ hidden: newValue }).eq("id", event.id)
    if (error) return
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, hidden: newValue } : e)))
  }

  // Marca/desmarca el evento como gestionado a mano. Si lo activas aquí (sin pasar por "Editar"),
  // el pipeline de Google lo dejará en paz a partir del próximo ciclo del cron.
  const toggleManualPhotos = async (event: Event) => {
    const newValue = !event.manual_photos
    const { error } = await supabase.from("events").update({ manual_photos: newValue }).eq("id", event.id)
    if (error) return console.log("MANUAL PHOTOS ERROR:", error)
    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, manual_photos: newValue } : item)))
  }

  const showAll = async () => {
    const { error } = await supabase.from("events").update({ hidden: false }).neq("id", 0)
    if (error) return
    setEvents((prev) => prev.map((e) => ({ ...e, hidden: false })))
  }

  const hideAll = async () => {
    const { error } = await supabase.from("events").update({ hidden: true }).neq("id", 0)
    if (error) return
    setEvents((prev) => prev.map((e) => ({ ...e, hidden: true })))
  }

  const deleteEvent = async (id: number) => {
    const { error } = await supabase.from("events").delete().eq("id", id)

    if (error) return console.log("DELETE EVENT ERROR:", error)

    setEvents((prev) => prev.filter((event) => event.id !== id))
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Loading admin...</p>
      </main>
    )
  }

  const galleryUploadBox = (
    gallery: string[],
    onUpload: (e: ChangeEvent<HTMLInputElement>) => void,
    onRemove: (url: string) => void
  ) => (
    <div className="lg:col-span-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
        Galería manual ({gallery.length} foto{gallery.length === 1 ? "" : "s"})
      </p>
      <label className="block cursor-pointer rounded-2xl border border-dashed border-white/20 bg-white/[0.02] px-5 py-4 text-center text-sm font-bold text-zinc-400 transition hover:border-purple-500/50 hover:text-white">
        {uploading ? "Subiendo..." : "📁 Subir una o varias fotos"}
        <input type="file" accept="image/*" multiple disabled={uploading} onChange={onUpload} className="hidden" />
      </label>
      {gallery.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {gallery.map((url) => (
            <div key={url} className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Admin events</p>

            <h1 className="mt-4 text-6xl font-black tracking-tight">Event control</h1>

            <p className="mt-6 max-w-2xl text-lg text-zinc-400">Create, edit and manage nightlife events across Barcelona.</p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a href="/admin" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">Clubs admin</a>
              <a href="/admin/club-events" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">Club nights admin</a>
              <a href="/admin/events" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black">Events admin</a>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <div className="grid gap-4 lg:grid-cols-3">
              {Object.keys(emptyEvent).map((key) => (
                <input
                  key={key}
                  value={(newEvent as any)[key]}
                  onChange={(e) => setNewEvent({ ...newEvent, [key]: e.target.value })}
                  placeholder={key}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                />
              ))}

              <div className="lg:col-span-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Foto de portada</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewImageUpload}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none w-full"
                />
                {newEvent.image && (
                  <img src={newEvent.image} alt="Preview" className="mt-3 h-44 w-full rounded-2xl object-cover" />
                )}
              </div>

              {galleryUploadBox(newGallery, handleNewGalleryUpload, removeNewGalleryPhoto)}

              <button
                type="button"
                onClick={() => setNewManualPhotos((v) => !v)}
                className={`lg:col-span-3 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                  newManualPhotos ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {newManualPhotos ? "✋ Fotos manuales (el pipeline de Google no lo tocará)" : "🤖 Dejar que Google Places busque fotos automáticamente"}
              </button>

              <button
                onClick={addEvent}
                disabled={uploading}
                className="rounded-2xl bg-white px-8 py-4 font-bold text-black disabled:opacity-50 lg:col-span-3"
              >
                {uploading ? "Uploading..." : "Add event"}
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 outline-none mb-4"
          />
          <div className="flex gap-3 mb-4">
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">👁️ Show all</button>
            <button onClick={hideAll} className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-600 hover:text-white transition">🙈 Hide all</button>
          </div>
          <div className="grid gap-6">
            {events
              .filter((event) => {
                if (!search.trim()) return true
                const q = search.toLowerCase()
                return event.title?.toLowerCase().includes(q) || event.club_name?.toLowerCase().includes(q) || event.artist?.toLowerCase().includes(q)
              })
              .map((event) => (
                <div key={event.id} className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
                  {editingId === event.id ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                      {Object.keys(emptyEvent).map((key) => (
                        <input
                          key={key}
                          value={(editEvent as any)[key]}
                          onChange={(e) => setEditEvent({ ...editEvent, [key]: e.target.value })}
                          placeholder={key}
                          className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                        />
                      ))}

                      <div className="lg:col-span-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500">Foto de portada</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditImageUpload}
                          className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none w-full"
                        />
                        {editEvent.image && (
                          <img src={editEvent.image} alt="Preview" className="mt-3 h-52 w-full rounded-2xl object-cover" />
                        )}
                      </div>

                      {galleryUploadBox(editGallery, handleEditGalleryUpload, removeEditGalleryPhoto)}

                      <button
                        type="button"
                        onClick={() => setEditManualPhotos((v) => !v)}
                        className={`lg:col-span-3 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                          editManualPhotos ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {editManualPhotos ? "✋ Fotos manuales (el pipeline de Google no lo tocará)" : "🤖 Dejar que Google Places busque fotos automáticamente"}
                      </button>

                      <button onClick={() => saveEditing(event.id)} disabled={uploading} className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black disabled:opacity-50">Save changes</button>
                      <button onClick={cancelEditing} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        {event.image && (
                          <img src={event.image} alt={event.title} className="mb-3 h-48 w-full rounded-3xl object-cover lg:w-[420px]" />
                        )}

                        {Array.isArray(event.gallery) && event.gallery.length > 0 && (
                          <div className="mb-6 flex gap-2 lg:w-[420px]">
                            {event.gallery.slice(0, 4).map((url, i) => (
                              <img key={i} src={url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                            ))}
                            {event.gallery.length > 4 && (
                              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-zinc-400">
                                +{event.gallery.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-sm uppercase tracking-wide text-zinc-500">{event.club_name} · {event.music}</p>

                        <h2 className="mt-2 text-3xl font-black">{event.title}</h2>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🎧 {event.artist}</span>
                          <span className="rounded-full bg-white/10 px-4 py-2 text-sm">📅 {event.date}</span>
                          <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🕒 {event.start_time} - {event.end_time}</span>
                          <span className="rounded-full bg-white/10 px-4 py-2 text-sm">🎟 {event.price}</span>
                          {event.vip_tables && (
                            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-sm text-amber-300">🛋️ Mesa VIP</span>
                          )}
                          {event.google_rating ? (
                            <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-sm text-blue-300">
                              ⭐ {event.google_rating} ({event.google_review_count || 0})
                            </span>
                          ) : null}
                          <span className={`rounded-full px-4 py-2 text-sm border ${event.manual_photos ? "bg-purple-500/20 border-purple-500/30 text-purple-300" : "bg-white/5 border-white/10 text-zinc-400"}`}>
                            {event.manual_photos ? "✋ Fotos manuales" : "🤖 Google automático"}
                          </span>
                        </div>

                        <p className="mt-5 max-w-2xl text-zinc-400">{event.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => startEditing(event)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold">✏️ Edit</button>
                        <button onClick={() => toggleFeatured(event)} className={`rounded-full px-5 py-3 text-sm font-bold ${event.featured ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5"}`}>🔥 Featured</button>
                        <button onClick={() => toggleSoldOut(event)} className={`rounded-full px-5 py-3 text-sm font-bold ${event.sold_out ? "bg-red-500 text-white" : "border border-white/10 bg-white/5"}`}>🚫 Sold out</button>
                        <button onClick={() => toggleVipTables(event)} className={`rounded-full px-5 py-3 text-sm font-bold ${event.vip_tables ? "bg-amber-400 text-black" : "border border-white/10 bg-white/5"}`}>🛋️ Mesa VIP</button>
                        <button onClick={() => toggleManualPhotos(event)} className={`rounded-full px-5 py-3 text-sm font-bold ${event.manual_photos ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5"}`}>✋ Manual</button>
                        <button onClick={() => toggleHidden(event)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${event.hidden ? "bg-zinc-600 text-white" : "border border-white/10 bg-white/5"}`}>{event.hidden ? "👁️ Hidden" : "👁️ Visible"}</button>
                        <button onClick={() => deleteEvent(event.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400">Delete</button>
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
