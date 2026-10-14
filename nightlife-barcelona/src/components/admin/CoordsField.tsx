"use client"

import { useState } from "react"
import { MapPin, Search, ExternalLink, AlertTriangle, Check } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { googleMapsUrl, isInServiceArea, parseCoordNumber, parseCoords } from "../../lib/coords"

type Props = {
  latitude: string
  longitude: string
  onChange: (latitude: string, longitude: string) => void
  // Dirección del formulario, para el botón "Buscar por la dirección".
  address?: string
  inputClassName?: string
  labelClassName?: string
}

// Ubicación en el mapa para clubs, eventos y esenciales. Antes las coordenadas solo se podían
// poner desde Supabase; sin ellas el sitio no aparece en el mapa. Tres formas de rellenarlas:
// buscar por la dirección, pegar lo que se copia en Google Maps, o escribir los dos números.
export default function CoordsField({ latitude, longitude, onChange, address, inputClassName, labelClassName }: Props) {
  const [paste, setPaste] = useState("")
  const [pasteError, setPasteError] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchMsg, setSearchMsg] = useState("")

  const input =
    inputClassName ||
    "w-full rounded-ctl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-brand/60"
  const label = labelClassName || "mb-1.5 block text-xs font-bold text-zinc-400"

  const lat = parseCoordNumber(latitude)
  const lng = parseCoordNumber(longitude)
  const point = lat != null && lng != null ? { lat, lng } : null
  const half = (lat == null) !== (lng == null)
  const outside = point && !isInServiceArea(point)

  const applyPaste = (text: string) => {
    setPaste(text)
    if (!text.trim()) return setPasteError("")
    const p = parseCoords(text)
    if (p) {
      onChange(String(p.lat), String(p.lng))
      setPaste("")
      setPasteError("")
    } else if (/goo\.gl|maps\.app/i.test(text)) {
      setPasteError("Los enlaces cortos de Google Maps no llevan las coordenadas. Copia los números (ver abajo).")
    } else {
      setPasteError("No reconozco unas coordenadas aquí. Ejemplo: 41.3851, 2.1734")
    }
  }

  const searchAddress = async () => {
    if (!address?.trim()) return
    setSearching(true)
    setSearchMsg("")
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token || ""
      const res = await fetch(`/api/admin/geocode?q=${encodeURIComponent(address.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setSearchMsg(json.error || "No se ha podido buscar la dirección.")
      } else {
        onChange(String(json.lat), String(json.lng))
        setSearchMsg(`Encontrado: ${json.label}. Compruébalo en Google Maps.`)
      }
    } catch {
      setSearchMsg("No se ha podido buscar la dirección.")
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="rounded-card border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="text-brand-soft" aria-hidden="true" />
        <p className="text-sm font-bold text-white">Ubicación en el mapa</p>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={paste}
          onChange={(e) => applyPaste(e.target.value)}
          placeholder="Pega aquí las coordenadas o el enlace de Google Maps"
          className={`${input} min-w-0 flex-1`}
        />
        {address !== undefined && (
          <button
            type="button"
            onClick={searchAddress}
            disabled={searching || !address?.trim()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <Search size={15} aria-hidden="true" />
            {searching ? "Buscando…" : "Buscar por la dirección"}
          </button>
        )}
      </div>
      {pasteError && <p className="mt-1.5 text-xs text-warn">{pasteError}</p>}
      {searchMsg && <p className="mt-1.5 text-xs text-zinc-300">{searchMsg}</p>}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className={label}>Latitud</label>
          <input
            value={latitude}
            onChange={(e) => onChange(e.target.value, longitude)}
            placeholder="41.3851"
            inputMode="decimal"
            className={input}
          />
        </div>
        <div className="min-w-0">
          <label className={label}>Longitud</label>
          <input
            value={longitude}
            onChange={(e) => onChange(latitude, e.target.value)}
            placeholder="2.1734"
            inputMode="decimal"
            className={input}
          />
        </div>
      </div>

      <div className="mt-3 text-xs leading-relaxed">
        {point && !outside && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-open">
            <span className="flex items-center gap-1.5"><Check size={14} aria-hidden="true" /> Saldrá en el mapa.</span>
            <a href={googleMapsUrl(point)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand-soft underline">
              Comprobar en Google Maps <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
        )}
        {point && outside && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-warn">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={14} aria-hidden="true" /> Queda fuera de Cataluña: ¿latitud y longitud están cambiadas?
            </span>
            <a href={googleMapsUrl(point)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">
              Ver dónde cae <ExternalLink size={12} aria-hidden="true" />
            </a>
          </p>
        )}
        {half && <p className="text-warn">Falta la {lat == null ? "latitud" : "longitud"}: sin las dos no sale en el mapa.</p>}
        {!point && !half && <p className="text-zinc-400">Sin coordenadas no aparece en el mapa.</p>}
        <p className="mt-1.5 text-zinc-500">
          En Google Maps: mantén pulsado el sitio (en el ordenador, clic derecho) y toca los números que salen para copiarlos.
        </p>
      </div>
    </div>
  )
}
