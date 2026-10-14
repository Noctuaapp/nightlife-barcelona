"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Wrench } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { ADMIN_EMAIL } from "../../lib/admin"

// Rutas que siempre deben funcionar, incluso en mantenimiento: /login (para que el admin pueda
// entrar) y /admin (que ya protege el acceso por su cuenta, comprobando el email en cada página).
const ALWAYS_ALLOWED_PREFIXES = ["/login", "/admin"]

export default function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const [blocked, setBlocked] = useState(false)
  const { t } = useLanguage()

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
      const isAdmin = sessionData.session?.user.email === ADMIN_EMAIL
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
      <main className="flex min-h-screen items-center justify-center bg-night px-4 text-ink">
        <div className="w-full max-w-md rounded-card border border-white/10 bg-surface p-8 text-center">
          <Wrench size={32} className="mx-auto text-brand-soft" />
          <h1 className="mb-3 mt-5 text-2xl font-semibold">{t("maintenance.title")}</h1>
          <p className="text-sm leading-relaxed text-zinc-300">{t("maintenance.body")}</p>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
