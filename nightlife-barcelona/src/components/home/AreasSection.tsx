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
            className="group fade-up overflow-hidden rounded-[28px] border bg-white/[0.03] transition duration-500 hover:-translate-y-1.5"
            style={{ animationDelay: `${index * 0.08}s`, borderColor: `${cat.color}40`, boxShadow: `0 18px 50px -28px ${cat.color}80` }}
          >
            <div
              className="relative h-[220px] overflow-hidden"
              style={{
                background: `radial-gradient(70% 90% at 80% 15%, ${cat.color}90 0%, transparent 60%), radial-gradient(60% 70% at 10% 100%, ${cat.color}50 0%, transparent 65%), linear-gradient(135deg, ${cat.color}40 0%, #120d24 100%)`,
              }}
            >
              <div
                aria-hidden="true"
                className="absolute right-6 top-6 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-5xl backdrop-blur-md transition duration-500 group-hover:-rotate-6 group-hover:scale-110"
                style={{ boxShadow: `0 12px 40px -10px ${cat.color}` }}
              >
                {cat.icon}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-5">
                <h3 className="text-3xl font-black tracking-tight text-white">
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