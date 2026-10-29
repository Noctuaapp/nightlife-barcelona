"use client"

import { supabase } from "../../lib/supabase"
import { safeNextPath } from "../../lib/nextPath"
import { track } from "../../lib/track"
import { useLanguage } from "../../context/LanguageContext"

// «Continuar con Google» (29/10/2026): un solo botón para registro, inicio de sesión y las zonas
// privadas. Es el camino con menos pereza (sin contraseña ni formulario), así que se pinta blanco, con
// el logo de colores y sombra: lo más llamativo de cada pantalla. Sirve igual para crear la cuenta que
// para entrar: Google decide. `from` se anota en google_click para ver desde dónde se pulsa
// (signup | login | wall | modal).
//
// `next`: a dónde volver al terminar. En /signup y /login se lee de ?next=; en las zonas privadas
// (mapa, plan, favoritos…) se pasa la ruta actual.
export default function GoogleButton({
  from,
  next,
  className = "",
}: {
  from: "signup" | "login" | "wall" | "modal"
  next?: string
  className?: string
}) {
  const { t } = useLanguage()

  const go = async () => {
    track("google_click", { meta: { from } })
    const back = next ?? safeNextPath()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${back}` },
    })
  }

  return (
    <button
      type="button"
      onClick={go}
      className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-[15px] font-bold text-[#1f1f1f] shadow-[0_12px_32px_-14px_rgba(255,255,255,0.55)] transition hover:bg-zinc-100 active:scale-[0.99] ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {t("signup.google")}
    </button>
  )
}
