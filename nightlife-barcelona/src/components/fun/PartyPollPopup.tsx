"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import { useOwnLevelColor } from "../mascot/NocSays"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { madridDayNumber, pollOfTheDay, pollText, type PartyPoll } from "../../lib/partyPolls"
import { track } from "../../lib/track"

// Juego "¿Qué prefieres?" (pedido por Jordi: "encuestas rollo el juego que preferirías... ambiente
// fiesta y cachondeo"). Decisiones: sale como popup al entrar y NO da XP, es solo por diversión.
//
// Cuándo aparece:
//   - Solo a gente con sesión: el contenido habla de bebida y quien se registra ya confirmó que
//     es mayor de edad. Además así los votos van a su cuenta y no hace falta guardar nada en el
//     navegador (sin cookies ni localStorage, igual que la analítica de lib/track.ts).
//   - UNA encuesta al día (pedido por Jordi: "quiero que salga una encuesta al día"), la misma
//     para todo el mundo ese día — ver pollOfTheDay() en lib/partyPolls.ts. Si ya votó hoy (día
//     de Barcelona), no sale más hasta mañana. Si cierra sin votar, vuelve a salir en su próxima
//     visita de ese mismo día.
//   - Unos segundos después de entrar, nunca en admin / login / registro. Se vuelve a comprobar
//     cuando cambia el día, al volver a la pestaña o a la app (móvil en segundo plano toda la
//     noche) y al iniciar sesión. Antes solo se miraba una vez por carga de la web: con la app
//     abierta desde el día anterior no salía hasta cerrar sesión y volver a entrar (25/10/2026).
//   - Tras votar ve los porcentajes de todo el mundo. Nada de "Otra": mañana, la siguiente.

const EXCLUDED_PREFIXES = ["/admin", "/login", "/signup", "/confirm-age", "/blocked", "/profile/change-password"]
const SHOW_DELAY_MS = 6000

// Día (de Barcelona) en que ya se comprobó, en memoria: navegar entre páginas el mismo día no lo
// vuelve a disparar, pero al día siguiente sí.
let checkedDay: number | null = null

const UI = {
  es: { title: "¿Qué prefieres?", or: "o", close: "Cerrar", votes: "votos", vote: "voto", yours: "Tu elección", fun: "La encuesta de hoy. Nadie ve lo que votas, solo el total.", tomorrow: "Mañana, otra." },
  ca: { title: "Què prefereixes?", or: "o", close: "Tancar", votes: "vots", vote: "vot", yours: "La teva tria", fun: "L'enquesta d'avui. Ningú veu què votes, només el total.", tomorrow: "Demà, una altra." },
  en: { title: "Would you rather?", or: "or", close: "Close", votes: "votes", vote: "vote", yours: "Your pick", fun: "Today's poll. Nobody sees your vote, only the totals.", tomorrow: "New one tomorrow." },
}

type Results = { a: number; b: number }

export default function PartyPollPopup() {
  const pathname = usePathname() || ""
  const { locale } = useLanguage()
  const ui = locale === "es" ? UI.es : locale === "ca" ? UI.ca : UI.en

  const [open, setOpen] = useState(false)
  const [poll, setPoll] = useState<PartyPoll | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [choice, setChoice] = useState<0 | 1 | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [sending, setSending] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  // Noc con el color del nivel de Club Noctua de quien juega (antes salía siempre gris).
  const levelColor = useOwnLevelColor()
  // Sube cada vez que hay que volver a mirar (pestaña visible otra vez, sesión iniciada).
  const [recheck, setRecheck] = useState(0)

  useEffect(() => {
    const bump = () => {
      if (document.visibilityState === "visible" && checkedDay !== madridDayNumber()) setRecheck((n) => n + 1)
    }
    document.addEventListener("visibilitychange", bump)
    window.addEventListener("focus", bump)
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        checkedDay = null
        setRecheck((n) => n + 1)
      }
    })
    return () => {
      document.removeEventListener("visibilitychange", bump)
      window.removeEventListener("focus", bump)
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) return
    if (checkedDay === madridDayNumber()) return
    if (EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const prepare = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user.id
      if (!uid || cancelled) return
      checkedDay = madridDayNumber()
      const { data: mine, error } = await supabase
        .from("party_poll_votes")
        .select("poll_id, created_at")
        .eq("user_id", uid)
      // Si la tabla aún no existe (SQL sin ejecutar) o falla la consulta, no se enseña nada.
      if (error || cancelled) return
      const rows = (mine || []) as { poll_id: string; created_at: string }[]
      const voted = new Set(rows.map((v) => v.poll_id))
      const today = madridDayNumber()
      if (rows.some((v) => madridDayNumber(new Date(v.created_at)) === today)) return
      const todays = pollOfTheDay(voted, today)
      if (!todays) return
      setUserId(uid)
      setPoll(todays)
      setChoice(null)
      setResults(null)
      timer = setTimeout(() => {
        if (!cancelled) setOpen(true)
      }, SHOW_DELAY_MS)
    }
    prepare()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, recheck])

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    dialogRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  const vote = async (picked: 0 | 1) => {
    if (!poll || !userId || choice !== null || sending) return
    setSending(true)
    setChoice(picked)
    await supabase.from("party_poll_votes").insert({ poll_id: poll.id, choice: picked, user_id: userId })
    track("party_poll_vote", { itemType: "poll", itemName: poll.id, meta: { choice: picked } })
    const { data } = await supabase.rpc("party_poll_results", { p_poll_id: poll.id })
    const row = Array.isArray(data) ? data[0] : data
    // Si por lo que sea no llegan los totales, al menos se cuenta su propio voto.
    setResults({
      a: Number(row?.votes_a ?? (picked === 0 ? 1 : 0)),
      b: Number(row?.votes_b ?? (picked === 1 ? 1 : 0)),
    })
    setSending(false)
  }

  if (!mounted || !open) return null

  const text = poll ? pollText(poll, locale) : null
  const total = results ? results.a + results.b : 0
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  const option = (idx: 0 | 1, label: string) => {
    const count = results ? (idx === 0 ? results.a : results.b) : 0
    const percent = pct(count)
    const mine = choice === idx
    const showing = results !== null
    return (
      <button
        type="button"
        onClick={() => vote(idx)}
        disabled={choice !== null}
        aria-pressed={mine}
        className={`relative w-full overflow-hidden rounded-ctl border px-4 py-4 text-left text-[15px] font-semibold leading-snug transition active:scale-[0.98] disabled:active:scale-100 ${
          mine ? "border-brand bg-brand/10 text-ink" : showing ? "border-white/10 bg-white/[0.03] text-zinc-300" : "border-white/15 bg-white/[0.05] text-ink hover:border-brand-soft hover:bg-white/[0.08]"
        }`}
      >
        {showing && (
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 ${mine ? "bg-brand/30" : "bg-white/[0.07]"}`}
            style={{ width: `${percent}%`, transition: "width 0.7s cubic-bezier(.2,.8,.2,1)" }}
          />
        )}
        <span className="relative flex items-center justify-between gap-3">
          <span>{label}</span>
          {showing && <span className="shrink-0 font-display text-lg tabular-nums">{percent}%</span>}
        </span>
        {showing && mine && <span className="relative mt-1 block text-xs font-semibold text-brand-soft">{ui.yours}</span>}
      </button>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-night/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={close}
      style={{ animation: "pollFade 0.25s ease-out" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="party-poll-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-card border border-white/10 bg-surface p-6 shadow-2xl"
        // El foco va al diálogo al abrirse (para Escape y lectores de pantalla), pero sin el anillo
        // morado global de :focus-visible alrededor de toda la tarjeta.
        style={{ animation: "pollRise 0.45s cubic-bezier(.2,1.2,.4,1)", outline: "none" }}
      >
        <button type="button" onClick={close} aria-label={ui.close} className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 transition hover:text-ink">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <NocOwl size={56} mood={results ? "wow" : "party"} levelColor={levelColor} />
          <h2 id="party-poll-title" className="font-display text-2xl text-ink">{ui.title}</h2>
        </div>

        {text && (
          <>
            <div className="mt-5 flex flex-col gap-2">
              {option(0, text.a)}
              <span className="text-center text-xs font-semibold text-zinc-500">{ui.or}</span>
              {option(1, text.b)}
            </div>

            <div className="mt-4 flex min-h-[40px] items-center justify-between gap-3">
              <p className="text-xs leading-snug text-muted">
                {results ? `${total} ${total === 1 ? ui.vote : ui.votes} · ${ui.tomorrow}` : ui.fun}
              </p>
              {results && (
                <button
                  type="button"
                  onClick={close}
                  className="shrink-0 rounded-ctl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong active:scale-95"
                >
                  {ui.close}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes pollFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pollRise { from { opacity: 0; transform: translateY(24px) scale(.97) } to { opacity: 1; transform: none } }
      `}</style>
    </div>,
    document.body
  )
}
