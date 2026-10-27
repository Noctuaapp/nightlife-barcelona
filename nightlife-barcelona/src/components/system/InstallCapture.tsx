"use client"

import { useEffect } from "react"
import { INSTALL_EVENT, type InstallEvent } from "../../lib/useInstallPrompt"
import { track } from "../../lib/track"

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
    // "appinstalled" lo lanza el navegador cuando la instalación se completa, venga de nuestro botón,
    // del menú de Chrome o del icono de la barra: es el recuento real de instalaciones (Android).
    // iPhone no avisa de nada: allí solo se ve cuando alguien abre la web desde el icono (origen "pwa").
    const onInstalled = () => {
      track("app_installed")
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
