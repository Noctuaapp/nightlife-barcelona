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

// «Ya la tengo instalada» (29/10/2026). El navegador no dice si la app está instalada cuando abres la
// web en una pestaña normal, así que el botón de instalar seguía saliendo a quien ya la tenía. Se
// recuerda en el propio móvil (localStorage) en cuanto se sabe: al abrir la app desde el icono (modo
// "standalone"), al lanzarse "appinstalled", o si Chrome responde a getInstalledRelatedApps (ver
// related_applications en manifest.ts). En Android la app instalada y Chrome comparten ese
// almacenamiento, así que vale también para la pestaña. Se olvida si Chrome vuelve a ofrecer instalar
// (señal de que ya no está instalada). En iPhone la app y Safari NO comparten almacenamiento: allí
// no hay forma de saberlo desde una pestaña de Safari.
const INSTALLED_KEY = "noctua_app_installed"

function readInstalledFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1"
  } catch {
    return false
  }
}

export function markInstalled(value: boolean) {
  try {
    if (value) localStorage.setItem(INSTALLED_KEY, "1")
    else localStorage.removeItem(INSTALLED_KEY)
  } catch {
    /* almacenamiento bloqueado (modo privado, etc.): no pasa nada */
  }
}

// Una sola consulta a getInstalledRelatedApps por carga de página, aunque haya varios botones.
let relatedAppsCheck: Promise<boolean> | null = null
function installedRelatedApp(): Promise<boolean> {
  if (!relatedAppsCheck) {
    relatedAppsCheck = (async () => {
      try {
        const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> }
        if (typeof nav.getInstalledRelatedApps !== "function") return false
        const apps = await nav.getInstalledRelatedApps()
        return Array.isArray(apps) && apps.length > 0
      } catch {
        return false
      }
    })()
  }
  return relatedAppsCheck
}

export function useInstallPrompt() {
  const [state, setState] = useState({ canPrompt: false, isIos: false, isMobile: false, installed: false })

  useEffect(() => {
    const read = () => {
      const standalone =
        (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
      const canPrompt = !!window.__noctuaInstall
      // Chrome solo ofrece instalar cuando NO está instalada: se borra cualquier recuerdo viejo.
      if (canPrompt) markInstalled(false)
      else if (standalone) markInstalled(true)
      const ua = navigator.userAgent
      // Los iPad modernos se presentan como un Mac: se distinguen por la pantalla táctil.
      const isIos = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
      setState({
        canPrompt,
        isIos,
        isMobile: isIos || /android/i.test(ua),
        installed: !canPrompt && (standalone || readInstalledFlag()),
      })
    }
    read()
    // Chrome en Android puede decir si la app está instalada aunque estemos en una pestaña.
    let alive = true
    installedRelatedApp().then((yes) => {
      if (yes && alive && !window.__noctuaInstall) {
        markInstalled(true)
        read()
      }
    })
    window.addEventListener(INSTALL_EVENT, read)
    return () => {
      alive = false
      window.removeEventListener(INSTALL_EVENT, read)
    }
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
