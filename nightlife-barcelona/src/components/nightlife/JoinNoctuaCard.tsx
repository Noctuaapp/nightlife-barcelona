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

// Aviso de registro de las fichas de club y de evento (29/10/2026).
//
// Antes era una banda fija dentro de la ficha («Esto es solo un local…», con «Crear cuenta gratis»).
// Ahora es un aviso emergente: aparece abajo y centrado (también en ordenador), sin tapar la pantalla (no hay fondo oscuro ni
// bloquea nada), con «Continuar con Google» como botón principal y una cruz para quitarlo.
//
// Para no molestar —y para no parecer un «intersticial intrusivo», que Google penaliza en las
// visitas que llegan desde el buscador— no sale nada más llegar:
//   · espera 12 s en la ficha, o a que se haya leído más de la mitad (lo que pase antes, y nunca
//     antes de 5 s);
//   · sale una sola vez por visita;
//   · si se cierra con la cruz, no vuelve a salir en 7 días en ese navegador (se guarda solo la
//     fecha de cierre, para respetar lo que la persona ha decidido);
//   · solo lo ve quien no tiene sesión, y nunca un navegador automatizado.
// Se anota cuándo se ve (join_view), cada pulsación (join_click: google | signup | login) y cada
// cierre (join_dismiss) para medir el embudo en Admin › Visitas.

type Kind = "club" | "event"

const DISMISS_KEY = "noctua_join_dismissed" // fecha (ms) del último cierre con la cruz
const SHOWN_KEY = "noctua_join_shown" // sessionStorage: ya salió en esta visita
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const SHOW_AFTER_MS = 12_000
const MIN_BEFORE_SCROLL_MS = 5_000
const SCROLL_DEPTH = 0.55

function recentlyDismissed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
    return at > 0 && Date.now() - at < SNOOZE_MS
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
function remember(store: "local" | "session") {
  try {
    if (store === "local") window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    else window.sessionStorage.setItem(SHOWN_KEY, "1")
  } catch {
    /* sin almacenamiento (modo privado): el aviso saldrá igual, solo una vez por carga */
  }
}

export default function JoinNoctuaCard({ kind, itemId, name }: { kind: Kind; itemId: number; name: string }) {
  const { t } = useLanguage()
  const pathname = usePathname()
  const [anon, setAnon] = useState(false)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false) // para la animación de entrada
  const openedRef = useRef(false)

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

  // Cuándo sale: a los 12 s o al haber leído más de la mitad de la ficha (nunca antes de 5 s).
  useEffect(() => {
    if (!anon || typeof window === "undefined") return
    if (navigator.webdriver || recentlyDismissed() || alreadyShownThisVisit()) return
    const started = Date.now()

    const reveal = () => {
      if (openedRef.current) return
      openedRef.current = true
      remember("session")
      setOpen(true)
      track("join_view", { itemType: kind, itemId, itemName: name })
    }
    const timer = window.setTimeout(reveal, SHOW_AFTER_MS)
    const onScroll = () => {
      if (Date.now() - started < MIN_BEFORE_SCROLL_MS) return
      const doc = document.documentElement
      const depth = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1)
      if (depth >= SCROLL_DEPTH) reveal()
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("scroll", onScroll)
    }
  }, [anon, kind, itemId, name])

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
    remember("local")
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
  // Tras registrarse o entrar, vuelve a la ficha en la que estaba.
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
      <div className="relative overflow-hidden rounded-card border border-brand/40 bg-gradient-to-br from-[#1b1244] via-surface to-[#2b1038] p-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <button
          type="button"
          onClick={() => dismiss("x")}
          aria-label={t("clubPage.close")}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>

        <div className="relative flex items-start gap-3 pr-8">
          <div className="shrink-0 rounded-full bg-white/[0.06] p-1.5">
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
