"use client"

import { useEffect, useState } from "react"

import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"

import { supabase } from "../../../lib/supabase"

type Event = {
  id: number
  title: string
  club_name: string | null
  date: string | null
}

type Ticket = {
  id: number
  event_id: number | null
  name: string
  description: string | null
  price: number | null
  currency: string | null
  available: boolean | null
  external_url: string | null
}

export default function AdminTicketsPage() {
  const emptyTicket = {
    event_id: "",
    name: "",
    description: "",
    price: "",
    currency: "EUR",
    external_url: "",
  }

  const [events, setEvents] = useState<Event[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [newTicket, setNewTicket] = useState(emptyTicket)
  const [editTicket, setEditTicket] = useState(emptyTicket)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

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
      .select("id, title, club_name, date")
      .order("date", { ascending: true })

    if (error) {
      console.log("FETCH EVENTS ERROR:", error)
      return
    }

    if (data) setEvents(data)
  }

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.log("FETCH TICKETS ERROR:", error)
      return
    }

    if (data) setTickets(data)
  }

  useEffect(() => {
    fetchEvents()
    fetchTickets()
  }, [])

  const addTicket = async () => {
    if (!newTicket.event_id || !newTicket.name) return

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        event_id: Number(newTicket.event_id),
        name: newTicket.name,
        description: newTicket.description,
        price: newTicket.price ? Number(newTicket.price) : null,
        currency: newTicket.currency || "EUR",
        external_url: newTicket.external_url,
        available: true,
      })
      .select()
      .single()

    if (error) {
      console.log("ADD TICKET ERROR:", error)
      return
    }

    if (data) setTickets((prev) => [data, ...prev])

    setNewTicket(emptyTicket)
  }

  const startEditing = (ticket: Ticket) => {
    setEditingId(ticket.id)

    setEditTicket({
      event_id: ticket.event_id ? String(ticket.event_id) : "",
      name: ticket.name || "",
      description: ticket.description || "",
      price: ticket.price ? String(ticket.price) : "",
      currency: ticket.currency || "EUR",
      external_url: ticket.external_url || "",
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditTicket(emptyTicket)
  }

  const saveEditing = async (id: number) => {
    if (!editTicket.event_id || !editTicket.name) return

    const { data, error } = await supabase
      .from("tickets")
      .update({
        event_id: Number(editTicket.event_id),
        name: editTicket.name,
        description: editTicket.description,
        price: editTicket.price ? Number(editTicket.price) : null,
        currency: editTicket.currency || "EUR",
        external_url: editTicket.external_url,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.log("EDIT TICKET ERROR:", error)
      return
    }

    if (data) {
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === id ? data : ticket
        )
      )
    }

    cancelEditing()
  }

  const toggleAvailable = async (ticket: Ticket) => {
    const newValue = !ticket.available

    const { error } = await supabase
      .from("tickets")
      .update({ available: newValue })
      .eq("id", ticket.id)

    if (error) {
      console.log("AVAILABLE ERROR:", error)
      return
    }

    setTickets((prev) =>
      prev.map((item) =>
        item.id === ticket.id
          ? { ...item, available: newValue }
          : item
      )
    )
  }

  const deleteTicket = async (id: number) => {
    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id)

    if (error) {
      console.log("DELETE TICKET ERROR:", error)
      return
    }

    setTickets((prev) =>
      prev.filter((ticket) => ticket.id !== id)
    )
  }

  const getEventLabel = (eventId: number | null) => {
    const event = events.find((item) => item.id === eventId)

    if (!event) return "Unknown event"

    return `${event.title} · ${event.club_name || "Barcelona"} · ${event.date || "TBA"}`
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
              Admin tickets
            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight">
              Ticket control
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-zinc-400">
              Create, edit and manage ticket options for every Noctua event.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/admin"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
              >
                Clubs admin
              </a>

              <a
                href="/admin/events"
                className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
              >
                Events admin
              </a>

              <a
                href="/admin/tickets"
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-black"
              >
                Tickets admin
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
            <div className="grid gap-4 lg:grid-cols-3">
              <select
                value={newTicket.event_id}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    event_id: e.target.value,
                  })
                }
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              >
                <option value="">Select event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {event.club_name} · {event.date}
                  </option>
                ))}
              </select>

              <input
                value={newTicket.name}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    name: e.target.value,
                  })
                }
                placeholder="Ticket name"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newTicket.price}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    price: e.target.value,
                  })
                }
                placeholder="Price"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newTicket.currency}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    currency: e.target.value,
                  })
                }
                placeholder="Currency"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newTicket.external_url}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    external_url: e.target.value,
                  })
                }
                placeholder="External ticket URL"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-2"
              />

              <textarea
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({
                    ...newTicket,
                    description: e.target.value,
                  })
                }
                placeholder="Description"
                className="min-h-[120px] rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3"
              />

              <button
                onClick={addTicket}
                className="rounded-2xl bg-white px-8 py-4 font-bold text-black lg:col-span-3"
              >
                Add ticket
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-6">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6"
              >
                {editingId === ticket.id ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <select
                      value={editTicket.event_id}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          event_id: e.target.value,
                        })
                      }
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    >
                      <option value="">Select event</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title} · {event.club_name} · {event.date}
                        </option>
                      ))}
                    </select>

                    <input
                      value={editTicket.name}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ticket name"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editTicket.price}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          price: e.target.value,
                        })
                      }
                      placeholder="Price"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editTicket.currency}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          currency: e.target.value,
                        })
                      }
                      placeholder="Currency"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editTicket.external_url}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          external_url: e.target.value,
                        })
                      }
                      placeholder="External ticket URL"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-2"
                    />

                    <textarea
                      value={editTicket.description}
                      onChange={(e) =>
                        setEditTicket({
                          ...editTicket,
                          description: e.target.value,
                        })
                      }
                      placeholder="Description"
                      className="min-h-[120px] rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3"
                    />

                    <button
                      onClick={() => saveEditing(ticket.id)}
                      className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black"
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
                      <p className="text-sm uppercase tracking-wide text-zinc-500">
                        {getEventLabel(ticket.event_id)}
                      </p>

                      <h2 className="mt-2 text-3xl font-black">
                        {ticket.name}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                          🎟 {ticket.price ? `${ticket.price} ${ticket.currency || "EUR"}` : "TBA"}
                        </span>

                        <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                          {ticket.available ? "✅ Available" : "🚫 Hidden"}
                        </span>
                      </div>

                      <p className="mt-5 max-w-2xl text-zinc-400">
                        {ticket.description}
                      </p>

                      {ticket.external_url && (
                        <a
                          href={ticket.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-5 inline-block text-sm font-bold text-zinc-300 underline"
                        >
                          Open ticket link
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEditing(ticket)}
                        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => toggleAvailable(ticket)}
                        className={`rounded-full px-5 py-3 text-sm font-bold ${
                          ticket.available
                            ? "bg-emerald-400 text-black"
                            : "border border-white/10 bg-white/5"
                        }`}
                      >
                        ✅ Available
                      </button>

                      <button
                        onClick={() => deleteTicket(ticket.id)}
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