"use client"

import { useEffect, useState } from "react"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { nightlifeData } from "../../data/nightlife-data"

type Club = {
  id: number
  name: string
  music: string
  neighborhood: string
  liveStatus: string
  queue: string
  trending: boolean
  soldOut: boolean
}

export default function AdminPage() {

  const [clubs, setClubs] = useState<Club[]>([])

  const [search, setSearch] = useState("")

  const [newClub, setNewClub] = useState({
    name: "",
    music: "",
    neighborhood: "",
  })

  useEffect(() => {

    const saved = localStorage.getItem(
      "noctua-admin-clubs"
    )

    if (saved) {

      const parsed = JSON.parse(saved)

      const cleanData = parsed.filter(Boolean)

      setClubs(cleanData)

    } else {

      const cleanData = nightlifeData.filter(Boolean)

      setClubs(cleanData)

    }

  }, [])

  useEffect(() => {

    if (clubs.length > 0) {

      localStorage.setItem(
        "noctua-admin-clubs",
        JSON.stringify(clubs)
      )

    }

  }, [clubs])

  const queueLevels = [
    "No queue",
    "Short queue",
    "Medium queue",
    "Long queue",
    "Massive queue",
  ]

  const toggleTrending = (id: number) => {

    setClubs((prev) =>
      prev.map((club) => {

        if (!club) return club

        if (club.id === id) {

          return {
            ...club,
            trending: !club.trending,
          }

        }

        return club

      })
    )

  }

  const toggleSoldOut = (id: number) => {

    setClubs((prev) =>
      prev.map((club) => {

        if (!club) return club

        if (club.id === id) {

          return {
            ...club,
            soldOut: !club.soldOut,
          }

        }

        return club

      })
    )

  }

  const updateQueue = (
    id: number,
    level: string
  ) => {

    setClubs((prev) =>
      prev.map((club) => {

        if (!club) return club

        if (club.id === id) {

          return {
            ...club,
            queue: level,
          }

        }

        return club

      })
    )

  }

  const deleteClub = (id: number) => {

    setClubs((prev) =>
      prev.filter(
        (club) =>
          club && club.id !== id
      )
    )

  }

  const addClub = () => {

    if (
      !newClub.name ||
      !newClub.music ||
      !newClub.neighborhood
    ) {
      return
    }

    const club: Club = {
      id: Date.now(),
      name: newClub.name,
      music: newClub.music,
      neighborhood: newClub.neighborhood,
      liveStatus: "Getting busy",
      queue: "No queue",
      trending: false,
      soldOut: false,
    }

    setClubs((prev) => [
      club,
      ...prev,
    ])

    setNewClub({
      name: "",
      music: "",
      neighborhood: "",
    })

  }

  const filteredClubs = clubs.filter((club) => {

    if (!club) return false

    if (!search.trim()) return true

    const query = search.toLowerCase()

    return (
      club.name
        ?.toLowerCase()
        .includes(query) ||

      club.music
        ?.toLowerCase()
        .includes(query) ||

      club.neighborhood
        ?.toLowerCase()
        .includes(query) ||

      club.liveStatus
        ?.toLowerCase()
        .includes(query)
    )

  })

  return (

    <>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

        <section className="px-4 pt-14">

          <div className="mx-auto max-w-7xl">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

              Admin panel

            </p>

            <h1 className="mt-4 text-6xl font-black tracking-tight text-white">

              Live nightlife control

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">

              Control nightlife activity,
              queues and live venue status
              across Barcelona.

            </p>

          </div>

        </section>

        {/* ADD CLUB */}

        <section className="mx-auto mt-10 max-w-7xl px-4">

          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">

            <div className="flex flex-col gap-4 lg:flex-row">

              <input
                value={newClub.name}
                onChange={(e) =>
                  setNewClub({
                    ...newClub,
                    name: e.target.value,
                  })
                }
                placeholder="Club name"
                className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.music}
                onChange={(e) =>
                  setNewClub({
                    ...newClub,
                    music: e.target.value,
                  })
                }
                placeholder="Music type"
                className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <input
                value={newClub.neighborhood}
                onChange={(e) =>
                  setNewClub({
                    ...newClub,
                    neighborhood:
                      e.target.value,
                  })
                }
                placeholder="Neighborhood"
                className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
              />

              <button
                onClick={addClub}
                className="rounded-2xl bg-white px-8 py-4 font-bold text-black transition hover:scale-[1.02]"
              >

                Add club

              </button>

            </div>

          </div>

        </section>

        {/* SEARCH */}

        <section className="mx-auto mt-6 max-w-7xl px-4">

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search clubs..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 outline-none"
          />

        </section>

        {/* CLUBS */}

        <section className="mx-auto mt-10 max-w-7xl px-4">

          <div className="grid gap-6">

            {filteredClubs.map((club) => (

              <div
                key={club.id}
                className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
              >

                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

                  {/* INFO */}

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

                        🔥 {club.liveStatus}

                      </div>

                      <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm">

                        ⏳ {club.queue}

                      </div>

                    </div>

                    {/* QUEUE */}

                    <div className="mt-6">

                      <p className="mb-3 text-sm uppercase tracking-wide text-zinc-500">

                        Live queue control

                      </p>

                      <div className="flex flex-wrap gap-2">

                        {queueLevels.map((level) => (

                          <button
                            key={level}
                            onClick={() =>
                              updateQueue(
                                club.id,
                                level
                              )
                            }
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

                  {/* ACTIONS */}

                  <div className="flex flex-wrap gap-3">

                    <button
                      onClick={() =>
                        toggleTrending(club.id)
                      }
                      className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                        club.trending
                          ? "bg-emerald-400 text-black"
                          : "border border-white/10 bg-white/5 text-white"
                      }`}
                    >

                      🔥 Trending

                    </button>

                    <button
                      onClick={() =>
                        toggleSoldOut(club.id)
                      }
                      className={`rounded-full px-5 py-3 text-sm font-bold transition ${
                        club.soldOut
                          ? "bg-red-500 text-white"
                          : "border border-white/10 bg-white/5 text-white"
                      }`}
                    >

                      🚫 Sold out

                    </button>

                    <button
                      onClick={() =>
                        deleteClub(club.id)
                      }
                      className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500 hover:text-white"
                    >

                      Delete

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        </section>

      </main>

      <BottomNav />

    </>

  )

}