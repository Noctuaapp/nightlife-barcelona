"use client"

import { useEffect, useState } from "react"
import { madridToday } from "./madridDay"

/**
 * El «hoy» de Madrid (AAAA-MM-DD) que se actualiza solo. Una pantalla del admin que se queda abierta pasada la medianoche
 * (o un móvil que vuelve a la pestaña por la mañana) seguía creyendo que era el día de ayer: las gráficas acababan en el
 * día anterior (20/11/2026). Se comprueba cada 30 s y al volver a la pestaña.
 */
export function useMadridToday(): string {
  const [today, setToday] = useState(madridToday)
  useEffect(() => {
    const check = () => setToday((prev) => {
      const now = madridToday()
      return now === prev ? prev : now
    })
    const id = setInterval(check, 30_000)
    document.addEventListener("visibilitychange", check)
    window.addEventListener("focus", check)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", check)
      window.removeEventListener("focus", check)
    }
  }, [])
  return today
}
