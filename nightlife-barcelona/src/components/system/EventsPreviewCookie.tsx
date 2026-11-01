"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { isAdminEmail } from "../../lib/admin"
import { EVENTS_HIDDEN, EVENTS_PREVIEW_COOKIE } from "../../lib/featureFlags"
import { useViewAsUser } from "../../lib/viewAsUser"

// Mientras «Eventos» está cerrado (lib/featureFlags.ts), guarda en el navegador del admin una marca para
// que src/proxy.ts le deje entrar a las fichas de evento (/event/...). A los demás no les guarda nada, y
// si el admin cierra sesión la marca se borra. Con «Ver como usuario» puesto (lib/viewAsUser.ts) también
// se borra, para que el admin vea Eventos como un visitante; al salir, vuelve. No pinta nada.
export default function EventsPreviewCookie() {
  const viewAsUser = useViewAsUser()
  // undefined = aún no se sabe quién es; null = sin sesión.
  const [email, setEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!EVENTS_HIDDEN) return
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!EVENTS_HIDDEN || email === undefined) return
    try {
      document.cookie =
        isAdminEmail(email) && !viewAsUser
          ? `${EVENTS_PREVIEW_COOKIE}=1; path=/; max-age=2592000; SameSite=Lax`
          : `${EVENTS_PREVIEW_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    } catch {
      /* sin cookies: el admin entrará a Eventos con un enlace directo solo si el navegador las permite */
    }
  }, [email, viewAsUser])

  return null
}
