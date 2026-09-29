"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type ClubMapProps = {
  latitude: number
  longitude: number
  name: string
}

export default function ClubMap({ latitude, longitude, name }: ClubMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || map.current || !mapContainer.current) return

    const container = mapContainer.current

    const createMap = () => {
      if (map.current || container.offsetWidth === 0) return

      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

      map.current = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [longitude, latitude],
        zoom: 15,
        interactive: false,
      })

      map.current.on("load", () => {
        map.current?.resize()
      })

      new mapboxgl.Marker({ color: "#a855f7" })
        .setLngLat([longitude, latitude])
        .setPopup(new mapboxgl.Popup().setText(name))
        .addTo(map.current!)
    }

    // Si el contenedor mide 0px al montar (p.ej. dentro de un sidebar sticky que todavía no ha
    // asentado su layout), antes el mapa se quedaba en blanco para siempre: este efecto solo se
    // reejecutaba si cambiaban latitude/longitude/name, nunca si el contenedor pasaba a tener
    // ancho real. Con el ResizeObserver, en cuanto el contenedor mide algo, creamos el mapa.
    if (container.offsetWidth === 0) {
      const observer = new ResizeObserver(() => {
        if (container.offsetWidth > 0) {
          createMap()
          observer.disconnect()
        }
      })
      observer.observe(container)
      return () => {
        observer.disconnect()
        map.current?.remove()
        map.current = null
      }
    }

    createMap()

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [mounted, latitude, longitude, name])

  if (!mounted) return (
    <div
      className="w-full rounded-3xl overflow-hidden bg-zinc-900"
      style={{ height: "220px" }}
    />
  )

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-3xl overflow-hidden"
      style={{ height: "220px", minHeight: "220px" }}
    />
  )
}