"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { Share2, X } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import { useOwnLevelColor } from "../mascot/NocSays"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "../../context/LanguageContext"
import { isAlcoholPoll, madridDayNumber, pollOfTheDay, pollText, type PartyPoll } from "../../lib/partyPolls"
import { track } from "../../lib/track"
import { useConsent } from "../../lib/useConsent"
import { hasOptionalConsent } from "../../lib/consent"
import { readLocalVotes, recordLocalVote, votedOnDay } from "../../lib/partyPollLocal"
import { setPopupState, usePopupSlot } from "../../lib/popupGate"
import { DOTS, dotsFilled, shareText, verdictOwlMood, verdictText } from "../../lib/pollVerdict"

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
//   - El veredicto (05/11/2026, lib/pollVerdict.ts): además de los porcentajes, Noc le dice cómo le ha ido
//     contra el resto («eres de los raros», «ciudad dividida»…), con 20 puntos que muestran qué parte
//     de la gente piensa como él/ella, y un botón para compartirlo (el enlace lleva ?utm_source=poll
//     para saber cuánta gente llega por ahí). Con menos de 8 votos solo dice que es de los primeros.
//   - Toques sin querer (04/11/2026): tocar fuera de la tarjeta YA NO la cierra (antes un toque suelto al
//     aparecer la hacía desaparecer y ese día no volvía), y durante los primeros instantes los botones
//     no responden, para que el toque que iba dirigido a la página de debajo no se cuele como un voto o
//     un cierre. Se cierra con la X, con Escape o con «Cerrar» después de votar.
//   - Cola de avisos (03/11/2026, lib/popupGate.ts): ya no sale a la vez que el banner de cookies ni
//     que el aviso de registro. Pasados los segundos de espera, espera su turno: después de las
//     cookies y antes del registro, y con una pausa entre uno y otro.

const EXCLUDED_PREFIXES = ["/admin", "/login", "/signup", "/confirm-age", "/blocked", "/profile/change-password", "/recuperar"]
const SHOW_DELAY_MS = 6000
// Tiempo tras aparecer en el que los botones aún no responden (el dedo suele seguir en la pantalla).
const TOUCH_GUARD_MS = 700

// Día (de Barcelona) en que ya se comprobó, en memoria: navegar entre páginas el mismo día no lo
// vuelve a disparar, pero al día siguiente sí.
let checkedDay: number | null = null

const UI = {
  es: { title: "¿Qué preferirías?", or: "VS", adult: "+18 · sin filtro", close: "Cerrar", yours: "Tu elección", fun: "La de hoy. Nadie ve lo que votas, solo el total. Sé sincero/a.", tomorrow: "Vuelve mañana, que la próxima es peor.", share: "Compartir", copied: "Enlace copiado", likeYou: "piensa como tú" },
  ca: { title: "Què preferiries?", or: "VS", adult: "+18 · sense filtre", close: "Tancar", yours: "La teva tria", fun: "La d'avui. Ningú veu què votes, només el total. Sigues sincer/a.", tomorrow: "Torna demà, que la propera és pitjor.", share: "Compartir", copied: "Enllaç copiat", likeYou: "pensa com tu" },
  en: { title: "Would you rather?", or: "VS", adult: "18+ · no filter", close: "Close", yours: "Your pick", fun: "Today's one. Nobody sees your vote, only the totals. Be honest.", tomorrow: "Come back tomorrow, the next one's worse.", share: "Share", copied: "Link copied", likeYou: "think like you" },
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
  // Puntos del veredicto encendidos (se encienden uno a uno un instante después de votar) y aviso de
  // «enlace copiado» cuando el móvil no tiene menú de compartir.
  const [dotsOn, setDotsOn] = useState(false)
  const [copied, setCopied] = useState(false)
  // false durante los primeros instantes tras abrirse (ver TOUCH_GUARD_MS).
  const [touchReady, setTouchReady] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  // Noc con el color del nivel de Club Noctua de quien juega (antes salía siempre gris).
  const levelColor = useOwnLevelColor()
  // Sube cada vez que hay que volver a mirar (pestaña visible otra vez, sesión iniciada).
  const [recheck, setRecheck] = useState(0)
  // Cola de avisos: `waiting` = ya está preparada y va a salir; `armed` = ya pasaron los segundos de
  // espera; `slot` = le toca (no hay otro aviso en pantalla).
  const slot = usePopupSlot("poll")
  const [waiting, setWaiting] = useState(false)
  const [armed, setArmed] = useState(false)

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
    // aviso y ya no volvía a salir ese día (corregido el 30/10/2026). Ahora, al acabar la espera solo se
    // «arma»: sale cuando le toca en la cola de avisos (ver más abajo).
    const schedule = (todays: PartyPoll) => {
      setPoll(todays)
      setChoice(null)
      setResults(null)
      setWaiting(true)
      timer = setTimeout(() => {
        if (!cancelled) setArmed(true)
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
        schedule(todays)
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
      schedule(todays)
    }
    prepare()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      setWaiting(false)
      setArmed(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, recheck, consent.ready, consent.optional])

  // Sale cuando ya pasó la espera Y le toca en la cola de avisos.
  useEffect(() => {
    if (!armed || !slot || open) return
    checkedDay = madridDayNumber()
    setArmed(false)
    setWaiting(false)
    setOpen(true)
  }, [armed, slot, open])

  // Le cuenta a la cola si está abierta o a punto de salir (el aviso de registro espera por ella).
  useEffect(() => {
    setPopupState("poll", { open, pending: waiting && !open })
  }, [open, waiting])
  useEffect(() => () => setPopupState("poll", { open: false, pending: false }), [])

  // Si quien juega sin cuenta retira el permiso con la encuesta abierta, se cierra.
  useEffect(() => {
    if (anon && consent.ready && !consent.optional) setOpen(false)
  }, [anon, consent.ready, consent.optional])

  const close = useCallback(() => setOpen(false), [])

  // Los puntos del veredicto se encienden después de que las barras se hayan movido.
  useEffect(() => {
    if (!results) {
      setDotsOn(false)
      return
    }
    const id = window.setTimeout(() => setDotsOn(true), 450)
    return () => window.clearTimeout(id)
  }, [results])

  useEffect(() => {
    if (!open) {
      setTouchReady(false)
      return
    }
    const id = window.setTimeout(() => setTouchReady(true), TOUCH_GUARD_MS)
    return () => window.clearTimeout(id)
  }, [open])

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
  const mineCount = results && choice !== null ? (choice === 0 ? results.a : results.b) : 0
  const verdict = results && poll && choice !== null ? verdictText(locale, mineCount, total, poll.id) : null

  const shareVerdict = async () => {
    if (!verdict || !text || choice === null || !poll) return
    const message = shareText(locale, choice === 0 ? text.a : text.b, verdict.bucket, verdict.pct)
    const url = `${window.location.origin}/?utm_source=poll`
    track("share_click", { itemType: "poll", itemName: poll.id })
    try {
      if (navigator.share) {
        await navigator.share({ title: "Noctua", text: message, url })
        return
      }
      await navigator.clipboard.writeText(`${message} ${url}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      /* quien cierra el menú de compartir no ha hecho nada malo */
    }
  }

  const option = (idx: 0 | 1, label: string) => {
    const count = results ? (idx === 0 ? results.a : results.b) : 0
    const percent = pct(count)
    const mine = choice === idx
    const showing = results !== null
    return (
      <button
        type="button"
        onClick={() => vote(idx)}
        disabled={choice !== null || !touchReady}
        aria-pressed={mine}
        className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] px-4 py-4 text-left text-[16px] font-extrabold leading-snug tracking-tight transition active:scale-[0.98] disabled:active:scale-100 ${
          mine
            ? "bg-white text-[#0a0910]"
            : showing
              ? "bg-[#1b1824] text-zinc-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
              : "bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-[#2c2937]"
        }`}
      >
        {showing && (
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 ${mine ? "bg-[#0a0910]/10" : "bg-white/[0.06]"}`}
            style={{ width: `${percent}%`, transition: "width 0.7s cubic-bezier(.2,.8,.2,1)" }}
          />
        )}
        <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${mine ? "bg-[#0a0910] text-white" : "bg-white/10 text-white"}`}>{idx === 0 ? "A" : "B"}</span>
        <span className="relative min-w-0 flex-1">
          <span className="block">{label}</span>
          {showing && mine && <span className="mt-0.5 block text-xs font-bold text-[#0a0910]/60">{ui.yours}</span>}
        </span>
        {showing && <span className="relative shrink-0 font-display text-xl tabular-nums">{percent}%</span>}
      </button>
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-night/80 p-4 sm:items-center"
      style={{ animation: "pollFade 0.25s ease-out" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="party-poll-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-card border border-white/10 bg-surface p-6 shadow-2xl"
        // El foco va al diálogo al abrirse (para Escape y lectores de pantalla), pero sin el anillo
        // morado global de :focus-visible alrededor de toda la tarjeta.
        style={{ animation: "pollRise 0.45s cubic-bezier(.2,1.2,.4,1)", outline: "none" }}
      >
        <button type="button" onClick={close} disabled={!touchReady} aria-label={ui.close} className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 transition hover:text-ink disabled:opacity-60">
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <NocOwl size={56} mood={verdict ? verdictOwlMood(verdict.bucket) : "party"} levelColor={levelColor} />
          <div className="min-w-0">
            <h2 id="party-poll-title" className="font-display text-2xl text-ink">{ui.title}</h2>
            {poll && isAlcoholPoll(poll) && (
              <span className="mt-1 inline-block rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-[#0a0910]">{ui.adult}</span>
            )}
          </div>
        </div>

        {text && (
          <>
            <div className="mt-5 flex flex-col gap-2">
              {option(0, text.a)}
              <span className="flex items-center gap-3 text-zinc-500" aria-hidden="true">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-black tracking-widest">{ui.or}</span>
                <span className="h-px flex-1 bg-white/10" />
              </span>
              {option(1, text.b)}
            </div>

            {verdict ? (
              <div className="mt-4">
                <div className="rounded-2xl border border-white/10 bg-[#14111c] p-4" style={{ animation: "pollRise 0.5s cubic-bezier(.2,1.2,.4,1)" }}>
                  <p className="font-display text-xl leading-tight text-white">{verdict.title}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-zinc-300">{verdict.line}</p>
                  {verdict.bucket !== "early" && (
                    <div className="mt-4 flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:gap-4" aria-hidden="true">
                      <div className="grid w-full grid-cols-10 gap-1.5 min-[360px]:flex-1">
                        {Array.from({ length: DOTS }, (_, i) => (
                          <span
                            key={i}
                            className={`aspect-square rounded-full transition-colors duration-300 motion-reduce:transition-none ${dotsOn && i < dotsFilled(verdict.pct) ? "bg-white" : "bg-white/[0.12]"}`}
                            style={{ transitionDelay: `${i * 35}ms` }}
                          />
                        ))}
                      </div>
                      <div className="flex shrink-0 items-baseline gap-2 min-[360px]:block min-[360px]:text-right">
                        <p className="font-display text-3xl leading-none tabular-nums text-white">{verdict.pct}%</p>
                        <p className="text-[11px] font-semibold text-zinc-400 min-[360px]:mt-1">{ui.likeYou}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={shareVerdict}
                    className="btn-pill btn-secondary inline-flex items-center justify-center gap-2 px-4 py-3 text-sm active:scale-95"
                  >
                    <Share2 size={15} aria-hidden="true" className="shrink-0" /> {copied ? ui.copied : ui.share}
                  </button>
                  <button type="button" onClick={close} className="btn-pill btn-primary px-4 py-3 text-sm active:scale-95">
                    {ui.close}
                  </button>
                </div>
                <p className="mt-3 text-center text-xs leading-snug text-muted">
                  {ui.tomorrow}
                </p>
              </div>
            ) : (
              <p className="mt-4 min-h-[40px] text-xs leading-snug text-muted">{ui.fun}</p>
            )}
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
