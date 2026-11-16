"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import type { CityKey } from "./cities"
import { rememberCity } from "./cityMemory"

// Ciudad de la página que se está viendo (Fase E, 14/11/2026). La decide la dirección: todo lo que cuelga de /madrid está
// dentro de <CityScope city="madrid"> (app/madrid/layout.tsx) y la ficha de un local de Madrid se envuelve a mano, porque
// vive en /clubs/[slug] como las demás. Las páginas comunes (perfil, favoritos, acceso…) heredan la ciudad recordada: ver
// lib/cityMemory.ts y components/system/AutoCityScope.tsx, que envuelve toda la web. Sin ningún CityScope, Barcelona.
// Va en un contexto (y no en usePathname) para que el HTML del servidor ya salga con la ciudad buena y para que el árbol
// de componentes no tenga que adivinarla.
const CityCtx = createContext<CityKey | null>(null)

/**
 * `remember` (por defecto sí): al pintarse, la ciudad pasa a ser la recordada en esta pestaña. Lo desactiva quien solo hereda
 * la ciudad (las páginas comunes) para no pisar lo recordado.
 */
export function CityScope({ city, remember = true, children }: { city: CityKey; remember?: boolean; children: ReactNode }) {
  useEffect(() => {
    if (remember) rememberCity(city)
  }, [city, remember])
  return <CityCtx.Provider value={city}>{children}</CityCtx.Provider>
}

/** La ciudad del CityScope más cercano, o null si no hay ninguno (= Barcelona). */
export function useCityScope(): CityKey | null {
  return useContext(CityCtx)
}
