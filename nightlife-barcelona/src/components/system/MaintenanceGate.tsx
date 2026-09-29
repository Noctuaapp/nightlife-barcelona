"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "../../lib/supabase"

// Rutas que siempre deben funcionar, incluso en mantenimiento: /login (para que el admin pueda
// entrar) y /admin (que ya protege el acceso por su cuenta, comprobando el email en cada página).
const ALWAYS_ALLOWED_PREFIXES = ["/login", "/admin"]

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [checking, setChecking] = useState(true)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const alwaysAllowed = ALWAYS_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
    if (alwaysAllowed) {
      setChecking(false)
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
      setChecking(false)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [pathname])

  // Mientras comprobamos, no mostramos nada para evitar un parpadeo del contenido normal antes
  // de saber si hay que bloquear. La comprobación es rápida (una consulta local + una a Supabase).
  if (checking) return null

  if (blocked) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black px-4 text-white">
        <div className="w-full max-w-md rounded-[36px] border border-purple-500/20 bg-purple-500/5 p-8 backdrop-blur-xl text-center">
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
