export default function BottomNav() {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-black/95 backdrop-blur">
  
        <div className="mx-auto flex max-w-xl items-center justify-around px-6 py-4">
  
          <button className="flex flex-col items-center text-white">
            <span className="text-sm font-medium">Discover</span>
          </button>
  
          <button className="flex flex-col items-center text-zinc-500">
            <span className="text-sm">Map</span>
          </button>
  
          <button className="flex flex-col items-center text-zinc-500">
            <span className="text-sm">Events</span>
          </button>
  
          <button className="flex flex-col items-center text-zinc-500">
            <span className="text-sm">Saved</span>
          </button>
  
        </div>
  
      </nav>
    )
  }