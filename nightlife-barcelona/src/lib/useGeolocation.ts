"use client"

import { useCallback, useState } from "react"
import { useLanguage } from "../context/LanguageContext"
import { getPrecisePosition } from "./precisePosition"

export type GeoPos = { lat: number; lng: number }

// Ubicación del usuario bajo demanda (nunca se pide al cargar la página). Devuelve un mensaje de
// error claro según el motivo: permiso denegado, sin señal o sin soporte.
// precise: escucha el GPS unos segundos y se queda con la lectura más exacta (ver precisePosition),
// en vez de la primera que dé el navegador. Tarda algo más: para cuando importa el sitio exacto
// (la parada más cercana), no para un «cerca de mí» general.
export function useGeolocation(options: { precise?: boolean } = {}) {
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
      if (options.precise) {
        getPrecisePosition()
          .then((p) => {
            const v = { lat: p.lat, lng: p.lng }
            setPos(v)
            setLocating(false)
            resolve(v)
          })
          .catch((e: { code?: number }) => {
            setLocating(false)
            setError(e.code === 1 ? t("geo.denied") : e.code === 3 ? t("geo.timeout") : e.code === 0 ? t("geo.unsupported") : t("geo.error"))
            resolve(null)
          })
        return
      }
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
