"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, LocateFixed, Navigation, Search, Map as MapIcon } from "lucide-react"
import Header from "../layout/Header"
import Footer from "../layout/Footer"
import BottomNav from "../layout/BottomNav"
import { NitbusBadge } from "../ui/TransitBadge"
import { useLanguage } from "../../context/LanguageContext"
import { useGeolocation } from "../../lib/useGeolocation"
import { distanceInMeters, formatDistance } from "../../lib/geo"
import { NITBUS_PLATE, NITBUS_RAIL } from "../../lib/transitColors"
import { directionStats, nearestStop, normStopName, planTrips, type NbLine, type NbStop } from "../../lib/nitbusRoutes"

// Esquema de una línea de Nitbus (31/10/2026): una barra vertical con todas sus paradas en orden,
// cabeceras marcadas, transbordos con otras líneas nocturnas y «parada más cercana». Sustituye al
// mapa con mil chinchetas, donde no se veía nada. En vertical porque en el móvil el plano horizontal
// del cartel de la parada obliga a girar el teléfono y a leer los nombres de lado.

type Props = {
  code: string
  line: NbLine | null
  route: { from: string; to: string | null; note: string | null } | null
  allCodes: string[]
}

// Un punto del mapa (el sitio que se estaba mirando o la posición de la persona) y la parada de
// esta línea que le queda más cerca. Pueden marcarse las dos a la vez (31/10/2026): antes, al pulsar
// «Cerca de mí» se perdía la marcada desde el local y no se podía ver el trayecto entre ambas.
type Point = { lat: number; lon: number }
type Focus = { dir: number; index: number; tick: number }
type Nearest = { index: number; meters: number }

// Una parada con tantas líneas se pinta como nudo de transbordo (Pl. Catalunya, Sants, etc.).
const HUB_MIN_LINES = 4
const MAX_TRANSFER_BADGES = 12
// Alinea el punto con la primera línea del nombre: padding superior del renglón (0.75rem) + la
// mitad de su altura de línea (leading-6 = 1.5rem).
const DOT_TOP = "1.5rem"

// Parada más cercana a un punto, mirando los dos sentidos de la línea.
function pickNearest(line: NbLine, lat: number, lon: number): { dir: number; index: number; meters: number } | null {
  let best: { dir: number; index: number; meters: number } | null = null
  for (let d = 0; d < line.directions.length; d++) {
    const n = nearestStop(line.directions[d].stops, lat, lon, distanceInMeters)
    if (n && (best === null || n.meters < best.meters)) best = { dir: d, index: n.index, meters: n.meters }
  }
  return best
}

function StopDot({ kind }: { kind: "terminal" | "hub" | "stop" }) {
  const base = "absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
  if (kind === "terminal")
    return <span aria-hidden="true" className={`${base} h-5 w-5 ring-4 ring-night`} style={{ top: DOT_TOP, background: NITBUS_PLATE.fg }} />
  if (kind === "hub")
    return <span aria-hidden="true" className={`${base} h-4 w-4 border-[3px] border-white bg-night ring-4 ring-night`} style={{ top: DOT_TOP }} />
  return <span aria-hidden="true" className={`${base} h-3 w-3 border-2 bg-night ring-4 ring-night`} style={{ top: DOT_TOP, borderColor: "#9db0ff" }} />
}

export default function NitbusLineView({ code, line, route, allCodes }: Props) {
  const { t } = useLanguage()
  const geo = useGeolocation()
  const [dir, setDir] = useState(0)
  const [query, setQuery] = useState("")
  const [spot, setSpot] = useState<Point | null>(null) // el sitio que se estaba mirando (?lat y ?lon)
  const [me, setMe] = useState<Point | null>(null) // la posición de la persona («Cerca de mí»)
  const [named, setNamed] = useState<{ dir: number; index: number } | null>(null) // ?stop=Nombre
  const [focus, setFocus] = useState<Focus | null>(null) // a qué parada llevar la pantalla

  const directions = line?.directions ?? []
  const current = directions[Math.min(dir, Math.max(directions.length - 1, 0))]
  const stops: NbStop[] = current?.stops ?? []

  // Enlaces desde otras páginas: ?stop=Nombre (parada concreta) o ?lat=..&lon=.. (la más cercana a
  // un local que se estaba mirando).
  useEffect(() => {
    if (!line) return
    const p = new URLSearchParams(window.location.search)
    const stopName = p.get("stop")
    const lat = Number(p.get("lat"))
    const lon = Number(p.get("lon"))
    if (stopName) {
      const key = normStopName(stopName)
      for (let d = 0; d < line.directions.length; d++) {
        const i = line.directions[d].stops.findIndex((s) => normStopName(s.name) === key)
        if (i >= 0) {
          setDir(d)
          setNamed({ dir: d, index: i })
          setFocus({ dir: d, index: i, tick: Date.now() })
          return
        }
      }
    } else if (p.get("lat") && p.get("lon") && isFinite(lat) && isFinite(lon)) {
      const best = pickNearest(line, lat, lon)
      setSpot({ lat, lon })
      if (best) {
        setDir(best.dir)
        setFocus({ dir: best.dir, index: best.index, tick: Date.now() })
      }
    }
  }, [line])

  // Lleva la parada elegida al centro de la pantalla.
  useEffect(() => {
    if (!focus || focus.dir !== dir) return
    const el = document.getElementById(`stop-${focus.dir}-${focus.index}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [focus, dir, query])

  const findMine = async () => {
    if (!line) return
    const pos = await geo.request()
    if (!pos) return
    setQuery("")
    setMe({ lat: pos.lat, lon: pos.lng })
    // Con un sitio ya marcado se queda en el sentido que se estaba viendo, para que las dos paradas
    // salgan en la misma lista; sin él, se elige el sentido de la parada más cercana.
    let d = dir
    if (!spot) {
      const best = pickNearest(line, pos.lat, pos.lng)
      if (!best) return
      d = best.dir
      setDir(d)
    }
    const n = line.directions[d] ? nearestStop(line.directions[d].stops, pos.lat, pos.lng, distanceInMeters) : null
    if (n) setFocus({ dir: d, index: n.index, tick: Date.now() })
  }

  const q = normStopName(query)
  const rows = useMemo(
    () => stops.map((s, index) => ({ s, index })).filter(({ s }) => !q || normStopName(s.name).includes(q)),
    [stops, q]
  )
  const filtering = q.length > 0
  const ordered = !!line?.ordered
  // La parada de ESTE sentido más cercana a cada punto: al cambiar de sentido se recalculan solas.
  const spotHi: Nearest | null = useMemo(() => {
    const n = spot && current ? nearestStop(current.stops, spot.lat, spot.lon, distanceInMeters) : null
    return n ? { index: n.index, meters: n.meters } : null
  }, [spot, current])
  const meHi: Nearest | null = useMemo(() => {
    const n = me && current ? nearestStop(current.stops, me.lat, me.lon, distanceInMeters) : null
    return n ? { index: n.index, meters: n.meters } : null
  }, [me, current])
  // Con mi parada y la del sitio marcadas: en qué sentido ir, dónde subir y bajar y cuántas paradas.
  const trips = useMemo(() => (line && me && spot ? planTrips(line, me, spot, distanceInMeters) : []), [line, me, spot])
  // Tiempo aproximado de punta a punta del sentido que se está viendo (solo con el recorrido en orden).
  const dirStats = useMemo(() => (ordered && stops.length > 1 ? directionStats(stops, distanceInMeters) : null), [ordered, stops])
  const approxMinutes = !filtering && dirStats?.minutes != null ? dirStats.minutes : null

  const title = `Nitbus ${code}`

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        <Link href="/nitbus" className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-300 transition hover:text-ink">
          <ChevronLeft size={16} aria-hidden="true" /> {t("nitbusPage.back")}
        </Link>

        <header className="mt-5">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-11 items-center rounded-lg px-3 text-2xl font-black tracking-tight"
              style={{ background: NITBUS_PLATE.bg, color: NITBUS_PLATE.fg }}
            >
              {code}
            </span>
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
          </div>
          {route && (
            <p className="mt-3 text-base leading-snug text-zinc-200">
              <span className="font-semibold">{route.from}</span>
              {route.to && (
                <>
                  <span aria-hidden="true" className="mx-1.5 text-zinc-500">↔</span>
                  <span className="font-semibold">{route.to}</span>
                </>
              )}
              {route.note && <span className="text-zinc-400"> · {route.note}</span>}
            </p>
          )}
          <p className="mt-1 text-sm text-zinc-400">{t("essentialsPage.nitbusHours")}</p>
        </header>

        {!line || stops.length === 0 ? (
          <div className="mt-8 rounded-card border border-white/10 bg-surface p-6">
            <p className="text-base leading-relaxed text-zinc-200">{t("nitbusPage.noStops")}</p>
            <Link
              href={`/essentials/nitbus?line=${code}`}
              className="mt-4 inline-flex items-center gap-2 rounded-ctl border border-white/20 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
            >
              <MapIcon size={16} aria-hidden="true" /> {t("nitbusPage.viewMap")}
            </Link>
          </div>
        ) : (
          <>
            {line && !ordered && (
              <p className="mt-6 rounded-card border border-warn/40 bg-warn/[0.08] p-4 text-sm leading-relaxed text-zinc-100">
                {t("nitbusPage.orderPending")}
              </p>
            )}

            {directions.length > 1 && (
              <div role="tablist" aria-label={t("nitbusPage.directionLabel")} className="mt-6 grid grid-cols-2 gap-2">
                {directions.map((d, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={dir === i}
                    onClick={() => {
                      setDir(i)
                      setFocus(null)
                    }}
                    className={`min-w-0 rounded-ctl border px-3 py-3 text-left text-sm font-semibold transition ${
                      dir === i ? "border-brand bg-brand text-white" : "border-white/15 text-zinc-200 hover:bg-white/5"
                    }`}
                  >
                    <span className="block text-xs font-normal opacity-80">{t("nitbusPage.towardLabel")}</span>
                    <span className="block truncate">{d.to}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("nitbusPage.findStop")}
                  aria-label={t("nitbusPage.findStop")}
                  className="w-full rounded-ctl border border-white/10 bg-surface py-3 pl-11 pr-4 text-sm text-ink outline-none placeholder:text-zinc-500 focus:border-brand/50"
                />
              </div>
              <button
                onClick={findMine}
                disabled={geo.locating}
                className="inline-flex shrink-0 items-center gap-2 rounded-ctl border border-white/20 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-white/5 disabled:opacity-60"
              >
                <LocateFixed size={16} aria-hidden="true" />
                {geo.locating ? t("nitbusPage.locating") : t("nitbusPage.nearest")}
              </button>
            </div>

            <div aria-live="polite" className="min-h-0">
              {geo.error && <p className="mt-3 text-sm leading-relaxed text-red-300">{geo.error}</p>}
              {(spotHi || meHi) && (
                <div className="mt-3 flex flex-col gap-2">
                  {spotHi && current && (
                    <button
                      type="button"
                      onClick={() => setFocus({ dir, index: spotHi.index, tick: Date.now() })}
                      className="flex w-full items-start gap-3 rounded-card border border-warn/40 bg-warn/[0.08] p-3 text-left text-sm leading-snug text-zinc-100"
                    >
                      <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full bg-warn" />
                      <span>
                        {t("nitbusPage.nearSpotIs")
                          .replace("{name}", current.stops[spotHi.index].name)
                          .replace("{dist}", formatDistance(spotHi.meters))}
                      </span>
                    </button>
                  )}
                  {meHi && current && (
                    <button
                      type="button"
                      onClick={() => setFocus({ dir, index: meHi.index, tick: Date.now() })}
                      className="flex w-full items-start gap-3 rounded-card border border-brand/50 bg-brand/[0.10] p-3 text-left text-sm leading-snug text-zinc-100"
                    >
                      <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-full bg-brand" />
                      <span>
                        {t("nitbusPage.nearestIs")
                          .replace("{name}", current.stops[meHi.index].name)
                          .replace("{dist}", formatDistance(meHi.meters))}
                      </span>
                    </button>
                  )}
                </div>
              )}
              {trips.length > 0 && (
                <div className="mt-3 rounded-card border border-white/15 bg-white/[0.03] p-3">
                  <p className="text-sm font-semibold text-ink">{t("nitbusPage.tripTitle").replace("{code}", code)}</p>
                  <div className="mt-2 flex flex-col gap-2">
                    {trips.map((tr) => {
                      const dr = directions[tr.dir]
                      const board = t("nitbusPage.tripBoard")
                        .replace("{from}", `«${dr.stops[tr.from].name}»`)
                        .replace("{end}", `«${dr.stops[tr.to].name}»`)
                      const stopsLabel = tr.stops === 1 ? t("nitbusPage.tripStopOne") : t("nitbusPage.tripStops").replace("{n}", String(tr.stops))
                      const meta = [
                        t("nitbusPage.tripDirection").replace("{to}", dr.to),
                        stopsLabel,
                        tr.minutes != null ? t("nitbusPage.tripMin").replace("{min}", String(tr.minutes)) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                      return (
                        <button
                          key={`${tr.kind}-${tr.dir}`}
                          type="button"
                          onClick={() => {
                            setDir(tr.dir)
                            setFocus({ dir: tr.dir, index: tr.from, tick: Date.now() })
                          }}
                          className={`w-full rounded-ctl border px-3 py-2.5 text-left transition hover:bg-white/5 ${
                            tr.dir === dir ? "border-brand/60" : "border-white/10"
                          }`}
                        >
                          <span className="block text-xs font-semibold text-zinc-400">
                            {t(tr.kind === "go" ? "nitbusPage.tripGo" : "nitbusPage.tripBack")}
                          </span>
                          <span className="block text-sm text-ink">{board}</span>
                          <span className="block text-xs text-zinc-300">{meta}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <p className="mt-6 text-sm text-zinc-400">
              {t("nitbusPage.stopsCount").replace("{n}", String(filtering ? rows.length : stops.length))}
              {current?.to && !filtering && ordered ? ` · ${current.from} → ${current.to}` : ""}
              {approxMinutes != null ? ` · ${t("nitbusPage.approxTime").replace("{min}", String(approxMinutes))}` : ""}
            </p>
            {approxMinutes != null && <p className="mt-1 text-xs text-zinc-500">{t("nitbusPage.estimateNote")}</p>}

            {rows.length === 0 ? (
              <p className="mt-4 text-base text-zinc-300">{t("nitbusPage.noMatch").replace("{q}", query)}</p>
            ) : (
              <ol className="mt-3">
                {rows.map(({ s, index }) => {
                  const isFirst = index === 0
                  const isLast = index === stops.length - 1
                  const terminal = ordered && (isFirst || isLast)
                  const hub = !terminal && s.others.length >= HUB_MIN_LINES
                  const isSpot = spotHi?.index === index
                  const isMe = meHi?.index === index
                  const isNamed = !!named && named.dir === dir && named.index === index
                  const railTop = filtering || !ordered ? false : !isFirst
                  const railBottom = filtering || !ordered ? false : !isLast
                  return (
                    <li
                      key={`${index}-${s.name}`}
                      id={`stop-${dir}-${index}`}
                      className={`relative flex gap-3 scroll-mt-28 rounded-xl pr-2 ${
                        isMe ? "bg-brand/[0.14] ring-1 ring-brand/60" : isSpot || isNamed ? "bg-warn/[0.10] ring-1 ring-warn/50" : ""
                      }`}
                    >
                      <div className="relative w-8 shrink-0" aria-hidden="true">
                        {(railTop || railBottom) && (
                          <span
                            className="absolute left-1/2 w-1.5 -translate-x-1/2"
                            style={{
                              background: NITBUS_RAIL,
                              top: railTop ? 0 : DOT_TOP,
                              bottom: railBottom ? 0 : `calc(100% - ${DOT_TOP})`,
                            }}
                          />
                        )}
                        <StopDot kind={terminal ? "terminal" : hub ? "hub" : "stop"} />
                      </div>
                      <div className="min-w-0 flex-1 py-3">
                        <p
                          className={`break-words leading-6 ${
                            terminal ? "text-lg font-bold text-ink" : hub ? "font-semibold text-ink" : "text-zinc-200"
                          }`}
                        >
                          {s.name}
                        </p>
                        {terminal && (
                          <p className="text-xs text-zinc-400">{isFirst ? t("nitbusPage.start") : t("nitbusPage.end")}</p>
                        )}
                        {isSpot && spotHi && (
                          <p className="text-xs font-semibold text-warn">{t("nitbusPage.spotHere").replace("{dist}", formatDistance(spotHi.meters))}</p>
                        )}
                        {isMe && meHi && (
                          <p className="text-xs font-semibold text-brand-soft">{t("nitbusPage.youAreHere").replace("{dist}", formatDistance(meHi.meters))}</p>
                        )}
                        {s.others.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-zinc-400">{t("nitbusPage.transfer")}</span>
                            {s.others.slice(0, MAX_TRANSFER_BADGES).map((c) => (
                              <Link key={c} href={`/nitbus/${c}?stop=${encodeURIComponent(s.name)}`} aria-label={`Nitbus ${c}`}>
                                <NitbusBadge code={c} />
                              </Link>
                            ))}
                            {s.others.length > MAX_TRANSFER_BADGES && (
                              <span className="text-xs text-zinc-400">+{s.others.length - MAX_TRANSFER_BADGES}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {s.lat != null && s.lon != null && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=walking`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("nitbusPage.directions")}
                          aria-label={`${t("nitbusPage.directions")}: ${s.name}`}
                          className="mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-ink"
                        >
                          <Navigation size={16} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}

            <Link
              href={`/essentials/nitbus?line=${code}`}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-soft underline underline-offset-4 hover:text-ink"
            >
              <MapIcon size={16} aria-hidden="true" /> {t("nitbusPage.viewMapLine").replace("{code}", code)}
            </Link>
          </>
        )}

        <section className="mt-10 border-t border-white/10 pt-6" aria-label={t("nitbusPage.otherLines")}>
          <h2 className="text-base font-semibold text-ink">{t("nitbusPage.otherLines")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {allCodes
              .filter((c) => c !== code)
              .map((c) => (
                <Link key={c} href={`/nitbus/${c}`} aria-label={`Nitbus ${c}`} className="rounded-md p-0.5 transition hover:ring-2 hover:ring-white/60">
                  <NitbusBadge code={c} size="md" />
                </Link>
              ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-zinc-400">{t("nitbusPage.officialNote")}</p>
        </section>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}
