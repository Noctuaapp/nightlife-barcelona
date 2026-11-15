"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { CITIES, type CityKey } from "../../lib/cities"
import { isAdminEmail } from "../../lib/admin"
import { supabase } from "../../lib/supabase"
import { useViewAsUser } from "../../lib/viewAsUser"

// Puerta de una ciudad (Fase E). Con la ciudad abierta al público no hace nada: deja pasar y el HTML del servidor sale entero.
// Con la ciudad en «prelaunch» (lib/cities.ts) solo deja ver el contenido al admin: el servidor entrega una pantalla vacía (no
// hay nada de Madrid en el HTML) y, comprobada la sesión, a cualquier otra persona se la devuelve a la portada. «Ver como
// usuario» también cuenta como visitante, igual que en el resto de la web.
export default function CityGate({ city, children }: { city: CityKey; children: ReactNode }) {
  const router = useRouter()
  const prelaunch = CITIES[city].prelaunch
  const viewAsUser = useViewAsUser()
  const [admin, setAdmin] = useState<boolean | null>(null) // null = comprobando

  useEffect(() => {
    if (!prelaunch) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAdmin(isAdminEmail(data.session?.user.email))
    })
    return () => {
      alive = false
    }
  }, [prelaunch])

  const allowed = !prelaunch || (admin === true && !viewAsUser)
  const turnAway = prelaunch && (admin === false || (admin === true && viewAsUser))

  useEffect(() => {
    if (turnAway) router.replace("/")
  }, [turnAway, router])

  if (!allowed) return <div aria-hidden="true" className="min-h-screen bg-[#05060f]" />
  return <>{children}</>
}
