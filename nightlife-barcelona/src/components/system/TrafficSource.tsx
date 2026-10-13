"use client"

import { useEffect } from "react"
import { track, getSessionId } from "../../lib/track"

// Se monta una vez en el layout. Registra el inicio de cada sesión con su origen (Google,
// Instagram, invitación, directo...) y, para usuarios con sesión, sirve para medir retención.
export default function TrafficSource() {
  useEffect(() => {
    try {
      const flag = "noctua_session_logged"
      if (window.sessionStorage.getItem(flag)) return
      window.sessionStorage.setItem(flag, "1")
    } catch { /* sin sessionStorage: se registra igualmente */ }
    getSessionId()
    track("session_start", { itemType: "site" })
  }, [])
  return null
}
