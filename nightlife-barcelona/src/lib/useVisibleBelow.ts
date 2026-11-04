"use client"

import { useEffect, useState, type RefObject } from "react"

// Alto que queda a la vista POR DEBAJO de un elemento (04/11/2026). Sirve para los desplegables de
// los buscadores: en el móvil el teclado tapa la mitad de abajo de la pantalla, y una lista de
// resultados que se abre hacia abajo quedaba escondida detrás. Con este alto se le pone un máximo a
// la lista (y hace scroll por dentro), de forma que siempre cabe entre el buscador y el teclado.
//
// Usa visualViewport (lo que el navegador deja ver de verdad, ya sin el teclado) y se recalcula al
// abrirse el teclado, al hacer scroll y al girar el móvil. Devuelve null mientras no está activo o
// si el navegador no lo soporta (la lista sale entonces con su alto de siempre).
export function useVisibleBelow(ref: RefObject<HTMLElement | null>, active: boolean, gap = 14): number | null {
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!active) {
      setHeight(null)
      return
    }
    const vv = window.visualViewport
    const compute = () => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
      setHeight(Math.max(140, Math.floor(visibleBottom - rect.bottom - gap)))
    }
    compute()
    vv?.addEventListener("resize", compute)
    vv?.addEventListener("scroll", compute)
    window.addEventListener("scroll", compute, { passive: true })
    window.addEventListener("resize", compute)
    return () => {
      vv?.removeEventListener("resize", compute)
      vv?.removeEventListener("scroll", compute)
      window.removeEventListener("scroll", compute)
      window.removeEventListener("resize", compute)
    }
  }, [ref, active, gap])

  return height
}
