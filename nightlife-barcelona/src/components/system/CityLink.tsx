"use client"

import Link from "next/link"
import { useCallback, type ComponentProps } from "react"
import { cityPath } from "../../lib/cities"
import { useSelectedCity } from "../../lib/previewCity"

// Enlace que respeta la ciudad en pantalla (Fase E): dentro de /madrid, «/clubs» lleva a «/madrid/clubs» y «/» a «/madrid».
// En Barcelona devuelve el mismo enlace de siempre (cityPath no toca nada). Es un sustituto directo de next/link: las
// páginas comunes a todas las ciudades (ficha de local, perfil, favoritos…) pasan por cityPath sin cambiar.
type LinkProps = ComponentProps<typeof Link>

export default function CityLink({ href, ...props }: LinkProps) {
  const city = useSelectedCity()
  const resolved =
    typeof href === "string"
      ? cityPath(href, city)
      : typeof href.pathname === "string"
        ? { ...href, pathname: cityPath(href.pathname, city) }
        : href
  return <Link href={resolved} {...props} />
}

/** Para router.push / router.replace: devuelve la dirección de una página dentro de la ciudad en pantalla. */
export function useCityPath(): (path: string) => string {
  const city = useSelectedCity()
  return useCallback((path: string) => cityPath(path, city), [city])
}
