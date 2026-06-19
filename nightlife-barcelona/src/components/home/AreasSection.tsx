"use client"

import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "../../context/LanguageContext"

export default function AreasSection() {
  const { t } = useLanguage()

  const essentialCategories = [
    { key: "Pharmacy", slug: "pharmacy", image: "/essentials/pharmacy.jpg", icon: "💊" },
    { key: "ATM", slug: "atm", image: "/essentials/atm.jpg", icon: "🏧" },
    { key: "Food", slug: "food", image: "/essentials/foodie.jpg", icon: "🍔" },
    { key: "Transport", slug: "transport", image: "/essentials/transport.jpg", icon: "🚇" },
    { key: "Supermarket", slug: "supermarket", image: "/essentials/supermarket.jpg", icon: "🛒" },
    { key: "Hotel", slug: "hotel", image: "/essentials/hotel.jpg", icon: "🏨" },
    { key: "Casino", slug: "casino", image: "/essentials/casino.jpg", icon: "🎰" },
  ]

  return (
    <section className="mx-auto mt-28 max-w-7xl px-4">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("essentials.title")}</p>
        <h2 className="mt-4 text-5xl font-black tracking-tight text-white">
          {t("essentials.subtitle")}
        </h2>
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
                alt={t(`essentials.category_names.${cat.key}`)}
                fill
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-5">
                <p className="text-sm uppercase tracking-wide text-zinc-400">{cat.icon}</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {t(`essentials.category_names.${cat.key}`)}
                </h3>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-zinc-400">{t(`essentials.categories.${cat.key}`)}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{t("essentials.view_all")}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}