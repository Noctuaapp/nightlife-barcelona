"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import { isAdminEmail } from "./admin"

// Mismo chequeo que ya hacía AdminEditButton por su cuenta, sacado a un sitio común para que lo
// use también la edición in situ de las fichas públicas (club, evento...).
export function useIsAdmin(): boolean {
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
