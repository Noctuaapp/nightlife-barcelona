"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import { normStopName } from "../../lib/nitbusRoutes"

// Selector de parada para «Mi trayecto» (06/11/2026). Un <select> nativo no sirve aquí: el desplegable
// de opciones lo pinta el sistema operativo en blanco, sin seguir el tema oscuro, y una línea tiene
// 40-60 paradas, así que además lleva un buscador. Botón + lista flotante, como el selector de barrio
// del mapa.

type Props = {
  label: string
  placeholder: string
  searchPlaceholder: string
  noMatch: (query: string) => string
  value: string
  options: string[]
  onChange: (name: string) => void
  disabled?: boolean
}

// Con pocas paradas el buscador sobra.
const SEARCH_MIN_OPTIONS = 8

export default function StopPicker({ label, placeholder, searchPlaceholder, noMatch, value, options, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const q = normStopName(query)
  const shown = useMemo(() => (q ? options.filter((o) => normStopName(o).includes(q)) : options), [options, q])

  // Se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    document.addEventListener("touchstart", onOutside)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onOutside)
      document.removeEventListener("touchstart", onOutside)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // Si el selector se desactiva con la lista abierta (se borró la parada de subida), se cierra.
  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div ref={rootRef} className="relative min-w-0">
      <span className="mb-1 block text-xs font-semibold text-zinc-400">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          setOpen((o) => !o)
          setQuery("")
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-ctl border bg-surface px-4 py-3 text-left text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-brand/60" : "border-white/10"
        } ${value ? "text-ink" : "text-zinc-400"}`}
      >
        <span className="min-w-0 flex-1 truncate">{value || placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-ctl border border-white/15 bg-night shadow-[0_16px_40px_-14px_rgba(0,0,0,0.85)]">
          {options.length > SEARCH_MIN_OPTIONS && (
            <div className="relative border-b border-white/10">
              <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="w-full bg-transparent py-3 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-zinc-500"
              />
            </div>
          )}
          <ul id={listId} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto overscroll-contain">
            {shown.length === 0 ? (
              <li role="presentation" className="px-4 py-3 text-sm text-zinc-400">
                {noMatch(query)}
              </li>
            ) : (
              shown.map((name) => (
                <li key={name} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={name === value}
                    onClick={() => {
                      onChange(name)
                      setOpen(false)
                    }}
                    className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                      name === value ? "bg-brand/[0.14] font-semibold text-ink" : "text-zinc-200"
                    }`}
                  >
                    {name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
