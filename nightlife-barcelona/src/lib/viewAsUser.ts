"use client"

import { useSyncExternalStore } from "react"
import { EVENTS_HIDDEN, EVENTS_PREVIEW_COOKIE } from "./featureFlags"

// «Ver como usuario» (01/11/2026): el admin ve las fichas de clubs y eventos tal como las ve un
// visitante, sin cerrar sesión. Con el interruptor puesto, useIsAdmin() y useCanEdit() devuelven
// false (no salen lápices, «Editar», campos vacíos para rellenar ni la pestaña Admin) y la web
// trata a Eventos como a un visitante (mientras EVENTS_HIDDEN siga activo, enseña «Próximamente»).
//
// Se guarda en sessionStorage: dura lo que dure la pestaña, así que no hay forma de quedarse en
// vista de usuario por olvido. Solo cambia lo que se ENSEÑA: sigues siendo admin para la base de
// datos y la analítica sigue sin contar tus visitas.

export const VIEW_AS_USER_KEY = "noctua_view_as_user"
const CHANGE_EVENT = "noctua:view-as-user"

function read(): boolean {
  try {
    return window.sessionStorage.getItem(VIEW_AS_USER_KEY) === "1"
  } catch {
    return false
  }
}

export function setViewAsUser(on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(VIEW_AS_USER_KEY, "1")
    else window.sessionStorage.removeItem(VIEW_AS_USER_KEY)
  } catch {
    /* sin almacenamiento: el interruptor no se puede recordar */
  }
  // La marca que deja entrar a /event/... (ver EventsPreviewCookie) se quita de inmediato: así, si la
  // página siguiente se pide al servidor, el visitante «ve» lo mismo que vería un visitante de verdad.
  if (on && EVENTS_HIDDEN) {
    try {
      document.cookie = `${EVENTS_PREVIEW_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    } catch {
      /* sin cookies */
    }
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

// true si este navegador (esta pestaña) está en «Ver como usuario». En el servidor y en el primer
// pintado siempre es false, para no desajustar el HTML.
export function useViewAsUser(): boolean {
  return useSyncExternalStore(subscribe, read, () => false)
}
