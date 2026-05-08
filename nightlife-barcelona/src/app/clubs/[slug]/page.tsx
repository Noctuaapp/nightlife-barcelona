import { nightlifeData } from "../../../data/nightlife-data"

type ClubPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function ClubPage({
  params,
}: ClubPageProps) {

  const { slug } = await params

  const safeClubs = nightlifeData.filter(
    (club) => club && club.name
  )

  const createSlug = (name: string) => {

    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")

  }

  const club = safeClubs.find((club) => {

    return createSlug(club.name) === slug

  })

  if (!club) {

    return (

      <main className="flex min-h-screen items-center justify-center bg-black text-white">

        <h1 className="text-5xl font-black">

          Club not found

        </h1>

      </main>

    )

  }

  return (

    <main className="min-h-screen bg-black text-white">

      {/* HERO */}

      <section className="relative h-[70vh] overflow-hidden">

        <img
          src={club.image}
          alt={club.name}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-black/70" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />

        <div className="relative z-10 flex h-full items-end">

          <div className="mx-auto w-full max-w-7xl px-6 pb-16">

            <p className="text-sm uppercase tracking-[0.4em] text-zinc-300">

              {club.music}

            </p>

            <h1 className="mt-5 text-6xl font-black tracking-tight text-white md:text-8xl">

              {club.name}

            </h1>

            <div className="mt-8 flex flex-wrap gap-3">

              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm backdrop-blur-xl">

                📍 {club.neighborhood}

              </div>

              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm backdrop-blur-xl">

                🔥 {club.liveStatus}

              </div>

              <div className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm backdrop-blur-xl">

                ⏳ {club.queue}

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-20">

        <div className="grid gap-10 lg:grid-cols-3">

          <div className="lg:col-span-2">

            <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-10 backdrop-blur-2xl">

              <h2 className="text-5xl font-black">

                About

              </h2>

              <p className="mt-8 text-lg leading-relaxed text-zinc-300">

                {club.name} is one of Barcelona’s most talked-about nightlife venues,
                known for its energetic atmosphere, international crowd
                and unforgettable nights.

              </p>

            </div>

          </div>

          <div className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl">

            <h3 className="text-3xl font-black">

              Night info

            </h3>

            <div className="mt-10 space-y-5 text-zinc-300">

              <p>🕒 {club.hours}</p>

              <p>🎵 {club.music}</p>

              <p>👕 {club.dresscode}</p>

              <p>🚇 {club.nearestMetro}</p>

              <p>🚕 {club.taxiEstimate}</p>

            </div>

          </div>

        </div>

      </section>

    </main>

  )

}