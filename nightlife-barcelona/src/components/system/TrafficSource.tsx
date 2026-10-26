"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { track, getSessionId, getTrafficSource, markSessionStart } from "../../lib/track"

// Se monta una vez en el layout. Registra el inicio de cada visita con su origen (Google,
// Instagram, invitación, directo...). Sin sessionStorage: ver src/lib/track.ts.
//
// Desde el 26/10/2026 registra también cada cambio de página dentro de la visita ("page_nav"),
// para poder ver en Admin › Visitas el recorrido de cada sesión (por dónde entra, qué mira y
// dónde lo deja). Sin datos personales: solo la ruta (sin ?parámetros).
export default function TrafficSource() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!markSessionStart()) return
    getSessionId()
    getTrafficSource()
    track("session_start", { itemType: "site" })
  }, [])

  useEffect(() => {
    if (!pathname) return
    // La primera página ya va en "session_start" (su path es la página de entrada).
    if (last.current === null) {
      last.current = pathname
      return
    }
    if (last.current === pathname) return
    last.current = pathname
    track("page_nav", { itemType: "page" })
  }, [pathname])

  return null
}
