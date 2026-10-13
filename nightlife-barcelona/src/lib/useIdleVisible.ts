"use client"

import { useEffect, useState } from "react"

// Devuelve true mientras la persona está usando la pantalla y false tras `idleMs` sin tocar,
// mover el ratón, hacer scroll o pulsar una tecla. Se usa para esconder barras fijas que
// tapan el final de la página y volver a mostrarlas al interactuar.
export function useIdleVisible(idleMs = 3000, resetKey?: string): boolean {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      setVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), idleMs)
    }
    arm()
    const events = ["touchstart", "touchmove", "scroll", "keydown", "mousemove", "pointerdown"] as const
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, arm))
    }
  }, [idleMs, resetKey])
  return visible
}
