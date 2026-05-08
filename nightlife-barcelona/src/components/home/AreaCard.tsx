import Image from "next/image"

interface AreaCardProps {

  name: string

  image: string

  vibe: string

  crowd: string

  bestFor: string

  energy: string

  badges: string[]

  mapsLink: string

  actionLabel: string
}

export default function AreaCard({
  name,
  image,
  vibe,
  crowd,
  bestFor,
  energy,
  badges,
  mapsLink,
  actionLabel,
}: AreaCardProps) {

  return (

    <div className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-1 hover:border-white/20">

      {/* IMAGE */}

      <div className="relative h-[220px] overflow-hidden">

        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

        {/* BADGES */}

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">

          {badges.slice(0, 2).map((badge) => (

            <div
              key={badge}
              className="rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-white backdrop-blur-xl"
            >

              {badge}

            </div>

          ))}

        </div>

        {/* TITLE */}

        <div className="absolute bottom-0 left-0 w-full p-5">

          <p className="text-sm uppercase tracking-wide text-zinc-400">

            {vibe}

          </p>

          <h3 className="mt-2 text-3xl font-black tracking-tight text-white">

            {name}

          </h3>

        </div>

      </div>

      {/* CONTENT */}

      <div className="space-y-4 p-5">

        {/* QUICK INFO */}

        <div className="grid grid-cols-2 gap-3">

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

            <p className="text-xs uppercase tracking-wide text-zinc-500">

              Access

            </p>

            <p className="mt-2 text-sm font-semibold text-white">

              {crowd}

            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

            <p className="text-xs uppercase tracking-wide text-zinc-500">

              Availability

            </p>

            <p className="mt-2 text-sm font-semibold text-white">

              {energy}

            </p>

          </div>

        </div>

        {/* BEST FOR */}

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

          <p className="text-xs uppercase tracking-wide text-zinc-500">

            Best for

          </p>

          <p className="mt-2 text-sm font-semibold text-white">

            {bestFor}

          </p>

        </div>

        {/* ACTIONS */}

        <div className="flex gap-3 pt-1">

          <a
            href={mapsLink}
            target="_blank"
            className="flex-1 rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-black transition hover:scale-[1.02]"
          >

            {actionLabel}

          </a>

          <button className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10">

            Save

          </button>

        </div>

      </div>

    </div>
  )
}