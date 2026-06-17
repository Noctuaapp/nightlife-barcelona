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

  const uberFallback = lat && lng
    ? `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodedName}`
    : `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`

  const uberDeep = lat && lng
    ? `uber://?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodedName}`
    : `uber://?action=setPickup&dropoff[formatted_address]=${dest}`

  const cabifyFallback = `https://cabify.com/ride?dest[0][name]=${encodedName}&dest[0][address]=${dest}`
  const cabifyDeep = lat && lng
    ? `cabify://cabify.com/ride?dest[0][latitude]=${lat}&dest[0][longitude]=${lng}&dest[0][name]=${encodedName}`
    : `cabify://cabify.com/ride?dest[0][name]=${encodedName}&dest[0][address]=${dest}`

  const freeNowFallback = `https://free-now.com`
  const freeNowDeep = lat && lng
    ? `mytaxi://?dest_lat=${lat}&dest_lng=${lng}&dest_name=${encodedName}`
    : `mytaxi://`

  const isMobile = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const handleClick = (deepLink: string, fallback: string) => {
    if (isMobile()) {
      const start = Date.now()
      window.location.href = deepLink
      setTimeout(() => {
        if (Date.now() - start < 2000) {
          window.location.href = fallback
        }
      }, 1500)
    } else {
      window.open(fallback, "_blank")
    }
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-zinc-500 mb-3">Get there</p>
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => handleClick(uberDeep, uberFallback)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-bold text-white transition hover:bg-white/10 hover:scale-[1.02]"
        >
          <span className="text-2xl">🚗</span>
          Uber
        </button>
        <button
          onClick={() => handleClick(cabifyDeep, cabifyFallback)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-bold text-white transition hover:scale-[1.02]"
          style={{ background: "rgba(124,58,237,0.2)", borderColor: "rgba(124,58,237,0.4)" }}
        >
          <span className="text-2xl">🟣</span>
          Cabify
        </button>
        <button
          onClick={() => handleClick(freeNowDeep, freeNowFallback)}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-bold text-white transition hover:scale-[1.02]"
          style={{ background: "rgba(202,138,4,0.2)", borderColor: "rgba(202,138,4,0.4)" }}
        >
          <span className="text-2xl">🚕</span>
          FREE NOW
        </button>
      </div>
    </div>
  )
}