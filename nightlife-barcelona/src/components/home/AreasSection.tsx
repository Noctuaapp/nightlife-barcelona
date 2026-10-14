"use client"

import Link from "next/link"
import { Pill, Banknote, UtensilsCrossed, ShoppingCart, Bus, CarTaxiFront, type LucideIcon } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"

// Esenciales de la noche en la portada: accesos directos compactos. Antes eran 7 tarjetas de
// 300 px de alto con degradados de colores, e incluían Hotel y Casino, que no son esenciales para
// volver a casa o resolver algo a las 3 de la mañana. Ahora son los 6 que sí lo son.
const CATEGORIES: { key: string; slug: string; icon: LucideIcon }[] = [
  { key: "Pharmacy", slug: "pharmacy", icon: Pill },
  { key: "ATM", slug: "atm", icon: Banknote },
  { key: "Food", slug: "food", icon: UtensilsCrossed },
  { key: "Supermarket", slug: "supermarket", icon: ShoppingCart },
  { key: "Nitbus", slug: "nitbus", icon: Bus },
  { key: "Taxi", slug: "taxi", icon: CarTaxiFront },
]

export default function AreasSection() {
  const { t } = useLanguage()

  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6" aria-labelledby="essentials-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="essentials-title" className="font-display text-3xl sm:text-4xl">
            {t("essentials.title")}
          </h2>
          <p className="mt-2 text-sm text-zinc-300">{t("essentials.subtitle")}</p>
        </div>
        <Link href="/essentials" className="shrink-0 text-sm font-semibold text-zinc-300 hover:text-ink">
          {t("home.seeAll")}
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <Link
              key={cat.slug}
              href={`/essentials/${cat.slug}`}
              className="flex flex-col gap-3 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"
            >
              <Icon size={22} className="text-brand-soft" />
              <span>
                <span className="block text-sm font-semibold text-ink">{t(`essentials.category_names.${cat.key}`)}</span>
                <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{t(`essentials.categories.${cat.key}`)}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
