"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { logError } from "../../lib/log"
import { track } from "../../lib/track"
import AuthGateModal from "../ui/AuthGateModal"
import { cleanShareStops, madridToday, type ShareStop } from "../../lib/planShare"

export type { ShareStop }

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
  const [showGate, setShowGate] = useState(false)

  const share = async () => {
    if (state === "working" || stops.length === 0) return
    setState("working")
    try {
      // Crear un plan exige cuenta (ver el plan y apuntarse, no). Antes se mandaba de golpe a /signup, sin explicar nada
      // (15/11/2026): ahora sale la ventana de cuenta de las fichas, sin sacar a la persona del plan que acaba de montar.
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setState("idle")
        setShowGate(true)
        track("auth_gate_view", { itemType: "plan", meta: { reason: "plan", from: "share" } })
        return
      }
      const today = madridToday()
      const clean = cleanShareStops(stops)
      const { data, error } = await supabase.rpc("create_night_plan", {
        p_title: title.slice(0, 80),
        p_plan_date: today,
        p_stops: clean,
      })
      if (error || !data) throw error || new Error("sin código")
      track("plan_create", { itemType: "plan", meta: { stops: clean.length } })
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
    <>
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
    <AuthGateModal open={showGate} onClose={() => setShowGate(false)} reason="plan" />
    </>
  )
}
