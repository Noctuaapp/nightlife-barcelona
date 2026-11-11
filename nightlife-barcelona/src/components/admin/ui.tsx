"use client"

import { createContext, useContext } from "react"
import type { LucideIcon } from "lucide-react"

// Piezas comunes del admin (06/11/2026). Salen del Resumen, que fue el primero en rehacerse: cada bloque
// lleva su acento (violeta de marca, rosa y cian neón, coral), los estados siguen siendo verde (bien),
// ámbar (pendiente) y rojo (aviso) sin mezclarse con los acentos, y el color nunca va solo: siempre hay
// título, icono o texto al lado.
//
// Cada sección del menú tiene su acento (General violeta, Contenido rosa, Comunidad cian, Datos coral) y
// AdminShell lo pone en el contexto: así los títulos de bloque de una pantalla toman el color de su
// sección sin que la pantalla tenga que decirlo.

export type Accent = "violet" | "pink" | "cyan" | "coral"

export const ACCENT: Record<Accent, { chip: string; text: string; glow: string; line: string; bar: string; barLast: string; tile: string; avatar: string; solid: string; ring: string }> = {
  violet: {
    chip: "bg-brand/15 text-brand-soft",
    text: "text-brand-soft",
    glow: "bg-brand/30",
    line: "via-brand",
    bar: "bg-linear-to-t from-brand/25 to-brand/80",
    barLast: "bg-brand-soft shadow-[0_0_14px_rgba(160,139,255,0.8)]",
    tile: "border-brand/25 bg-brand/10",
    avatar: "from-brand to-[#ff4fa3]",
    solid: "bg-brand",
    ring: "ring-brand/50",
  },
  pink: {
    chip: "bg-[#ff4fa3]/15 text-[#ff86bf]",
    text: "text-[#ff86bf]",
    glow: "bg-[#ff4fa3]/25",
    line: "via-[#ff4fa3]",
    bar: "bg-linear-to-t from-[#ff4fa3]/25 to-[#ff4fa3]/80",
    barLast: "bg-[#ff86bf] shadow-[0_0_14px_rgba(255,79,163,0.8)]",
    tile: "border-[#ff4fa3]/25 bg-[#ff4fa3]/10",
    avatar: "from-[#ff4fa3] to-orange-400",
    solid: "bg-[#ff4fa3]",
    ring: "ring-[#ff4fa3]/50",
  },
  cyan: {
    chip: "bg-cyan-400/15 text-cyan-300",
    text: "text-cyan-300",
    glow: "bg-cyan-400/20",
    line: "via-cyan-400",
    bar: "bg-linear-to-t from-cyan-400/25 to-cyan-400/80",
    barLast: "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]",
    tile: "border-cyan-400/25 bg-cyan-400/10",
    avatar: "from-cyan-400 to-brand",
    solid: "bg-cyan-400",
    ring: "ring-cyan-400/50",
  },
  coral: {
    chip: "bg-orange-400/15 text-orange-300",
    text: "text-orange-300",
    glow: "bg-orange-400/20",
    line: "via-orange-400",
    bar: "bg-linear-to-t from-orange-400/25 to-orange-400/80",
    barLast: "bg-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.8)]",
    tile: "border-orange-400/25 bg-orange-400/10",
    avatar: "from-orange-400 to-[#ff4fa3]",
    solid: "bg-orange-400",
    ring: "ring-orange-400/50",
  },
}
export const AVATAR_ORDER: Accent[] = ["violet", "pink", "cyan", "coral"]

// Acento de la pantalla en la que estamos (lo fija AdminShell según la sección del menú).
export const AccentContext = createContext<Accent>("violet")
export const useAccent = () => useContext(AccentContext)

// Tarjeta del Resumen.
export const CARD = "relative overflow-hidden rounded-card border border-white/10 bg-surface"

// Tarjeta con el filo de luz del acento arriba y un brillo suave en la esquina (como los KPI del Resumen).
export function Panel({
  accent,
  glow = true,
  pad = "p-5 sm:p-6",
  className = "",
  children,
  ...rest
}: { accent?: Accent; glow?: boolean; pad?: string; className?: string; children: React.ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, "className">) {
  const ctx = useAccent()
  const a = ACCENT[accent ?? ctx]
  return (
    <section {...rest} className={`${CARD} ${pad} ${className}`}>
      {glow && <span aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl ${a.glow}`} />}
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent ${a.line} to-transparent`} />
      <div className="relative">{children}</div>
    </section>
  )
}

// Título de bloque con su icono en una pastilla del color del acento.
export function SectionTitle({
  icon: Icon,
  accent,
  id,
  children,
  right,
  className = "",
}: { icon: LucideIcon; accent?: Accent; id?: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  const ctx = useAccent()
  const a = ACCENT[accent ?? ctx]
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h2 id={id} className="flex min-w-0 items-center gap-2.5 text-sm font-bold text-ink">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${a.chip}`}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0">{children}</span>
      </h2>
      {right}
    </div>
  )
}

export type TrendInfo = { dir: "up" | "down" | "flat"; text: string; prev: number }

// Variación frente al periodo anterior. El color nunca va solo: siempre lleva flecha o «= igual» y el valor de antes a la vista.
export function TrendChip({ trend }: { trend: TrendInfo }) {
  const tone = trend.dir === "up" ? "text-open" : trend.dir === "down" ? "text-red-300" : "text-zinc-400"
  return (
    <span className={`mt-1.5 block text-xs font-semibold tabular-nums ${tone}`} title={`Periodo anterior: ${trend.prev}`}>
      {trend.text}
      {!trend.text.includes("antes") && <span className="font-normal text-zinc-500"> · antes {trend.prev}</span>}
    </span>
  )
}

// Cifra con su etiqueta, en una casilla teñida del acento (los «Clubs visibles / Eventos…» del Resumen).
export function StatTile({
  accent,
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
  const ctx = useAccent()
  const a = ACCENT[accent ?? ctx]
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs text-zinc-300">
        {Icon && <Icon size={14} aria-hidden="true" className={a.text} />}
        {label}
      </span>
      <span className={`mt-1 block font-display text-2xl tabular-nums ${a.text}`}>{value}</span>
      {note != null && note !== "" && <span className="mt-0.5 block text-xs text-zinc-500">{note}</span>}
      {trend && <TrendChip trend={trend} />}
      {onClick && cue && <span className={`mt-2 block text-xs font-semibold ${a.text}`}>{cue} ›</span>}
    </>
  )
  const cls = `block rounded-2xl border p-4 text-left transition ${active ? `${a.tile} ring-1 ring-inset ${a.ring}` : a.tile} ${onClick ? "hover:brightness-125" : ""} ${className}`
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export const PILL = {
  green: "bg-open/12 text-open",
  amber: "bg-warn/12 text-warn",
  red: "bg-red-500/15 text-red-300",
  violet: "bg-brand/15 text-brand-soft",
  neutral: "bg-white/[0.06] text-zinc-300",
}
export const PILL_DOT = { green: "bg-open", amber: "bg-warn", red: "bg-red-400", violet: "bg-brand-soft", neutral: "bg-zinc-500" }

export function StatusPill({ tone, children }: { tone: keyof typeof PILL; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${PILL[tone]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PILL_DOT[tone]}`} />
      {children}
    </span>
  )
}

// Etiqueta pequeña (género, país, nivel…): tinte suave, sin borde duro.
export function Tag({ tone = "neutral", children, className = "" }: { tone?: keyof typeof PILL; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${PILL[tone]} ${className}`}>{children}</span>
}

// Chip de filtro: el elegido va teñido del color de marca (el blanco queda para la acción principal).
export const CHIP_ON = "bg-brand/20 text-white ring-1 ring-inset ring-brand/60"
export const CHIP_OFF = "border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"

export function FilterChip({
  active,
  onClick,
  children,
  count,
  className = "",
}: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? CHIP_ON : CHIP_OFF} ${className}`}
    >
      {children}
      {count != null && <span className={`tabular-nums ${active ? "text-brand-soft" : "text-zinc-500"}`}>{count}</span>}
    </button>
  )
}

// Campo de texto / desplegable / botones de las pantallas del admin.
export const INPUT =
  "w-full rounded-ctl border border-white/10 bg-night/70 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand/60"
export const BTN_PRIMARY = "rounded-ctl bg-white px-5 py-2.5 text-sm font-bold text-night transition hover:bg-zinc-200 disabled:opacity-50"
export const BTN_GHOST = "rounded-ctl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-white transition hover:bg-white/[0.1] disabled:opacity-50"
export const BTN_DANGER = "rounded-ctl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
