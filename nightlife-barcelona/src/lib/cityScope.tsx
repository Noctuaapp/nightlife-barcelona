"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { CityKey } from "./cities"

// Ciudad de la página que se está viendo (Fase E, 14/11/2026). La decide la dirección: todo lo que cuelga de /madrid está
// dentro de <CityScope city="madrid"> (app/madrid/layout.tsx) y la ficha de un local de Madrid se envuelve a mano, porque
// vive en /clubs/[slug] como las demás. Fuera de un CityScope la ciudad es Barcelona, como siempre.
// Va en un contexto (y no en usePathname) para que el HTML del servidor ya salga con la ciudad buena y para que el árbol
// de componentes no tenga que adivinarla.
const CityCtx = createContext<CityKey | null>(null)

export function CityScope({ city, children }: { city: CityKey; children: ReactNode }) {
  return <CityCtx.Provider value={city}>{children}</CityCtx.Provider>
}

/** La ciudad del CityScope más cercano, o null si no hay ninguno (= Barcelona). */
export function useCityScope(): CityKey | null {
  return useContext(CityCtx)
}
