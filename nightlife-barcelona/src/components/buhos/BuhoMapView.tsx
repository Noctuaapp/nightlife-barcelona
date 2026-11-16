"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "../system/CityLink"
import { ChevronLeft } from "lucide-react"
import Header from "../layout/Header"
import Footer from "../layout/Footer"
import BottomNav from "../layout/BottomNav"
import { NitbusBadge } from "../ui/TransitBadge"
import NitbusStopsMap from "../nitbus/NitbusStopsMap"
import { NightPage } from "../ui/NightBackdrop"
import { useLanguage } from "../../context/LanguageContext"
import { CITIES } from "../../lib/cities"
import { distanceInMeters, formatDistance, walkingMinutes } from "../../lib/geo"
import { getPrecisePosition } from "../../lib/precisePosition"
import { NITBUS_PLATE } from "../../lib/transitColors"
import { loadBuhoMapData, type BuhoMapData } from "../../lib/buhoMapData"

// Mapa de los búhos de Madrid (16/11/2026), hermano del mapa de paradas de Nitbus de Barcelona (Esenciales › Nitbus): todas las paradas
// de los búhos de la EMT en un mapa, con las líneas como filtro, «Cerca de mí» (las 3 paradas más cercanas, numeradas) y, al tocar una
// parada, su ficha con las líneas que paran ahí. Usa el mismo mapa que Barcelona (NitbusStopsMap), centrado en Madrid.
//
// Los datos son los de lib/madridBuhos.ts (GTFS de la EMT, 1.580 paradas y 32 líneas), preparados en lib/buhoMapData.ts. Ese módulo
// pesa ~110 KB, así que se carga solo aquí, bajo demanda (import dinámico), igual que lib/buhos.ts en la ficha de un local de Madrid.
// Se llega desde /madrid/buhos («Ver las paradas en el mapa») y desde cada línea («Ver N1 en el mapa», que abre el mapa ya filtrado
// con ?line=N1).

const ALL = "All"
const FAR_METERS = 20000 // si la parada más cercana está más lejos, no se acerca el mapa al usuario (está fuera de Madrid)
const MAD = CITIES.madrid

export default function BuhoMapView() {
  const { t } = useLanguage()
  const [data, setData] = useState<BuhoMapData | null>(null)
  const [line, setLine] = useState<string>(ALL)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [user, setUser] = useState<{ lat: number; lng: number; accuracy: number | null } | null>(null)
  const [locating, setLocating] = useState(false)
  const [fixNonce, setFixNonce] = useState(0)
  const [geoError, setGeoError] = useState("")

  useEffect(() => {
    let alive = true
    loadBuhoMapData().then((d) => {
      if (!alive) return
      setData(d)
      // ?line=N1 abre el mapa ya filtrado a esa línea (el enlace «Ver N1 en el mapa» de su página).
      const wanted = (new URLSearchParams(window.location.search).get("line") || "").toUpperCase()
      if (wanted && d.codes.includes(wanted)) setLine(wanted)
    })
    return () => {
      alive = false
    }
  }, [])

  const visible = useMemo(() => (!data ? [] : line === ALL ? data.stops : data.stops.filter((s) => s.lines.includes(line))), [data, line])

  const nearest = useMemo(
    () =>
      user
        ? visible
            .map((s) => ({ s, d: distanceInMeters(user.lat, user.lng, s.lat, s.lon) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 3)
        : [],
    [visible, user]
  )
  const nearestStops = useMemo(() => nearest.map((n) => n.s), [nearest])
  const far = nearest.length > 0 && nearest[0].d > FAR_METERS
  const selected = useMemo(() => (selectedId == null || !data ? null : data.stops.find((s) => s.id === selectedId) ?? null), [data, selectedId])
  const selectedDistance = selected && user ? distanceInMeters(user.lat, user.lng, selected.lat, selected.lon) : null

  // La ubicación solo se pide al pulsar «Cerca de mí». Se escucha el GPS unos segundos y se queda la lectura más exacta
  // (lib/precisePosition): se enseña algo con la primera y se afina después, igual que en el mapa de Nitbus de Barcelona.
  const locateMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError(t("geo.unsupported"))
      return
    }
    setLocating(true)
    setGeoError("")
    let first: { lat: number; lng: number } | null = null
    getPrecisePosition({
      onUpdate: (p) => {
        setUser((cur) => (cur && distanceInMeters(cur.lat, cur.lng, p.lat, p.lng) < 25 ? { ...cur, accuracy: p.accuracy } : { lat: p.lat, lng: p.lng, accuracy: p.accuracy }))
        if (!first) {
          first = { lat: p.lat, lng: p.lng }
          setFixNonce((n) => n + 1)
        }
      },
    })
      .then((p) => {
        if (first && distanceInMeters(first.lat, first.lng, p.lat, p.lng) > 60) setFixNonce((n) => n + 1)
        setLocating(false)
      })
      .catch((e: { code?: number }) => {
        if (!first) setGeoError(e.code === 1 ? t("geo.denied") : e.code === 3 ? t("geo.timeout") : e.code === 0 ? t("geo.unsupported") : t("geo.error"))
        setLocating(false)
      })
  }

  const pickLine = (code: string) => {
    setLine(code)
    setSelectedId(null)
  }

  // Sin contorno (16/11/2026): «Todas» es una píldora sólida (blanca si está elegida) y cada línea es solo su placa, sin la
  // píldora oscura con aro que la rodeaba. Como ya no hay aro que marque la elegida, cuando se filtra por una línea las demás
  // se apagan y la elegida se agranda un poco.
  const allChip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-white text-[#0a0910]" : "bg-[#23202d] text-white hover:bg-[#2c2937]"}`
  const lineChip = (code: string) =>
    `shrink-0 rounded-md transition ${line === code ? "scale-110" : line === ALL ? "opacity-100 hover:scale-105" : "opacity-45 hover:opacity-100"}`

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <NightPage tone="violet">
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
          <Link href="/buhos" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-300 hover:text-ink">
            <ChevronLeft size={16} aria-hidden="true" /> {t("nitbusPage.back")}
          </Link>
          <h1 className="mt-3 font-display text-[2rem] leading-tight text-ink sm:text-5xl">{t("nitbusPage.mapTitle")}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-zinc-300">{t("nitbusPage.mapSubtitle")}</p>

          {/* Las líneas como filtro: «Todas» y una placa por línea; se desliza en horizontal. */}
          <div role="group" aria-label={t("nitbusPage.linesTitle")} className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]">
            <button type="button" aria-pressed={line === ALL} onClick={() => pickLine(ALL)} className={allChip(line === ALL)}>
              {t("nitbusPage.mapAllLines")}
            </button>
            {(data?.codes ?? []).map((code) => (
              <button key={code} type="button" aria-pressed={line === code} aria-label={`Búho ${code}`} onClick={() => pickLine(code)} className={lineChip(code)}>
                <NitbusBadge code={code} size="md" />
              </button>
            ))}
          </div>

          <section className="mt-3" aria-label={t("nitbusPage.mapTitle")}>
            {data ? (
              <NitbusStopsMap
                id="buho-map"
                className="h-[58dvh] min-h-[380px] scroll-mt-20 md:h-[560px]"
                center={[MAD.center.lng, MAD.center.lat]}
                zoom={11.6}
                stops={visible}
                selected={selected}
                onSelect={setSelectedId}
                user={user}
                nearest={nearestStops}
                fitKey={line === ALL ? "" : line}
                userFitNonce={far ? 0 : fixNonce}
                locating={locating}
                onLocate={locateMe}
              >
                {selected && (
                  <div className="absolute inset-x-3 bottom-9 z-10 max-h-[52%] overflow-y-auto rounded-2xl border border-white/10 bg-night/95 p-4 backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-black leading-snug text-white">{selected.name}</p>
                        {selectedDistance != null && !far && (
                          <p className="mt-0.5 text-xs font-semibold text-brand-soft">
                            {formatDistance(selectedDistance)} · {walkingMinutes(selectedDistance)} min
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg leading-none text-white"
                        aria-label={t("clubPage.close")}
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-zinc-400">{t("essentialsPage.nitbusLinesHere")}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {selected.lines.map((c) => (
                        <Link key={c} href={`/buhos/${c}?stop=${encodeURIComponent(selected.name)}`} aria-label={`Búho ${c}: ${selected.name}`}>
                          <NitbusBadge code={c} size="md" />
                        </Link>
                      ))}
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lon}&travelmode=walking`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pill btn-primary mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
                    >
                      {t("clubPage.directions")}
                    </a>
                  </div>
                )}
              </NitbusStopsMap>
            ) : (
              <div className="flex h-[58dvh] min-h-[380px] items-center justify-center rounded-card border border-white/10 bg-surface text-sm text-zinc-400 md:h-[560px]" aria-live="polite">
                {t("essentialsPage.loading")}
              </div>
            )}

            {geoError && <p className="mt-3 text-sm text-warn">{geoError}</p>}
            {user?.accuracy != null && user.accuracy > 150 && (
              <p className="mt-3 text-sm text-zinc-400">{t("geo.approximate").replace("{n}", String(Math.round(user.accuracy / 10) * 10))}</p>
            )}

            {/* Tus 3 paradas más cercanas, con las líneas que paran en cada una. */}
            {user && nearest.length > 0 && !far ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold text-ink">{t("essentialsPage.nitbusNearest")}</p>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {nearest.map(({ s: stop, d }, i) => (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(stop.id)
                        document.getElementById("buho-map")?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }}
                      className={`flex items-start gap-3 rounded-card border p-3 text-left transition ${
                        selectedId === stop.id ? "border-brand/60 bg-brand/10" : "border-white/10 bg-surface hover:border-white/25"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black" style={{ background: NITBUS_PLATE.fg, color: NITBUS_PLATE.bg }}>
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug text-ink">{stop.name}</span>
                        <span className="mt-0.5 block text-xs font-semibold text-brand-soft">
                          {formatDistance(d)} · {walkingMinutes(d)} min
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                          {stop.lines.slice(0, 5).map((c) => (
                            <NitbusBadge key={c} code={c} />
                          ))}
                          {stop.lines.length > 5 && <span className="text-xs text-zinc-400">+{stop.lines.length - 5}</span>}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">{t("essentialsPage.nitbusLocateHint")}</p>
            )}
          </section>

          <p className="mt-8 text-xs leading-relaxed text-zinc-400">{t("nitbusPage.officialNote_madrid")}</p>
          <p className="mt-2 text-[11px] leading-snug text-zinc-500">
            {t("clubPage.buhoSource")}{" "}
            <a href="https://www.emtmadrid.es" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              emtmadrid.es
            </a>
          </p>
        </main>
      </NightPage>
      <Footer />
      <BottomNav />
    </div>
  )
}
