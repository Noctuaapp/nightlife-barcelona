"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"

// Rutas que siempre deben funcionar, incluso en mantenimiento: /login (para que el admin pueda
// entrar) y /admin (que ya protege el acceso por su cuenta, comprobando el email en cada página).
const ALWAYS_ALLOWED_PREFIXES = ["/login", "/admin"]

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const alwaysAllowed = ALWAYS_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
    if (alwaysAllowed) {
      setBlocked(false)
      return
    }

    let cancelled = false
    const check = async () => {
      const [{ data: settings }, { data: sessionData }] = await Promise.all([
        supabase.from("app_settings").select("maintenance_mode").eq("id", true).maybeSingle(),
        supabase.auth.getSession(),
      ])
      if (cancelled) return
      const isAdmin = sessionData.session?.user.email === "info@noctuaapp.com"
      setBlocked(!!settings?.maintenance_mode && !isAdmin)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Antes, mientras `checking` era true se devolvía null. Como `checking` empieza en true y el
  // useEffect solo corre en el navegador, el HTML que generaba el servidor para TODAS las páginas
  // salía vacío y Google no veía ningún contenido (clubs, eventos, textos...) al indexar.
  // Ahora se pinta el contenido normal mientras se comprueba; solo si hay mantenimiento activo
  // se sustituye por el aviso (mantenimiento es algo puntual, un parpadeo ahí es aceptable).
  if (blocked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-card border border-purple-500/20 bg-purple-500/5 p-8 backdrop-blur-xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-purple-500/20 bg-purple-500/10 text-3xl">
            🛠️
          </div>
          <h1 className="mb-3 text-2xl font-bold">En mantenimiento</h1>
          <p className="text-sm leading-relaxed text-zinc-400">
            Estamos haciendo mejoras en Noctua. Vuelve a intentarlo dentro de un rato.
          </p>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
