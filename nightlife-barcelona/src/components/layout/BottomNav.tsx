"use client"

export default function BottomNav() {

  return (

    <div className="fixed bottom-6 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2">

      <div className="flex items-center justify-between rounded-[32px] border border-white/10 bg-black/50 px-6 py-4 shadow-2xl backdrop-blur-2xl">

        {/* HOME */}

        <button className="flex flex-col items-center gap-1 text-white">

          <span className="text-xl">
            🏠
          </span>

          <span className="text-xs font-medium">
            Home
          </span>

        </button>

        {/* EVENTS */}

        <button className="flex flex-col items-center gap-1 text-zinc-500 transition hover:text-white">

          <span className="text-xl">
            🎫
          </span>

          <span className="text-xs font-medium">
            Events
          </span>

        </button>

        {/* FAVORITES */}

        <button className="flex flex-col items-center gap-1 text-zinc-500 transition hover:text-white">

          <span className="text-xl">
            ❤️
          </span>

          <span className="text-xs font-medium">
            Saved
          </span>

        </button>

        {/* PROFILE */}

        <button className="flex flex-col items-center gap-1 text-zinc-500 transition hover:text-white">

          <span className="text-xl">
            👤
          </span>

          <span className="text-xs font-medium">
            Profile
          </span>

        </button>

      </div>

    </div>
  )
}