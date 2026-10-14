"use client"

import { useEffect, useState } from "react"

// Avisos breves propios ("Enlace copiado", "Guardado"...). Antes se usaba window.alert(), que
// bloquea la página con un cuadro del navegador. toast() se puede llamar desde cualquier sitio;
// <ToastHost /> vive una sola vez en el layout y los pinta.
const EVENT = "noctua:toast"

export function toast(message: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }))
}

export default function ToastHost() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 2200)
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
      <p className="rounded-full border border-white/10 bg-surface-2 px-5 py-3 text-sm font-semibold text-ink shadow-lg">
        {message}
      </p>
    </div>
  )
}
