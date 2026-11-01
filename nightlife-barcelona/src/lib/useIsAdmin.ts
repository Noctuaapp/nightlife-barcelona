"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import { isAdminEmail } from "./admin"
import { useViewAsUser } from "./viewAsUser"

// ¿Hay una sesión de admin? Es el chequeo de verdad, SIN tener en cuenta «Ver como usuario». Solo lo
// usa el propio interruptor (para saber si debe salir); todo lo demás usa useIsAdmin().
export function useIsRealAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive && isAdminEmail(data.session?.user.email)) setIsAdmin(true)
    })
    return () => {
      alive = false
    }
  }, [])

  return isAdmin
}

// Mismo chequeo que ya hacía AdminEditButton por su cuenta, sacado a un sitio común para que lo
// use también la edición in situ de las fichas públicas (club, evento...). Con «Ver como usuario»
// puesto (lib/viewAsUser.ts) devuelve false aunque seas admin, para ver la ficha como un visitante.
export function useIsAdmin(): boolean {
  const real = useIsRealAdmin()
  const viewAsUser = useViewAsUser()
  return real && !viewAsUser
}
