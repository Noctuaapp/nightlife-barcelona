"use client"

import { useEffect, useRef, useState } from "react"
import { COUNTRIES, getSortedCountries, type CountryLocale } from "../../lib/countries"

// Antes usábamos un <select> nativo con el emoji de la bandera delante del nombre del país.
// Se ve bien en Mac/iOS, pero en Windows (y en muchos navegadores) las dos letras del emoji no
// se combinan en una bandera: se ve el código de país en texto ("AG", "AL"...) en vez de la
// bandera — es una limitación de fuente del sistema, no algo que se pueda arreglar con CSS. Un
// <select> nativo tampoco puede mostrar una <img> dentro de sus opciones en ningún navegador, así
// que la única forma de tener banderas reales y consistentes en todos los sistemas es dibujar el
// desplegable nosotros mismos, con una imagen de bandera por país (desde flagcdn.com).
type Props = {
  value: string
  onChange: (esName: string) => void
  locale: CountryLocale
  placeholder: string
  size?: "lg" | "sm"
}

const flagUrl = (code: string) => `https://flagcdn.com/24x18/${code.toLowerCase()}.png`

export default function CountrySelect({ value, onChange, locale, placeholder, size = "lg" }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  const countries = getSortedCountries(locale)
  const selected = COUNTRIES.find((c) => c.es === value) || null

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  const filtered = query.trim()
    ? countries.filter((c) => c[locale].toLowerCase().includes(query.trim().toLowerCase()))
    : countries

  const isLg = size === "lg"

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          isLg
            ? "flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-left outline-none transition focus:border-purple-500/50"
            : "flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left outline-none transition focus:border-purple-500/50"
        }
      >
        <span className={`flex min-w-0 items-center gap-2.5 truncate ${selected ? "text-white" : "text-zinc-500"} ${isLg ? "text-base" : "text-sm"}`}>
          {selected && (
            <img
              src={flagUrl(selected.code)}
              alt=""
              width={20}
              height={15}
              style={{ borderRadius: "2px", flexShrink: 0, boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }}
            />
          )}
          <span className="truncate">{selected ? selected[locale] : placeholder}</span>
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, opacity: 0.5, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}
        >
          <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
          style={{ boxShadow: "0 24px 48px -16px rgba(0,0,0,0.75)" }}
        >
          <div className="border-b border-white/10 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder-zinc-600 focus:border-purple-500/50"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {!query.trim() && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false) }}
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-white/10"
              >
                {placeholder}
              </button>
            )}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-zinc-600">Sin resultados.</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.es); setOpen(false); setQuery("") }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                  c.es === value ? "bg-purple-500/15 text-white" : "text-zinc-300"
                }`}
              >
                <img src={flagUrl(c.code)} alt="" width={20} height={15} style={{ borderRadius: "2px", flexShrink: 0, boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }} />
                <span className="truncate">{c[locale]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
