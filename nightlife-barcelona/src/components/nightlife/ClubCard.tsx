import Image from "next/image"
import Link from "next/link"

interface ClubCardProps {
  name: string
  music: string
  area: string
  price: string
  hours: string
  image: string
}

export default function ClubCard({
  name,
  music,
  area,
  price,
  hours,
  image,
}: ClubCardProps) {
  return (
    <Link href={`/club/${name.toLowerCase()}`}>

      <div className="overflow-hidden rounded-3xl bg-zinc-900 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl">

        <div className="overflow-hidden">

          <Image
            src={image}
            alt={name}
            width={600}
            height={400}
            className="h-52 w-full object-cover transition duration-300 hover:scale-105"
          />

        </div>

        <div className="p-5">

          <div className="flex items-start justify-between gap-4">

            <div>

              <h2 className="text-xl font-bold text-white">
                {name}
              </h2>

              <div className="mt-2 flex flex-wrap gap-2">

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                  {music}
                </span>

                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                  {area}
                </span>

              </div>

            </div>

            <div className="text-right">

              <p className="text-lg font-semibold text-white">
                {price}
              </p>

              <p className="text-xs text-zinc-500">
                entry
              </p>

            </div>

          </div>

          <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4">

            <div className="flex flex-col">

              <span className="text-sm font-medium text-white">
                {hours}
              </span>

              <span className="text-xs text-zinc-500">
                Tonight
              </span>

            </div>

            <span className="text-sm font-medium text-zinc-400">
              View →
            </span>

          </div>

        </div>

      </div>

    </Link>
  )
}