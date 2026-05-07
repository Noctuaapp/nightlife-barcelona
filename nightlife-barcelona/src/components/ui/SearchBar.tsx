"use client"

interface SearchBarProps {
  search: string
  setSearch: (value: string) => void
}

export default function SearchBar({
  search,
  setSearch,
}: SearchBarProps) {

  return (

    <div className="group relative">

      {/* GLOW */}

      <div className="absolute inset-0 rounded-[28px] bg-white/5 opacity-0 blur-2xl transition duration-500 group-focus-within:opacity-100" />

      {/* ICON */}

      <div className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-zinc-500 transition duration-300 group-focus-within:text-white">

        🔍

      </div>

      {/* INPUT */}

      <input
        type="text"
        placeholder="Search clubs, music or areas..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="relative h-16 w-full rounded-[28px] border border-white/10 bg-white/[0.04] pl-14 pr-5 text-white outline-none backdrop-blur-xl transition duration-300 placeholder:text-zinc-500 focus:scale-[1.01] focus:border-white/20 focus:bg-white/[0.06]"
      />

    </div>
  )
}