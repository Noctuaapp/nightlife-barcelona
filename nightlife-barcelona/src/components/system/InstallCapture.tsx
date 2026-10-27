"use client"

import { useEffect } from "react"
import { INSTALL_EVENT, type InstallEvent } from "../../lib/useInstallPrompt"

// Guarda el aviso "se puede instalar" del navegador desde el primer momento (ver
// lib/useInstallPrompt.ts). No pinta nada.
//
// También registra el service worker mínimo (public/sw.js): Chrome en Android solo lanza ese aviso
// si la web tiene uno con un manejador "fetch". El nuestro no guarda nada en caché ni intercepta
// peticiones; existe solo para cumplir ese requisito.
export default function InstallCapture() {
  useEffect(() => {
    const registerWorker = () => {
      try {
        if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
      } catch {
        /* navegador sin soporte o en modo restringido: no pasa nada */
      }
    }
    if (document.readyState === "complete") registerWorker()
    else window.addEventListener("load", registerWorker, { once: true })

    const onPrompt = (e: Event) => {
      e.preventDefault()
      window.__noctuaInstall = e as InstallEvent
      window.dispatchEvent(new Event(INSTALL_EVENT))
    }
    const onInstalled = () => {
      window.__noctuaInstall = null
      window.dispatchEvent(new Event(INSTALL_EVENT))
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("load", registerWorker)
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])
  return null
}
