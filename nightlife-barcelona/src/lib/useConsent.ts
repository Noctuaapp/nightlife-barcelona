"use client"

import { useEffect, useState } from "react"
import { CONSENT_CHANGE_EVENT, readConsent } from "./consent"

// Estado del permiso de cookies para los componentes. `ready` es false hasta que se ha leído el
// navegador: el servidor no puede saberlo, y pintar algo distinto en el primer render rompería la
// hidratación. Mientras no esté listo, nadie debe mostrar ni guardar nada.
export type ConsentView = { ready: boolean; decided: boolean; optional: boolean }

export function useConsent(): ConsentView {
  const [view, setView] = useState<ConsentView>({ ready: false, decided: false, optional: false })

  useEffect(() => {
    const sync = () => {
      const c = readConsent()
      setView({ ready: true, decided: c !== null, optional: c?.optional === true })
    }
    sync()
    window.addEventListener(CONSENT_CHANGE_EVENT, sync)
    window.addEventListener("storage", sync) // otra pestaña cambió la decisión
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  return view
}
