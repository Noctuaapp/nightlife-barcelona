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
import { useConsent } from "../../lib/useConsent"
import { hasOptionalConsent } from "../../lib/consent"
import { readLocalVotes, recordLocalVote, votedOnDay } from "../../lib/partyPollLocal"

// Juego "¿Qué prefieres?" (pedido por Jordi: "encuestas rollo el juego que preferirías... ambiente
// fiesta y cachondeo"). Decisiones: sale como popup al entrar y NO da XP, es solo por diversión.
//
// Cuándo aparece:
//   - A todo el mundo (30/10/2026; antes solo con sesión). Con cuenta, los votos van a su cuenta
//     (party_poll_votes) y no se guarda nada en el navegador. Sin cuenta, el voto es anónimo
//     (party_poll_anon_votes) y para no repetirle la pregunta se guarda en el dispositivo una marca
//     de qué votó — eso solo se hace si ha aceptado el banner de cookies (lib/consent.ts). Sin ese
//     permiso, a quien no tiene cuenta no se le enseña la encuesta.
//   - Quien juega sin cuenta no ha confirmado que es mayor de edad, así que NO recibe las preguntas
//     que hablan de alcohol (ALCOHOL_POLL_IDS en lib/partyPolls.ts, pedido por Jordi el 30/10/2026):
//     esas solo salen con cuenta.
//   - UNA encuesta al día (pedido por Jordi: "quiero que salga una encuesta al día"), la misma
//     para todo el mundo ese día — ver pollOfTheDay() en lib/partyPolls.ts. Si ya votó hoy (día
//     de Barcelona), no sale más hasta mañana. Si cierra sin votar, vuelve a salir en su próxima
//     visita de ese mismo día.
//   - Unos segundos después de entrar, nunca en admin / login / registro. Se vuelve a comprobar
//     cuando cambia el día, al volver a la pestaña o a la app (móvil en segundo plano toda la
//     noche) y al iniciar sesión. Antes solo se miraba una vez por carga de la web: con la app
//     abierta desde el día anterior no salía hasta cerrar sesión y volver a entrar (25/10/2026).
//   - Tras votar ve los porcentajes de todo el mundo. Nada de "Otra": mañana, la siguiente.

const EXCLUDED_PREFIXES = ["/admin", "/login", "/signup", "/confirm-age", "/blocked", "/profile/change-password", "/recuperar"]
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

function localStore(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export default function PartyPollPopup() {
  const pathname = usePathname() || ""
  const { locale } = useLanguage()
  const ui = locale === "es" ? UI.es : locale === "ca" ? UI.ca : UI.en

  const [open, setOpen] = useState(false)
  const [poll, setPoll] = useState<PartyPoll | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // true = juega sin cuenta (voto anónimo, con permiso de cookies para recordarlo).
  const [anon, setAnon] = useState(false)
  const consent = useConsent()
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
    // El día solo se da por comprobado cuando la encuesta ya salió o no hay nada que enseñar. Si se
    // marcara al preparar, cambiar de página antes de que pasen los segundos de espera cancelaba el
    // aviso y ya no volvía a salir ese día (corregido el 30/10/2026).
    const schedule = (todays: PartyPoll, today: number) => {
      setPoll(todays)
      setChoice(null)
      setResults(null)
      timer = setTimeout(() => {
        if (cancelled) return
        checkedDay = today
        setOpen(true)
      }, SHOW_DELAY_MS)
    }

    const prepare = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const uid = sessionData.session?.user.id ?? null
      if (cancelled) return
      const today = madridDayNumber()

      // Sin cuenta: solo con permiso de cookies, porque hay que recordar en el dispositivo qué se
      // votó. Sin permiso (o sin haber contestado aún al banner) no se enseña nada y se vuelve a
      // mirar en cuanto cambie la decisión.
      if (!uid) {
        if (!consent.ready || !consent.optional) return
        const local = readLocalVotes(localStore())
        if (votedOnDay(local, today)) {
          checkedDay = today
          return
        }
        const todays = pollOfTheDay(new Set(Object.keys(local)), today, { allowAlcohol: false })
        if (!todays) {
          checkedDay = today
          return
        }
        setUserId(null)
        setAnon(true)
        schedule(todays, today)
        return
      }

      const { data: mine, error } = await supabase
        .from("party_poll_votes")
        .select("poll_id, created_at")
        .eq("user_id", uid)
      // Si la tabla aún no existe (SQL sin ejecutar) o falla la consulta, no se enseña nada.
      if (error || cancelled) return
      const rows = (mine || []) as { poll_id: string; created_at: string }[]
      const voted = new Set(rows.map((v) => v.poll_id))
      if (rows.some((v) => madridDayNumber(new Date(v.created_at)) === today)) {
        checkedDay = today
        return
      }
      // Lo votado antes en este dispositivo sin cuenta (si dio permiso) tampoco se repite.
      if (consent.optional) {
        const local = readLocalVotes(localStore())
        if (votedOnDay(local, today)) {
          checkedDay = today
          return
        }
        Object.keys(local).forEach((id) => voted.add(id))
      }
      const todays = pollOfTheDay(voted, today, { allowAlcohol: true })
      if (!todays) {
        checkedDay = today
        return
      }
      setUserId(uid)
      setAnon(false)
      schedule(todays, today)
    }
    prepare()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, recheck, consent.ready, consent.optional])

  // Si quien juega sin cuenta retira el permiso con la encuesta abierta, se cierra.
  useEffect(() => {
    if (anon && consent.ready && !consent.optional) setOpen(false)
  }, [anon, consent.ready, consent.optional])

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
    if (!poll || choice !== null || sending) return
    if (!anon && !userId) return
    setSending(true)
    setChoice(picked)
    const { error } = anon
      ? await supabase.from("party_poll_anon_votes").insert({ poll_id: poll.id, choice: picked })
      : await supabase.from("party_poll_votes").insert({ poll_id: poll.id, choice: picked, user_id: userId })
    // Se recuerda en este dispositivo solo si el voto se guardó y hay permiso de cookies.
    if (!error && hasOptionalConsent()) recordLocalVote(localStore(), poll.id, madridDayNumber())
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
