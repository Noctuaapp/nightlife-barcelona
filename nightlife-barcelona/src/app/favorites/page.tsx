"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"

import { supabase } from "../../lib/supabase"
import { useFavorites } from "../../context/FavoritesContext"
import { FALLBACK_IMAGE } from "../../lib/fallbackImage"
import { createSlug } from "../../lib/slug"
import { useLanguage } from "../../context/LanguageContext"
import { toDateLocale } from "../../lib/dateLocale"

type FavType = "club" | "event" | "club_event"

type BaseItem = {
  id: number
  favoriteId: number
  note: string | null
  collectionId: number | null
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
  const {
    favorites,
    loadingFavorites,
    toggleFavorite,
    setNote,
    setFavoriteCollection,
    collections,
    createCollection,
    renameCollection,
    deleteCollection,
  } = useFavorites()

  const [clubs, setClubs] = useState<Club[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([])
  const [checkingSession, setCheckingSession] = useState(true)

  const [activeCollection, setActiveCollection] = useState<"all" | "none" | number>("all")
  const [addingList, setAddingList] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [editingListId, setEditingListId] = useState<number | null>(null)
  const [editingListName, setEditingListName] = useState("")

  // Notas: borrador local mientras el usuario escribe, se guarda al salir del campo (onBlur)
  // para no hacer una llamada a la base de datos en cada pulsación de tecla.
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  // Estado de las tarjetas: antes el selector de lista era un <select> nativo del navegador (el
  // único elemento de toda la web con ese estilo — desentona con los botones/pills del resto de
  // la app) y la nota estaba siempre visible ocupando sitio en TODAS las tarjetas aunque casi
  // nadie la usara. Ahora el desplegable de listas es un botón + menú propio (mismo patrón que el
  // selector de ciudad del header) y la nota queda oculta detrás de un botón "+ Nota", solo
  // visible por defecto si ya tenías una escrita.
  // (Estos dos useState tienen que declararse aquí, junto con el resto — declararlos después del
  // "return" de la pantalla de carga rompía las Rules of Hooks: React dejaba de ver estos hooks
  // en cuanto checkingSession/loadingFavorites pasaban a false, y eso desincronizaba el orden de
  // hooks entre renders.)
  const [openListMenu, setOpenListMenu] = useState<string | null>(null)
  const [openNote, setOpenNote] = useState<Record<string, boolean>>({})

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
            note: fav?.note ?? null,
            collectionId: fav?.collection_id ?? null,
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

  const matchesCollection = (collectionId: number | null) => {
    if (activeCollection === "all") return true
    if (activeCollection === "none") return collectionId === null
    return collectionId === activeCollection
  }

  const filteredClubs = useMemo(() => clubs.filter((c) => matchesCollection(c.collectionId)), [clubs, activeCollection])
  const filteredClubEvents = useMemo(() => clubEvents.filter((c) => matchesCollection(c.collectionId)), [clubEvents, activeCollection])
  const filteredEvents = useMemo(() => events.filter((e) => matchesCollection(e.collectionId)), [events, activeCollection])

  const totalFavorites = clubs.length + events.length + clubEvents.length
  const totalFiltered = filteredClubs.length + filteredClubEvents.length + filteredEvents.length
  const uncategorizedCount = [...clubs, ...clubEvents, ...events].filter((i) => i.collectionId === null).length

  const draftKey = (type: FavType, id: number) => `${type}-${id}`

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    const created = await createCollection(newListName)
    setNewListName("")
    setAddingList(false)
    if (created) setActiveCollection(created.id)
  }

  const handleDeleteList = async (id: number) => {
    if (!window.confirm(t("favoritesPage.confirmDeleteList"))) return
    await deleteCollection(id)
    if (activeCollection === id) setActiveCollection("all")
  }

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
  ) => {
    const key = draftKey(item.type, item.id)
    const noteValue = noteDrafts[key] ?? item.note ?? ""
    const currentList = collections.find((c) => c.id === item.collectionId)
    const noteVisible = openNote[key] ?? !!item.note

    return (
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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Organizar: asignar a una lista — botón + menú propio en vez del <select> nativo */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenListMenu(openListMenu === key ? null : key)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                  currentList ? "border border-purple-500/30 bg-purple-500/10 text-purple-300" : "border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
                }`}
              >
                <span>🗂️</span>
                <span>{currentList ? currentList.name : t("favoritesPage.noList")}</span>
                <svg width="8" height="5" viewBox="0 0 10 6" fill="none" style={{ transform: openListMenu === key ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openListMenu === key && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOpenListMenu(null)} />
                  <div className="absolute left-0 top-11 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 shadow-2xl" style={{ background: "#111" }}>
                    <button
                      onClick={() => { setFavoriteCollection(item.type, item.id, null); setOpenListMenu(null) }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 ${!currentList ? "text-white bg-white/10" : "text-zinc-400"}`}
                    >
                      {t("favoritesPage.noList")}
                      {!currentList && <span className="text-emerald-400 text-xs">✓</span>}
                    </button>
                    {collections.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setFavoriteCollection(item.type, item.id, c.id); setOpenListMenu(null) }}
                        className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 ${currentList?.id === c.id ? "text-white bg-white/10" : "text-zinc-400"}`}
                      >
                        {c.name}
                        {currentList?.id === c.id && <span className="text-emerald-400 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!noteVisible && (
              <button
                type="button"
                onClick={() => setOpenNote((prev) => ({ ...prev, [key]: true }))}
                className="rounded-full border border-dashed border-white/15 px-4 py-2 text-xs font-bold text-zinc-500 transition hover:border-white/30 hover:text-zinc-300"
              >
                + {t("favoritesPage.notePlaceholder")}
              </button>
            )}
          </div>

          {/* Nota personal */}
          {noteVisible && (
            <input
              type="text"
              autoFocus={openNote[key] === true}
              value={noteValue}
              onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
              onBlur={(e) => setNote(item.type, item.id, e.target.value)}
              placeholder={t("favoritesPage.notePlaceholder")}
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/50"
            />
          )}
        </div>
      </div>
    )
  }

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

        {totalFavorites > 0 && (
          <section className="mx-auto mt-10 max-w-7xl px-4">
            <p className="mb-3 text-sm text-zinc-500">{t("favoritesPage.listsExplainer")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveCollection("all")}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  activeCollection === "all" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {t("favoritesPage.all")} ({totalFavorites})
              </button>

              {collections.map((c) => {
                const count = [...clubs, ...clubEvents, ...events].filter((i) => i.collectionId === c.id).length
                const isEditing = editingListId === c.id
                return (
                  <div key={c.id} className="group relative">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingListName}
                        onChange={(e) => setEditingListName(e.target.value)}
                        onBlur={() => { renameCollection(c.id, editingListName); setEditingListId(null) }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                        className="rounded-full border border-purple-500/50 bg-black/60 px-5 py-2.5 text-sm text-white outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => setActiveCollection(c.id)}
                        onDoubleClick={() => { setEditingListId(c.id); setEditingListName(c.name) }}
                        title={t("favoritesPage.renameHint")}
                        className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                          activeCollection === c.id ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {c.name} ({count})
                      </button>
                    )}
                    {!isEditing && (
                      <button
                        onClick={() => handleDeleteList(c.id)}
                        title={t("favoritesPage.deleteList")}
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white group-hover:flex"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}

              {uncategorizedCount > 0 && (
                <button
                  onClick={() => setActiveCollection("none")}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                    activeCollection === "none" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {t("favoritesPage.noList")} ({uncategorizedCount})
                </button>
              )}

              {addingList ? (
                <input
                  autoFocus
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onBlur={handleCreateList}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                  placeholder={t("favoritesPage.newListPlaceholder")}
                  className="rounded-full border border-purple-500/50 bg-black/60 px-5 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600"
                />
              ) : (
                <button
                  onClick={() => setAddingList(true)}
                  className="rounded-full border border-dashed border-white/20 px-5 py-2.5 text-sm font-bold text-zinc-400 transition hover:border-white/40 hover:text-white"
                >
                  {t("favoritesPage.newList")}
                </button>
              )}
            </div>
          </section>
        )}

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

        {totalFavorites > 0 && totalFiltered === 0 && (
          <p className="mx-auto mt-16 max-w-7xl px-4 text-center text-zinc-500">
            {t("favoritesPage.emptyListMessage")}
          </p>
        )}

        {filteredClubs.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.clubsSavedEyebrow")}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{t("favoritesPage.clubsSavedTitle")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredClubs.map((club) =>
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

        {filteredClubEvents.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.nightsSavedEyebrow")}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{t("favoritesPage.nightsSavedTitle")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredClubEvents.map((ce) =>
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

        {filteredEvents.length > 0 && (
          <section className="mx-auto mt-16 max-w-7xl px-4">
            <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">{t("favoritesPage.eventsSavedEyebrow")}</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white">{t("favoritesPage.eventsSavedTitle")}</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) =>
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
