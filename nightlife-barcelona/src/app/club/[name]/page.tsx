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
        Club not found
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-5xl px-4 py-8">

        <Image
          src={club.image}
          alt={club.name}
          width={1200}
          height={700}
          className="h-[400px] w-full rounded-3xl object-cover"
        />

        <div className="mt-8">

          <h1 className="text-5xl font-bold">
            {club.name}
          </h1>

          <div className="mt-4 flex flex-wrap gap-3">

            <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black">
              {club.music}
            </span>

            <span className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
              {club.neighborhood}
            </span>

          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">

            <div className="rounded-3xl bg-zinc-900 p-6">

              <h2 className="mb-4 text-xl font-semibold">
                Information
              </h2>

              <div className="space-y-3 text-zinc-300">

                <p>
                  <span className="font-semibold text-white">
                    Address:
                  </span>{" "}
                  {club.address}
                </p>

                <p>
                  <span className="font-semibold text-white">
                    Hours:
                  </span>{" "}
                  {club.hours}
                </p>

                <p>
                  <span className="font-semibold text-white">
                    Price:
                  </span>{" "}
                  {club.price}
                </p>

                <p>
                  <span className="font-semibold text-white">
                    Metro:
                  </span>{" "}
                  {club.metro}
                </p>

              </div>

            </div>

            <div className="rounded-3xl bg-zinc-900 p-6">

              <h2 className="mb-4 text-xl font-semibold">
                About
              </h2>

              <p className="leading-relaxed text-zinc-400">
                One of Barcelona's nightlife hotspots with music,
                atmosphere and experiences for late-night culture.
              </p>

            </div>

          </div>

        </div>

      </div>

    </main>
  )
}