"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

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
  music: string | null
  neighborhood: string | null
  image: string | null
  price: string | null
}

type EventItem = BaseItem & {
  title: string
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

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setCheckingSession(false)
        return
      }
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
          .select("id, name, music, neighborhood, image, price")
          .in("id", clubFavs.map((f) => f.item_id))
        setClubs(attach(data || [], clubFavs))
      } else {
        setClubs([])
      }

      if (eventFavs.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("id, title, club_name, image, music, date, price")
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
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.loading")}</p>
      </main>
    )
  }

  const renderCard = (
    item: (Club | EventItem | ClubEvent) & { type: FavType },
    title: string,
    image: string | null,
    meta: { label: string; value: string }[],
    href: string
  ) => (
    <div key={`${item.type}-${item.id}`} className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] transition hover:border-white/20">
      <Link href={href} className="block">
        <img
          src={image || FALLBACK_IMAGE}
          alt={title}
          className="h-56 w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE }}
        />
      </Link>

      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0">
            <h3 className="truncate text-2xl font-black text-white">{title}</h3>
          </Link>
          <button
            onClick={() => toggleFavorite(item.type, item.id)}
            title={t("favoritesPage.removeFromFavorites")}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-400 transition hover:border-red-500/40 hover:text-red-400"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {meta.map((m, i) => (
            <span key={i} className="rounded-full bg-white/10 px-4 py-2 text-sm text-zinc-300">
              {m.label} {m.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Header />

      <main className="min-h-screen bg-black pb-40 text-white">
        <section className="px-4 pt-14">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("nav.favorites")}</p>
                <h1 className="mt-4 text-5xl font-black tracking-tight text-white md:text-7xl">
                  {t("favoritesPage.title")}
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
                  {t("favoritesPage.subtitle")}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 backdrop-blur-xl">
                <p className="text-sm uppercase tracking-wide text-zinc-500">{t("favoritesPage.saved")}</p>
                <p className="mt-2 text-3xl font-black text-white">{totalFavorites}</p>
              </div>
            </div>
          </div>
        </section>

        {totalFavorites === 0 && (
          <section className="mx-auto mt-24 max-w-4xl px-4">
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-14 text-center backdrop-blur-2xl">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-6xl backdrop-blur-xl">
                ❤️
              </div>
              <h2 className="mt-8 text-4xl font-black tracking-tight text-white">{t("favoritesPage.emptyTitle")}</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
                {t("favoritesPage.emptySubtitle")}
              </p>
              <div className="mt-10 flex justify-center">
                <Link href="/clubs" className="rounded-full bg-white px-8 py-4 text-sm font-bold text-black transition hover:scale-105">
                  {t("favoritesPage.discoverClubs")}
                </Link>
              </div>
            </div>
          </section>
        )}

        {clubs.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.clubsSavedEyebrow")}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{t("favoritesPage.clubsSavedTitle")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {clubs.map((club) =>
                renderCard(
                  { ...club, type: "club" },
                  club.name,
                  club.image,
                  [
                    { label: "📍", value: club.neighborhood || "Barcelona" },
                    { label: "🎟", value: club.price || t("clubEvent.tba") },
                  ],
                  `/clubs/${createSlug(club.name)}`
                )
              )}
            </div>
          </section>
        )}

        {clubEvents.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.nightsSavedEyebrow")}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{t("favoritesPage.nightsSavedTitle")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {clubEvents.map((ce) =>
                renderCard(
                  { ...ce, type: "club_event" },
                  ce.title,
                  ce.image,
                  [
                    { label: "📅", value: ce.date ? new Date(ce.date).toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" }) : t("clubEvent.tba") },
                    { label: "🎵", value: ce.music || t("club.music") },
                  ],
                  `/club-event/${ce.id}`
                )
              )}
            </div>
          </section>
        )}

        {events.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.eventsSavedEyebrow")}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{t("favoritesPage.eventsSavedTitle")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) =>
                renderCard(
                  { ...event, type: "event" },
                  event.title,
                  event.image,
                  [
                    { label: "📅", value: event.date ? new Date(event.date).toLocaleDateString(toDateLocale(locale), { day: "numeric", month: "short" }) : t("clubEvent.tba") },
                    { label: "🎟", value: event.price || t("clubEvent.tba") },
                  ],
                  `/event/${createSlug(event.title)}`
                )
              )}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </>
  )
}
