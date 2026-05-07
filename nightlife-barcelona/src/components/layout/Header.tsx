export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

        <div>
          <h1 className="text-2xl font-bold text-white">
            Noctua
          </h1>

          <p className="text-sm text-zinc-400">
            Barcelona Nightlife Guide
          </p>
        </div>

        <button className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:scale-105">
          Map
        </button>

      </div>
    </header>
  )
}