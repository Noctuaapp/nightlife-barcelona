"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import GoogleButton from "../auth/GoogleButton"
import { useLanguage } from "../../context/LanguageContext"
import { supabase } from "../../lib/supabase"
import { track } from "../../lib/track"
import { setPopupState, usePopupSlot } from "../../lib/popupGate"

// Aviso de registro (29/10/2026; más frecuente y en cola desde el 03/11/2026).
//
// Es un aviso emergente: aparece abajo y centrado (también en ordenador), sin tapar la pantalla (no hay
// fondo oscuro ni bloquea nada), con «Continuar con Google» como botón principal y una cruz para quitarlo.
// Sale en las fichas de club y de evento y, desde el 03/11/2026, también en la portada, la lista de
// clubs y las páginas de barrio, zona y música (ver lib/joinPrompt.ts; desde el 06/11/2026 ya no sale en
// Esenciales). Estilo «píldora»: superficie lisa, sin degradado ni resplandor.
//
// Para no molestar —y para no parecer un «intersticial intrusivo», que Google penaliza en las
// visitas que llegan desde el buscador— no sale nada más llegar:
//   · espera 12 s en la página, o a que se haya leído más de la mitad (lo que pase antes, y nunca
//     antes de 5 s). Si en esta visita ya se han mirado 2 páginas o más, espera solo 4 s: quien ya
//     está curioseando es quien más probabilidades tiene de querer guardar algo;
//   · sale una sola vez por visita;
//   · si se cierra con la cruz, no vuelve a salir en 3 días; con «Ahora no» o Escape, en 1 día, en ese
//     navegador (antes: 7 días para todo). Se guarda solo la fecha hasta la que descansa, para respetar
//     lo que la persona ha decidido;
//   · solo lo ve quien no tiene sesión, y nunca un navegador automatizado;
//   · cola de avisos (lib/popupGate.ts): nunca a la vez que el banner de cookies o la encuesta del día;
//     espera su turno, el último.
// Se anota cuándo se ve (join_view), cada pulsación (join_click: google | signup | login) y cada
// cierre (join_dismiss) para medir el embudo en Admin › Visitas.

type Kind = "club" | "event" | "page"

const SNOOZE_KEY = "noctua_join_snooze_until" // fecha (ms) hasta la que no vuelve a salir
const SHOWN_KEY = "noctua_join_shown" // sessionStorage: ya salió en esta visita
const VIEWS_KEY = "noctua_join_views" // sessionStorage: páginas con aviso vistas en esta visita
const SNOOZE_X_MS = 3 * 24 * 60 * 60 * 1000
const SNOOZE_LATER_MS = 24 * 60 * 60 * 1000
const SHOW_AFTER_MS = 12_000
const SHOW_AFTER_ENGAGED_MS = 4_000
const ENGAGED_AFTER_VIEWS = 2
const MIN_BEFORE_SCROLL_MS = 5_000
const SCROLL_DEPTH = 0.55

function snoozed(): boolean {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY) || 0)
    return until > Date.now()
  } catch {
    return false
  }
}
function alreadyShownThisVisit(): boolean {
  try {
    return window.sessionStorage.getItem(SHOWN_KEY) === "1"
  } catch {
    return false
  }
}
function rememberShown() {
  try {
    window.sessionStorage.setItem(SHOWN_KEY, "1")
  } catch {
    /* sin almacenamiento (modo privado): el aviso saldrá igual, solo una vez por carga */
  }
}
function rememberSnooze(ms: number) {
  try {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + ms))
  } catch {
    /* sin almacenamiento: saldrá igual en la próxima visita */
  }
}
// Cuenta una página más con aviso en esta visita y devuelve el total.
function bumpViews(): number {
  try {
    const n = Number(window.sessionStorage.getItem(VIEWS_KEY) || 0) + 1
    window.sessionStorage.setItem(VIEWS_KEY, String(n))
    return n
  } catch {
    return 1
  }
}

export default function JoinNoctuaCard({ kind, itemId, name }: { kind: Kind; itemId: number | null; name: string }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [anon, setAnon] = useState(false)
  const [armed, setArmed] = useState(false) // ya toca enseñarlo (pasó la espera o se leyó la página)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false) // para la animación de entrada
  const armedRef = useRef(false)
  const slot = usePopupSlot("join")

  useEffect(() => {
    let alive = true
    // getSession lee la sesión guardada en el navegador (sin llamada de red).
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAnon(!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setAnon(!session)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  // Cuándo toca: a los 12 s (4 s si ya se han mirado 2 páginas) o al haber leído más de la mitad de la
  // página (nunca antes de 5 s).
  useEffect(() => {
    if (!anon || typeof window === "undefined") return
    if (navigator.webdriver || snoozed() || alreadyShownThisVisit()) return
    const started = Date.now()
    const views = bumpViews()
    const delay = views >= ENGAGED_AFTER_VIEWS ? SHOW_AFTER_ENGAGED_MS : SHOW_AFTER_MS

    const arm = () => {
      if (armedRef.current) return
      armedRef.current = true
      setArmed(true)
    }
    const timer = window.setTimeout(arm, delay)
    const onScroll = () => {
      if (Date.now() - started < MIN_BEFORE_SCROLL_MS) return
      const doc = document.documentElement
      const depth = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1)
      if (depth >= SCROLL_DEPTH) arm()
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("scroll", onScroll)
    }
  }, [anon])

  // Sale cuando toca Y le toca en la cola de avisos (después de cookies y encuesta).
  useEffect(() => {
    if (!anon || !armed || open || !slot) return
    if (alreadyShownThisVisit()) return
    rememberShown()
    setOpen(true)
    track("join_view", { itemType: kind, itemId, itemName: name })
  }, [anon, armed, open, slot, kind, itemId, name])

  // Le cuenta a la cola que está en pantalla (el banner de cookies se aparta mientras tanto).
  useEffect(() => {
    if (!open) return
    setPopupState("join", { open: true })
    return () => setPopupState("join", { open: false })
  }, [open])

  // Entrada suave: primero se pinta fuera de sitio y un instante después se coloca.
  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }
    const id = window.requestAnimationFrame(() => setVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [open])

  const dismiss = (via: "x" | "later" | "esc") => {
    rememberSnooze(via === "x" ? SNOOZE_X_MS : SNOOZE_LATER_MS)
    setOpen(false)
    track("join_dismiss", { itemType: kind, itemId, itemName: name, meta: { via } })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss("esc")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!anon || !open) return null

  const click = (to: "google" | "signup" | "login") => track("join_click", { itemType: kind, itemId, itemName: name, meta: { to } })
  // Tras registrarse o entrar, vuelve a la página en la que estaba.
  const back = pathname || "/"
  const next = `?next=${encodeURIComponent(back)}`

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="join-noctua-title"
      className={`fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md transition duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="relative rounded-card border border-white/10 bg-surface p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)]">

        <button
          type="button"
          onClick={() => dismiss("x")}
          aria-label={t("clubPage.close")}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="relative flex items-start gap-3 pr-8">
          <div className="shrink-0 rounded-full bg-[#23202d] p-1.5">
            <NocOwl size={34} mood="party" />
          </div>
          <div className="min-w-0">
            <h2 id="join-noctua-title" className="text-[15px] font-extrabold leading-snug text-ink">
              {t(kind === "event" ? "joinCard.titleEvent" : "joinCard.titleClub")}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-zinc-300">{t("joinCard.sub")}</p>
          </div>
        </div>

        <div className="relative mt-3.5">
          <GoogleButton from="join" next={back} onBeforeGo={() => click("google")} />
          <div className="mt-3 flex items-center justify-center gap-4 text-[13px]">
            <Link href={`/signup${next}`} onClick={() => click("signup")} className="font-semibold text-ink underline-offset-4 hover:underline">
              {t("authGate.ctaEmail")}
            </Link>
            <span aria-hidden="true" className="text-zinc-600">·</span>
            <Link href={`/login${next}`} onClick={() => click("login")} className="font-semibold text-zinc-300 underline-offset-4 hover:underline">
              {t("joinCard.login")}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => dismiss("later")}
            className="mx-auto mt-2 block text-xs font-semibold text-zinc-400 transition hover:text-zinc-200"
          >
            {t("authGate.maybeLater")}
          </button>
        </div>
      </div>
    </div>
  )
}
