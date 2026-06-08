import Link from "next/link"

import Header from "../../../components/layout/Header"
import BottomNav from "../../../components/layout/BottomNav"
import FavoriteButton from "../../../components/favorites/FavoriteButton"
import { supabase } from "../../../lib/supabase"

type ClubEventPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ClubEventPage({
  params,
}: ClubEventPageProps) {
  const { id } = await params

  const { data: clubEvent } = await supabase
    .from("club_events")
    .select("*")
    .eq("id", Number(id))
    .single()

  if (!clubEvent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-5xl font-black">
            Club night not found
          </h1>

          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-white px-6 py-3 font-bold text-black"
          >
            Back home
          </Link>
        </div>
      </main>
    )
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("club_event_id", clubEvent.id)
    .eq("available", true)
    .order("price", { ascending: true })

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="relative h-[75vh] overflow-hidden">
          <img
            src={clubEvent.image || "/clubs/razz.jpg"}
            alt={clubEvent.title}
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />

          <div className="relative z-10 flex h-full items-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-16">
              <p className="text-sm uppercase tracking-[0.4em] text-zinc-300">
                {clubEvent.club_name || "Barcelona club night"}
              </p>

              <h1 className="mt-5 max-w-5xl text-6xl font-black tracking-tight text-white md:text-8xl">
                {clubEvent.title}
              </h1>

              <div className="mt-8 flex flex-wrap gap-3">
                {clubEvent.featured && (
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300">
                    🔥 Featured
                  </div>
                )}

                {clubEvent.sold_out && (
                  <div className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-300">
                    🚫 Sold out
                  </div>
                )}

                <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                  🎧 {clubEvent.music || "Music"}
                </div>

                <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm">
                  🎟 {clubEvent.price || "TBA"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                  Club night experience
                </p>

                <h2 className="mt-4 text-5xl font-black">
                  About this night
                </h2>

                <p className="mt-8 text-lg leading-relaxed text-zinc-300">
                  {clubEvent.description ||
                    "A curated club night inside one of Barcelona’s nightlife venues."}
                </p>

                <div className="mt-10 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm text-zinc-500">
                      Artist
                    </p>

                    <p className="mt-3 text-2xl font-black">
                      {clubEvent.artist || "TBA"}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                    <p className="text-sm text-zinc-500">
                      Club
                    </p>

                    <p className="mt-3 text-2xl font-black">
                      {clubEvent.club_name || "Barcelona"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Night info
              </p>

              <h3 className="mt-4 text-4xl font-black">
                Details
              </h3>

              <div className="mt-10 space-y-6 text-zinc-300">
                <div>
                  <p className="text-sm text-zinc-500">Date</p>
                  <p className="mt-2 text-lg">
                    📅 {clubEvent.date || "TBA"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Time</p>
                  <p className="mt-2 text-lg">
                    🕒 {clubEvent.start_time || "TBA"} - {clubEvent.end_time || "TBA"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Music</p>
                  <p className="mt-2 text-lg">
                    🎵 {clubEvent.music || "TBA"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-zinc-500">Price</p>
                  <p className="mt-2 text-lg">
                    🎟 {clubEvent.price || "TBA"}
                  </p>
                </div>
              </div>

              {tickets && tickets.length > 0 && (
                <div className="mt-10">
                  <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-500">
                    Tickets
                  </p>

                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-white">
                              {ticket.name}
                            </h4>

                            {ticket.description && (
                              <p className="mt-1 text-sm text-zinc-400">
                                {ticket.description}
                              </p>
                            )}
                          </div>

                          <p className="shrink-0 font-black text-white">
                            {ticket.price
                              ? `${ticket.price} ${ticket.currency || "EUR"}`
                              : "TBA"}
                          </p>
                        </div>

                        {ticket.external_url && !clubEvent.sold_out && (
                          <a
                            href={ticket.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center justify-center rounded-xl bg-white px-4 py-3 font-bold text-black transition hover:scale-[1.02]"
                          >
                            Buy Ticket
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!tickets || tickets.length === 0) && clubEvent.ticket_url && !clubEvent.sold_out && (
                <a
                  href={clubEvent.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-10 flex items-center justify-center rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:scale-[1.02]"
                >
                  Get tickets
                </a>
              )}

              {clubEvent.sold_out && (
                <div className="mt-10 flex items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 font-bold text-red-300">
                  Sold out
                </div>
              )}
<FavoriteButton itemType="club_event" itemId={clubEvent.id} />
              <Link
                href={`/clubs/${clubEvent.club_name?.toLowerCase().replace(/\s+/g, "-") || ""}`}
                className="mt-4 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-bold text-white transition hover:bg-white/10"
              >
                Back to club
              </Link>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
    </>
  )
}