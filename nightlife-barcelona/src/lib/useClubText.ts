"use client"

import { useMemo } from "react"
import { useLanguage } from "../context/LanguageContext"
import { displayHours, displayMusic, displayPrice } from "./clubDisplay"

// Horario, precio y estilo de música de los locales en el idioma elegido en la web (ver lib/clubDisplay.ts).
// En español devuelven el texto tal cual; si algo no se entiende, también.
export function useClubText() {
  const { locale } = useLanguage()
  return useMemo(
    () => ({
      locale,
      music: (raw: unknown) => displayMusic(locale, raw),
      hours: (raw: unknown, openDays?: string[] | null) => displayHours(locale, raw, openDays),
      price: (raw: unknown) => displayPrice(locale, raw).text,
    }),
    [locale]
  )
}
