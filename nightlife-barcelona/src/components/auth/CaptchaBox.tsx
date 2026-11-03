"use client"

import { useEffect, useRef } from "react"
import { TURNSTILE_SITE_KEY } from "../../lib/captcha"

// Widget de Cloudflare Turnstile (ver lib/captcha.ts). Sin clave configurada no pinta nada.
// «interaction-only»: casi todo el mundo pasa sin ver nada; solo si Cloudflare duda aparece una
// casilla. El token es de un solo uso: tras cada intento (bien o mal) el formulario sube
// `resetKey` y el widget se vuelve a crear con un token nuevo.

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => {
      scriptPromise = null // permite reintentar si un bloqueador lo cortó
      reject(new Error("turnstile_blocked"))
    }
    document.head.appendChild(s)
  })
  return scriptPromise
}

export default function CaptchaBox({
  onToken,
  resetKey = 0,
  siteKey = TURNSTILE_SITE_KEY,
}: {
  onToken: (token: string | null) => void
  resetKey?: number
  siteKey?: string
}) {
  const holder = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  useEffect(() => {
    callback.current = onToken
  }, [onToken])

  useEffect(() => {
    const el = holder.current
    if (!siteKey || !el) return
    let widgetId: string | null = null
    let cancelled = false
    callback.current(null)
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return
        widgetId = window.turnstile.render(el, {
          sitekey: siteKey,
          theme: "dark",
          appearance: "interaction-only",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(null),
          "error-callback": () => callback.current(null),
        })
      })
      .catch(() => callback.current(null))
    return () => {
      cancelled = true
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId)
        } catch {
          /* el widget ya no estaba */
        }
      }
    }
  }, [siteKey, resetKey])

  if (!siteKey) return null
  return <div ref={holder} className="flex justify-center" data-testid="captcha-box" />
}
