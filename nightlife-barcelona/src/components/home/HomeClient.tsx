"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import Header from "../layout/Header"
import BottomNav from "../layout/BottomNav"
import Footer from "../layout/Footer"
import EventsSection from "./EventsSection"
import SurpriseMe from "./SurpriseMe"
import ReferralBanner from "./ReferralBanner"
import AreasSection from "./AreasSection"
import Icon from "../ui/Icon"
import { useLanguage } from "../../context/LanguageContext"
import { createSlug } from "../../lib/slug"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { useGeolocation } from "../../lib/useGeolocation"
import { distanceInMeters, formatDistance } from "../../lib/geo"
import { clubOpenNow } from "../../lib/clubHours"

// Portada. Rediseñada tras la auditoría de octubre 2026:
// - Antes el titular, un subtítulo de 7 líneas, tres cifras y una cinta animada ocupaban la
//   primera pantalla entera, y el primer local aparecía a 2,5 pantallas de scroll. Ahora la
//   primera pantalla ya enseña qué está abierto esta noche (cerca de ti si das tu ubicación).
// - Fuera las manchas de color animadas, la cuadrícula, el ruido, el foco que seguía al ratón,
//   los contadores y la aparición escalonada de cada tarjeta: costaban batería y no ayudaban a decidir.
// - "Para ti" era un orden aleatorio: ahora es "Todos" y prioriza locales con foto y buena nota.

type Club = Record<string, any>

const TABS = [
  { key: "all", label: "home.tabAll" },
  { key: "near", label: "home.tabNear" },
  { key: "open", label: "home.tabOpen" },
  { key: "top", label: "home.tabTop" },
  { key: "lgtbi", label: "home.tabLgtbi" },
  { key: "free", label: "home.tabFree" },
] as const

// Redondea hacia abajo para que la cifra sea siempre "aproximada por debajo" (nunca promete más
// locales de los que realmente hay): a la decena por debajo de 200, a la media centena a partir
// de ahí.
function roughly(n: number): number {
  if (n <= 0) return 0
  const step = n < 200 ? 10 : 50
  return Math.floor(n / step) * step
}

function quality(c: Club): number {
  const rating = Number(c.google_rating || c.rating || 0)
  return (c.image ? 2 : 0) + (rating >= 4 ? rating : rating / 2) + (c.trending ? 1 : 0)
}

function ClubTile({ club, openNow, distance, compact = false }: { club: Club; openNow: boolean | null; distance?: string | null; compact?: boolean }) {
  const { t } = useLanguage()
  const rating = club.google_rating || club.rating
  return (
    <Link
      href={`/clubs/${club.slug || createSlug(club.name)}`}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-card border border-white/10 bg-surface ${compact ? "h-56 w-[72vw] max-w-[280px] shrink-0 snap-start" : "h-64"}`}
    >
      <Image
        src={club.image || FALLBACK_IMAGE}
        alt={club.name}
        fill
        sizes={compact ? "280px" : "(max-width: 768px) 100vw, 33vw"}
        unoptimized={!club.image}
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 to-transparent" />
      {openNow !== null && (
        <span
          className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            openNow ? "bg-night/80 text-open" : "bg-night/70 text-zinc-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${openNow ? "live-dot bg-open" : "bg-off"}`} />
          {openNow ? t("clubPage.openNow") : t("home.closed")}
        </span>
      )}
      <div className="relative p-4">
        <p className="truncate text-lg font-semibold text-ink">{club.name}</p>
        <p className="mt-0.5 truncate text-sm text-zinc-300">
          {[club.neighborhood || "Barcelona", distance, club.music].filter(Boolean).join(" · ")}
        </p>
        {(rating || club.price) && (
          <p className="mt-1 flex items-center gap-2 text-xs text-zinc-300">
            {rating && (
              <span className="flex items-center gap-1 font-semibold text-ink">
                <Icon name="star" className="h-3 w-3 text-warn" /> {Number(rating).toFixed(1)}
              </span>
            )}
            {club.price && <span className="truncate">{club.price}</span>}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function HomeClient({
  initialClubs,
  eventsCount = 0,
  essentialsCount = 0,
}: {
  initialClubs: Club[]
  eventsCount?: number
  essentialsCount?: number
}) {
  const { t } = useLanguage()
  const clubs = initialClubs
  const geo = useGeolocation()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("all")
  const [search, setSearch] = useState("")
  // Estado "abierto" calculado tras montar: depende de la hora y así el HTML coincide con el servidor.
  const [openMap, setOpenMap] = useState<Record<string, boolean | null>>({})

  useEffect(() => {
    setMounted(true)
    const compute = () => {
      const m: Record<string, boolean | null> = {}
      for (const c of clubs) m[c.id] = clubOpenNow(c.hours, c.open_days)
      setOpenMap(m)
    }
    compute()
    const id = setInterval(compute, 60000)
    return () => clearInterval(id)
  }, [clubs])

  const isOpen = (c: Club) => (mounted ? openMap[c.id] ?? null : null)
  // Locales abiertos ahora (para el indicador en directo de la portada).
  const openCount = mounted ? Object.values(openMap).filter((v) => v === true).length : 0
  const dist = (c: Club) =>
    geo.pos && c.latitude && c.longitude ? distanceInMeters(geo.pos.lat, geo.pos.lng, Number(c.latitude), Number(c.longitude)) : null

  // Orden estable en el servidor; variedad (entre los mejores) solo tras montar.
  const ranked = useMemo(() => {
    const base = [...clubs].sort((a, b) => quality(b) - quality(a))
    if (!mounted) return base
    const top = base.slice(0, 24).sort(() => Math.random() - 0.5)
    return [...top, ...base.slice(24)]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, mounted])

  // Primera pantalla: abiertos ahora (los más cercanos si hay ubicación). Si no hay ninguno
  // abierto (de día), los mejor valorados para esta noche.
  const tonight = useMemo(() => {
    const open = ranked.filter((c) => isOpen(c) === true)
    const pool = open.length >= 3 ? open : ranked
    const list = geo.pos ? [...pool].filter((c) => dist(c) !== null).sort((a, b) => (dist(a) as number) - (dist(b) as number)) : pool
    return { anyOpen: open.length >= 3, list: list.slice(0, 10) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked, openMap, geo.pos])

  const displayed = useMemo(() => {
    let list = ranked
    if (activeTab === "top") list = [...clubs].sort((a, b) => Number(b.google_rating || b.rating || 0) - Number(a.google_rating || a.rating || 0))
    else if (activeTab === "lgtbi") list = ranked.filter((c) => c.lgtbi_friendly)
    else if (activeTab === "free") list = ranked.filter((c) => String(c.price || "").toLowerCase().includes("gratis"))
    else if (activeTab === "open") list = ranked.filter((c) => isOpen(c) === true)
    else if (activeTab === "near")
      list = geo.pos ? ranked.filter((c) => dist(c) !== null).sort((a, b) => (dist(a) as number) - (dist(b) as number)) : ranked
    return list.slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ranked, clubs, openMap, geo.pos])

  const selectTab = (key: (typeof TABS)[number]["key"]) => {
    setActiveTab(key)
    if (key === "near" && !geo.pos && !geo.locating) geo.request()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    window.location.href = `/clubs${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""}`
  }

  const quickLinks = [
    { href: "/map", icon: "map", label: t("home.quickMap") },
    { href: "/essentials", icon: "globe", label: t("home.quickEssentials") },
    { href: "/plan", icon: "calendar", label: t("home.quickPlan") },
    { href: "/events", icon: "ticket", label: t("home.quickEvents") },
  ]

  return (
    <>
      <Header />

      <main className="min-h-screen bg-night pb-28 text-ink md:pb-16">
        {/* PORTADA: Barcelona de noche a sangre (la foto del skyline con los mismos violetas y azules
            del header), un indicador en directo con los locales abiertos ahora, el titular grande
            con la segunda línea en el degradado de neón de la marca, y el buscador en cristal. */}
        <section className="relative isolate overflow-hidden">
          <Image
            src="/hero/skyline_barcelona.jpeg"
            alt={t("home.heroImageAlt")}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[38%_45%] sm:object-center"
          />
          {/* Lectura del texto: oscurece la izquierda en pantallas grandes y funde con la página abajo */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{ background: "linear-gradient(180deg, rgba(7,8,20,0.55) 0%, rgba(7,8,20,0.35) 35%, rgba(10,9,16,0.85) 78%, #0a0910 100%)" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 hidden md:block"
            style={{ background: "linear-gradient(90deg, rgba(7,8,20,0.88) 0%, rgba(7,8,20,0.55) 45%, rgba(7,8,20,0) 75%)" }}
          />

          <div className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-20 lg:pt-28">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md sm:text-sm">
              <span aria-hidden="true" className="live-dot h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              {openCount > 0
                ? (openCount === 1 ? t("home.liveOpenOne") : t("home.liveOpenMany")).replace("{n}", String(openCount))
                : t("home.liveTonight")}
            </p>

            <h1 className="mt-5 max-w-4xl font-display text-[2.6rem] leading-[0.98] tracking-tight text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-6xl lg:text-[5.25rem]">
              {t("home.hero")}
              <span
                className="block bg-clip-text pb-1 text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #6cf2f2 0%, #3b82ff 35%, #a855f7 68%, #ec4899 100%)" }}
              >
                {t("home.hero_accent")}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg">{t("home.subtitle")}</p>

            <form onSubmit={handleSearch} role="search" className="mt-7 max-w-2xl">
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1.5 pl-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl transition focus-within:border-cyan-300/60 focus-within:bg-white/[0.14]">
                <Icon name="search" className="h-5 w-5 shrink-0 text-white/70" />
                <label htmlFor="home-search" className="sr-only">
                  {t("home.searchLabel")}
                </label>
                <input
                  id="home-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("home.searchPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-white outline-none placeholder:text-white/60"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(236,72,153,0.7)] transition hover:opacity-90 sm:px-7"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  {t("home.search")}
                </button>
              </div>
            </form>

            {/* Cifras de la app: estáticas (sin animación ni contador que suba), solo para dar
               una idea rápida de tamaño antes de los accesos rápidos. */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-200">
              <span>
                <strong className="font-display text-base text-white">{roughly(clubs.length)}+</strong> {t("home.statsClubs")}
              </span>
              <span>
                <strong className="font-display text-base text-white">{roughly(eventsCount)}+</strong> {t("home.statsEvents")}
              </span>
              <span>
                <strong className="font-display text-base text-white">{roughly(essentialsCount)}+</strong> {t("home.statsEssentials")}
              </span>
            </div>

            <nav aria-label={t("home.quickTitle")} className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {quickLinks.map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-300/50 hover:bg-black/45"
                >
                  <Icon name={q.icon} className="h-4 w-4 text-cyan-300" /> {q.label}
                </Link>
              ))}
            </nav>
          </div>
        </section>

        {/* ESTA NOCHE: carrusel en la primera pantalla */}
        <section className="mx-auto max-w-7xl px-4 pt-2 sm:px-6" aria-labelledby="tonight-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="tonight-title" className="text-xl font-semibold">
                {tonight.anyOpen ? (geo.pos ? t("home.openNearYou") : t("home.openNow")) : t("home.forTonight")}
              </h2>
              {!geo.pos && (
                <button onClick={() => geo.request()} className="mt-1 text-sm font-semibold text-brand-soft underline-offset-2 hover:underline">
                  {geo.locating ? t("home.locating") : t("home.useLocation")}
                </button>
              )}
              {geo.error && <p className="mt-1 text-sm text-warn">{geo.error}</p>}
            </div>
            <Link href={tonight.anyOpen ? "/clubs?open=1" : "/clubs"} className="shrink-0 text-sm font-semibold text-zinc-300 hover:text-ink">
              {t("home.seeAll")}
            </Link>
          </div>
          <div className="relative -mx-4 mt-4 sm:mx-0">
            <div className="scroll-x-thin flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:px-0">
              {tonight.list.map((club) => {
                const d = dist(club)
                return <ClubTile key={club.id} club={club} openNow={isOpen(club)} distance={d !== null ? formatDistance(d) : null} compact />
              })}
            </div>
            {/* Pista visual de que hay más locales deslizando a la derecha (el móvil no siempre
               deja ver la barra de scroll). */}
            {tonight.list.length > 2 && (
              <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-night to-transparent sm:hidden" />
            )}
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
          <ReferralBanner />
          <SurpriseMe clubs={clubs} />
        </section>

        {/* DESTACADOS con filtros */}
        <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6" aria-labelledby="featured-title">
          <h2 id="featured-title" className="font-display text-3xl sm:text-4xl">
            {t("home.featured")}
          </h2>
          <div role="tablist" className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => selectTab(tab.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-ink text-night" : "border border-white/10 text-zinc-300 hover:bg-white/5"
                }`}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          {activeTab === "near" && geo.error && <p className="mt-4 text-sm text-warn">{geo.error}</p>}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayed.length === 0 ? (
              <p className="col-span-full py-12 text-center text-zinc-400">{t("home.noResults")}</p>
            ) : (
              displayed.map((club) => {
                const d = dist(club)
                return <ClubTile key={club.id} club={club} openNow={isOpen(club)} distance={activeTab === "near" && d !== null ? formatDistance(d) : null} />
              })
            )}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/clubs"
              className="inline-flex items-center gap-2 rounded-ctl border border-white/15 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"
            >
              {t("home.exploreAll").replace("{n}", String(clubs.length))} <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <EventsSection />
        <AreasSection />

        {/* Qué es Noctua — visible (antes estaba oculto solo para la verificación de Google) */}
        <section className="mx-auto mt-20 max-w-3xl px-4 sm:px-6">
          <h2 className="text-lg font-semibold">{t("home.about_title")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t("home.about_text")}</p>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </>
  )
}
