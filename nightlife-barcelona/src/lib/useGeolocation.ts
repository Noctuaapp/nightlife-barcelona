"use client"

import { useCallback, useState } from "react"
import { useLanguage } from "../context/LanguageContext"

export type GeoPos = { lat: number; lng: number }

// Ubicación del usuario bajo demanda (nunca se pide al cargar la página). Devuelve un mensaje de
// error claro según el motivo: permiso denegado, sin señal o sin soporte.
export function useGeolocation() {
  const [pos, setPos] = useState<GeoPos | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState("")
  const { t } = useLanguage()

  const request = useCallback((): Promise<GeoPos | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError(t("geo.unsupported"))
        resolve(null)
        return
      }
      setLocating(true)
      setError("")
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const v = { lat: p.coords.latitude, lng: p.coords.longitude }
          setPos(v)
          setLocating(false)
          resolve(v)
        },
        (e) => {
          setLocating(false)
          setError(e.code === 1 ? t("geo.denied") : e.code === 3 ? t("geo.timeout") : t("geo.error"))
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { pos, locating, error, request }
}
