"use client"

import { useCallback, useEffect, useState } from "react"

// «Instalar Noctua» como app (27/10/2026). Chrome (Android y ordenador) avisa con
// "beforeinstallprompt" de que la web se puede instalar; InstallCapture lo guarda en cuanto llega
// (puede llegar antes de que se pinte el botón) y este hook lo ofrece a quien quiera enseñar un
// botón. Safari de iPhone no tiene ese aviso: allí solo se puede explicar el paso a mano.

export type InstallEvent = Event & { prompt: () => Promise<void> }

declare global {
  interface Window {
    __noctuaInstall?: InstallEvent | null
  }
}

export const INSTALL_EVENT = "noctua-install-ready"

export function useInstallPrompt() {
  const [state, setState] = useState({ canPrompt: false, isIos: false, installed: false })

  useEffect(() => {
    const read = () => {
      const standalone =
        (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      setState({
        canPrompt: !!window.__noctuaInstall,
        isIos: /iphone|ipad|ipod/i.test(navigator.userAgent),
        installed: standalone,
      })
    }
    read()
    window.addEventListener(INSTALL_EVENT, read)
    return () => window.removeEventListener(INSTALL_EVENT, read)
  }, [])

  const install = useCallback(async () => {
    const ev = window.__noctuaInstall
    if (!ev) return
    try {
      await ev.prompt()
    } catch {
      /* el navegador ya no deja instalar: se ignora */
    }
    window.__noctuaInstall = null
    window.dispatchEvent(new Event(INSTALL_EVENT))
  }, [])

  return { ...state, install }
}
