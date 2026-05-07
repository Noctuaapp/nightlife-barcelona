import Image from "next/image"

import { nightlifeData } from "../../../data/nightlife-data"

interface ClubPageProps {
  params: Promise<{
    name: string
  }>
}

export default async function ClubPage({
  params,
}: ClubPageProps) {

  const { name } = await params

  const decodedName = decodeURIComponent(name)
    .toLowerCase()
    .trim()

  const club = nightlifeData.find(
    (club) =>
      club.name.toLowerCase().trim() === decodedName
  )

  if (!club) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-black text-white">

        Club not found

      </div>

    )
  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* HERO */}

      <section className="relative h-[85vh] overflow-hidden">

        <Image
          src={club.image}
          alt={club.name}
          fill
          className="object-cover"
        />

        {/* OVERLAY */}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />

        {/* CONTENT */}

        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">

          <div className="mx-auto max-w-7xl">

            <div className="w-fit rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">

              {club.music}

            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none tracking-tight text-white md:text-7xl">

              {club.name}

            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">

              One of Barcelona’s most iconic nightlife experiences located in {club.neighborhood}.

            </p>

            {/* ACTIONS */}

            <div className="mt-10 flex flex-wrap gap-4">

              <button className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:scale-105">

                Buy tickets

              </button>

              <button className="rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/[0.08]">

                ❤️ Save

              </button>

              <button className="rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/[0.08]">

                ↗ Share

              </button>

            </div>

            {/* STATS */}

            <div className="mt-10 flex flex-wrap gap-4">

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">

                <p className="text-sm text-zinc-400">
                  Rating
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {club.rating} ⭐
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">

                <p className="text-sm text-zinc-400">
                  People tonight
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {club.people}+
                </p>

              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">

                <p className="text-sm text-zinc-400">
                  Entry
                </p>

                <p className="mt-1 text-2xl font-black text-white">
                  {club.price}
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* INFO */}

      <section className="mx-auto max-w-7xl px-4 py-20">

        <div className="grid gap-10 lg:grid-cols-3">

          {/* LEFT */}

          <div className="lg:col-span-2">

            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
              About
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight text-white">

              A nightlife experience built for unforgettable nights.

            </h2>

            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-zinc-400">

              Discover music, atmosphere and experiences curated for nightlife lovers in Barcelona. Explore the venue, crowd vibe and local scene before your night even starts.

            </p>

          </div>

          {/* RIGHT */}

          <div className="space-y-5">

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">
                Area
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {club.neighborhood}
              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">
                Opening hours
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {club.hours}
              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">
                Address
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {club.address}
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  )
}