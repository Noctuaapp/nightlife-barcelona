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
//
// Desde el 10/11/2026 mide también cuánto tiempo se queda la persona en cada página ("page_time",
// con la ruta y los segundos en meta). Solo cuenta el tiempo con la pestaña a la vista: si se
// cambia de app o se bloquea el móvil, el reloj se para. Se envía al salir de la página (cambio de
// ruta) y cuando la pestaña pasa a segundo plano o se cierra (mejor esfuerzo: si el navegador
// cierra antes de mandarlo, ese último tramo se pierde). Un tramo de menos de 2 s no se envía, y
// uno largo se corta a 30 min (pestaña olvidada abierta). Sin datos personales.
const MIN_SECONDS = 2
const MAX_SECONDS = 1800

export default function TrafficSource() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)
  // Reloj de la página actual: milisegundos ya sumados + desde cuándo está a la vista (null = oculta).
  const accrued = useRef(0)
  const visibleSince = useRef<number | null>(null)

  useEffect(() => {
    if (!markSessionStart()) return
    getSessionId()
    getTrafficSource()
    track("session_start", { itemType: "site" })
  }, [])

  // Envía el tiempo acumulado en la página `path` y reinicia el reloj (sigue contando si la pestaña está a la vista).
  const flush = (path: string | null) => {
    const ms = accrued.current + (visibleSince.current !== null ? Date.now() - visibleSince.current : 0)
    accrued.current = 0
    visibleSince.current = typeof document !== "undefined" && document.visibilityState === "visible" ? Date.now() : null
    const seconds = Math.min(MAX_SECONDS, Math.round(ms / 1000))
    if (path && seconds >= MIN_SECONDS) track("page_time", { itemType: "page", meta: { path: path.slice(0, 120), seconds } })
  }
  // El efecto de abajo solo se monta una vez para los eventos del navegador, así que guarda la última versión de flush.
  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    if (!pathname) return
    // La primera página ya va en "session_start" (su path es la página de entrada).
    if (last.current === null) {
      last.current = pathname
      visibleSince.current = document.visibilityState === "visible" ? Date.now() : null
      return
    }
    if (last.current === pathname) return
    // Se sale de la página anterior: su tiempo se envía antes de anotar la nueva.
    flush(last.current)
    last.current = pathname
    track("page_nav", { itemType: "page" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushRef.current(last.current)
        visibleSince.current = null
      } else if (visibleSince.current === null) {
        visibleSince.current = Date.now()
      }
    }
    const onPageHide = () => {
      flushRef.current(last.current)
      visibleSince.current = null
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [])

  return null
}
