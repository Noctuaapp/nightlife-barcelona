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

// Antes esta pantalla tenía un sistema de "listas" (carpetas para organizar favoritos) y una
// nota de texto por favorito. Tras probarlo, no se le veía suficiente utilidad como para
// justificar la complejidad (un desplegable de listas por tarjeta, gestión de crear/renombrar/
// borrar listas...) así que se ha quitado del todo: esto vuelve a ser simplemente la lista de
// tus clubs, noches y eventos guardados, con un botón para quitarlos.
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

export default function FavoritesPage() {
  const { t, locale } = useLanguage()
  const { favorites, loadingFavorites, toggleFavorite } = useFavorites()

  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([])
  const [checkingSession, setCheckingSession] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

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
          .select("id, name, slug, music, neighborhood, image, price")
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

  // Filas compactas (antes tarjetas con foto de 224 px y emojis delante de cada dato).
  const renderRow = (type: FavType, id: number, title: string, image: string | null, meta: string, href: string) => (
    <li key={`${type}-${id}`} className="flex items-center gap-4 rounded-card border border-white/10 bg-surface p-3 transition hover:border-white/25">
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
      <main className="min-h-screen bg-night pb-40 text-ink">
        <section className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
          <h1 className="font-display text-[2.1rem] leading-[1.06] sm:text-5xl">{t("favoritesPage.title")}</h1>
          <p className="mt-3 max-w-xl text-base text-zinc-300">{t("favoritesPage.subtitle")}</p>
          {totalFavorites > 0 && (
            <p className="mt-2 text-sm text-zinc-400">{t("profilePage.favCount").replace("{n}", String(totalFavorites))}</p>
          )}
        </section>

        {totalFavorites === 0 && (
          <section className={section}>
            <div className="rounded-card border border-white/10 bg-surface px-6 py-14 text-center">
              <Heart size={36} className="mx-auto text-brand-soft" />
              <h2 className="mt-5 text-xl font-semibold text-ink">{t("favoritesPage.emptyTitle")}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">{t("favoritesPage.emptySubtitle")}</p>
              <Link href="/clubs" className="mt-6 inline-flex rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong">
                {t("favoritesPage.discoverClubs")}
              </Link>
            </div>
          </section>
        )}

        {clubEvents.length > 0 && (
          <section className={section}>
            <h2 className={h2}>{t("favoritesPage.nightsSavedTitle")}</h2>
            <ul className="space-y-2">
              {clubEvents.map((ce) => renderRow("club_event", ce.id, ce.title, ce.image, [fmtDate(ce.date), ce.club_name].filter(Boolean).join(" · "), `/club-event/${ce.id}`))}
            </ul>
          </section>
        )}

        {events.length > 0 && (
          <section className={section}>
            <h2 className={h2}>{t("favoritesPage.eventsSavedTitle")}</h2>
            <ul className="space-y-2">
              {events.map((event) =>
                renderRow("event", event.id, event.title, event.image, [fmtDate(event.date), event.club_name, event.price].filter(Boolean).join(" · "), `/event/${event.slug || createSlug(event.title)}`)
              )}
            </ul>
          </section>
        )}

        {clubs.length > 0 && (
          <section className={section}>
            <h2 className={h2}>{t("favoritesPage.clubsSavedTitle")}</h2>
            <ul className="space-y-2">
              {clubs.map((club) =>
                renderRow("club", club.id, club.name, club.image, [club.neighborhood || "Barcelona", club.music, club.price].filter(Boolean).join(" · "), `/clubs/${club.slug || createSlug(club.name)}`)
              )}
            </ul>
          </section>
        )}
      </main>
      <BottomNav />
    </>
  )
}
