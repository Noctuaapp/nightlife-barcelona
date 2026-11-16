"use client"

import { useEffect, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { CITIES, type CityKey } from "../../lib/cities"
import { cityForPath, readRememberedCity } from "../../lib/cityMemory"
import { CityScope } from "../../lib/cityScope"
import { useIsAdmin } from "../../lib/useIsAdmin"

// Envuelve toda la web (app/layout.tsx) y pone la ciudad a las páginas que no llevan la suya (16/11/2026; ver lib/cityMemory.ts).
// Las páginas de una ciudad (/madrid/…, «/», «/clubs»…) reciben la de su dirección y la dejan recordada; las comunes (perfil, favoritos,
// acceso, contacto, la ficha de un evento…) reciben la recordada, para que su cabecera, sus pestañas y el pie sigan en la ciudad
// de la que venía quien las abre y ningún botón le lleve a la otra. Las de dentro (madrid/layout.tsx, la ficha de un local) ponen su
// propio CityScope y mandan sobre este.
// Lo recordado se lee ya montado: el HTML del servidor sale en Barcelona y, en una página común abierta desde Madrid, pasa a
// Madrid al cargar (un parpadeo de la etiqueta de la cabecera, nada más).
export default function AutoCityScope({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [remembered, setRemembered] = useState<CityKey | null>(null)

  useEffect(() => {
    setRemembered(readRememberedCity())
  }, [pathname])

  // Una ciudad en «prelaunch» (Madrid, mientras no se abra) solo se hereda si quien mira es admin: a un visitante que, por lo que sea,
  // la tuviera guardada en el navegador (un equipo compartido con el admin) no se le enseña, y su web sigue en Barcelona.
  const isAdmin = useIsAdmin()
  const usable = remembered && (!CITIES[remembered].prelaunch || isAdmin) ? remembered : null

  const { city, explicit } = cityForPath(pathname, usable)
  return (
    <CityScope city={city} remember={explicit}>
      {children}
    </CityScope>
  )
}
