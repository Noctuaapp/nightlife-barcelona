"use client"

type TransportButtonsProps = {
  name: string
  address: string | null
  lat: number | null
  lng: number | null
}

export default function TransportButtons({ name, address, lat, lng }: TransportButtonsProps) {
  const dest = encodeURIComponent(address || name)
  const encodedName = encodeURIComponent(name)

  const uberLink = lat && lng
    ? `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodedName}`
    : `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`

  const handleCabify = () => {
    const deepLink = `cabify://cabify.com/ride?dest[0][name]=${encodedName}&dest[0][address]=${dest}`
    const fallback = `https://cabify.com`
    window.location.href = deepLink
    setTimeout(() => { window.location.href = fallback }, 1500)
  }

  const handleFreeNow = () => {
    const deepLink = `free-now://`
    const fallback = `https://free-now.com`
    window.location.href = deepLink
    setTimeout(() => { window.location.href = fallback }, 1500)
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-500 mb-3">Get there</p>
      <div className="grid grid-cols-3 gap-3">
        <a href={uberLink} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-bold text-white transition hover:bg-white/10 hover:scale-[1.02]">
          <span className="text-2xl">🚗</span>
          Uber
        </a>
        <button onClick={handleCabify} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-bold text-white transition hover:scale-[1.02]" style={{ background: "rgba(124,58,237,0.2)", borderColor: "rgba(124,58,237,0.4)" }}>
          <span className="text-2xl">🟣</span>
          Cabify
        </button>
        <button onClick={handleFreeNow} className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-bold text-white transition hover:scale-[1.02]" style={{ background: "rgba(202,138,4,0.2)", borderColor: "rgba(202,138,4,0.4)" }}>
          <span className="text-2xl">🚕</span>
          FREE NOW
        </button>
      </div>
    </div>
  )
}