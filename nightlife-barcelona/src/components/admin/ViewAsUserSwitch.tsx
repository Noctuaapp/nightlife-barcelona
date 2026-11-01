"use client"

import { usePathname, useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useIsRealAdmin } from "../../lib/useIsAdmin"
import { setViewAsUser, useViewAsUser } from "../../lib/viewAsUser"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"

// Interruptor «Ver como usuario» (01/11/2026), solo para el admin. Apagado, sale en las fichas y
// listados de clubs y eventos; encendido, se queda en TODAS las páginas para poder salir desde donde
// estés. No cambia nada en la base de datos ni cierra sesión: solo oculta lo de admin en pantalla
// (ver lib/viewAsUser.ts).
const WHERE_IT_SHOWS = ["/clubs", "/club-event/", "/event/", "/events"]

export default function ViewAsUserSwitch() {
  const isAdmin = useIsRealAdmin()
  const on = useViewAsUser()
  const pathname = usePathname() || ""
  const router = useRouter()

  if (!isAdmin) return null
  const here = WHERE_IT_SHOWS.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`))
  if (!on && !here) return null

  const toggle = () => {
    const next = !on
    setViewAsUser(next)
    // Con Eventos cerrado un visitante no puede entrar en la ficha de un evento: se le lleva al aviso.
    if (next && EVENTS_HIDDEN && pathname.startsWith("/event/")) router.push("/events")
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`fixed bottom-[calc(96px+env(safe-area-inset-bottom))] left-3 z-[60] flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold shadow-lg transition active:scale-95 sm:bottom-6 ${
        on ? "bg-amber-400 text-black" : "border border-white/20 bg-black/80 text-white backdrop-blur hover:bg-black"
      }`}
    >
      {on ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
      {on ? "Vista de usuario · Salir" : "Ver como usuario"}
    </button>
  )
}
