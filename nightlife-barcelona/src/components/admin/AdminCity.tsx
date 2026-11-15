"use client"

import { useSyncExternalStore } from "react"
import { MapPin } from "lucide-react"
import { CITIES, type CityKey } from "../../lib/cities"
import { ADMIN_CITY_STORAGE_KEY, ADMIN_DEFAULT_CITY, isCityPrelaunch, parseAdminCity } from "../../lib/adminCity"

// Ciudad elegida en el admin (15/11/2026).
//
// Es un almacén pequeño fuera de React (y no un contexto) porque las pantallas del admin son las que pintan AdminShell:
// la pantalla es el padre del menú, así que un contexto puesto en el menú no le llegaría a ella. Así la pantalla y el menú
// leen lo mismo, la elección sobrevive al cambiar de sección (y a recargar) y se sincroniza entre pestañas.

let current: CityKey = ADMIN_DEFAULT_CITY
let loaded = false
const listeners = new Set<() => void>()

function readStored(): CityKey {
  if (!loaded && typeof window !== "undefined") {
    loaded = true
    try {
      current = parseAdminCity(window.localStorage.getItem(ADMIN_CITY_STORAGE_KEY))
    } catch {
      // Sin acceso al almacenamiento (modo privado...): se queda en Barcelona durante la visita.
    }
  }
  return current
}

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== ADMIN_CITY_STORAGE_KEY) return
    const next = parseAdminCity(e.newValue)
    if (next === current) return
    current = next
    emit()
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** Cambia la ciudad del admin y la recuerda. */
export function setAdminCity(city: CityKey) {
  const next = parseAdminCity(city)
  // Sin cambio: no se avisa a nadie.
  if (next === readStored()) return
  current = next
  try {
    window.localStorage.setItem(ADMIN_CITY_STORAGE_KEY, next)
  } catch {
    // Igual que arriba: vale para esta visita.
  }
  emit()
}

/** La ciudad del admin y cómo cambiarla. En el servidor (y al hidratar) es Barcelona. */
export function useAdminCity(): [CityKey, (city: CityKey) => void] {
  const city = useSyncExternalStore(subscribe, readStored, () => ADMIN_DEFAULT_CITY)
  return [city, setAdminCity]
}

/** Selector Barcelona | Madrid del menú del admin. */
export function AdminCitySwitch({ compact = false }: { compact?: boolean }) {
  const [city, setCity] = useAdminCity()
  const cities = Object.values(CITIES)

  return (
    <div>
      <div role="group" aria-label="Ciudad del admin" className="grid grid-cols-2 gap-1 rounded-ctl border border-white/10 bg-white/[0.03] p-1">
        {cities.map((c) => {
          const active = c.key === city
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setCity(c.key)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition ${
                active ? "bg-white text-night" : "text-zinc-400 hover:bg-white/[0.06] hover:text-ink"
              }`}
            >
              {c.name}
            </button>
          )
        })}
      </div>
      {!compact && (
        <p className="mt-2 px-1 text-xs leading-snug text-zinc-400">
          Los apartados con <MapPin size={11} aria-hidden="true" className="-mt-0.5 inline" /> cambian con la ciudad. Usuarios, mensajes y demás son comunes.
        </p>
      )}
    </div>
  )
}

/** Etiqueta con la ciudad que se está viendo, para la cabecera de las pantallas que dependen de ella. */
export function AdminCityBadge() {
  const [city] = useAdminCity()
  const prelaunch = isCityPrelaunch(city)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        prelaunch ? "border-warn/40 bg-warn/10 text-warn" : "border-white/10 bg-white/[0.04] text-zinc-300"
      }`}
    >
      <MapPin size={12} aria-hidden="true" />
      {CITIES[city].name}
      {prelaunch && <span className="font-normal">· aún sin abrir al público</span>}
    </span>
  )
}

/**
 * Aviso para las pantallas de analítica: la base de datos aún no sabe separar por ciudad (falta ejecutar
 * supabase/104_analitica_por_ciudad.sql), así que lo que se ve es toda la web. En Madrid nunca se enseña eso (se enseña
 * el error), solo en Barcelona, que es donde está todo el tráfico de verdad.
 */
export function CitySqlPending() {
  return (
    <p role="status" className="mb-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-2.5 text-xs text-warn">
      Se muestra toda la web junta: falta ejecutar supabase/104_analitica_por_ciudad.sql en Supabase para separar Barcelona y Madrid.
    </p>
  )
}
