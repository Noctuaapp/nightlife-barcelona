"use client"

import { useEffect, type ReactNode } from "react"
import { ChevronLeft, Search, X } from "lucide-react"

// Piezas para pantallas de «buscar, elegir y editar» del admin (Clubs, Eventos, Esenciales, Mañaneo, Programación).
//
// 19/11/2026: «el fondo todo negro con la ficha negra para editar es muy complicado de ver». Ahora hay capas claras:
//   fondo de la página  <  fila de la lista  <  ficha de edición (más clara, con luz en la esquina)  >  campos (hundidos, con
//   borde visible). En ordenador la ficha se abre a la derecha de la lista, sin perder tu sitio; en móvil y tablet ocupa la
//   pantalla entera con su barra de guardar siempre a la vista. Los estados de sí/no son interruptores con su texto, no una
//   fila de botones sueltos. Los estilos («ui-sheet», «ui-input», «ui-item»...) están en globals.css.

/** Buscador con lupa y botón para borrar. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className = "",
}: { value: string; onChange: (v: string) => void; placeholder: string; label?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className="ui-input ui-input-flat pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Borrar búsqueda"
          className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

/** Un campo: nombre arriba (legible, sin mayúsculas), el control y una ayuda debajo. */
export function Field({
  label,
  hint,
  children,
  wide = false,
  group = false,
}: { label: ReactNode; hint?: ReactNode; children: ReactNode; wide?: boolean; group?: boolean }) {
  const Tag = group ? "div" : "label"
  return (
    <Tag className={`block min-w-0 ${wide ? "md:col-span-2" : ""}`}>
      <span className="ui-label">{label}</span>
      {children}
      {hint && <span className="ui-hint block">{hint}</span>}
    </Tag>
  )
}

/** Rejilla de campos: dos columnas en pantalla ancha. */
export function FieldGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2 ${className}`}>{children}</div>
}

/** Título de un grupo de campos dentro de la ficha. */
export function FormSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-4 border-b border-white/10 pb-2.5">
        <h3 className="text-[15px] font-extrabold tracking-tight text-white">{title}</h3>
        {hint && <p className="mt-1 text-xs leading-relaxed text-zinc-300/80">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

/** Interruptor de sí/no con su explicación al lado. */
export function SwitchRow({
  checked,
  onChange,
  title,
  hint,
  tone,
  disabled,
}: { checked: boolean; onChange: (v: boolean) => void; title: ReactNode; hint?: ReactNode; tone?: "green" | "amber" | "red"; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.07] disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{title}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-zinc-300/80">{hint}</span>}
      </span>
      <span className="ui-switch" data-on={checked} data-tone={tone} aria-hidden="true" />
    </button>
  )
}

/** Pestañas dentro de la ficha (una sola visible a la vez; lo escrito en las demás se conserva). */
export function SheetTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="ui-tabs">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} onClick={() => onChange(t.value)} className="ui-tab">
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Miniatura de una fila: la foto o, si no hay, la inicial en un cuadro de color. */
export function Thumb({ src, name, size = 48, fallback }: { src?: string | null; name: string; size?: number; fallback?: ReactNode }) {
  const box = { width: size, height: size }
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={box} className="shrink-0 rounded-xl object-cover ring-1 ring-white/15" loading="lazy" />
  }
  // Sin foto, un icono propio (p. ej. el de la categoría de un esencial) en vez de la inicial.
  if (fallback) {
    return (
      <span style={box} aria-hidden="true" className="grid shrink-0 place-items-center rounded-xl bg-white/[0.06] text-brand-soft ring-1 ring-white/15">
        {fallback}
      </span>
    )
  }
  return (
    <span style={box} aria-hidden="true" className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/40 to-[#3b2a8f]/60 text-base font-extrabold text-white ring-1 ring-white/15">
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** Bloquea el scroll de la página mientras la ficha ocupa toda la pantalla (móvil y tablet). */
function useSheetLock() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 1279px)").matches) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}

/**
 * Ficha de edición. Se pinta SOLO cuando hay algo abierto. Barra de arriba con el nombre y los enlaces, cuerpo con su propio
 * scroll y barra de abajo fija con Guardar / Cancelar (y Borrar a la izquierda).
 */
export function EditSheet({
  title,
  subtitle,
  onClose,
  links,
  footer,
  children,
}: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; links?: ReactNode; footer: ReactNode; children: ReactNode }) {
  useSheetLock()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <aside
      role="dialog"
      aria-label={typeof title === "string" ? title : "Editar"}
      className="ui-sheet fixed inset-0 z-[70] flex flex-col rounded-none xl:sticky xl:inset-auto xl:top-5 xl:z-0 xl:max-h-[calc(100vh-40px)] xl:rounded-[22px]"
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
        <button type="button" onClick={onClose} aria-label="Volver a la lista" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white transition hover:bg-white/15 xl:hidden">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-extrabold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-300/80">{subtitle}</p>}
        </div>
        {links && <div className="flex shrink-0 items-center gap-2">{links}</div>}
        <button type="button" onClick={onClose} aria-label="Cerrar" className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-white transition hover:bg-white/15 xl:grid">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5">{children}</div>
      <footer className="ui-sheet-bar flex flex-wrap items-center gap-2.5 rounded-b-[22px] border-t border-white/10 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">{footer}</footer>
    </aside>
  )
}

/**
 * Lista y ficha. En pantalla muy ancha (xl) la ficha se abre a la derecha y la lista se queda a la izquierda, más estrecha. En el
 * resto, la ficha tapa la pantalla (ver EditSheet) y la lista sigue donde estaba al cerrarla.
 */
export function SplitView({ list, sheet }: { list: ReactNode; sheet: ReactNode | null }) {
  return (
    <div className={sheet ? "xl:grid xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:items-start xl:gap-6" : ""}>
      <div className="min-w-0">{list}</div>
      {sheet}
    </div>
  )
}

/** «Mostrar 50 más» al pie de una lista larga (cientos de filas pintadas de golpe hacían lenta la pantalla). */
export function ShowMore({ shown, total, step = 50, onMore }: { shown: number; total: number; step?: number; onMore: () => void }) {
  if (shown >= total) return null
  return (
    <div className="mt-4 text-center">
      <button type="button" onClick={onMore} className="ui-btn ui-btn-secondary">
        Mostrar {Math.min(step, total - shown)} más <span className="text-zinc-400">({shown} de {total})</span>
      </button>
    </div>
  )
}
