"use client"

import { useEffect, useState } from "react"
import { supabase } from "./supabase"

// Noc estacional (pedido el 23/10/2026, ampliado el mismo día): Noc se pone un accesorio de
// temporada solo con la fecha, sin que nadie tenga que tocar nada — pero además, desde
// /admin/herramientas, Jordi puede forzar una temporada concreta antes de que llegue (para
// probarla) o apagarlas todas, sin esperar a que cambie el calendario. "Automático" es y debe
// seguir siendo el valor por defecto: así, en cuanto llega la fecha, Noc cambia solo sin que haga
// falta volver a tocar nada.

export type SeasonalThemeKey =
  | "sanValentin"
  | "carnaval"
  | "semanaSanta"
  | "feriaAbril"
  | "santJordi"
  | "sanJuan"
  | "pride"
  | "summer"
  | "merce"
  | "halloween"
  | "christmas"

export type SeasonalThemeDef = {
  key: SeasonalThemeKey
  label: string
  // Solo informativo, para el desplegable de admin — el rango real que se usa en modo
  // "automático" vive en currentSeasonalTheme() de aquí abajo.
  dateHint: string
}

// Orden cronológico (de enero a diciembre) para que el desplegable de admin se lea de un vistazo.
export const SEASONAL_THEMES: SeasonalThemeDef[] = [
  { key: "sanValentin", label: "💘 San Valentín", dateHint: "14 de febrero" },
  { key: "carnaval", label: "🎭 Carnaval", dateHint: "1 feb – 5 mar (aprox., varía con la Pascua)" },
  { key: "semanaSanta", label: "✝️ Semana Santa", dateHint: "Domingo de Ramos – Pascua (varía cada año)" },
  { key: "feriaAbril", label: "💃 Feria de Abril", dateHint: "~2 semanas tras Pascua (aprox., varía cada año)" },
  { key: "santJordi", label: "🌹 Sant Jordi", dateHint: "23 de abril" },
  { key: "sanJuan", label: "🔥 Noche de San Juan", dateHint: "23–24 de junio" },
  { key: "pride", label: "🏳️‍🌈 Pride Barcelona", dateHint: "15–30 de junio" },
  { key: "summer", label: "🕶️ Verano", dateHint: "1 jul – 31 ago" },
  { key: "merce", label: "🎪 Fiestas de la Mercè", dateHint: "20–24 de septiembre" },
  { key: "halloween", label: "🎃 Halloween", dateHint: "24 oct – 2 nov" },
  { key: "christmas", label: "🎅 Navidad", dateHint: "15 dic – 6 ene" },
]

// Domingo de Pascua de un año dado (algoritmo de Meeus/Jones/Butcher) — Semana Santa y la Feria de
// Abril no tienen fecha fija, así que se anclan a partir de aquí en vez de dejarlas sin detección
// automática. Sigue pudiéndose forzar cualquier temporada a mano desde admin si el cálculo no
// cuadra exactamente con el calendario de un año concreto.
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

// Compara solo año/mes/día (como un número AAAAMMDD), para no liarse con las horas al comparar
// rangos de fechas calculados a partir de Pascua.
function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

// Para añadir una temporada más en el futuro basta con sumar un tramo aquí y su disfraz en
// NocOwl.tsx — el desplegable de admin lo recoge solo porque lee de SEASONAL_THEMES.
export function currentSeasonalTheme(): SeasonalThemeKey | null {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const today = dayKey(now)

  if (month === 2 && day === 14) return "sanValentin"
  if (month === 2 && day >= 1) return "carnaval"
  if (month === 3 && day <= 5) return "carnaval"

  const easter = easterSunday(now.getFullYear())
  const palmSunday = new Date(easter)
  palmSunday.setDate(easter.getDate() - 7)
  if (today >= dayKey(palmSunday) && today <= dayKey(easter)) return "semanaSanta"

  const feriaStart = new Date(easter)
  feriaStart.setDate(easter.getDate() + 15)
  const feriaEnd = new Date(feriaStart)
  feriaEnd.setDate(feriaStart.getDate() + 6)
  if (today >= dayKey(feriaStart) && today <= dayKey(feriaEnd)) return "feriaAbril"

  if (month === 4 && day === 23) return "santJordi"
  if (month === 6 && (day === 23 || day === 24)) return "sanJuan"
  if (month === 6 && ((day >= 15 && day <= 22) || (day >= 25 && day <= 30))) return "pride"
  if (month === 7 || month === 8) return "summer"
  if (month === 9 && day >= 20 && day <= 24) return "merce"
  if ((month === 10 && day >= 24) || (month === 11 && day <= 2)) return "halloween"
  if ((month === 12 && day >= 15) || (month === 1 && day <= 6)) return "christmas"
  return null
}

// "auto" (por defecto, de verdad el valor normal) | "none" (apagado, Noc siempre neutro) | una de
// SEASONAL_THEMES.key forzada a mano. Una sola fila en Supabase, igual que club_noctua_settings.
export type SeasonalOverride = "auto" | "none" | SeasonalThemeKey

// Pequeña caché a nivel de módulo: con varios Noc a la vez en pantalla (login + encabezado, por
// ejemplo) todos comparten la misma consulta en vez de pedirla cada uno por su cuenta.
let cachedOverride: SeasonalOverride | null = null
let inFlight: Promise<void> | null = null
const subscribers = new Set<(v: SeasonalOverride) => void>()

async function loadOverride() {
  const { data } = await supabase.from("noc_seasonal_settings").select("mode").eq("id", 1).maybeSingle()
  const mode = (data?.mode as SeasonalOverride) || "auto"
  cachedOverride = mode
  subscribers.forEach((fn) => fn(mode))
}

// Devuelve "auto" mientras no se sabe todavía (así Noc no parpadea: se pinta ya con la temporada
// que toque por fecha, y solo cambia si de verdad hay una anulación puesta desde admin).
export function useNocSeasonalOverride(): SeasonalOverride {
  const [override, setOverride] = useState<SeasonalOverride>(cachedOverride ?? "auto")

  useEffect(() => {
    if (cachedOverride) {
      setOverride(cachedOverride)
    } else {
      if (!inFlight) inFlight = loadOverride().finally(() => { inFlight = null })
    }
    subscribers.add(setOverride)
    return () => {
      subscribers.delete(setOverride)
    }
  }, [])

  return override
}
