"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"

export type ShareStop = {
  kind: "club" | "event"
  title: string
  subtitle?: string
  time?: string
  image?: string | null
  href: string
}

// Crea un plan compartible (enlace público, sin cuenta para verlo ni apuntarse) y abre el menú
// de compartir del móvil, o copia el enlace si no existe.
export default function SharePlanButton({
  title,
  stops,
  className = "",
  label = "🔗 Compartir con mis amigos",
}: {
  title: string
  stops: ShareStop[]
  className?: string
  label?: string
}) {
  const [state, setState] = useState<"idle" | "working" | "copied" | "error">("idle")

  const share = async () => {
    if (state === "working" || stops.length === 0) return
    setState("working")
    try {
      // Crear un plan exige cuenta (ver el plan y apuntarse, no).
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        window.location.href = "/login"
        return
      }
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())
      const clean = stops.slice(0, 8).map((s) => ({
        kind: s.kind,
        title: String(s.title).slice(0, 80),
        subtitle: s.subtitle ? String(s.subtitle).slice(0, 80) : "",
        time: s.time ? String(s.time).slice(0, 12) : "",
        image: s.image && s.image.startsWith("https://") ? s.image.slice(0, 300) : null,
        href: s.href.startsWith("/") ? s.href.slice(0, 200) : "",
      }))
      const { data, error } = await supabase.rpc("create_night_plan", {
        p_title: title.slice(0, 80),
        p_plan_date: today,
        p_stops: clean,
      })
      if (error || !data) throw error || new Error("sin código")
      const url = `${window.location.origin}/plan/${data}`
      const text = "Mira el plan que he montado para esta noche 🦉 ¿Te apuntas?"
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url })
          setState("idle")
          return
        } catch (e: any) {
          if (e?.name === "AbortError") { setState("idle"); return }
        }
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setState("copied")
      setTimeout(() => setState("idle"), 3000)
    } catch (e) {
      console.log("SHARE PLAN ERROR:", e)
      setState("error")
      setTimeout(() => setState("idle"), 3000)
    }
  }

  return (
    <button onClick={share} disabled={state === "working"} className={className || "w-full rounded-2xl border border-purple-400/40 bg-purple-500/10 py-4 font-bold text-white transition hover:bg-purple-500/20 disabled:opacity-60"}>
      {state === "working" ? "Creando enlace…" : state === "copied" ? "✓ Enlace copiado" : state === "error" ? "No se pudo crear el enlace" : label}
    </button>
  )
}
