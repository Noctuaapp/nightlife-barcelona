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
import { nearestStop, normStopName, type NbLine, type NbStop } from "../../lib/nitbusRoutes"

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

type Highlight = { dir: number; index: number; meters: number | null; kind: "me" | "spot" | "stop" }

// Una parada con tantas líneas se pinta como nudo de transbordo (Pl. Catalunya, Sants, etc.).
const HUB_MIN_LINES = 4
const MAX_TRANSFER_BADGES = 12
// Alinea el punto con la primera línea del nombre: padding superior del renglón (0.75rem) + la
// mitad de su altura de línea (leading-6 = 1.5rem).
const DOT_TOP = "1.5rem"

// Parada más cercana a un punto, mirando los dos sentidos de la línea.
function pickNearest(line: NbLine, lat: number, lon: number, kind: Highlight["kind"]): Highlight | null {
  let best: Highlight | null = null
  for (let d = 0; d < line.directions.length; d++) {
    const n = nearestStop(line.directions[d].stops, lat, lon, distanceInMeters)
    if (n && (best === null || n.meters < (best.meters ?? Infinity))) best = { dir: d, index: n.index, meters: n.meters, kind }
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
  const [highlight, setHighlight] = useState<Highlight | null>(null)

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
          setHighlight({ dir: d, index: i, meters: null, kind: "stop" })
          return
        }
      }
    } else if (p.get("lat") && p.get("lon") && isFinite(lat) && isFinite(lon)) {
      const best = pickNearest(line, lat, lon, "spot")
      if (best) {
        setDir(best.dir)
        setHighlight(best)
      }
    }
  }, [line])

  // Lleva la parada resaltada al centro de la pantalla.
  useEffect(() => {
    if (!highlight || highlight.dir !== dir) return
    const el = document.getElementById(`stop-${highlight.dir}-${highlight.index}`)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlight, dir, query])

  const findMine = async () => {
    if (!line) return
    const pos = await geo.request()
    if (!pos) return
    const best = pickNearest(line, pos.lat, pos.lng, "me")
    if (best) {
      setQuery("")
      setDir(best.dir)
      setHighlight(best)
    }
  }

  const q = normStopName(query)
  const rows = useMemo(
    () => stops.map((s, index) => ({ s, index })).filter(({ s }) => !q || normStopName(s.name).includes(q)),
    [stops, q]
  )
  const filtering = q.length > 0
  const ordered = !!line?.ordered
  const highlightedStop = highlight && directions[highlight.dir] ? directions[highlight.dir].stops[highlight.index] : null

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
                      if (highlight && highlight.dir !== i) setHighlight(null)
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
              {highlightedStop && highlight && highlight.kind !== "stop" && highlight.meters != null && (
                <p className="mt-3 rounded-card border border-warn/40 bg-warn/[0.08] p-3 text-sm leading-snug text-zinc-100">
                  {t(highlight.kind === "me" ? "nitbusPage.nearestIs" : "nitbusPage.nearSpotIs")
                    .replace("{name}", highlightedStop.name)
                    .replace("{dist}", formatDistance(highlight.meters))}
                </p>
              )}
            </div>

            <p className="mt-6 text-sm text-zinc-400">
              {t("nitbusPage.stopsCount").replace("{n}", String(filtering ? rows.length : stops.length))}
              {current?.to && !filtering && ordered ? ` · ${current.from} → ${current.to}` : ""}
            </p>

            {rows.length === 0 ? (
              <p className="mt-4 text-base text-zinc-300">{t("nitbusPage.noMatch").replace("{q}", query)}</p>
            ) : (
              <ol className="mt-3">
                {rows.map(({ s, index }) => {
                  const isFirst = index === 0
                  const isLast = index === stops.length - 1
                  const terminal = ordered && (isFirst || isLast)
                  const hub = !terminal && s.others.length >= HUB_MIN_LINES
                  const isHi = !!highlight && highlight.dir === dir && highlight.index === index
                  const railTop = filtering || !ordered ? false : !isFirst
                  const railBottom = filtering || !ordered ? false : !isLast
                  return (
                    <li
                      key={`${index}-${s.name}`}
                      id={`stop-${dir}-${index}`}
                      className={`relative flex gap-3 scroll-mt-28 rounded-xl pr-2 ${isHi ? "bg-warn/[0.10] ring-1 ring-warn/50" : ""}`}
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
                        {isHi && highlight?.kind === "me" && highlight.meters != null && (
                          <p className="text-xs font-semibold text-warn">{t("nitbusPage.youAreHere").replace("{dist}", formatDistance(highlight.meters))}</p>
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
