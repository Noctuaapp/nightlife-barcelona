"use client"

import { useEffect } from "react"
import { INSTALL_EVENT, type InstallEvent } from "../../lib/useInstallPrompt"

// Guarda el aviso "se puede instalar" del navegador desde el primer momento (ver
// lib/useInstallPrompt.ts). No pinta nada.
export default function InstallCapture() {
  useEffect(() => {
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
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])
  return null
}
