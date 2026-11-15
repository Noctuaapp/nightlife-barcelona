"use client"

import { useCallback } from "react"
import { useLanguage } from "../context/LanguageContext"
import { cityTextKey } from "./cityText"
import { useSelectedCity } from "./previewCity"

/**
 * Como t() de useLanguage, pero con los textos que nombran la ciudad adaptados a la que se está viendo
 * (lib/cityText.ts). En Barcelona devuelve exactamente lo de siempre.
 */
export function useCityT(): (key: string) => string {
  const { t } = useLanguage()
  const city = useSelectedCity()
  return useCallback((key: string) => t(cityTextKey(key, city)), [t, city])
}
