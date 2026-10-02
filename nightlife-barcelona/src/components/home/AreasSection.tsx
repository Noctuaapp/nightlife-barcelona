"use client"

import Link from "next/link"
import { useLanguage } from "../../context/LanguageContext"
import ArrowIcon from "../ui/ArrowIcon"

export default function AreasSection() {
  const { t } = useLanguage()

  // Antes esto apuntaba a fotos de stock genéricas en /public/essentials/*.jpg (gente sonriendo
  // en una farmacia, un cajero cualquiera...) que no pegaban nada con el resto del site, oscuro y
  // con acentos de color por categoría. Ahora reutilizamos el mismo tratamiento que ya usa
  // ClubCard cuando un club no tiene foto: degradado del color de la categoría + su icono en
  // grande de fondo. Es consistente con los mismos colores que ya usa /essentials por categoría.
  const essentialCategories = [
    { key: "Pharmacy", slug: "pharmacy", icon: "💊", color: "#10b981" },
    { key: "ATM", slug: "atm", icon: "🏧", color: "#3b82f6" },
    { key: "Food", slug: "food", icon: "🍔", color: "#f97316" },
    { key: "Transport", slug: "transport", icon: "🚇", color: "#8b5cf6" },
    { key: "Supermarket", slug: "supermarket", icon: "🛒", color: "#ec4899" },
    { key: "Hotel", slug: "hotel", icon: "🏨", color: "#14b8a6" },
    { key: "Casino", slug: "casino", icon: "🎰", color: "#f43f5e" },
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
            <div
              className="relative h-[220px] overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${cat.color}35 0%, rgba(5,3,8,0.95) 100%)` }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-[7rem] opacity-20 transition duration-700 group-hover:scale-110"
              >
                {cat.icon}
              </span>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
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
                <span className="text-sm font-semibold text-zinc-300">{t("essentials.view_all")}</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition duration-300 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-purple-400 group-hover:to-pink-400 group-hover:text-white">
                  <ArrowIcon className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}