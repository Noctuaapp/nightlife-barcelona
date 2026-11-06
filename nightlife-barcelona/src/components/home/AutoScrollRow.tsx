"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

// Carrusel que se desliza solo, despacio, hacia la izquierda (06/11/2026). Es el «Abierto ahora» de la portada:
// en vez de esperar a que alguien lo arrastre, los locales van pasando solos, como una cinta, para que quien
// llega los vaya viendo sin tocar nada. Sigue siendo un carrusel normal: se puede arrastrar con el dedo o con
// la rueda, y en cuanto se toca (o se pone el ratón encima, o se enfoca un enlace con el teclado) se para
// y se retoma solo unos segundos después.
//
// Cómo está hecho:
// - Bucle sin saltos: tras montar se pinta una segunda copia de las tarjetas; al llegar al final de la primera
//   se resta su anchura y se vuelve al principio, y como la segunda copia es idéntica no se nota el salto.
//   La copia solo existe en el cliente (el HTML del servidor lleva una sola lista, sin duplicados para el buscador).
// - Solo se anima si las tarjetas llenan el ancho del carrusel. Si caben todas en pantalla no hay nada que deslizar.
// - No se anima con «reducir movimiento» activado, ni mientras el carrusel no se ve en pantalla (ahorra batería).
// - La copia va con aria-hidden y sin foco de teclado: para un lector de pantalla la lista es una sola.

const SPEED = 26 // píxeles por segundo: despacio, que dé tiempo a leer el nombre
const RESUME_MS = 2800 // espera tras la última interacción antes de retomar

export default function AutoScrollRow({
  children,
  className = "",
  resetKey,
}: {
  children: ReactNode
  className?: string
  /** Cuando cambia (otro barrio, «cerca de mí»…), el carrusel vuelve al principio. */
  resetKey?: string
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [loop, setLoop] = useState(false)

  // 1) ¿Hay que animar? Solo si no hay «reducir movimiento» y las tarjetas llenan el ancho visible.
  useEffect(() => {
    const sc = scrollerRef.current
    const a = aRef.current
    if (!sc || !a) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const decide = () => {
      const gap = parseFloat(getComputedStyle(sc).columnGap) || 0
      setLoop(!mq.matches && a.offsetWidth + gap >= sc.clientWidth)
    }
    decide()
    const ro = new ResizeObserver(decide)
    ro.observe(sc)
    ro.observe(a)
    mq.addEventListener("change", decide)
    return () => {
      ro.disconnect()
      mq.removeEventListener("change", decide)
    }
  }, [])

  // 2) La copia no entra en el orden de tabulación (se repite en cada render porque React puede recrear los nodos).
  useEffect(() => {
    if (!loop) return
    bRef.current?.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach((el) => el.setAttribute("tabindex", "-1"))
  })

  // 3) El movimiento.
  useEffect(() => {
    const sc = scrollerRef.current
    const a = aRef.current
    const b = bRef.current
    if (!loop || !sc || !a || !b) return

    sc.scrollLeft = 0
    let pos = 0
    let last = performance.now()
    let raf = 0
    let touching = false
    let hover = false
    let focus = false
    let visible = true
    let blockedUntil = 0
    let wasActive = false

    const block = () => {
      blockedUntil = performance.now() + RESUME_MS
    }
    const onTouchStart = () => { touching = true }
    const onTouchEnd = () => { touching = false; block() }
    const onEnter = (e: PointerEvent) => { if (e.pointerType === "mouse") hover = true }
    const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") { hover = false; blockedUntil = performance.now() + 600 } }
    const onFocusIn = () => { focus = true }
    const onFocusOut = () => { focus = false; block() }

    sc.addEventListener("touchstart", onTouchStart, { passive: true })
    sc.addEventListener("touchend", onTouchEnd, { passive: true })
    sc.addEventListener("touchcancel", onTouchEnd, { passive: true })
    sc.addEventListener("wheel", block, { passive: true })
    sc.addEventListener("pointerenter", onEnter)
    sc.addEventListener("pointerleave", onLeave)
    sc.addEventListener("focusin", onFocusIn)
    sc.addEventListener("focusout", onFocusOut)

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0.05 })
    io.observe(sc)

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000
      last = now
      const active = !touching && !hover && !focus && visible && now >= blockedUntil
      const period = b.offsetLeft - a.offsetLeft // anchura de una copia + el hueco entre copias
      if (active && period > 0) {
        if (!wasActive) {
          // Se retoma desde donde haya dejado el carrusel quien lo arrastró.
          pos = sc.scrollLeft
          while (pos >= period) pos -= period
        }
        pos += SPEED * dt
        if (pos >= period) pos -= period
        sc.scrollLeft = pos
      }
      wasActive = active && period > 0
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      sc.removeEventListener("touchstart", onTouchStart)
      sc.removeEventListener("touchend", onTouchEnd)
      sc.removeEventListener("touchcancel", onTouchEnd)
      sc.removeEventListener("wheel", block)
      sc.removeEventListener("pointerenter", onEnter)
      sc.removeEventListener("pointerleave", onLeave)
      sc.removeEventListener("focusin", onFocusIn)
      sc.removeEventListener("focusout", onFocusOut)
    }
  }, [loop, resetKey])

  // Otro barrio u otra ordenación: vuelta al principio.
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollLeft = 0
  }, [resetKey])

  return (
    <div
      ref={scrollerRef}
      className={`${className} ${
        loop
          ? "scrollbar-none [mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-40px),transparent)]"
          : "snap-x"
      }`}
    >
      <div ref={aRef} className="flex shrink-0 gap-3">
        {children}
      </div>
      {loop && (
        <div ref={bRef} aria-hidden="true" className="flex shrink-0 gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
