"use client"

import { useCallback, useEffect, useState } from "react"
import { track } from "./track"

// «Instalar Noctua» como app (27/10/2026). Chrome (Android y ordenador) avisa con
// "beforeinstallprompt" de que la web se puede instalar; InstallCapture lo guarda en cuanto llega
// (puede llegar antes de que se pinte el botón) y este hook lo ofrece a quien quiera enseñar un
// botón. Safari de iPhone no tiene ese aviso: allí solo se puede explicar el paso a mano.

export type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
  interface Window {
    __noctuaInstall?: InstallEvent | null
  }
}

export const INSTALL_EVENT = "noctua-install-ready"

export function useInstallPrompt() {
  const [state, setState] = useState({ canPrompt: false, isIos: false, isMobile: false, installed: false })

  useEffect(() => {
    const read = () => {
      const standalone =
        (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      const ua = navigator.userAgent
      // Los iPad modernos se presentan como un Mac: se distinguen por la pantalla táctil.
      const isIos = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      setState({
        canPrompt: !!window.__noctuaInstall,
        isIos,
        isMobile: isIos || /android/i.test(ua),
        installed: standalone,
      })
    }
    read()
    window.addEventListener(INSTALL_EVENT, read)
    return () => window.removeEventListener(INSTALL_EVENT, read)
  }, [])

  // from: desde dónde se pulsó (menu, profile, welcome). Se anota si la persona acepta o rechaza el
  // cuadro del navegador ("install_choice"); la instalación en sí la confirma "appinstalled"
  // (ver InstallCapture).
  const install = useCallback(async (from?: string) => {
    const ev = window.__noctuaInstall
    if (!ev) return
    try {
      await ev.prompt()
      const choice = await ev.userChoice
      if (choice) track("install_choice", { meta: { outcome: choice.outcome, from: from ?? null } })
    } catch {
      /* el navegador ya no deja instalar: se ignora */
    }
    window.__noctuaInstall = null
    window.dispatchEvent(new Event(INSTALL_EVENT))
  }, [])

  return { ...state, install }
}
