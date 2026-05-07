"use client"

import Link from "next/link"

export default function Header() {

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

        {/* LOGO */}

        <Link
          href="/"
          className="flex items-center gap-3"
        >

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-black text-black shadow-2xl">

            N

          </div>

          <div>

            <h1 className="text-lg font-bold tracking-tight text-white">
              Noctua
            </h1>

            <p className="text-xs text-zinc-500">
              Barcelona nightlife
            </p>

          </div>

        </Link>

        {/* ACTIONS */}

        <div className="flex items-center gap-3">

          <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/10">

            Explore

          </button>

          <button className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-black transition hover:scale-[1.03]">

            Open app

          </button>

        </div>

      </div>

    </header>
  )
}