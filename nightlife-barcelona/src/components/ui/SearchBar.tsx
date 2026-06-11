type SearchBarProps = {
  search: string
  setSearch: (value: string) => void
  onSearch?: () => void
}

export default function SearchBar({
  search,
  setSearch,
  onSearch,
}: SearchBarProps) {

  return (

    <div className="relative max-w-xl">

      <input
        type="text"
        value={search}
        placeholder="Search clubs, areas or music..."
        onChange={(e) =>
          setSearch(e.target.value)
        }
        onKeyDown={(e) => {

          if (e.key === "Enter") {

            onSearch?.()

          }

        }}
        className="w-full rounded-2xl border border-white/10 bg-white/10 px-6 py-5 text-lg text-white placeholder:text-zinc-400 backdrop-blur-xl outline-none transition focus:border-white/20"
      />

      <button
        onClick={onSearch}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white px-5 py-2 font-semibold text-black transition hover:scale-105"
      >

        Search

      </button>

    </div>

  )

}