import { Pill, Banknote, UtensilsCrossed, TrainFront, Bus, ShoppingCart, BedDouble, Dices, Fuel, Hospital, MapPin, type LucideIcon } from "lucide-react"

// Categorías de esenciales: el valor de la columna `category` → URL e icono. Antes cada página
// tenía su copia con un emoji y un color distinto por categoría (doce colores compitiendo con el
// violeta de la marca). Ahora: un icono de línea y el mismo color para todas.
// "Taxi" y "Transport" se quitaron de aquí (ver /essentials/page.tsx): no informaban de nada útil
// como sitio al que ir andando (Taxi solo tenía oficinas de Uber/Cabify; Transport solo el
// Aerobus) y moverse de noche ya funciona bien desde la ficha de cada club (RideButtons) y la
// categoría Nitbus/Metro.
export const ESSENTIAL_CATEGORIES: { key: string; slug: string; icon: LucideIcon }[] = [
  { key: "Pharmacy", slug: "pharmacy", icon: Pill },
  { key: "ATM", slug: "atm", icon: Banknote },
  { key: "Food", slug: "food", icon: UtensilsCrossed },
  { key: "Supermarket", slug: "supermarket", icon: ShoppingCart },
  { key: "Metro", slug: "metro", icon: TrainFront },
  { key: "Nitbus", slug: "nitbus", icon: Bus },
  { key: "Hospital", slug: "hospital", icon: Hospital },
  { key: "Gas Station", slug: "gas-station", icon: Fuel },
  { key: "Hotel", slug: "hotel", icon: BedDouble },
  { key: "Casino", slug: "casino", icon: Dices },
]

export function categoryInfo(key: string): { key: string; slug: string; icon: LucideIcon } {
  return ESSENTIAL_CATEGORIES.find((c) => c.key === key) || { key, slug: key.toLowerCase().replace(/\s+/g, "-"), icon: MapPin }
}

export function categoryRank(key: string): number {
  const i = ESSENTIAL_CATEGORIES.findIndex((c) => c.key === key)
  return i === -1 ? 99 : i
}

// Clave de traducción del nombre: essentials.category_names.<Key sin espacios>
export const categoryNameKey = (key: string) => `essentials.category_names.${key.replace(/\s+/g, "")}`
export const categoryDescKey = (key: string) => `essentials.categories.${key.replace(/\s+/g, "")}`
