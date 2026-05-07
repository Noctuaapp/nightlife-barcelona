"use client"

export default function Header() {

  return (

    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-2xl">

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">

        {/* LOGO */}

        <div className="flex items-center gap-4">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-black shadow-2xl">

            N

          </div>

          <div>

            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Barcelona
            </p>

            <h1 className="text-lg font-black tracking-tight text-white">

              Nightlife

            </h1>

          </div>

        </div>

        {/* NAV */}

        <div className="hidden items-center gap-3 md:flex">

          <button className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]">

            Clubs

          </button>

          <button className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]">

            Events

          </button>

          <button className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]">

            Areas

          </button>

        </div>

      </div>

    </header>
  )
}