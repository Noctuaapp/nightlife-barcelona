"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, X, LocateFixed } from "lucide-react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import ExploreSwitch from "../../components/nightlife/ExploreSwitch"
import EssentialPhoto from "../../components/essentials/EssentialPhoto"
import { supabase } from "../../lib/supabase"
import { cleanEssential } from "../../lib/essentials"
import { useLanguage } from "../../context/LanguageContext"
import { distanceInMeters, formatDistance, walkingMinutes } from "../../lib/geo"
import { getOpenStatus } from "../../lib/openStatus"
import { getMetroTonight } from "../../lib/transitHours"
import { categoryInfo, categoryRank, categoryNameKey, categoryDescKey } from "../../lib/essentialCategories"

// Portada de Esenciales. Rehecha tras la auditoría de octubre 2026: antes eran cuatro bloques con
// doce colores (uno por categoría), emojis como iconos, contadores de relleno ("12 categorías",
// "9 barrios") y un mosaico de fotos de Google de farmacias y cajeros. Ahora: buscador, lo más
// útil de madrugada con cuántos sitios hay abiertos, el transporte de esta noche y la lista de
// categorías.

export default function EssentialsPage() {
  const [essentials, setEssentials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearMe, setNearMe] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  // Depende de la hora: se calcula tras montar para que el HTML del servidor y el del navegador coincidan.
  const [metroLabel, setMetroLabel] = useState("")
  const { t, locale } = useLanguage()

  useEffect(() => {
    supabase
      .from("essentials")
      .select("*")
      .eq("hidden", false)
      .then(({ data }) => {
        if (data) setEssentials(data.map(cleanEssential))
        setLoading(false)
      })

    // Solo se usa la ubicación sin preguntar si el usuario ya la había permitido antes.
    if (navigator.geolocation && navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((r) => {
          if (r.state === "granted") {
            navigator.geolocation.getCurrentPosition(
              (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => {},
              { timeout: 6000 }
            )
          }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const m = getMetroTonight()
    setMetroLabel(
      m.state === "closed" ? t("clubPage.metroClosed") : m.closes === "all-night" ? t("clubPage.metroAllNight") : t("clubPage.metroUntil").replace("{time}", m.closes)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  const categories = Array.from(new Set(essentials.map((e) => e.category))).sort((a, b) => categoryRank(a) - categoryRank(b))
  const itemsByCategory = (cat: string) => essentials.filter((e) => e.category === cat)
  const openCount = (cat: string) => itemsByCategory(cat).filter((e) => getOpenStatus(e.open_hours).state === "open").length

  const nearby = userLocation
    ? essentials
        .filter((e) => e.latitude && e.longitude)
        .map((e) => ({ ...e, _dist: distanceInMeters(userLocation.lat, userLocation.lng, Number(e.latitude), Number(e.longitude)) }))
        .sort((a, b) => a._dist - b._dist)
        .slice(0, 8)
    : []

  const toggleNearMe = () => {
    if (nearMe) {
      setNearMe(false)
      return
    }
    setNearMe(true)
    setLocationDenied(false)
    if (userLocation) return
    if (!navigator.geolocation) {
      setLocationDenied(true)
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setLocationDenied(true)
        setLocating(false)
      },
      { timeout: 8000 }
    )
  }

  const showResults = !!search.trim() || nearMe
  const q = search.trim().toLowerCase()
  const textMatches = q
    ? essentials.filter((e) =>
        [e.name, e.category, t(categoryNameKey(e.category || "")), e.neighborhood, e.address].some((v) => typeof v === "string" && v.toLowerCase().includes(q))
      )
    : essentials

  const searchResults: any[] = nearMe
    ? userLocation
      ? textMatches
          .filter((e) => e.latitude && e.longitude)
          .map((e) => ({ ...e, _dist: distanceInMeters(userLocation.lat, userLocation.lng, Number(e.latitude), Number(e.longitude)) }))
          .sort((a, b) => a._dist - b._dist)
          .slice(0, 30)
      : []
    : q
    ? textMatches.slice(0, 60)
    : []

  const statusClass = (state: string, soon: boolean) => (state === "open" ? (soon ? "text-warn" : "text-open") : "text-zinc-400")

  const sectionTitle = "mb-4 text-lg font-semibold text-ink"
  const tile = "flex flex-col gap-3 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 text-ink">
        <section className="px-4 pt-8 sm:pt-12">
          <div className="mx-auto max-w-7xl">
            <ExploreSwitch active="essentials" />
            <h1 className="font-display mt-6 max-w-3xl text-[2rem] leading-[1.06] sm:text-5xl">{t("essentials.subtitle")}</h1>
            <p className="mt-3 max-w-xl text-base text-zinc-300">{t("essentialsPage.intro")}</p>

            <div className="mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row">
              <div className="group flex flex-1 items-center gap-3 rounded-full border border-white/15 bg-surface px-5 py-3 transition focus-within:border-brand">
                <Search size={18} className="shrink-0 text-zinc-400 group-focus-within:text-brand-soft" />
                <input
                  type="search"
                  placeholder={t("essentialsPage.searchPlaceholder")}
                  aria-label={t("essentialsPage.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-base text-ink outline-none placeholder:text-zinc-400"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-zinc-400 hover:text-ink" aria-label={t("explorer.clearSearch")}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={toggleNearMe}
                aria-pressed={nearMe}
                className={`flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  nearMe ? "bg-brand text-white" : "border border-white/15 text-zinc-200 hover:bg-white/5"
                }`}
              >
                <LocateFixed size={16} /> {t("explorer.near")}
              </button>
            </div>
          </div>
        </section>

        {showResults ? (
          <section className="mx-auto mt-8 max-w-7xl px-4">
            <p className="mb-4 text-sm text-zinc-400" aria-live="polite">
              {nearMe && !userLocation
                ? locating
                  ? t("explorer.locating")
                  : locationDenied
                  ? t("geo.denied")
                  : t("essentialsPage.allowLocation")
                : (searchResults.length === 1 ? t("essentialsPage.resultOne") : t("essentialsPage.resultMany")).replace("{n}", String(searchResults.length)) +
                  (nearMe ? ` · ${t("essentialsPage.byDistance")}` : "")}
            </p>
            {nearMe && !userLocation ? null : searchResults.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg font-semibold text-zinc-200">{t("essentialsPage.noResults")}</p>
                <p className="mt-2 text-sm text-zinc-400">{t("essentialsPage.noResultsHint")}</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {searchResults.map((item) => {
                  const info = categoryInfo(item.category)
                  const CatIcon = info.icon
                  const st = getOpenStatus(item.open_hours, t)
                  return (
                    <Link
                      key={item.id}
                      href={`/essentials/${info.slug}`}
                      className="flex items-start gap-4 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25"
                    >
                      <EssentialPhoto src={item.image} alt={item.name} icon={<CatIcon size={26} />} color="#7c5cff" className="h-16 w-16 shrink-0 rounded-ctl" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{item.name}</p>
                        <p className="mt-0.5 truncate text-sm text-zinc-400">
                          {[t(categoryNameKey(item.category)), item.neighborhood].filter(Boolean).join(" · ")}
                        </p>
                        {item._dist != null && (
                          <p className="mt-1 text-sm font-semibold text-brand-soft">
                            {formatDistance(item._dist)} · {t("essentialsPage.walkMin").replace("{n}", String(walkingMinutes(item._dist)))}
                          </p>
                        )}
                        {st.label && <p className={`mt-1 text-xs font-semibold ${statusClass(st.state, st.soon)}`}>{st.label}</p>}
                        {item.highFee && <p className="mt-1 text-xs font-semibold text-warn">{t("essentialsPage.highFee")}</p>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {!loading && essentials.length > 0 && (
              <section className="mx-auto mt-10 max-w-7xl px-4">
                <h2 className={sectionTitle}>{t("essentialsPage.nowTitle")}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {["Taxi", "Pharmacy", "ATM", "Food"].map((cat) => {
                    const items = itemsByCategory(cat)
                    if (items.length === 0) return null
                    const info = categoryInfo(cat)
                    const CatIcon = info.icon
                    const open = openCount(cat)
                    return (
                      <Link key={cat} href={`/essentials/${info.slug}`} className={tile}>
                        <CatIcon size={22} className="text-brand-soft" />
                        <span>
                          <span className="block text-sm font-semibold text-ink">{t(categoryNameKey(cat))}</span>
                          <span className={`mt-0.5 block text-xs font-semibold ${open > 0 ? "text-open" : "text-zinc-400"}`}>
                            {open > 0
                              ? (open === 1 ? t("essentialsPage.openNowOne") : t("essentialsPage.openNowCount")).replace("{n}", String(open))
                              : (items.length === 1 ? t("essentialsPage.placesOne") : t("essentialsPage.placesCount")).replace("{n}", String(items.length))}
                          </span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="mx-auto mt-10 max-w-7xl px-4">
              <h2 className={sectionTitle}>{t("essentialsPage.transportTitle")}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { cat: "Metro", line: metroLabel },
                  { cat: "Nitbus", line: t("essentialsPage.nitbusLine") },
                  { cat: "Taxi", line: t("essentialsPage.taxiLine") },
                ].map(({ cat, line }) => {
                  const info = categoryInfo(cat)
                  const CatIcon = info.icon
                  return (
                    <Link key={cat} href={`/essentials/${info.slug}`} className="flex items-center gap-4 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl bg-brand/15 text-brand-soft">
                        <CatIcon size={22} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{t(categoryNameKey(cat))}</span>
                        <span className="mt-0.5 block text-xs text-zinc-300">{line}</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>

            {nearby.length > 0 && (
              <section className="mt-10">
                <h2 className={`${sectionTitle} mx-auto max-w-7xl px-4`}>{t("essentialsPage.nearTitle")}</h2>
                <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
                  {nearby.map((item) => {
                    const info = categoryInfo(item.category)
                    const CatIcon = info.icon
                    return (
                      <Link key={item.id} href={`/essentials/${info.slug}`} className="w-56 shrink-0 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25">
                        <span className="flex items-center gap-2 text-xs font-semibold text-brand-soft">
                          <CatIcon size={14} /> {formatDistance(item._dist)}
                          {item._dist <= 2500 ? ` · ${t("essentialsPage.walkMin").replace("{n}", String(walkingMinutes(item._dist)))}` : ""}
                        </span>
                        <span className="mt-2 block truncate text-sm font-semibold text-ink">{item.name}</span>
                        {item.neighborhood && <span className="block truncate text-xs text-zinc-400">{item.neighborhood}</span>}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="mx-auto mt-10 max-w-7xl px-4">
              <h2 className={sectionTitle}>{t("essentialsPage.allTitle")}</h2>
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-card bg-surface" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <p className="py-12 text-center text-zinc-400">{t("essentialsPage.empty")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((cat) => {
                    const info = categoryInfo(cat)
                    const CatIcon = info.icon
                    const count = itemsByCategory(cat).length
                    return (
                      <Link key={cat} href={`/essentials/${info.slug}`} className="flex items-center gap-4 rounded-card border border-white/10 bg-surface p-4 transition hover:border-white/25">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl bg-white/5 text-brand-soft">
                          <CatIcon size={22} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">{t(categoryNameKey(cat))}</span>
                          <span className="mt-0.5 block truncate text-xs text-zinc-400">{t(categoryDescKey(cat))}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-zinc-400">{count}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </>
  )
}
