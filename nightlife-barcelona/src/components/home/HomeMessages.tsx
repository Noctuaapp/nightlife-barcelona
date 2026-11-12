"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, ChevronRight, Crown, Megaphone, TriangleAlert, X, type LucideIcon } from "lucide-react"
import NocOwl from "../mascot/NocOwl"
import { useLanguage } from "../../context/LanguageContext"
import { useClubNoctuaEnabled } from "../../lib/appSettings"
import { activeMessages, shuffled, type HomeMessage, type HomeMessageKind, type HomeMessageText } from "../../lib/homeMessages"

// Mensajes de la portada (12/11/2026), debajo del carrusel de «Esta noche». Sustituye al chip de frases sueltas
// (FeatureTicker): ahora es una tarjeta con tipo, texto, botón y una línea de tiempo que avisa de cuándo cambia
// el mensaje. Tipos y cómo añadir publi, mesas VIP o avisos: lib/homeMessages.ts.
//   · Cambia solo cada 9 s; se detiene mientras tienes el ratón encima, el dedo puesto o el foco dentro, y con
//     «reducir movimiento» no cambia solo (se pasa con la flecha).
//   · La X oculta todos los mensajes hasta la próxima visita (se recuerda mientras dure la pestaña).
//   · Los anuncios (publi) llevan siempre la etiqueta «Publi» y, si lo hay, el nombre de quien los paga.

const INTERVAL_MS = 9000
const HIDE_KEY = "noctua_home_messages_hidden"

const ACCENT: Record<HomeMessageKind, string> = {
  tip: "#6cf2f2",
  promo: "#ff86bf",
  vip: "#f5c451",
  notice: "#fb923c",
}
const KIND_ICON: Record<Exclude<HomeMessageKind, "tip">, LucideIcon> = { promo: Megaphone, vip: Crown, notice: TriangleAlert }

// Aleatorio con semilla: el orden de los consejos no cambia cuando se recalcula la lista (p. ej. al saberse que
// Club Noctua está activo), solo cambia de una visita a otra.
function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function HomeMessages({ announcements, className = "" }: { announcements?: HomeMessage[]; className?: string }) {
  const { t } = useLanguage()
  const clubNoctua = useClubNoctuaEnabled() === true
  const [mounted, setMounted] = useState(false)
  const [seed, setSeed] = useState(1)
  const [hidden, setHidden] = useState(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [shown, setShown] = useState(true) // fundido corto al cambiar de mensaje
  const timer = useRef<number | null>(null)

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 2 ** 31))
    setMounted(true)
    try {
      setHidden(sessionStorage.getItem(HIDE_KEY) === "1")
    } catch {
      /* sin almacenamiento: se enseña */
    }
    setReduced(typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  // Antes de montar se pinta una lista fija (sin aleatorio) con el mismo alto, para que no salte nada al cargar.
  const messages = useMemo(
    () =>
      activeMessages(new Date(), {
        clubNoctua,
        announcements,
        shuffle: mounted ? (items) => shuffled(items, seededRandom(seed)) : undefined,
      }),
    [clubNoctua, announcements, mounted, seed]
  )

  const count = messages.length
  const go = (next: number) => {
    setShown(false)
    window.setTimeout(() => {
      setIndex(((next % count) + count) % count)
      setShown(true)
    }, 160)
  }

  useEffect(() => {
    if (!mounted || hidden || paused || reduced || count < 2) return
    timer.current = window.setTimeout(() => go(index + 1), INTERVAL_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, hidden, paused, reduced, count, index])

  if (hidden || count === 0) return null

  const m = messages[index % count]
  const accent = ACCENT[m.kind]
  const text = (x: HomeMessageText) => ("key" in x ? t(x.key) : x.literal)
  const tag = m.kind === "promo" && m.sponsor ? `${t("homeMsg.promo")} · ${m.sponsor}` : t(`homeMsg.${m.kind}`)
  const Kind = m.kind === "tip" ? null : KIND_ICON[m.kind]
  const cta = m.cta
  const ctaClass = "mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-white/10"
  const ctaLabel = cta ? (cta.label ? text(cta.label) : t("homeMsg.cta")) : ""

  const hide = () => {
    setHidden(true)
    try {
      sessionStorage.setItem(HIDE_KEY, "1")
    } catch {
      /* da igual: solo se oculta ahora */
    }
  }

  return (
    <section
      aria-label={t(`homeMsg.${m.kind}`)}
      aria-live="off"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={`relative overflow-hidden rounded-card border border-white/10 bg-white/[0.04] ${className}`}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
      <div className="flex min-h-[7.5rem] gap-3 py-3 pl-5 pr-2 sm:gap-4 sm:pl-6">
        <span
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: `${accent}1f`, color: accent }}
        >
          {Kind ? <Kind size={21} aria-hidden="true" /> : <NocOwl size={40} />}
        </span>

        <div className="min-w-0 flex-1 transition-opacity duration-150" style={{ opacity: shown ? 1 : 0 }}>
          <p className="text-xs font-semibold" style={{ color: accent }}>
            {tag}
          </p>
          {m.title && <p className="mt-0.5 text-sm font-bold leading-snug text-ink">{m.title}</p>}
          <p className={`${m.title ? "mt-0.5 text-zinc-300" : "mt-1 font-medium text-ink"} line-clamp-3 text-sm leading-snug`}>{text(m.text)}</p>
          {cta &&
            (cta.external ? (
              <a href={cta.href} target="_blank" rel={`noopener noreferrer${m.kind === "promo" ? " sponsored" : ""}`} className={ctaClass} style={{ borderColor: `${accent}66`, color: accent }}>
                {ctaLabel} <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            ) : (
              <Link href={cta.href} className={ctaClass} style={{ borderColor: `${accent}66`, color: accent }}>
                {ctaLabel} <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            ))}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-between self-stretch">
          <button type="button" onClick={hide} aria-label={t("homeMsg.hide")} className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-ink">
            <X size={15} aria-hidden="true" />
          </button>
          {count > 1 && (
            <button type="button" onClick={() => go(index + 1)} aria-label={t("homeMsg.next")} className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-ink">
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Línea de tiempo: se llena hasta que toca el siguiente mensaje. */}
      {count > 1 && !reduced && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 block h-0.5 bg-white/[0.06]">
          <span
            key={`${m.id}-${index}`}
            className="noctua-msg-bar block h-full origin-left"
            style={{ background: accent, animationDuration: `${INTERVAL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
          />
        </span>
      )}
      <style>{`@keyframes noctua-msg-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}.noctua-msg-bar{animation:noctua-msg-fill linear forwards}@media (prefers-reduced-motion: reduce){.noctua-msg-bar{animation:none!important}}`}</style>
    </section>
  )
}
