"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { logError } from "../../lib/log"

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
  label,
}: {
  title: string
  stops: ShareStop[]
  className?: string
  label?: string
}) {
  const { t } = useLanguage()
  const [state, setState] = useState<"idle" | "working" | "copied" | "error">("idle")

  const share = async () => {
    if (state === "working" || stops.length === 0) return
    setState("working")
    try {
      // Crear un plan exige cuenta (ver el plan y apuntarse, no).
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        window.location.href = "/signup?next=/plan"
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
      const text = t("sharePlan.message")
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url })
          setState("idle")
          return
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") { setState("idle"); return }
        }
      }
      await navigator.clipboard.writeText(`${text} ${url}`)
      setState("copied")
      setTimeout(() => setState("idle"), 3000)
    } catch (e) {
      logError("SHARE PLAN ERROR:", e)
      setState("error")
      setTimeout(() => setState("idle"), 3000)
    }
  }

  return (
    <button
      onClick={share}
      disabled={state === "working"}
      className={className || "w-full rounded-ctl border border-brand/40 bg-brand/10 py-3.5 text-sm font-semibold text-ink transition hover:bg-brand/20 disabled:opacity-60"}
    >
      {state === "working"
        ? t("sharePlan.working")
        : state === "copied"
        ? t("sharePlan.copied")
        : state === "error"
        ? t("sharePlan.error")
        : label || t("sharePlan.label")}
    </button>
  )
}
