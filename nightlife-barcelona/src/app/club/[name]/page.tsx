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

  const club = nightlifeData.find(
    (club) =>
      club.name.toLowerCase() === name.toLowerCase()
  )

  if (!club) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Club not found.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">

      {/* HERO IMAGE */}

      <section className="relative h-[60vh] overflow-hidden">

        <Image
          src={club.image}
          alt={club.name}
          fill
          className="object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full p-8">

          <div className="mx-auto max-w-7xl">

            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Barcelona nightlife
            </p>

            <h1 className="text-5xl font-black md:text-7xl">
              {club.name}
            </h1>

            <div className="mt-6 flex flex-wrap gap-3">

              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
                {club.music}
              </span>

              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
                {club.neighborhood}
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-4 py-16">

        <div className="grid gap-10 lg:grid-cols-[1.5fr_420px]">

          {/* LEFT */}

          <div>

            <div className="border-b border-zinc-800 pb-10">

              <h2 className="text-3xl font-bold">
                About this venue
              </h2>

              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-400">

                Discover one of Barcelona’s most iconic nightlife
                experiences. Music, atmosphere, design and unforgettable
                nights — all in one place.

              </p>

            </div>

            {/* INFO GRID */}

            <div className="mt-10 grid gap-6 md:grid-cols-2">

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-widest text-zinc-500">
                  Address
                </p>

                <h3 className="mt-3 text-xl font-semibold">
                  {club.address}
                </h3>

              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-widest text-zinc-500">
                  Metro
                </p>

                <h3 className="mt-3 text-xl font-semibold">
                  {club.metro}
                </h3>

              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-widest text-zinc-500">
                  Opening hours
                </p>

                <h3 className="mt-3 text-xl font-semibold">
                  {club.hours}
                </h3>

              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-6">

                <p className="text-sm uppercase tracking-widest text-zinc-500">
                  Entry price
                </p>

                <h3 className="mt-3 text-xl font-semibold">
                  {club.price}
                </h3>

              </div>

            </div>

          </div>

          {/* RIGHT SIDEBAR */}

          <aside>

            <div className="sticky top-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

              <p className="text-sm uppercase tracking-widest text-zinc-500">
                Nightlife experience
              </p>

              <h3 className="mt-4 text-3xl font-bold">
                Plan your night
              </h3>

              <p className="mt-4 text-zinc-400">

                Explore the venue, save it to favorites and discover nearby nightlife.

              </p>

              <button className="mt-8 w-full rounded-2xl bg-white px-6 py-4 font-semibold text-black transition hover:scale-[1.02]">

                Save venue

              </button>

            </div>

          </aside>

        </div>

      </section>

    </main>
  )
}