"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"

type Club = {
  id: number
  name: string
  music: string | null
  neighborhood: string | null
  image: string | null
  price: string | null
  hours: string | null
}

type EventItem = {
  id: number
  title: string
  club_name: string | null
  image: string | null
  music: string | null
  date: string | null
  price: string | null
}

type ClubEvent = {
  id: number
  title: string
  club_name: string | null
  image: string | null
  music: string | null
  date: string | null
  price: string | null
}

const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
}

export default function FavoritesPage() {
  const { favorites, loadingFavorites } = useFavorites()

  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([])
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (!data.session) {
        setCheckingSession(false)
        return
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const clubIds = favorites
        .filter((favorite) => favorite.item_type === "club")
        .map((favorite) => favorite.item_id)

      const eventIds = favorites
        .filter((favorite) => favorite.item_type === "event")
        .map((favorite) => favorite.item_id)

      const clubEventIds = favorites
        .filter((favorite) => favorite.item_type === "club_event")
        .map((favorite) => favorite.item_id)

      if (clubIds.length > 0) {
        const { data } = await supabase
          .from("clubs")
          .select("id, name, music, neighborhood, image, price, hours")
          .in("id", clubIds)

        setClubs(data || [])
      } else {
        setClubs([])
      }

      if (eventIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("id, title, club_name, image, music, date, price")
          .in("id", eventIds)

        setEvents(data || [])
      } else {
        setEvents([])
      }

      if (clubEventIds.length > 0) {
        const { data } = await supabase
          .from("club_events")
          .select("id, title, club_name, image, music, date, price")
          .in("id", clubEventIds)

        setClubEvents(data || [])
      } else {
        setClubEvents([])
      }
    }

    if (!loadingFavorites) {
      fetchData()
    }
  }, [favorites, loadingFavorites])

  const totalFavorites =
    clubs.length + events.length + clubEvents.length

  if (checkingSession || loadingFavorites) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
          Loading favorites...
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
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Favorites
                </p>

                <h1 className="mt-4 text-5xl font-black tracking-tight text-white md:text-7xl">
                  Your nightlife collection
                </h1>

                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
                  Saved clubs, events and club nights across Barcelona.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 backdrop-blur-xl">
                <p className="text-sm uppercase tracking-wide text-zinc-500">
                  Saved items
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  {totalFavorites}
                </p>
              </div>
            </div>
          </div>
        </section>

        {totalFavorites === 0 && (
          <section className="mx-auto mt-24 max-w-4xl px-4">
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-14 text-center backdrop-blur-2xl">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-6xl backdrop-blur-xl">
                ❤️
              </div>

              <h2 className="mt-8 text-4xl font-black tracking-tight text-white">
                No favorites yet
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
                Save clubs and nights to build your own Barcelona nightlife collection.
              </p>

              <div className="mt-10 flex justify-center">
                <Link
                  href="/clubs"
                  className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:scale-105"
                >
                  Discover clubs
                </Link>
              </div>
            </div>
          </section>
        )}

        {clubs.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Saved clubs
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
              Places
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/clubs/${createSlug(club.name)}`}
                  className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition hover:scale-[1.02]"
                >
                  <img
                    src={club.image || "/clubs/razz.jpg"}
                    alt={club.name}
                    className="h-56 w-full object-cover"
                  />

                  <div className="p-6">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      {club.music || "Music"}
                    </p>

                    <h3 className="mt-2 text-3xl font-black">
                      {club.name}
                    </h3>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        📍 {club.neighborhood || "Barcelona"}
                      </span>

                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        🎟 {club.price || "TBA"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {clubEvents.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Saved club nights
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
              Nights
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {clubEvents.map((clubEvent) => (
                <Link
                  key={clubEvent.id}
                  href={`/club-event/${clubEvent.id}`}
                  className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition hover:scale-[1.02]"
                >
                  <img
                    src={clubEvent.image || "/clubs/razz.jpg"}
                    alt={clubEvent.title}
                    className="h-56 w-full object-cover"
                  />

                  <div className="p-6">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      {clubEvent.club_name || "Barcelona"}
                    </p>

                    <h3 className="mt-2 text-3xl font-black">
                      {clubEvent.title}
                    </h3>

                    <div className="mt-5 flex flex-wrap gap-3">
                    <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        📅 {clubEvent.date ? new Date(clubEvent.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBA"}
                      </span>

                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        🎵 {clubEvent.music || "Music"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              Saved events
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
              Events
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/event/${createSlug(event.title)}`}
                  className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition hover:scale-[1.02]"
                >
                  <img
                    src={event.image || "/clubs/razz.jpg"}
                    alt={event.title}
                    className="h-56 w-full object-cover"
                  />

                  <div className="p-6">
                    <p className="text-sm uppercase tracking-wide text-zinc-500">
                      {event.club_name || "Barcelona event"}
                    </p>

                    <h3 className="mt-2 text-3xl font-black">
                      {event.title}
                    </h3>

                    <div className="mt-5 flex flex-wrap gap-3">
                    <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        📅 {event.date ? new Date(event.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "TBA"}
                      </span>

                      <span className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        🎟 {event.price || "TBA"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </>
  )
}