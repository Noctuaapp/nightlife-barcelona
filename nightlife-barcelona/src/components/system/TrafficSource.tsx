"use client"

import { useEffect } from "react"
import { track, getSessionId, getTrafficSource, markSessionStart } from "../../lib/track"

// Se monta una vez en el layout. Registra el inicio de cada visita con su origen (Google,
// Instagram, invitación, directo...). Sin sessionStorage: ver src/lib/track.ts.
export default function TrafficSource() {
  useEffect(() => {
    if (!markSessionStart()) return
    getSessionId()
    getTrafficSource()
    track("session_start", { itemType: "site" })
  }, [])
  return null
}
