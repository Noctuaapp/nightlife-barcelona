"use client"

import { useEffect, useState } from "react"

// Avisos breves propios ("Enlace copiado", "Guardado"...). Antes se usaba window.alert(), que
// bloquea la página con un cuadro del navegador. toast() se puede llamar desde cualquier sitio;
// <ToastHost /> vive una sola vez en el layout y los pinta.
const EVENT = "noctua:toast"

// `ms`: cuánto tiempo se ve (los errores, más tiempo para poder leerlos).
export function toast(message: string, ms = 2200) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<{ message: string; ms: number }>(EVENT, { detail: { message, ms } }))
}

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; ms: number } | string>).detail
      const msg = typeof detail === "string" ? detail : detail.message
      const ms = typeof detail === "string" ? 2200 : detail.ms
      setMessage(msg)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), ms)
    }
    window.addEventListener(EVENT, onToast)
    return () => {
      clearTimeout(timer)
      window.removeEventListener(EVENT, onToast)
    }
  }, [])

  if (!message) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-[200] flex justify-center px-4"
    >
      <p className="max-w-md rounded-card border border-white/10 bg-surface-2 px-5 py-3 text-center text-sm font-semibold text-ink shadow-lg">
        {message}
      </p>
    </div>
  )
}
