"use client"

import type { ReactNode } from "react"
import { useSelectedCity } from "../../lib/previewCity"

// Lo que solo tiene sentido en Barcelona (índices y enlaces a barrios, por ejemplo) no se enseña cuando el admin
// tiene otra ciudad en vista previa (lib/previewCity.ts). Para el público siempre se enseña, y el servidor lo pinta
// en el HTML igual que antes.
export default function OnlyBarcelona({ children }: { children: ReactNode }) {
  return useSelectedCity() === "barcelona" ? <>{children}</> : null
}
