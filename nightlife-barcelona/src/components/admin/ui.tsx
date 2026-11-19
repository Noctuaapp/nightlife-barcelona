"use client"

import { createContext, useContext, useLayoutEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"

// Piezas comunes del admin.
//
// 19/11/2026, rediseño completo («no me convence el dashboard ni esos colores ni cómo se ven los botones»). Lo que
// había era una pila de tarjetas iguales, cada bloque de un color distinto sin que el color dijera nada, cifras
// enormes en la letra de cartel y botones que cambiaban de aspecto de una pantalla a otra. Ahora:
//   - UN solo acento, el violeta de marca («violeta profundo»). Sirve para lo que se puede pulsar o está elegido y para
//     los datos de las gráficas. Verde, ámbar y rojo quedan reservados para estados (bien, pendiente, aviso).
//   - El oficio está en los detalles: bordes con luz que se desvanece, un destello violeta muy suave en la esquina de
//     cada tarjeta, botones con volumen. Todo eso vive en las clases «ui-*» de globals.css (capa components).
//   - Las cifras van en la letra de texto (Plus Jakarta) y la de cartel (Unbounded) se queda solo para el título de
//     cada pantalla.
//   - Un único juego de controles: botón principal violeta, secundario neutro, peligro rojo suave, interruptor
//     segmentado para pestañas y rangos, y chips de filtro.
//   - El color nunca va solo: siempre hay título, flecha, icono o texto al lado.
//
// Los NOMBRES de los acentos («violet», «pink», «cyan», «coral») se mantienen para no tocar las ~20 pantallas que los
// pasan, pero ya no cambian el color: los cuatro apuntan al mismo violeta.

export type Accent = "violet" | "pink" | "cyan" | "coral"

const VIOLET = {
  chip: "bg-brand/15 text-brand-soft",
  text: "text-brand-soft",
  glow: "bg-brand/20",
  line: "via-brand",
  bar: "bg-brand/45",
  barLast: "bg-brand",
  tile: "border-white/[0.07] bg-white/[0.025]",
  avatar: "from-brand to-[#5b3fd6]",
  solid: "bg-brand",
  ring: "ring-brand/50",
}

export const ACCENT: Record<Accent, typeof VIOLET> = { violet: VIOLET, pink: VIOLET, cyan: VIOLET, coral: VIOLET }
export const AVATAR_ORDER: Accent[] = ["violet", "pink", "cyan", "coral"]

// Acento de la pantalla en la que estamos (lo fija AdminShell). Se conserva por compatibilidad.
export const AccentContext = createContext<Accent>("violet")
export const useAccent = () => useContext(AccentContext)

// Tarjeta del admin: borde en degradado con luz, destello violeta en la esquina y sombra larga (ver .ui-card en globals.css).
export const CARD = "ui-card overflow-hidden"

export function Panel({
  glow: _glow,
  accent: _accent,
  pad = "p-5 sm:p-6",
  className = "",
  children,
  ...rest
}: { accent?: Accent; glow?: boolean; pad?: string; className?: string; children: React.ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, "className">) {
  return (
    <section {...rest} className={`${CARD} ${pad} ${className}`}>
      {children}
    </section>
  )
}

// Enlace de texto de una tarjeta («Ver todo», «Cambiar»). Violeta suave, sin subrayado.
export const LINK = "inline-flex items-center gap-1 text-xs font-semibold text-brand-soft transition hover:text-ink"

// Título de bloque: el nombre manda, el icono es un detalle gris.
export function SectionTitle({
  icon: Icon,
  id,
  children,
  right,
  className = "",
}: { icon?: LucideIcon; accent?: Accent; id?: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 id={id} className="flex min-w-0 items-center gap-2.5 text-[15px] font-bold tracking-tight text-ink">
        {Icon && (
          <span className="ui-icon">
            <Icon size={15} aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0">{children}</span>
      </h2>
      {right}
    </div>
  )
}

export type TrendInfo = { dir: "up" | "down" | "flat"; text: string; prev: number }

/** Fechas del periodo con el que se compara («28/10 al 10/11»): la página las pone y cada «antes» las enseña debajo. */
export const TrendRangeContext = createContext<string | null>(null)

// Variación frente al periodo anterior. El color nunca va solo: siempre lleva flecha o «= igual» y el valor de antes a la vista.
export function TrendChip({ trend }: { trend: TrendInfo }) {
  const since = useContext(TrendRangeContext)
  const tone = trend.dir === "up" ? "text-open" : trend.dir === "down" ? "text-red-300" : "text-zinc-400"
  return (
    <span className={`mt-1.5 block text-xs font-semibold tabular-nums ${tone}`} title={`Periodo anterior${since ? ` (${since})` : ""}: ${trend.prev}`}>
      {trend.text}
      {!trend.text.includes("antes") && <span className="font-normal text-zinc-500"> · antes {trend.prev}</span>}
      {since && <span className="block font-normal text-zinc-500">del {since}</span>}
    </span>
  )
}

// Cifra con su etiqueta. Casilla neutra; si se puede pulsar, se eleva al pasar por encima y la elegida lleva el
// borde violeta.
export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  active,
  onClick,
  cue,
  trend,
  className = "",
}: {
  accent?: Accent
  label: string
  value: React.ReactNode
  note?: React.ReactNode
  icon?: LucideIcon
  active?: boolean
  onClick?: () => void
  /** Texto corto al pie de una casilla que lleva a otra parte («Ver dónde ›»): avisa de que se puede pulsar. */
  cue?: string
  /** Variación frente al periodo anterior (▲ 18 %, ▼ antes 3...). Lo calcula lib/dataInsights.compareValues. */
  trend?: TrendInfo | null
  className?: string
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        {Icon && <Icon size={14} aria-hidden="true" className="shrink-0 text-zinc-500" />}
        {label}
      </span>
      <span className="mt-1.5 block text-[26px] font-extrabold leading-none tracking-tight text-ink">{value}</span>
      {note != null && note !== "" && <span className="mt-1.5 block text-xs text-zinc-500">{note}</span>}
      {trend && <TrendChip trend={trend} />}
      {onClick && cue && <span className="mt-2 block text-xs font-semibold text-brand-soft">{cue} ›</span>}
    </>
  )
  const cls = `ui-well block p-4 text-left transition ${active ? "ui-well-on" : ""} ${onClick ? "hover:border-brand-soft/40 hover:brightness-125" : ""} ${className}`
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export const PILL = {
  green: "bg-open/10 text-open ring-1 ring-inset ring-open/20",
  amber: "bg-warn/10 text-warn ring-1 ring-inset ring-warn/20",
  red: "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-400/25",
  violet: "bg-brand/15 text-brand-soft ring-1 ring-inset ring-brand/30",
  neutral: "bg-white/[0.06] text-zinc-300 ring-1 ring-inset ring-white/10",
}
export const PILL_DOT = { green: "bg-open", amber: "bg-warn", red: "bg-red-400", violet: "bg-brand-soft", neutral: "bg-zinc-500" }

export function StatusPill({ tone, children }: { tone: keyof typeof PILL; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PILL_DOT[tone]}`} />
      {children}
    </span>
  )
}

// Etiqueta pequeña (género, país, nivel…): tinte suave, esquinas cortas para que no se confunda con un botón.
export function Tag({ tone = "neutral", children, className = "" }: { tone?: keyof typeof PILL; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${PILL[tone]} ${className}`}>{children}</span>
}

// Chip de filtro (se pueden elegir varios): el elegido se tiñe de violeta con borde de luz.
export function FilterChip({
  active,
  onClick,
  children,
  count,
  className = "",
}: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`ui-chip ${className}`}>
      {children}
      {count != null && <span className={`tabular-nums ${active ? "text-brand-soft" : "text-zinc-500"}`}>{count}</span>}
    </button>
  )
}

// Interruptor segmentado: UNA opción elegida de entre varias (pestañas, rangos de fechas, ciudad). Una pista hundida con
// una pieza de cristal violeta que se DESLIZA hasta la opción elegida (se mide cada botón, así que valen anchos distintos).
// Si el valor no coincide con ninguna opción (un rango de fechas escrito a mano), la pieza se esconde.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: React.ReactNode; count?: number }[]
  value: T | ""
  onChange: (v: T) => void
  /** Nombre del grupo para lectores de pantalla. */
  label: string
  className?: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null)
  const [animate, setAnimate] = useState(false)
  const count = options.length

  useLayoutEffect(() => {
    const measure = () => {
      const el = value ? refs.current[value] : null
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null)
    }
    measure()
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    if (wrap.current) ro?.observe(wrap.current)
    // La primera colocación no se anima: la pieza aparece ya en su sitio.
    const raf = requestAnimationFrame(() => setAnimate(true))
    return () => {
      ro?.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value, count])

  return (
    <div ref={wrap} role="group" aria-label={label} className={`ui-seg overflow-x-auto ${className}`}>
      <span
        aria-hidden="true"
        className="ui-seg-thumb"
        style={{ width: thumb?.w ?? 0, transform: `translateX(${thumb?.x ?? 0}px)`, opacity: thumb ? 1 : 0, transitionDuration: animate ? undefined : "0s" }}
      />
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[o.value] = el
            }}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className="ui-seg-item"
          >
            {o.label}
            {o.count != null && <span className={`tabular-nums ${on ? "text-white/80" : "text-zinc-500"}`}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Campo de texto / desplegable / botones de las pantallas del admin.
export const INPUT =
  "w-full rounded-ctl border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-zinc-500 hover:border-white/20 focus:border-brand/60 focus:bg-white/[0.05] focus:ring-2 focus:ring-brand/20"
// Botones (clases «ui-btn» de globals.css). Principal: cristal violeta con volumen y un destello al pasar. Secundario: cristal
// oscuro con borde de luz. Terciario: sin caja hasta que lo tocas. Peligro: el mismo cristal en rojo. Con «-SM» para dentro de una
// tarjeta y «BTN_ICON» para un botón cuadrado con un solo icono. En carga: aria-busy="true".
export const BTN_PRIMARY = "ui-btn ui-btn-primary"
export const BTN_PRIMARY_SM = "ui-btn ui-btn-sm ui-btn-primary"
export const BTN_GHOST = "ui-btn ui-btn-secondary"
export const BTN_GHOST_SM = "ui-btn ui-btn-sm ui-btn-secondary"
export const BTN_QUIET = "ui-btn ui-btn-ghost"
export const BTN_ICON = "ui-btn ui-btn-icon ui-btn-secondary"
export const BTN_DANGER = "ui-btn ui-btn-danger"
