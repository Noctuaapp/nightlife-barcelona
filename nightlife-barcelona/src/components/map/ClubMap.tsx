"use client"

import { useEffect, useRef, useState } from "react"
import type { Map as MapboxMap } from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

// 18/11/2026: la librería del mapa (mapbox-gl, ~940 KB sin comprimir) ya no viaja con la ficha: se descarga solo cuando
// el mapa está a punto de verse en pantalla. Antes cada ficha de club o de evento la cargaba entera aunque nadie bajara
// hasta el mapa, y eso retrasaba que la página respondiera al toque (sobre todo en el móvil). El mapa se ve igual.

type ClubMapProps = {
  latitude: number
  longitude: number
  name: string
}

export default function ClubMap({ latitude, longitude, name }: ClubMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<MapboxMap | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !mapContainer.current) return

    const container = mapContainer.current
    let cancelled = false
    let watcher: IntersectionObserver | null = null
    let sizer: ResizeObserver | null = null

    const createMap = async () => {
      if (map.current || cancelled || container.offsetWidth === 0) return

      const mod = await import("mapbox-gl")
      // Mientras se descargaba, quizá se salió de la página o ya se creó el mapa.
      if (cancelled || map.current || container.offsetWidth === 0) return
      const mapboxgl = mod.default

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      const created = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [longitude, latitude],
        zoom: 15,
        interactive: false,
      })
      map.current = created

      created.on("load", () => {
        created.resize()
      })

      new mapboxgl.Marker({ color: "#7c5cff" })
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup().setText(name))
        .addTo(created)
    }

    // Si el contenedor mide 0px al montar (p.ej. dentro de un sidebar sticky que todavía no ha
    // asentado su layout), antes el mapa se quedaba en blanco para siempre: este efecto solo se
    // reejecutaba si cambiaban latitude/longitude/name, nunca si el contenedor pasaba a tener
    // ancho real. Con el ResizeObserver, en cuanto el contenedor mide algo, creamos el mapa.
    const start = () => {
      if (container.offsetWidth === 0) {
        sizer = new ResizeObserver(() => {
          if (container.offsetWidth > 0) {
            sizer?.disconnect()
            sizer = null
            void createMap()
          }
        })
        sizer.observe(container)
        return
      }
      void createMap()
    }

    // El mapa se prepara cuando está a menos de ~400 px de la pantalla; sin IntersectionObserver (navegadores muy
    // antiguos) se crea al momento, como antes.
    if (typeof IntersectionObserver === "undefined") {
      start()
    } else {
      watcher = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            watcher?.disconnect()
            watcher = null
            start()
          }
        },
        { rootMargin: "400px" }
      )
      watcher.observe(container)
    }

    return () => {
      cancelled = true
      watcher?.disconnect()
      sizer?.disconnect()
      map.current?.remove()
      map.current = null
    }
  }, [mounted, latitude, longitude, name])

  if (!mounted) return (
    <div
      className="w-full rounded-card overflow-hidden bg-zinc-900"
      style={{ height: "220px" }}
    />
  )

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-card overflow-hidden bg-zinc-900"
      style={{ height: "220px", minHeight: "220px" }}
    />
  )
}
