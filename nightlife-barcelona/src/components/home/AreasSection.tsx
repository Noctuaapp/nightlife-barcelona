"use client"

import Link from "../system/CityLink"
import { Pill, Banknote, UtensilsCrossed, ShoppingCart, Bus, TrainFront, CarTaxiFront, Hospital, type LucideIcon } from "lucide-react"
import { useLanguage } from "../../context/LanguageContext"
import { useCityT } from "../../lib/useCityT"
import { useSelectedCity } from "../../lib/previewCity"
import type { CityKey } from "../../lib/cities"
import { GROUP_ACCENT, categoryInfo, essentialEntryHref } from "../../lib/essentialCategories"
import CategoryTile from "../essentials/CategoryTile"

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
        {CATEGORIES[city].map((cat) => (
          // 19/11/2026: antes eran recuadros planos y grises; ahora la misma tarjeta con luz de color que /essentials (el color es el de su
          // grupo: salud, moverse, comer…), con contorno de ese color y el icono grande de marca de agua.
          <CategoryTile
            key={cat.slug}
            href={essentialEntryHref(cat.slug, city)}
            icon={cat.icon}
            accent={GROUP_ACCENT[categoryInfo(cat.key).group]}
            title={t(`essentials.category_names.${cat.key}`)}
            bordered
          >
            <span className="mt-1 line-clamp-2 block text-xs leading-snug text-zinc-300">{tc(`essentials.categories.${cat.key}`)}</span>
          </CategoryTile>
        ))}
      </div>
    </section>
  )
}
