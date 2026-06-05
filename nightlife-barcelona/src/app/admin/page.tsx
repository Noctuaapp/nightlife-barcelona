"use client"

import { useEffect, useState } from "react"

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

export default function AdminPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)

  const [editClub, setEditClub] = useState<EditClub>({
    name: "",
    music: "",
    neighborhood: "",
    price: "",
    hours: "",
    image: "",
    live_status: "",
  })

  const [newClub, setNewClub] = useState({
    name: "",
    music: "",
    neighborhood: "",
    price: "",
    hours: "",
    image: "",
  })

  const queueLevels = [
    "No queue",
    "Short queue",
    "Medium queue",
    "Long queue",
    "Massive queue",
  ]

  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .order("id")

    console.log("ADMIN DATA:", data)
    console.log("ADMIN ERROR:", error)

    if (data) {
      setClubs(data)
    }
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  const startEditing = (club: Club) => {
    setEditingId(club.id)

    setEditClub({
      name: club.name || "",
      music: club.music || "",
      neighborhood: club.neighborhood || "",
      price: club.price || "",
      hours: club.hours || "",
      image: club.image || "",
      live_status: club.live_status || "",
    })
  }

  const cancelEditing = () => {
    setEditingId(null)

    setEditClub({
      name: "",
      music: "",
      neighborhood: "",
      price: "",
      hours: "",
      image: "",
      live_status: "",
    })
  }

  const saveEditing = async (id: number) => {
    if (!editClub.name.trim()) return

    const { data, error } = await supabase
      .from("clubs")
      .update({
        name: editClub.name,
        music: editClub.music,
        neighborhood: editClub.neighborhood,
        price: editClub.price,
        hours: editClub.hours,
        image: editClub.image,
        live_status: editClub.live_status,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.log("EDIT ERROR:", error)
      return
    }

    if (data) {
      setClubs((prev) =>
        prev.map((club) =>
          club.id === id ? data : club
        )
      )
    }

    cancelEditing()
  }

  const toggleTrending = async (club: Club) => {
    const newValue = !club.trending

    const { error } = await supabase
      .from("clubs")
      .update({ trending: newValue })
      .eq("id", club.id)

    if (error) {
      console.log("TRENDING ERROR:", error)
      return
    }

    setClubs((prev) =>
      prev.map((item) =>
        item.id === club.id
          ? { ...item, trending: newValue }
          : item
      )
    )
  }

  const toggleSoldOut = async (club: Club) => {
    const newValue = !club.sold_out

    const { error } = await supabase
      .from("clubs")
      .update({ sold_out: newValue })
      .eq("id", club.id)

    if (error) {
      console.log("SOLD OUT ERROR:", error)
      return
    }

    setClubs((prev) =>
      prev.map((item) =>
        item.id === club.id
          ? { ...item, sold_out: newValue }
          : item
      )
    )
  }

  const updateQueue = async (club: Club, level: string) => {
    const { error } = await supabase
      .from("clubs")
      .update({ queue: level })
      .eq("id", club.id)

    if (error) {
      console.log("QUEUE ERROR:", error)
      return
    }

    setClubs((prev) =>
      prev.map((item) =>
        item.id === club.id
          ? { ...item, queue: level }
          : item
      )
    )
  }

  const deleteClub = async (id: number) => {
    const { error } = await supabase
      .from("clubs")
      .delete()
      .eq("id", id)

    if (error) {
      console.log("DELETE ERROR:", error)
      return
    }

    setClubs((prev) =>
      prev.filter((club) => club.id !== id)
    )
  }

  const addClub = async () => {
    if (
      !newClub.name ||
      !newClub.music ||
      !newClub.neighborhood
    ) {
      return
    }

    const { data, error } = await supabase
      .from("clubs")
      .insert({
        name: newClub.name,
        music: newClub.music,
        neighborhood: newClub.neighborhood,
        price: newClub.price || "€20",
        hours: newClub.hours || "00:00 - 06:00",
        image: newClub.image || "/clubs/razz.jpg",
        live_status: "Getting busy",
        queue: "No queue",
        trending: false,
        sold_out: false,
      })
      .select()
      .single()

    if (error) {
      console.log("ADD ERROR:", error)
      return
    }

    if (data) {
      setClubs((prev) => [data, ...prev])
    }

    setNewClub({
      name: "",
      music: "",
      neighborhood: "",
      price: "",
      hours: "",
      image: "",
    })
  }

  const filteredClubs = clubs.filter((club) => {
    if (!search.trim()) return true

    const query = search.toLowerCase()

    return (
      club.name?.toLowerCase().includes(query) ||
      club.music?.toLowerCase().includes(query) ||
      club.neighborhood?.toLowerCase().includes(query) ||
      club.live_status?.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Admin panel
            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">
              Live nightlife control
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Control nightlife activity, queues and live venue status across Barcelona.
            </p>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-3">
              <input
                value={newClub.name}
                onChange={(e) =>
                  setNewClub({ ...newClub, name: e.target.value })
                }
                placeholder="Club name"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.music}
                onChange={(e) =>
                  setNewClub({ ...newClub, music: e.target.value })
                }
                placeholder="Music type"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.neighborhood}
                onChange={(e) =>
                  setNewClub({ ...newClub, neighborhood: e.target.value })
                }
                placeholder="Neighborhood"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.price}
                onChange={(e) =>
                  setNewClub({ ...newClub, price: e.target.value })
                }
                placeholder="Price"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.hours}
                onChange={(e) =>
                  setNewClub({ ...newClub, hours: e.target.value })
                }
                placeholder="Hours"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.image}
                onChange={(e) =>
                  setNewClub({ ...newClub, image: e.target.value })
                }
                placeholder="Image path"
                className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <button
                onClick={addClub}
                className="rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:scale-[1.02] lg:col-span-3"
              >
                Add club to Supabase
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-7xl px-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 outline-none"
          />
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4">
          <div className="grid gap-6">
            {filteredClubs.map((club) => (
              <div
                key={club.id}
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                {editingId === club.id ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <input
                      value={editClub.name}
                      onChange={(e) =>
                        setEditClub({ ...editClub, name: e.target.value })
                      }
                      placeholder="Club name"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editClub.music}
                      onChange={(e) =>
                        setEditClub({ ...editClub, music: e.target.value })
                      }
                      placeholder="Music"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editClub.neighborhood}
                      onChange={(e) =>
                        setEditClub({ ...editClub, neighborhood: e.target.value })
                      }
                      placeholder="Neighborhood"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editClub.price}
                      onChange={(e) =>
                        setEditClub({ ...editClub, price: e.target.value })
                      }
                      placeholder="Price"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editClub.hours}
                      onChange={(e) =>
                        setEditClub({ ...editClub, hours: e.target.value })
                      }
                      placeholder="Hours"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editClub.image}
                      onChange={(e) =>
                        setEditClub({ ...editClub, image: e.target.value })
                      }
                      placeholder="Image path"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
                    />

                    <input
                      value={editClub.live_status}
                      onChange={(e) =>
                        setEditClub({ ...editClub, live_status: e.target.value })
                      }
                      placeholder="Live status"
                      className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none lg:col-span-3"
                    />

                    <button
                      onClick={() => saveEditing(club.id)}
                      className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black transition hover:scale-[1.02]"
                    >
                      Save changes
                    </button>

                    <button
                      onClick={cancelEditing}
                      className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold text-white transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-zinc-500">
                        {club.music}
                      </p>

                      <h2 className="mt-2 text-3xl font-black text-white">
                        {club.name}
                      </h2>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
                          📍 {club.neighborhood}
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
                          🔥 {club.live_status}
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
                          ⏳ {club.queue}
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
                          💸 {club.price}
                        </div>

                        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">
                          🕒 {club.hours}
                        </div>
                      </div>

                      <div className="mt-6">
                        <p className="mb-3 text-sm uppercase tracking-wide text-zinc-500">
                          Live queue control
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {queueLevels.map((level) => (
                            <button
                              key={level}
                              onClick={() => updateQueue(club, level)}
                              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                                club.queue === level
                                  ? "bg-white text-black"
                                  : "border border-white/10 bg-white/5 text-white"
                              }`}
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEditing(club)}
                        className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black"
                      >
                        ✏️ Edit
                      </button>

                      <button
                        onClick={() => toggleTrending(club)}
                        className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                          club.trending
                            ? "bg-emerald-400 text-black"
                            : "border border-white/10 bg-white/5 text-white"
                        }`}
                      >
                        🔥 Trending
                      </button>

                      <button
                        onClick={() => toggleSoldOut(club)}
                        className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                          club.sold_out
                            ? "bg-red-500 text-white"
                            : "border border-white/10 bg-white/5 text-white"
                        }`}
                      >
                        🚫 Sold out
                      </button>

                      <button
                        onClick={() => deleteClub(club.id)}
                        className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500 hover:text-white"
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