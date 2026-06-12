import Link from "next/link"
import Image from "next/image"

const essentialCategories = [
  { name: "Pharmacies", slug: "pharmacy", image: "/essentials/pharmacy.jpg", description: "24h pharmacies across Barcelona", icon: "💊" },
  { name: "ATMs", slug: "atm", image: "/essentials/atm.jpg", description: "Cash machines open all night", icon: "🏧" },
  { name: "Late Night Food", slug: "food", image: "/essentials/foodie.jpg", description: "Food open after 3AM", icon: "🍔" },
  { name: "Night Transport", slug: "transport", image: "/essentials/transport.jpg", description: "Night buses and metro", icon: "🚇" },
  { name: "Supermarkets", slug: "supermarket", image: "/essentials/supermarket.jpg", description: "Open late night shops", icon: "🛒" },
  { name: "Hotels", slug: "hotel", image: "/essentials/hotel.jpg", description: "Hotels near the nightlife areas", icon: "🏨" },
]

export default function AreasSection() {
  return (
    <section className="mx-auto mt-28 max-w-7xl px-4">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Night essentials</p>
        <h2 className="mt-4 text-5xl font-black tracking-tight text-white">
          Everything you need after dark
        </h2>
        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          Pharmacies, supermarkets, ATMs and useful late-night services across Barcelona.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {essentialCategories.map((cat, index) => (
          <Link
            key={cat.slug}
            href={`/essentials/${cat.slug}`}
            className="group fade-up overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-1 hover:border-white/20"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="relative h-[220px] overflow-hidden">
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{cat.icon}</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{cat.name}</h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-zinc-400">{cat.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Explore →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}