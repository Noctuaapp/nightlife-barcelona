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

    const { error } = await supabase.storage
    .from("event-images")
      .upload(filePath, file)

    setUploading(false)

    if (error) {
      console.log("UPLOAD ERROR:", error)
      return null
    }

    const { data } = supabase.storage
    .from("event-images")
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleNewImageUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const publicUrl = await uploadImage(file)

    if (publicUrl) {
      setNewEvent((prev) => ({
        ...prev,
        image: publicUrl,
      }))
    }
  }

  const handleEditImageUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const publicUrl = await uploadImage(file)

    if (publicUrl) {
      setEditEvent((prev) => ({
        ...prev,
        image: publicUrl,
      }))
    }
  }

  const addEvent = async () => {
    if (!newEvent.title) return

    const { data, error } = await supabase
      .from("events")
      .insert({
        ...newEvent,
        date: newEvent.date || null,
        start_time: newEvent.start_time || null,
        end_time: newEvent.end_time || null,
        featured: false,
        sold_out: false,
            })
      .select()
      .single()

    if (error) {
      console.log("Add club night ERROR:", error)
      return
    }

    if (data) setEvents((prev) => [data, ...prev])

    setNewEvent(emptyEvent)
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
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditEvent(emptyEvent)
  }

  const saveEditing = async (id: number) => {
    if (!editEvent.title) return

    const { data, error } = await supabase
      .from("events")
      .update(editEvent)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.log("EDIT EVENT ERROR:", error)
      return
    }

    if (data) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === id ? data : event
        )
      )
    }

    cancelEditing()
  }

  const toggleFeatured = async (event: Event) => {
    const newValue = !event.featured

    const { error } = await supabase
      .from("events")
      .update({ featured: newValue })
      .eq("id", event.id)

    if (error) return console.log("FEATURED ERROR:", error)

    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? { ...item, featured: newValue }
          : item
      )
    )
  }

  const toggleSoldOut = async (event: Event) => {
    const newValue = !event.sold_out
    const { error } = await supabase.from("events").update({ sold_out: newValue }).eq("id", event.id)
    if (error) return console.log("SOLD OUT ERROR:", error)
    setEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, sold_out: newValue } : item))
  }

  const toggleHidden = async (event: Event) => {
    const newValue = !event.hidden
    const { error } = await supabase.from("events").update({ hidden: newValue }).eq("id", event.id)
    if (error) return
    setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, hidden: newValue } : e))
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
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id)

    if (error) return console.log("DELETE EVENT ERROR:", error)

    setEvents((prev) =>
      prev.filter((event) => event.id !== id)
    )
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading admin...
        </p>
      </main>
    )
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Admin events
            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight">
              Event control
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-zinc-400">
              Create, edit and manage nightlife events across Barcelona.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
  <a
    href="/admin"
    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
  >
    Clubs admin
  </a>
  <a
  href="/admin/club-events"
   className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
>
  Club nights admin
</a>
  <a
    href="/admin/events"
    className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black"
  >
    Events admin
  </a>
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
                  onChange={(e) =>
                    setNewEvent({
                      ...newEvent,
                      [key]: e.target.value,
                    })
                  }
                  placeholder={key}
                  className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                />
              ))}

              <input
                type="file"
                accept="image/*"
                onChange={handleNewImageUpload}
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none lg:col-span-3"
              />

              {newEvent.image && (
                <img
                  src={newEvent.image}
                  alt="Preview"
                  className="h-44 w-full rounded-2xl object-cover lg:col-span-3"
                />
              )}

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
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">
              👁️ Show all
            </button>
            <button onClick={hideAll} className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-600 hover:text-white transition">
              🙈 Hide all
            </button>
          </div>
          <div className="grid gap-6">
            {events.filter((event) => {
              if (!search.trim()) return true
              const q = search.toLowerCase()
              return event.title?.toLowerCase().includes(q) || event.club_name?.toLowerCase().includes(q) || event.artist?.toLowerCase().includes(q)
            }).map((event) => (
              <div
                key={event.id}
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6"
              >
                {editingId === event.id ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    {Object.keys(emptyEvent).map((key) => (
                      <input
                        key={key}
                        value={(editEvent as any)[key]}
                        onChange={(e) =>
                          setEditEvent({
                            ...editEvent,
                            [key]: e.target.value,
                          })
                        }
                        placeholder={key}
                        className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                      />
                    ))}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none lg:col-span-3"
                    />

                    {editEvent.image && (
                      <img
                        src={editEvent.image}
                        alt="Preview"
                        className="h-52 w-full rounded-2xl object-cover lg:col-span-3"
                      />
                    )}

                    <button
                      onClick={() => saveEditing(event.id)}
                      disabled={uploading}
                      className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black disabled:opacity-50"
                    >
                      Save changes
                    </button>

                    <button
                      onClick={cancelEditing}
                      className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      {event.image && (
                        <img
                          src={event.image}
                          alt={event.title}
                          className="mb-6 h-48 w-full rounded-3xl object-cover lg:w-[420px]"
                        />
                      )}

                      <p className="text-sm uppercase tracking-wide text-zinc-500">
                        {event.club_name} · {event.music}
                      </p>

                      <h2 className="mt-2 text-3xl font-black">
                        {event.title}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                          🎧 {event.artist}
                        </span>

                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                          📅 {event.date}
                        </span>

                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                          🕒 {event.start_time} - {event.end_time}
                        </span>

                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                          🎟 {event.price}
                        </span>
                      </div>

                      <p className="mt-5 max-w-2xl text-zinc-400">
                        {event.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEditing(event)}
                        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => toggleFeatured(event)}
                        className={`rounded-full px-5 py-3 text-sm font-bold ${
                          event.featured
                            ? "bg-emerald-400 text-black"
                            : "border border-white/10 bg-white/5"
                        }`}
                      >
                        🔥 Featured
                      </button>

                      <button
                        onClick={() => toggleSoldOut(event)}
                        className={`rounded-full px-5 py-3 text-sm font-bold ${
                          event.sold_out
                            ? "bg-red-500 text-white"
                            : "border border-white/10 bg-white/5"
                        }`}
                      >
                        🚫 Sold out
                      </button>
                      <button onClick={() => toggleHidden(event)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${event.hidden ? "bg-zinc-600 text-white" : "border border-white/10 bg-white/5"}`}>
  {event.hidden ? "👁️ Hidden" : "👁️ Visible"}
</button>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400"
                      >                         
                        Delete
                      </button>
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