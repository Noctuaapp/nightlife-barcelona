"use client"

import Link from "../system/CityLink"
import { Pill, Banknote, UtensilsCrossed, ShoppingCart, Bus, TrainFront, CarTaxiFront, Hospital, type LucideIcon } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { useCityT } from "../../lib/useCityT"
import { useSelectedCity } from "../../lib/previewCity"
import type { CityKey } from "../../lib/cities"
import { essentialEntryHref } from "../../lib/essentialCategories"

// Esenciales de la noche en la portada: accesos directos compactos. Antes eran 7 tarjetas de
// 300 px de alto con degradados de colores, e incluían Hotel y Casino, que no son esenciales para
// volver a casa o resolver algo a las 3 de la mañana. Ahora son los 6 que sí lo son.
// Taxi se quitó (no informaba de nada; pedir uno ya funciona desde la ficha de cada club).
type Tile = { key: string; slug: string; icon: LucideIcon }
const COMMON: Tile[] = [
  { key: "Pharmacy", slug: "pharmacy", icon: Pill },
  { key: "ATM", slug: "atm", icon: Banknote },
  { key: "Food", slug: "food", icon: UtensilsCrossed },
  { key: "Supermarket", slug: "supermarket", icon: ShoppingCart },
]
// El metro y el Nitbus son de Barcelona (sus páginas y datos son de esa red): en Madrid, en su lugar, taxi y urgencias, que
// existen en las dos ciudades.
const CATEGORIES: Record<CityKey, Tile[]> = {
  barcelona: [...COMMON, { key: "Metro", slug: "metro", icon: TrainFront }, { key: "Nitbus", slug: "nitbus", icon: Bus }],
  madrid: [...COMMON, { key: "Taxi", slug: "taxi", icon: CarTaxiFront }, { key: "Hospital", slug: "hospital", icon: Hospital }],
}

export default function AreasSection() {
  const { t } = useLanguage()
  const tc = useCityT()
  const city = useSelectedCity()

  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6" aria-labelledby="essentials-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="essentials-title" className="font-display text-3xl sm:text-4xl">
            {t("essentials.title")}
          </h2>
          <p className="mt-2 text-sm text-zinc-300">{tc("essentials.subtitle")}</p>
        </div>
        <Link href="/essentials" className="shrink-0 text-sm font-semibold text-zinc-300 hover:text-ink">
          {t("home.seeAll")}
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES[city].map((cat) => {
          const Icon = cat.icon
          return (
            <Link
              key={cat.slug}
              href={essentialEntryHref(cat.slug, city)}
              className="flex flex-col gap-3 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"
            >
              <Icon size={22} className="text-brand-soft" />
              <span>
                <span className="block text-sm font-semibold text-ink">{t(`essentials.category_names.${cat.key}`)}</span>
                <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{tc(`essentials.categories.${cat.key}`)}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
