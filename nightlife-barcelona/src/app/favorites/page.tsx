"use client"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import ClubCard from "../../components/nightlife/ClubCard"

import { nightlifeData } from "../../data/nightlife-data"

import { useFavorites } from "../../context/FavoritesContext"

export default function FavoritesPage() {

  const { favorites } = useFavorites()

  const favoriteClubs = nightlifeData.filter((club) =>
    favorites.includes(club.name)
  )

  return (

    <>

      {/* BACKGROUND */}

      <div className="fixed inset-0 -z-10 overflow-hidden">

        <div className="absolute left-[-200px] top-[-200px] h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-3xl" />

        <div className="absolute bottom-[-200px] right-[-200px] h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />

      </div>

      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">

        {/* HERO */}

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

                  Saved clubs, unforgettable nights and your favorite places across Barcelona.

                </p>

              </div>

              {/* STATS */}

              <div className="flex gap-4">

                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 backdrop-blur-xl">

                  <p className="text-sm uppercase tracking-wide text-zinc-500">

                    Saved clubs

                  </p>

                  <p className="mt-2 text-3xl font-black text-white">

                    {favoriteClubs.length}

                  </p>

                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 backdrop-blur-xl">

                  <p className="text-sm uppercase tracking-wide text-zinc-500">

                    Status

                  </p>

                  <p className="mt-2 text-3xl font-black text-emerald-300">

                    LIVE

                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* EMPTY STATE */}

        {favoriteClubs.length === 0 && (

          <section className="mx-auto mt-24 max-w-4xl px-4">

            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-14 text-center backdrop-blur-2xl">

              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-6xl backdrop-blur-xl">

                ❤️

              </div>

              <h2 className="mt-8 text-4xl font-black tracking-tight text-white">

                No favorites yet

              </h2>

              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">

                Save clubs and nightlife spots to build your own Barcelona nightlife collection.

              </p>

              <div className="mt-10 flex justify-center">

                <a
                  href="/clubs"
                  className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:scale-105"
                >

                  Discover clubs

                </a>

              </div>

            </div>

          </section>

        )}

        {/* GRID */}

        {favoriteClubs.length > 0 && (

          <section className="mx-auto mt-16 max-w-7xl px-4">

            <div className="mb-10 flex items-center justify-between">

              <div>

                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

                  Saved places

                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight text-white">

                  Ready for tonight

                </h2>

              </div>

            </div>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

              {favoriteClubs.map((club, index) => (

                <div
                  key={club.id}
                  className="fade-up"
                  style={{
                    animationDelay: `${index * 0.08}s`,
                  }}
                >

                  <ClubCard
                    name={club.name}
                    music={club.music}
                    area={club.neighborhood}
                    price={club.price}
                    hours={club.hours}
                    image={club.image}
                    rating={club.rating}
                    people={club.people}
                    badges={club.badges}
                    terrace={club.terrace}
                    vip={club.vip}
                    smokingArea={club.smokingArea}
                    tableBooking={club.tableBooking}
                    dresscode={club.dresscode}
                  />

                </div>

              ))}

            </div>

          </section>

        )}

      </main>

      <BottomNav />

    </>
  )
}