"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Link2, Send, Users } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { logError } from "../../lib/log"
import { track } from "../../lib/track"
import AuthGateModal from "../ui/AuthGateModal"
import { cleanShareStops, madridToday, type ShareStop } from "../../lib/planShare"
import { POLL_MAX, POLL_MIN, defaultPick } from "../../lib/planPoll"

// «¿No os ponéis de acuerdo? Que voten» (15/11/2026). En una salida de noche decide el grupo de WhatsApp: en
// lugar de mandar un itinerario cerrado, la persona marca de 2 a 5 sitios (de los que le ha propuesto el plan)
// y manda un enlace donde cada amigo vota SIN cuenta y ve el recuento (SharedPlanClient). Crear la votación sí
// pide cuenta, igual que compartir un plan: es el momento en que a la persona le interesa tenerla.
// Servidor: supabase/119_plan_votacion_en_grupo.sql (create_night_plan_poll).

type Phase = "idle" | "working" | "done" | "error"

export default function PlanPollButton({ candidates, title }: { candidates: ShareStop[]; title: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<number[]>(() => defaultPick(candidates.length))
  const [phase, setPhase] = useState<Phase>("idle")
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showGate, setShowGate] = useState(false)

  // Si el plan se vuelve a generar, los sitios cambian: se empieza de cero.
  const key = useMemo(() => candidates.map((c) => c.href || c.title).join("|"), [candidates])
  useEffect(() => {
    setPicked(defaultPick(candidates.length))
    setPhase("idle")
    setCode(null)
    setCopied(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (candidates.length < POLL_MIN) return null

  const full = picked.length >= POLL_MAX
  const toggle = (i: number) => {
    setPhase((p) => (p === "done" || p === "error" ? "idle" : p))
    setPicked((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length >= POLL_MAX ? cur : [...cur, i]))
  }

  const link = code ? `${typeof window !== "undefined" ? window.location.origin : ""}/plan/${code}` : ""

  const send = async (url: string) => {
    const text = t("planPoll.message")
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch {
        // Cerrar el menú de compartir no es un error; si el navegador no lo permite aquí, queda el botón de enviar.
        return
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      /* sin portapapeles: queda el enlace a la vista */
    }
  }

  const create = async () => {
    if (phase === "working" || picked.length < POLL_MIN) return
    setPhase("working")
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setPhase("idle")
        setShowGate(true)
        track("auth_gate_view", { itemType: "plan", meta: { reason: "plan", from: "poll" } })
        return
      }
      const chosen = [...picked].sort((a, b) => a - b).map((i) => candidates[i])
      const clean = cleanShareStops(chosen, POLL_MAX)
      const { data, error } = await supabase.rpc("create_night_plan_poll", {
        p_title: title.slice(0, 80),
        p_plan_date: madridToday(),
        p_stops: clean,
      })
      if (error || !data) throw error || new Error("sin código")
      track("plan_poll_create", { itemType: "plan", meta: { options: clean.length } })
      setCode(String(data))
      setPhase("done")
      await send(`${window.location.origin}/plan/${data}`)
    } catch (e) {
      logError("PLAN POLL ERROR:", e)
      setPhase("error")
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  return (
    <div className="rounded-card border border-white/15 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-soft">
          <Users size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{t("planPoll.cta")}</span>
          <span className="mt-0.5 block text-xs leading-snug text-zinc-400">{t("planPoll.ctaSub")}</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-4">
          <p className="text-sm font-semibold text-ink">{t("planPoll.pickTitle")}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{t("planPoll.pickHint").replace("{min}", String(POLL_MIN)).replace("{max}", String(POLL_MAX))}</p>

          <ul className="mt-3 space-y-2">
            {candidates.map((c, i) => {
              const on = picked.includes(i)
              const blocked = !on && full
              return (
                <li key={`${c.href}-${i}`}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={blocked}
                    onClick={() => toggle(i)}
                    className={`flex w-full items-center gap-3 rounded-ctl border p-2.5 text-left transition ${
                      on ? "border-brand/60 bg-brand/10" : "border-white/10 bg-surface"
                    } ${blocked ? "opacity-40" : "hover:border-white/25"}`}
                  >
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className="h-12 w-12 shrink-0 rounded-ctl object-cover" />
                    ) : (
                      <span className="h-12 w-12 shrink-0 rounded-ctl bg-white/5" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{c.title}</span>
                      {c.subtitle && <span className="block truncate text-xs text-zinc-400">{c.subtitle}</span>}
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        on ? "border-brand bg-brand text-white" : "border-white/25"
                      }`}
                      aria-hidden="true"
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-3 text-xs text-zinc-400" aria-live="polite">
            {picked.length < POLL_MIN ? t("planPoll.needTwo") : t("planPoll.count").replace("{n}", String(picked.length))}
          </p>

          <button
            type="button"
            onClick={create}
            disabled={phase === "working" || picked.length < POLL_MIN}
            className="btn-pill btn-primary mt-3 w-full py-3.5 text-sm disabled:opacity-50"
          >
            {phase === "working" ? t("planPoll.working") : t("planPoll.create")}
          </button>

          {phase === "error" && <p className="mt-2 text-sm text-red-300">{t("planPoll.error")}</p>}

          {phase === "done" && code && (
            <div className="mt-4 rounded-ctl border border-open/30 bg-open/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-open">
                <Check size={16} aria-hidden="true" /> {copied ? t("planPoll.copied") : t("planPoll.ready")}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => send(link)}
                  className="flex items-center justify-center gap-2 rounded-ctl border border-white/15 py-2.5 text-sm font-semibold text-ink"
                >
                  <Send size={15} aria-hidden="true" /> {t("planPoll.sendGroup")}
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center justify-center gap-2 rounded-ctl border border-white/15 py-2.5 text-sm font-semibold text-ink"
                >
                  <Link2 size={15} aria-hidden="true" /> {t("sharedPlan.copyLink")}
                </button>
              </div>
              <Link href={`/plan/${code}`} className="mt-3 block text-center text-sm font-semibold text-brand-soft underline underline-offset-4">
                {t("planPoll.seeResults")}
              </Link>
            </div>
          )}
        </div>
      )}
      <AuthGateModal open={showGate} onClose={() => setShowGate(false)} reason="plan" />
    </div>
  )
}
