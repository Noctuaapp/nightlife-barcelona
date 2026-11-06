"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import { safeNextPath } from "../../lib/nextPath"
import { confirmAgeUrl, consentComplete, isConsentExempt } from "../../lib/signupConsent"

// Quien tiene sesión tiene que haber aceptado los términos y confirmado su edad (06/11/2026).
//
// Antes esta comprobación vivía dentro de la cabecera, y la cabecera no se pinta en todas las
// páginas (el mapa, por ejemplo, no la lleva): ahí se podía usar la web sin haber aceptado. Además,
// desde /terms y /privacy te devolvía a «Antes de continuar», así que no se podía ni leer lo que se
// iba a aceptar. Ahora es una pieza del layout: cubre todas las rutas y deja pasar solo la pantalla
// de confirmación, la de cuenta bloqueada y los textos legales.
//
// Cubre el alta con Google (no pasa por el formulario con su casilla), el alta con correo cuando
// la aceptación no pudo guardarse al registrarse, y las cuentas anteriores a esta confirmación.
//
// Es una barrera de la web: no sustituye a las reglas de la base de datos.

// Una vez comprobado que una cuenta está al día no hace falta volver a preguntarlo en cada página
// (la aceptación no se puede deshacer desde la web).
let verifiedUserId: string | null = null

export default function TermsGate() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isConsentExempt(pathname)) return

    const check = async (userId: string) => {
      if (verifiedUserId === userId) return
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("terms_accepted_at, birth_year")
        .eq("id", userId)
        .maybeSingle()
      // Si la consulta falla (red caída…) no se echa a nadie: se vuelve a comprobar en la siguiente página.
      if (error) return
      if (consentComplete(profile)) {
        verifiedUserId = userId
        return
      }
      // La respuesta puede llegar cuando ya se ha cambiado de página: se mira la de ahora.
      if (isConsentExempt(window.location.pathname)) return
      router.replace(confirmAgeUrl(window.location.pathname, window.location.search, safeNextPath()))
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) check(data.session.user.id)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) check(session.user.id)
      else verifiedUserId = null
    })
    return () => subscription.unsubscribe()
  }, [pathname, router])

  return null
}
