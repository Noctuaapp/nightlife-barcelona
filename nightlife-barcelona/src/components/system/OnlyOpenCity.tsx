"use client"

import type { ReactNode } from "react"
import { CITIES } from "../../lib/cities"
import { useSelectedCity } from "../../lib/previewCity"

// Lo que viene del servidor para la ciudad en pantalla (índices y enlaces a barrios, por ejemplo) no se enseña mientras esa
// ciudad esté en vista previa (solo el admin, en /madrid con Madrid en prelaunch): el servidor no entrega sus locales y
// los índices saldrían vacíos o ajenos. Con la ciudad abierta se enseña siempre, y el servidor lo pinta en el HTML.
export default function OnlyOpenCity({ children }: { children: ReactNode }) {
  return CITIES[useSelectedCity()].prelaunch ? null : <>{children}</>
}
