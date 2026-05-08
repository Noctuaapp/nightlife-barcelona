import Image from "next/image"
import Link from "next/link"
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

  const uberLink =
    `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${encodeURIComponent(club.address)}`

  const mapsLink =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.address)}`

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

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />

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

            {/* TRANSPORT */}

            <div className="mt-6 flex flex-wrap gap-4">

  <a
    href={club.uberLink}
    target="_blank"
    className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
  >
    🚕 Uber
  </a>

  <a
    href={club.cabifyLink}
    target="_blank"
    className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
  >
    🚖 Cabify
  </a>

  <a
    href={club.mapsLink}
    target="_blank"
    className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
  >
    🗺 Maps
  </a>

</div>

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

           {/* LIVE TONIGHT */}

<div className="mt-14">

<div className="flex items-center justify-between">

  <div>

    <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
      Live tonight
    </p>

    <h3 className="mt-3 text-4xl font-black tracking-tight text-white">
      Real-time nightlife status
    </h3>

  </div>

  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300">

    ● LIVE

  </div>

</div>

<div className="mt-10 grid gap-5 md:grid-cols-2">

  <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-7 backdrop-blur-2xl">

    <p className="text-sm uppercase tracking-wide text-zinc-500">
      Current status
    </p>

    <p className="mt-4 text-4xl font-black text-white">
      🔥 {club.liveStatus}
    </p>

    <p className="mt-4 text-zinc-400">
      Updated live from nightlife activity and venue data.
    </p>

  </div>

  <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-7 backdrop-blur-2xl">

    <p className="text-sm uppercase tracking-wide text-zinc-500">
      Queue estimate
    </p>

    <p className="mt-4 text-4xl font-black text-white">
      ⏳ {club.queue}
    </p>

    <p className="mt-4 text-zinc-400">
      Estimated waiting time before entry tonight.
    </p>

  </div>

  <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-7 backdrop-blur-2xl">

    <p className="text-sm uppercase tracking-wide text-zinc-500">
      Crowd vibe
    </p>

    <p className="mt-4 text-4xl font-black text-white">
      🌍 {club.crowd}
    </p>

    <p className="mt-4 text-zinc-400">
      Current audience and social atmosphere tonight.
    </p>

  </div>

  <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-7 backdrop-blur-2xl">

    <p className="text-sm uppercase tracking-wide text-zinc-500">
      Music & vibe
    </p>

    <p className="mt-4 text-4xl font-black text-white">
      🎧 {club.vibe}
    </p>

    <p className="mt-4 text-zinc-400">
      What the atmosphere feels like right now.
    </p>

  </div>

</div>

</div>

            {/* NIGHT SCORE */}

            <div className="mt-14">

              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

                Night score

              </p>

              <div className="mt-8 space-y-6">

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Atmosphere</span>
                    <span>{club.atmosphereScore}/10</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width: `${club.atmosphereScore * 10}%`,
                      }}
                    />

                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Music</span>
                    <span>{club.musicIntensity}/10</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width: `${club.musicIntensity * 10}%`,
                      }}
                    />

                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Crowd</span>
                    <span>{club.crowdScore}/10</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width: `${club.crowdScore * 10}%`,
                      }}
                    />

                  </div>
                </div>

                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Value</span>
                    <span>{club.valueScore}/10</span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-white"
                      style={{
                        width: `${club.valueScore * 10}%`,
                      }}
                    />

                  </div>
                </div>

              </div>

            </div>

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
                Dresscode
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {club.dresscode}
              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">
                Queue tonight
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {club.queue}
              </p>

            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

              <p className="text-sm uppercase tracking-wide text-zinc-500">
                Crowd
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {club.crowd}
              </p>

            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

<p className="text-sm uppercase tracking-wide text-zinc-500">
  Walking time
</p>

<p className="mt-2 text-xl font-bold text-white">
  🚶 {club.walkingTime}
</p>

</div>

<div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

<p className="text-sm uppercase tracking-wide text-zinc-500">
  Nearest metro
</p>

<p className="mt-2 text-xl font-bold text-white">
  🚇 {club.nearestMetro}
</p>

</div>

<div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

<p className="text-sm uppercase tracking-wide text-zinc-500">
  Night bus
</p>

<p className="mt-2 text-xl font-bold text-white">
  🚌 {club.nightBus}
</p>

</div>

<div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">

<p className="text-sm uppercase tracking-wide text-zinc-500">
  Taxi estimate
</p>

<p className="mt-2 text-xl font-bold text-white">
  🚕 {club.taxiEstimate}
</p>

</div>
          </div>

        </div>

      </section>
{/* NEARBY NIGHTLIFE */}

<section className="mx-auto max-w-7xl px-4 pb-24">

  <div className="flex items-end justify-between">

    <div>

      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

        Nearby nightlife

      </p>

      <h2 className="mt-3 text-5xl font-black tracking-tight text-white">

        Continue your night

      </h2>

    </div>

  </div>

  <div className="mt-10 grid gap-5 md:grid-cols-2">

    {nightlifeData
      .filter((item) => item.name !== club.name)
      .slice(0, 4)
      .map((item) => (

        <Link
          key={item.id}
          href={`/club/${encodeURIComponent(item.name)}`}
          className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-1 hover:border-white/20"
        >

          <div className="relative h-[220px] overflow-hidden">

            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover transition duration-700 group-hover:scale-105"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-6">

              <div className="flex items-end justify-between">

                <div>

                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">

                    {item.music}

                  </p>

                  <h3 className="mt-2 text-3xl font-black tracking-tight text-white">

                    {item.name}

                  </h3>

                </div>

                <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl">

                  ⭐ {item.rating}

                </div>

              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">

                <span>
                  📍 {item.neighborhood}
                </span>

                <span>
                  🔥 {item.people}+ tonight
                </span>

              </div>

            </div>

          </div>

        </Link>

      ))}

  </div>

</section>
    </main>
  )
}