"use client"

import { useEffect, useRef } from "react"
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

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: 15,
      interactive: false,
    })

    new mapboxgl.Marker({ color: "#a855f7" })
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup().setText(name))
      .addTo(map.current)

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [latitude, longitude, name])

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-3xl overflow-hidden"
      style={{ height: "220px" }}
    />
  )
}