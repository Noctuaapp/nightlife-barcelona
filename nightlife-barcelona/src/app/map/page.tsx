import { nightlifeData } from "../../data/nightlife-data"

export default function MapPage() {
  return (
    <main className="h-screen overflow-hidden bg-black text-white">

      <div className="flex h-full">

        {/* SIDEBAR */}

        <aside className="hidden w-[420px] border-r border-zinc-800 bg-zinc-950 lg:block">

          <div className="border-b border-zinc-800 p-6">

            <p className="text-sm uppercase tracking-widest text-zinc-500">
              Noctua Map
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Explore nightlife
            </h1>

          </div>

          <div className="h-[calc(100vh-120px)] overflow-y-auto p-4">

            <div className="space-y-4">

              {nightlifeData.map((club) => (

                <div
                  key={club.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-600"
                >

                  <div className="flex items-start justify-between">

                    <div>

                      <h2 className="text-lg font-semibold">
                        {club.name}
                      </h2>

                      <p className="mt-1 text-sm text-zinc-400">
                        {club.neighborhood}
                      </p>

                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                      {club.music}
                    </span>

                  </div>

                  <div className="mt-4 flex items-center justify-between">

                    <span className="text-sm text-zinc-300">
                      {club.hours}
                    </span>

                    <span className="text-sm text-zinc-500">
                      {club.price}
                    </span>

                  </div>

                </div>

              ))}

            </div>

          </div>

        </aside>

        {/* MAP AREA */}

        <section className="relative flex-1">

          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">

            <div className="text-center">

              <p className="text-sm uppercase tracking-widest text-zinc-500">
                Mapbox integration
              </p>

              <h2 className="mt-4 text-4xl font-bold">
                Interactive map coming soon
              </h2>

              <p className="mt-4 max-w-md text-zinc-400">
                Clubs, events, nightlife spots and live exploration
                will appear here.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  )
}