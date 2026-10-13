"use client"

import { useCallback, useState } from "react"

export type GeoPos = { lat: number; lng: number }

// Ubicación del usuario bajo demanda (nunca se pide al cargar la página). Devuelve un mensaje de
// error claro según el motivo: permiso denegado, sin señal o sin soporte.
export function useGeolocation() {
  const [pos, setPos] = useState<GeoPos | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState("")

  const request = useCallback((): Promise<GeoPos | null> => {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setError("Tu navegador no permite usar la ubicación.")
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
          setError(
            e.code === 1
              ? "Has bloqueado la ubicación. Actívala en los ajustes del navegador para este sitio."
              : "No se pudo obtener tu ubicación (sin señal o tardó demasiado). Inténtalo de nuevo."
          )
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      )
    })
  }, [])

  return { pos, locating, error, request }
}
