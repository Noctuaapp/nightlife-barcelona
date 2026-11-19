import type { CSSProperties, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import Link from "../system/CityLink"

// Tarjeta visual de la portada de Esenciales (17/11/2026). Antes todo eran filas oscuras iguales con un iconito; Clubs, en cambio, enseña
// fotos grandes. De farmacias, cajeros o supermercados no hay buenas fotos (las que había eran de 200 px y de un solo sitio), así que la
// tarjeta se hace con luz de color: un degradado del color del grupo (GROUP_ACCENT), el icono de la categoría enorme y apagado de
// marca de agua, y arriba el icono pequeño con la cifra o la etiqueta. Es CSS puro: no descarga ninguna imagen.

export function tileBackground(accent: string): CSSProperties {
  return {
    backgroundImage: `radial-gradient(120% 100% at 100% 0%, ${accent}3d, transparent 62%), linear-gradient(165deg, ${accent}24 0%, #16141f 58%, #0f0d17 100%)`,
  }
}

export default function CategoryTile({
  href,
  icon: Icon,
  accent,
  title,
  badge,
  children,
  layout = "stack",
  bordered = false,
  className = "",
}: {
  href: string
  icon: LucideIcon
  accent: string
  title: string
  /** Cifra o etiqueta pequeña arriba a la derecha (cuántos sitios hay). */
  badge?: ReactNode
  /** Líneas de debajo del título (distancia, «abiertos ahora», descripción…). */
  children?: ReactNode
  /** stack: icono arriba y texto abajo (cuadrada). row: icono a la izquierda y texto a la derecha (ancha). */
  layout?: "stack" | "row"
  /** Contorno del color del grupo y un halo suave (la portada de la web lo usa para que los accesos no se vean planos y grises). */
  bordered?: boolean
  className?: string
}) {
  const chip = (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `${accent}2e`, color: accent }}>
      <Icon size={20} aria-hidden="true" />
    </span>
  )
  return (
    <Link
      href={href}
      style={bordered ? { ...tileBackground(accent), borderColor: `${accent}8c`, boxShadow: `0 12px 30px -18px ${accent}` } : tileBackground(accent)}
      className={`group relative flex overflow-hidden rounded-card border p-4 transition ${bordered ? "hover:-translate-y-0.5 hover:brightness-110" : "border-white/10 hover:border-white/30"} ${
        layout === "stack" ? "min-h-[9.5rem] flex-col justify-between" : "min-h-[5.75rem] items-center gap-4"
      } ${className}`}
    >
      {/* Marca de agua: el mismo icono, enorme, inclinado y apagado, asomando por la esquina. */}
      <Icon
        aria-hidden="true"
        size={layout === "stack" ? 112 : 96}
        strokeWidth={1.1}
        className="pointer-events-none absolute -bottom-5 -right-4 -rotate-12"
        style={{ color: accent, opacity: 0.2 }}
      />
      {layout === "stack" ? (
        <>
          <span className="relative flex items-start justify-between gap-2">
            {chip}
            {badge != null && badge !== "" && <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-zinc-100">{badge}</span>}
          </span>
          <span className="relative mt-4 block min-w-0">
            <span className="block text-base font-semibold leading-tight text-ink">{title}</span>
            {children}
          </span>
        </>
      ) : (
        <>
          <span className="relative flex">{chip}</span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-base font-semibold leading-tight text-ink">{title}</span>
            {children}
          </span>
          {badge != null && badge !== "" && <span className="relative shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-zinc-100">{badge}</span>}
        </>
      )}
    </Link>
  )
}
