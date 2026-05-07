"use client"

import { useEffect, useState } from "react"
import ClubCard from "../../components/nightlife/ClubCard"
import { nightlifeData } from "../../data/nightlife-data"

export default function FavoritesPage() {

  const [savedClubs, setSavedClubs] = useState<string[]>([])

  useEffect(() => {

    const storedClubs =
      JSON.parse(localStorage.getItem("savedClubs") || "[]")

    setSavedClubs(storedClubs)

  }, [])

  const favoriteNightclubs =
    nightlifeData.filter((club) =>
      savedClubs.includes(club.name)
    )

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">

      <div className="mx-auto max-w-7xl">

        <div className="mb-10">

          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Your collection
          </p>

          <h1 className="mt-2 text-5xl font-bold">
            Saved clubs
          </h1>

          <p className="mt-4 max-w-xl text-zinc-400">
            Your favorite nightlife spots in Barcelona.
          </p>

        </div>

        {favoriteNightclubs.length === 0 ? (

          <div className="flex h-[50vh] flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900">

            <div className="text-6xl">
              ❤️
            </div>

            <h2 className="mt-6 text-2xl font-bold">
              No saved clubs yet
            </h2>

            <p className="mt-3 text-zinc-400">
              Save clubs to build your nightlife collection.
            </p>

          </div>

        ) : (

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

            {favoriteNightclubs.map((club) => (

              <ClubCard
                key={club.id}
                name={club.name}
                music={club.music}
                area={club.neighborhood}
                price={club.price}
                hours={club.hours}
                image={club.image}
              />

            ))}

          </div>

        )}

      </div>

    </main>
  )
}