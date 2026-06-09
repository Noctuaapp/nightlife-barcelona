import Link from "next/link"
import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import FavoriteButton from "../../../components/favorites/FavoriteButton"
import ClubMap from "../../../components/map/ClubMap"
import ClubNightsCalendar from "../../../components/nightlife/ClubNightsCalendar"
import { supabase } from "../../../lib/supabase"

type ClubPageProps = {
  params: Promise<{ slug: string }>
}

const createSlug = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export default async function ClubPage({ params }: ClubPageProps) {
  const { slug } = await params

  const { data: clubs } = await supabase.from("clubs").select("*")
  const club = clubs?.find((club) => createSlug(club.name) === slug)

  if (!club) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-5xl font-black">Club not found</h1>
          <Link href="/" className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-bold text-black">
            Back home
          </Link>
        </div>
      </main>
    )
  }

  const { data: clubEvents } = await supabase
    .from("club_events")
    .select("*")
    .eq("club_id", club.id)
    .order("date", { ascending: true })

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 text-white">

        <section className="relative h-[75vh] overflow-hidden">
          <img
            src={club.image || "/clubs/razz.jpg"}
            alt={club.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
          <div className="relative z-10 flex h-full items-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-16">
              <p className="text-sm uppercase tracking-[0.4em] text-zinc-300">
                {club.music || "Barcelona nightlife"}
              </p>
              <h1 className="mt-5 text-6xl font-black tracking-tight text-white md:text-8xl">
                {club.name}
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                {club.trending && (
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300">
                    🔥 Trending
                  </div>
                )}
                {club.sold_out && (
                  <div className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300">
                    🚫 Sold out
                  </div>
                )}
                <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                  📍 {club.neighborhood || "Barcelona"}
                </div>
                <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                  ⏳ {club.queue || "No queue"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-3">

            <div className="lg:col-span-2 space-y-10">
              {/* About */}
              <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Club experience</p>
                <h2 className="mt-4 text-5xl font-black">About this venue</h2>
                <p className="mt-8 text-lg leading-relaxed text-zinc-300">
                  {club.name} is one of Barcelona's nightlife venues, known for its
                  {club.music ? ` ${club.music.toLowerCase()} ` : " "}
                  atmosphere, live energy and late-night crowd.
                </p>
                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm text-zinc-500">Music</p>
                    <p className="mt-3 text-2xl font-black">🎵 {club.music || "TBA"}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm text-zinc-500">Area</p>
                    <p className="mt-3 text-2xl font-black">📍 {club.neighborhood || "Barcelona"}</p>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              {clubEvents && clubEvents.length > 0 && (
                <ClubNightsCalendar clubEvents={clubEvents} clubName={club.name} />
              )}
            </div>

            {/* Sidebar */}
            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Night info</p>
              <h3 className="mt-4 text-4xl font-black">Details</h3>
              <div className="mt-10 space-y-6 text-zinc-300">
                <div>
                  <p className="text-sm text-zinc-500">Hours</p>
                  <p className="mt-2 text-lg">🕒 {club.hours || "TBA"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Price</p>
                  <p className="mt-2 text-lg">🎟 {club.price || "TBA"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Live status</p>
                  <p className="mt-2 text-lg">🔥 {club.live_status || "Normal"}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Queue</p>
                  <p className="mt-2 text-lg">⏳ {club.queue || "No queue"}</p>
                </div>
              </div>

              {club.latitude && club.longitude && (
                <div className="mt-8">
                  <p className="text-sm text-zinc-500 mb-3">Location</p>
                  <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                  {club.address && (
                    <p className="mt-3 text-sm text-zinc-400">📍 {club.address}</p>
                  )}
                </div>
              )}

              <FavoriteButton itemType="club" itemId={club.id} />

              <Link
                href="/"
                className="mt-4 flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}