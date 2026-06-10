type TransportButtonsProps = {
    name: string
    address: string | null
    lat: number | null
    lng: number | null
  }
  
  export default function TransportButtons({ name, address, lat, lng }: TransportButtonsProps) {
    const dest = encodeURIComponent(address || name)
    const uberLink = lat && lng
      ? `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}`
      : `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
    const cabifyLink = `https://cabify.com/ride?dest[0][name]=${encodeURIComponent(name)}&dest[0][address]=${dest}`
    const taxiLink = `https://www.taxi.barcelona/en`
  
    return (
      <div className="mt-6">
        <p className="text-sm text-zinc-500 mb-3">Get there</p>
        <div className="grid grid-cols-3 gap-3">
          
        <a  href={uberLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-4 text-xs font-bold text-white transition hover:bg-white/10 hover:scale-[1.02]"
          >
            <span className="text-2xl">🚗</span>
            Uber
          </a>
          
          <a  href={cabifyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-bold text-white transition hover:scale-[1.02]"
            style={{ background: "rgba(124,58,237,0.2)", borderColor: "rgba(124,58,237,0.4)" }}
          >
            <span className="text-2xl">🟣</span>
            Cabify
          </a>
          
          <a  href={taxiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 text-xs font-bold text-white transition hover:scale-[1.02]"
            style={{ background: "rgba(202,138,4,0.2)", borderColor: "rgba(202,138,4,0.4)" }}
          >
         <span className="text-2xl">🚕</span>
            Taxi
          </a>
        </div>
      </div>
    )
  }