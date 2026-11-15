"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Check, ChevronDown } from "lucide-react"
import { CITIES, selectableCities, switchCityPath, type CityKey } from "../../lib/cities"
import { useSelectedCity } from "../../lib/previewCity"
import { useIsAdmin } from "../../lib/useIsAdmin"

// Ciudad + hora de la cabecera (14/11/2026). Con una sola ciudad disponible (lo que ve el público mientras Madrid esté
// en «prelaunch», lib/cities.ts) es la etiqueta de siempre, sin desplegable. Con más de una (todos, cuando se abra Madrid; el
// admin, antes) es un selector que lleva a la misma página de la otra ciudad (/clubs → /madrid/clubs) o, si no existe allí,
// a su portada. Las ciudades que aún no están abiertas salen marcadas como «vista previa».
const PILL =
  "flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-3 pr-3.5 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:py-2 sm:text-sm"

export default function CityPicker({ clock }: { clock: string | null }) {
  const isAdmin = useIsAdmin()
  const city = useSelectedCity()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const current = CITIES[city]
  const options = selectableCities(isAdmin)
  const preview = current.prelaunch

  const dot = (
    <span
      aria-hidden="true"
      className={`live-dot h-2 w-2 rounded-full ${preview ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"}`}
    />
  )

  if (options.length < 2) {
    return (
      <div className={PILL}>
        {dot}
        <span>{current.name}</span>
        {clock && <span className="hidden tabular-nums text-white/55 sm:inline">{clock}</span>}
      </div>
    )
  }

  const choose = (key: CityKey) => {
    setOpen(false)
    if (key !== city) router.push(switchCityPath(pathname || "/", key))
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Cambiar de ciudad"
        className={`${PILL} cursor-pointer outline-none transition hover:border-cyan-300/40 hover:bg-white/[0.12] focus-visible:border-cyan-300/60 ${preview ? "border-amber-300/50" : ""}`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        {dot}
        <span>{current.name}</span>
        {preview && <span className="rounded-full bg-amber-400 px-1.5 py-px text-[10px] font-bold leading-tight text-black">vista previa</span>}
        {clock && !preview && <span className="hidden tabular-nums text-white/55 sm:inline">{clock}</span>}
        <ChevronDown size={14} aria-hidden="true" className={`text-white/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            aria-label="Ciudades"
            className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-2xl border border-white/15 bg-[#0b1030]/95 p-1.5 shadow-xl backdrop-blur"
          >
            {options.map((c) => (
              <li key={c.key} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={c.key === city}
                  onClick={() => choose(c.key)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <span>
                    {c.name}
                    {c.prelaunch && <span className="ml-2 text-xs font-medium text-amber-300">vista previa · solo tú</span>}
                  </span>
                  {c.key === city && <Check size={16} aria-hidden="true" className="text-cyan-300" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
