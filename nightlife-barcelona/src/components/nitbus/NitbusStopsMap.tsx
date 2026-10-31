"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { LocateFixed } from "lucide-react"
import { circleCoords } from "../../lib/geo"
import { NITBUS_PLATE } from "../../lib/transitColors"
import { useLanguage } from "../../context/LanguageContext"

// Mapa de paradas de Nitbus (31/10/2026), para encontrar la parada más cercana de un vistazo.
//
// El mapa anterior de esta página nunca llegó a crearse (su contenedor aparecía cuando cargaban las
// paradas, y el mapa se creaba una sola vez al montar) y además ponía un elemento HTML por parada:
// con más de 2.000 habría ido a trompicones. Ahora:
//  - El mapa es este componente, que lleva su propio contenedor: se crea al montarse, sin depender
//    de cuándo llegan los datos.
//  - Las paradas son una capa del propio mapa (círculos), no elementos HTML: miles sin esfuerzo.
//  - Mismo lenguaje que el cartel real de Nitbus: placa azul noche con borde ámbar (NITBUS_PLATE).
//    Las 3 más cercanas a ti salen numeradas en ámbar macizo, tu posición en el violeta de la marca
//    con el margen de error alrededor, y la parada elegida con un halo.
//  - En el móvil el mapa se mueve con dos dedos (un dedo sigue desplazando la página), como en el
//    resto de mapas de esenciales.

export type NitbusMapStop = { id: number; name: string; lat: number; lon: number; lines: string[] }

type Props = {
  id?: string
  stops: NitbusMapStop[] // las que se enseñan (ya filtradas por línea y búsqueda)
  selected: NitbusMapStop | null
  onSelect: (id: number | null) => void
  user: { lat: number; lng: number; accuracy: number | null } | null
  nearest: NitbusMapStop[] // hasta 3, de más cerca a más lejos
  fitKey: string // cambia cuando hay que reencuadrar a `stops` (otra línea, otra búsqueda); "" = vista de Barcelona
  userFitNonce: number // sube cuando hay que encuadrar al usuario y sus paradas cercanas
  locating: boolean
  onLocate: () => void
  className?: string
  mapStyle?: string | mapboxgl.Style // por defecto el oscuro de Mapbox; las pruebas usan uno sin red
  children?: ReactNode // ficha de la parada elegida, encima del mapa
}

const BARCELONA: [number, number] = [2.1734, 41.3851]
const DEFAULT_STYLE = "mapbox://styles/mapbox/dark-v11"
const SRC_STOPS = "nb-stops"
const SRC_SEL = "nb-selected"
const SRC_ACC = "nb-accuracy"
const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }

const stopsToFc = (stops: NitbusMapStop[]): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: stops.map((s) => ({
    type: "Feature",
    properties: { id: s.id, name: s.name },
    geometry: { type: "Point", coordinates: [s.lon, s.lat] },
  })),
})

export default function NitbusStopsMap(props: Props) {
  const { t } = useLanguage()
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const nearMarkersRef = useRef<mapboxgl.Marker[]>([])
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState(false)

  // Lo último que ha llegado, para leerlo desde los efectos y listeners sin volver a montarlos.
  const latest = useRef(props)
  useEffect(() => {
    latest.current = props
  })

  // Crear el mapa, una sola vez.
  useEffect(() => {
    const el = boxRef.current
    if (!el || mapRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
    const map = new mapboxgl.Map({
      container: el,
      style: latest.current.mapStyle ?? DEFAULT_STYLE,
      center: BARCELONA,
      zoom: 12,
    })
    mapRef.current = map
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right")

    // Móvil: un dedo desplaza la página, dos dedos mueven el mapa.
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    let hintTimer: ReturnType<typeof setTimeout> | undefined
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        map.dragPan.enable()
        if (e.cancelable) e.preventDefault()
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault()
        return
      }
      setHint(true)
      if (hintTimer) clearTimeout(hintTimer)
      hintTimer = setTimeout(() => setHint(false), 1200)
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) map.dragPan.disable()
    }
    if (isTouch) {
      map.dragPan.disable()
      el.addEventListener("touchstart", onTouchStart, { capture: true, passive: false })
      el.addEventListener("touchmove", onTouchMove, { capture: true, passive: false })
      el.addEventListener("touchend", onTouchEnd, { capture: true, passive: true })
      el.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true })
    }

    map.on("load", () => {
      // De abajo arriba: margen de error, paradas, nombres, parada elegida.
      map.addSource(SRC_ACC, { type: "geojson", data: EMPTY })
      map.addLayer({ id: "nb-acc-fill", type: "fill", source: SRC_ACC, paint: { "fill-color": "#7c5cff", "fill-opacity": 0.13 } })
      map.addLayer({ id: "nb-acc-line", type: "line", source: SRC_ACC, paint: { "line-color": "#7c5cff", "line-opacity": 0.55, "line-width": 1 } })

      map.addSource(SRC_STOPS, { type: "geojson", data: stopsToFc(latest.current.stops) })
      map.addLayer({
        id: "nb-stops-dot",
        type: "circle",
        source: SRC_STOPS,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 13, 3.6, 15, 6, 17, 8.5],
          "circle-color": NITBUS_PLATE.bg,
          "circle-stroke-color": NITBUS_PLATE.fg,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 14, 1.5, 16, 2.2],
        },
      })
      map.addLayer({
        id: "nb-stops-label",
        type: "symbol",
        source: SRC_STOPS,
        minzoom: 16,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": 11,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-max-width": 8,
          "text-optional": true,
        },
        paint: { "text-color": "#ecebf5", "text-halo-color": "#0a0910", "text-halo-width": 1.4 },
      })

      map.addSource(SRC_SEL, { type: "geojson", data: EMPTY })
      map.addLayer({
        id: "nb-sel-glow",
        type: "circle",
        source: SRC_SEL,
        paint: { "circle-radius": 22, "circle-color": NITBUS_PLATE.fg, "circle-opacity": 0.22, "circle-blur": 0.5 },
      })
      map.addLayer({
        id: "nb-sel-dot",
        type: "circle",
        source: SRC_SEL,
        paint: { "circle-radius": 8.5, "circle-color": NITBUS_PLATE.fg, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 },
      })

      map.on("mousemove", "nb-stops-dot", () => (map.getCanvas().style.cursor = "pointer"))
      map.on("mouseleave", "nb-stops-dot", () => (map.getCanvas().style.cursor = ""))
      setReady(true)
    })

    // Tocar una parada: se elige la más cercana al dedo dentro de un margen generoso (las paradas
    // son pequeñas y un dedo no es un cursor).
    map.on("click", (e) => {
      const r = 16
      const hits = map.queryRenderedFeatures(
        [
          [e.point.x - r, e.point.y - r],
          [e.point.x + r, e.point.y + r],
        ],
        { layers: ["nb-stops-dot"] }
      )
      if (hits.length === 0) {
        latest.current.onSelect(null)
        return
      }
      let best = hits[0]
      let bestD = Infinity
      for (const h of hits) {
        const pt = map.project((h.geometry as GeoJSON.Point).coordinates as [number, number])
        const d = (pt.x - e.point.x) ** 2 + (pt.y - e.point.y) ** 2
        if (d < bestD) {
          bestD = d
          best = h
        }
      }
      const id = Number(best.properties?.id)
      latest.current.onSelect(Number.isFinite(id) ? id : null)
    })

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => map.resize()) : null
    ro?.observe(el)

    return () => {
      ro?.disconnect()
      if (isTouch) {
        el.removeEventListener("touchstart", onTouchStart, { capture: true })
        el.removeEventListener("touchmove", onTouchMove, { capture: true })
        el.removeEventListener("touchend", onTouchEnd, { capture: true })
        el.removeEventListener("touchcancel", onTouchEnd, { capture: true })
      }
      if (hintTimer) clearTimeout(hintTimer)
      userMarkerRef.current?.remove()
      nearMarkersRef.current.forEach((m) => m.remove())
      map.remove()
      mapRef.current = null
      setReady(false)
    }
  }, [])

  // Las paradas que se ven (según la línea y la búsqueda).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ;(map.getSource(SRC_STOPS) as mapboxgl.GeoJSONSource | undefined)?.setData(stopsToFc(props.stops))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.stops])

  // Reencuadrar al cambiar de línea o de búsqueda (con un respiro, para no ir saltando al teclear).
  const firstFit = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (firstFit.current) {
      firstFit.current = false
      return
    }
    const timer = setTimeout(() => {
      const pts = latest.current.stops.map((s) => [s.lon, s.lat] as [number, number])
      if (latest.current.fitKey === "" || pts.length === 0) {
        if (latest.current.fitKey === "") map.easeTo({ center: BARCELONA, zoom: 12, duration: 700 })
        return
      }
      if (pts.length === 1) {
        map.easeTo({ center: pts[0], zoom: 16, duration: 700 })
        return
      }
      const b = new mapboxgl.LngLatBounds(pts[0], pts[0])
      pts.forEach((p) => b.extend(p))
      map.fitBounds(b, { padding: { top: 70, bottom: 50, left: 40, right: 40 }, maxZoom: 15.5, duration: 800 })
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.fitKey])

  // Tu posición: punto violeta con halo y, alrededor, el margen de error del GPS.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    userMarkerRef.current?.remove()
    userMarkerRef.current = null
    const acc = map.getSource(SRC_ACC) as mapboxgl.GeoJSONSource | undefined
    const u = props.user
    if (!u) {
      acc?.setData(EMPTY)
      return
    }
    const dot = document.createElement("div")
    dot.className = "relative h-5 w-5"
    dot.innerHTML =
      '<span class="absolute inset-0 animate-ping rounded-full bg-brand/45"></span>' +
      '<span class="absolute inset-[2px] rounded-full border-[3px] border-white bg-brand shadow-[0_2px_8px_rgba(0,0,0,0.6)]"></span>'
    userMarkerRef.current = new mapboxgl.Marker({ element: dot }).setLngLat([u.lng, u.lat]).addTo(map)
    acc?.setData(
      u.accuracy != null && u.accuracy >= 20
        ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circleCoords(u.lat, u.lng, u.accuracy)] } }] }
        : EMPTY
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.user])

  // Las 3 paradas más cercanas, numeradas.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    nearMarkersRef.current.forEach((m) => m.remove())
    nearMarkersRef.current = props.nearest.map((s, i) => {
      const isSel = props.selected?.id === s.id
      const el = document.createElement("button")
      el.type = "button"
      el.setAttribute("aria-label", s.name)
      el.style.cssText =
        `width:30px;height:30px;border-radius:9999px;background:${NITBUS_PLATE.fg};color:${NITBUS_PLATE.bg};` +
        `border:3px solid ${isSel ? "#7c5cff" : "#ffffff"};font:900 14px/1 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;` +
        "box-shadow:0 3px 12px rgba(0,0,0,0.65);cursor:pointer;padding:0"
      el.textContent = String(i + 1)
      el.addEventListener("click", (ev) => {
        ev.stopPropagation()
        latest.current.onSelect(s.id)
      })
      return new mapboxgl.Marker({ element: el }).setLngLat([s.lon, s.lat]).addTo(map)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.nearest, props.selected])

  // Encuadrar al usuario con sus paradas cercanas.
  useEffect(() => {
    const map = mapRef.current
    const l = latest.current
    if (!map || !ready || !l.user || props.userFitNonce === 0) return
    const pts: [number, number][] = [[l.user.lng, l.user.lat], ...l.nearest.map((s) => [s.lon, s.lat] as [number, number])]
    if (pts.length === 1) {
      map.easeTo({ center: pts[0], zoom: 16, duration: 800 })
      return
    }
    const b = new mapboxgl.LngLatBounds(pts[0], pts[0])
    pts.forEach((p) => b.extend(p))
    map.fitBounds(b, { padding: { top: 80, bottom: 60, left: 50, right: 50 }, maxZoom: 16.2, duration: 900 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.userFitNonce])

  // La parada elegida: halo y el mapa se acerca (dejando sitio para la ficha de abajo).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const s = props.selected
    ;(map.getSource(SRC_SEL) as mapboxgl.GeoJSONSource | undefined)?.setData(
      s ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [s.lon, s.lat] } }] } : EMPTY
    )
    if (s) {
      const h = boxRef.current?.clientHeight ?? 400
      map.easeTo({ center: [s.lon, s.lat], zoom: Math.max(map.getZoom(), 15.6), duration: 700, padding: { top: 20, left: 0, right: 0, bottom: Math.round(Math.min(230, h * 0.4)) } })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.selected?.id])

  return (
    <div id={props.id} className={`relative overflow-hidden rounded-card border border-white/10 bg-surface ${props.className ?? ""}`}>
      <div ref={boxRef} style={{ width: "100%", height: "100%" }} />

      {hint && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/50 md:hidden">
          <p className="rounded-full bg-night/90 px-5 py-2.5 text-sm font-semibold text-ink">{t("essentialsPage.twoFingers")}</p>
        </div>
      )}

      <button
        type="button"
        onClick={props.onLocate}
        disabled={props.locating}
        className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-night/90 px-4 py-2.5 text-sm font-semibold text-ink shadow-lg backdrop-blur-md transition hover:bg-night disabled:opacity-80"
      >
        <LocateFixed size={16} className={props.user ? "text-brand-soft" : "text-zinc-300"} aria-hidden="true" />
        {props.locating ? (props.user ? t("geo.refining") : t("explorer.locating")) : t("explorer.near")}
      </button>

      {props.children}
    </div>
  )
}
