"use client"

import { useEffect } from "react"
import { supabase } from "../../lib/supabase"
import { isAdminEmail } from "../../lib/admin"
import { EVENTS_HIDDEN, EVENTS_PREVIEW_COOKIE } from "../../lib/featureFlags"

// Mientras «Eventos» está cerrado (lib/featureFlags.ts), guarda en el navegador del admin una marca para
// que src/proxy.ts le deje entrar a las fichas de evento (/event/...). A los demás no les guarda nada, y
// si el admin cierra sesión la marca se borra. No pinta nada.
export default function EventsPreviewCookie() {
  useEffect(() => {
    if (!EVENTS_HIDDEN) return
    const apply = (email?: string | null) => {
      try {
        document.cookie = isAdminEmail(email)
          ? `${EVENTS_PREVIEW_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax`
          : `${EVENTS_PREVIEW_COOKIE}=; path=/; max-age=0; SameSite=Lax`
      } catch {
        /* sin cookies: el admin entrará a Eventos con un enlace directo solo si el navegador las permite */
      }
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.email))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user.email))
    return () => data.subscription.unsubscribe()
  }, [])
  return null
}
