"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Heart } from "lucide-react"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import LoginWall from "../../components/ui/LoginWall"

import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"
import { EVENTS_HIDDEN } from "../../lib/featureFlags"
import { addDays, effectiveHoursStatus, effectiveOpenNow, nightDay } from "../../lib/scheduleNotices"
import NightBackdrop from "../../components/ui/NightBackdrop"

// Antes esta pantalla tenía un sistema de "listas" (carpetas para organizar favoritos) y una
// nota de texto por favorito. Tras probarlo, no se le veía suficiente utilidad como para
// justificar la complejidad (un desplegable de listas por tarjeta, gestión de crear/renombrar/
// borrar listas...) así que se ha quitado del todo: esto vuelve a ser simplemente la lista de
// tus clubs, noches y eventos guardados, con un botón para quitarlos.
//
// 05/11/2026 — vista rápida: cada fila enseña lo que se quiere saber sin entrar a la ficha. En los
// locales, si está abierto ahora y hasta qué hora (o a qué hora abre); en noches y eventos, el día
// («Hoy», «Mañana») y, si ya pasó, que ya pasó. Arriba, un filtro «Abiertos ahora». Se calcula con
// el mismo horario que usan las fichas (avisos de cierre del dueño incluidos), no es un dato aparte.
type FavType = "club" | "event" | "club_event"

type BaseItem = {
  id: number
  favoriteId: number
}

type Club = BaseItem & {
  name: string
  slug?: string | null
  music: string | null
  neighborhood: string | null
  image: string | null
  price: string | null
  hours: string | null
  open_days: string[] | null
  temporarily_closed: boolean | null
  schedule_notices: unknown
}

type EventItem = BaseItem & {
  title: string
  slug?: string | null
  club_name: string | null
  image: string | null
  music: string | null
  date: string | null
  price: string | null
}

type ClubEvent = BaseItem & {
  title: string
  club_name: string | null
  image: string | null
  music: string | null
  date: string | null
  price: string | null
}

type RowStatus = { text: string; tone: "open" | "closed" | "today" | "past" }

export default function FavoritesPage() {
  const { t, locale } = useLanguage()
  const { favorites, loadingFavorites, toggleFavorite } = useFavorites()

  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([])
  const [checkingSession, setCheckingSession] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [onlyOpen, setOnlyOpen] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setLoggedIn(!!data.session)
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const clubFavs = favorites.filter((f) => f.item_type === "club")
      const eventFavs = favorites.filter((f) => f.item_type === "event")
      const clubEventFavs = favorites.filter((f) => f.item_type === "club_event")

      const attach = <T extends { id: number }>(rows: T[], favs: typeof favorites): (T & BaseItem)[] =>
        rows.map((row) => {
          const fav = favs.find((f) => f.item_id === row.id)
          return {
            ...row,
            favoriteId: fav?.id ?? 0,
          }
        })

      if (clubFavs.length > 0) {
        const { data } = await supabase
          .from("clubs")
          .select("id, name, slug, music, neighborhood, image, price, hours, open_days, temporarily_closed, schedule_notices")
          .in("id", clubFavs.map((f) => f.item_id))
        setClubs(attach(data || [], clubFavs))
      } else {
        setClubs([])
      }

      if (eventFavs.length > 0 && !EVENTS_HIDDEN) {
        const { data } = await supabase
          .from("events")
          .select("id, title, slug, club_name, image, music, date, price")
          .in("id", eventFavs.map((f) => f.item_id))
        setEvents(attach(data || [], eventFavs))
      } else {
        setEvents([])
      }

      if (clubEventFavs.length > 0) {
        const { data } = await supabase
          .from("club_events")
          .select("id, title, club_name, image, music, date, price")
          .in("id", clubEventFavs.map((f) => f.item_id))
        setClubEvents(attach(data || [], clubEventFavs))
      } else {
        setClubEvents([])
      }
    }

    if (!loadingFavorites) {
      fetchData()
    }
  }, [favorites, loadingFavorites])

  const totalFavorites = clubs.length + events.length + clubEvents.length

  // Estado de cada local ahora mismo (null = no se sabe: sin horario o ilegible). Los abiertos van
  // primero; dentro de cada grupo, por nombre.
  const clubsView = clubs
    .map((c) => ({ club: c, open: effectiveOpenNow(c), status: effectiveHoursStatus(c) }))
    .sort((a, b) => Number(b.open === true) - Number(a.open === true) || a.club.name.localeCompare(b.club.name))
  const openCount = clubsView.filter((x) => x.open === true).length
  // Si con el paso de la noche ya no queda ninguno abierto, el filtro se apaga solo (sin chips no habría cómo quitarlo).
  const filterOpen = onlyOpen && openCount > 0
  const shownClubs = filterOpen ? clubsView.filter((x) => x.open === true) : clubsView

  // Noches y eventos: lo próximo primero y lo que ya pasó al final (siguen guardados, solo atenuados).
  const today = nightDay()
  const tomorrow = addDays(today, 1)
  const byDate = <T extends { date: string | null }>(a: T, b: T) => {
    const pa = !!a.date && a.date < today
    const pb = !!b.date && b.date < today
    if (pa !== pb) return pa ? 1 : -1
    return (a.date || "9999").localeCompare(b.date || "9999")
  }
  const sortedClubEvents = [...clubEvents].sort(byDate)
  const sortedEvents = [...events].sort(byDate)

  if (checkingSession || loadingFavorites) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-night text-ink">
          <p className="text-sm text-zinc-400">{t("favoritesPage.loading")}</p>
        </main>
      </>
    )
  }

  // Sin sesión (29/10/2026): antes salía «aún no tienes favoritos», como si fuera tu lista vacía. Ahora
  // se explica que es una zona privada y se ofrece entrar con Google, crear cuenta o iniciar sesión.
  if (!loggedIn) {
    return (
      <>
        <Header />
        <LoginWall titleKey="favoritesPage.gateTitle" subtitleKey="favoritesPage.gateSubtitle" />
        <BottomNav />
      </>
    )
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString(toDateLocale(locale), { weekday: "short", day: "numeric", month: "short" }) : t("eventPage.dateTbc")

  // «Hoy» y «Mañana» van en la línea destacada (y entonces no se repite la fecha); «Ya pasó» atenúa la fila.
  const dateStatus = (d: string | null): RowStatus | null =>
    !d ? null : d === today ? { text: t("favoritesPage.today"), tone: "today" } : d === tomorrow ? { text: t("favoritesPage.tomorrow"), tone: "today" } : d < today ? { text: t("favoritesPage.past"), tone: "past" } : null

  // Filas compactas (antes tarjetas con foto de 224 px y emojis delante de cada dato).
  const renderRow = (type: FavType, id: number, title: string, image: string | null, meta: string, href: string, status?: RowStatus | null) => (
    <li key={`${type}-${id}`} className={`flex items-center gap-4 rounded-card border border-white/10 bg-surface p-3 transition hover:border-white/25 ${status?.tone === "past" ? "opacity-60" : ""}`}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image || FALLBACK_IMAGE}
          alt=""
          className="h-16 w-16 shrink-0 rounded-ctl object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE }}
        />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{title}</span>
          {status && (
            <span
              className={`mt-0.5 flex items-center gap-1.5 text-[13px] font-semibold ${status.tone === "open" ? "text-open" : status.tone === "today" ? "text-warn" : "text-zinc-400"}`}
            >
              {(status.tone === "open" || status.tone === "today") && (
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.tone === "open" ? "bg-open" : "bg-warn"}`} />
              )}
              <span className="truncate">{status.text}</span>
            </span>
          )}
          <span className="mt-0.5 block truncate text-sm text-zinc-400">{meta}</span>
        </span>
      </Link>
      <button
        onClick={() => toggleFavorite(type, id)}
        aria-label={t("favoritesPage.removeFromFavorites")}
        title={t("favoritesPage.removeFromFavorites")}
        className="shrink-0 rounded-ctl p-2 text-brand-soft transition hover:text-red-300"
      >
        <Heart size={20} fill="currentColor" />
      </button>
    </li>
  )

  const section = "mx-auto mt-10 max-w-3xl px-4"
  const h2 = "mb-4 text-lg font-semibold text-ink"

  return (
    <>
      <Header />
      <main className="relative isolate min-h-screen bg-night pb-40 text-ink">
        <NightBackdrop tone={"pink"} />
        <section className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
          <h1 className="font-display text-[2.1rem] leading-[1.06] sm:text-5xl">{t("favoritesPage.title")}</h1>
          <p className="mt-3 max-w-xl text-base text-zinc-300">{t("favoritesPage.subtitle")}</p>
          {totalFavorites > 0 && (
            <p className="mt-2 text-sm text-zinc-400">{t("profilePage.favCount").replace("{n}", String(totalFavorites))}</p>
          )}
          {openCount > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOnlyOpen(false)}
                aria-pressed={!filterOpen}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!filterOpen ? "bg-white text-[#0a0910]" : "border border-transparent bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-[#2c2937]"}`}
              >
                {t("favoritesPage.all")}
              </button>
              <button
                type="button"
                onClick={() => setOnlyOpen(true)}
                aria-pressed={filterOpen}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filterOpen ? "bg-white text-[#0a0910]" : "border border-transparent bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-[#2c2937]"}`}
              >
                {t("favoritesPage.openNowFilter")} · {openCount}
              </button>
            </div>
          )}
        </section>

        {totalFavorites === 0 && (
          <section className={section}>
            <div className="rounded-card border border-white/10 bg-surface px-6 py-14 text-center">
              <Heart size={36} className="mx-auto text-brand-soft" />
              <h2 className="mt-5 text-xl font-semibold text-ink">{t("favoritesPage.emptyTitle")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">{t("favoritesPage.emptySubtitle")}</p>
              <Link href="/clubs" className="btn-pill btn-primary mt-6 inline-flex px-6 py-3 text-sm">
                {t("favoritesPage.discoverClubs")}
              </Link>
            </div>
          </section>
        )}

        {!filterOpen && sortedClubEvents.length > 0 && (
          <section className={section}>
            <h2 className={h2}>{t("favoritesPage.nightsSavedTitle")}</h2>
            <ul className="space-y-2">
              {sortedClubEvents.map((ce) => {
                const st = dateStatus(ce.date)
                return renderRow("club_event", ce.id, ce.title, ce.image, [st && st.tone !== "past" ? null : fmtDate(ce.date), ce.club_name, ce.price].filter(Boolean).join(" · "), `/club-event/${ce.id}`, st)
              })}
            </ul>
          </section>
        )}

        {!filterOpen && sortedEvents.length > 0 && (
          <section className={section}>
            <h2 className={h2}>{t("favoritesPage.eventsSavedTitle")}</h2>
            <ul className="space-y-2">
              {sortedEvents.map((event) => {
                const st = dateStatus(event.date)
                return renderRow("event", event.id, event.title, event.image, [st && st.tone !== "past" ? null : fmtDate(event.date), event.club_name, event.price].filter(Boolean).join(" · "), `/event/${event.slug || createSlug(event.title)}`, st)
              })}
            </ul>
          </section>
        )}

        {shownClubs.length > 0 && (
          <section className={section}>
            <h2 className={h2}>{t("favoritesPage.clubsSavedTitle")}</h2>
            <ul className="space-y-2">
              {shownClubs.map(({ club, open, status }) => {
                const st: RowStatus | null =
                  open === true
                    ? { text: status?.open ? t("favoritesPage.openUntil").replace("{t}", status.at) : t("favoritesPage.openNow"), tone: "open" }
                    : open === false
                      ? { text: status && !status.open ? t("favoritesPage.opensAt").replace("{t}", status.at) : t("favoritesPage.closedNow"), tone: "closed" }
                      : null
                return renderRow("club", club.id, club.name, club.image, [club.neighborhood || "Barcelona", club.music, club.price].filter(Boolean).join(" · "), `/clubs/${club.slug || createSlug(club.name)}`, st)
              })}
            </ul>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}
