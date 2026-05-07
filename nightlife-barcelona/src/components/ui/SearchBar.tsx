interface SearchBarProps {
    search: string
    setSearch: (value: string) => void
  }
  
  export default function SearchBar({
    search,
    setSearch,
  }: SearchBarProps) {
    return (
      <div className="mt-6">
  
        <div className="flex items-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
  
          <input
            type="text"
            placeholder="Search clubs, events, areas..."
            value={search || ""}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
          />
  
        </div>
  
      </div>
    )
  }