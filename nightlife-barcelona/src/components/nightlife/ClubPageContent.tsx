"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useLanguage } from "../../context/LanguageContext"
import { track } from "../../lib/track"
import FavoriteButton from "../favorites/FavoriteButton"
import CheckInButton from "../gamification/CheckInButton"
import AttendanceButton from "../gamification/AttendanceButton"
import NearbyVenuesSheet from "../nightlife/NearbyVenuesSheet"
import ClubMap from "../map/ClubMap"
import ClubNightsCalendar from "../nightlife/ClubNightsCalendar"
import NearbyEssentials from "../nightlife/NearbyEssentials"
import ClubTransport from "./club/ClubTransport"
import ClubGallery from "./club/ClubGallery"
import ClubReviews from "./club/ClubReviews"
import Stars from "./club/Stars"
import Icon from "../ui/Icon"
import { toast } from "../ui/Toast"
import { supabase } from "../../lib/supabase"
import { InlineEditText, InlineEditImage } from "../admin/InlineEdit"
import { useIsAdmin } from "../../lib/useIsAdmin"
import { FALLBACK_IMAGE as FALLBACK_CLUB_IMAGE } from "../../lib/fallbackImage"
import { createSlug } from "../../lib/slug"
import { clubOpenNow } from "../../lib/clubHours"
import { toDateLocale } from "../../lib/dateLocale"

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// Ficha de club. Reordenada tras la auditoría de octubre 2026:
//   1. Arriba lo que decide la noche: nombre, si está abierto, valoración y dos botones.
//   2. Datos prácticos (música, precio, horario, edad) sin "TBA" ni valores inventados.
//   3. Lo que pasa hoy de verdad: notas y check-ins recientes (nada de "estimados").
//   4. Detalle: servicios, cómo llegar y volver, preguntas frecuentes, mapa.
//   5. Fotos, reseñas de Google y locales parecidos.
// Antes: "Comprar entradas" salía 4 veces (y enlazaba a la web aunque no vendiera entradas),
// "Cómo llegar" 3, la valoración 3, había dos botones de volver, una cola fija que parecía en
// directo, un nivel de ambiente inventado y efectos (paralaje, foco que sigue al ratón,
// contadores animados) que no ayudaban a decidir nada.

type Tab = "about" | "nights" | "sessions" | "location"

const LIVE_STATUS_MAX_AGE_MS = 4 * 60 * 60 * 1000
const CHECKINS_MIN_FOR_LIVE = 3
const CHECKINS_FOR_FULL = 10

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-white/10 bg-surface p-6 sm:p-7 ${className}`}>{children}</div>
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-lg font-semibold text-ink">{children}</h2>
}

export default function ClubPageContent({ club, clubEvents, clubSessions = [] }: { club: any; clubEvents: any[]; clubSessions?: any[] }) {
  const { t, locale } = useLanguage()
  const isAdmin = useIsAdmin()
  const [activeTab, setActiveTab] = useState<Tab>("about")
  const [related, setRelated] = useState<any[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [liveCheckins, setLiveCheckins] = useState(0)
  const [liveNotes, setLiveNotes] = useState<{ note: string; note_created_at: string }[]>([])
  // La hora depende del momento en que se mira: se calcula tras montar para que el HTML del
  // servidor y el del navegador coincidan.
  const [openNow, setOpenNow] = useState<boolean | null>(null)
  const [now, setNow] = useState<number | null>(null)

  // Solo enlaces de venta de entradas. Antes caía a la web oficial y "Comprar entradas" salía en
  // locales que no venden nada.
  const ticketUrl: string | null = club.tickets_url || club.ticket_url || club.entradas_url || null
  const website: string | null = club.website || null
  const instagram: string | null = club.instagram || club.instagram_url || null
  const displayRating: number | null = club.google_rating || club.rating || null
  const reviewCount: number | null = club.google_review_count || club.review_count || club.reviews_count || null
  const capacity = club.capacity || club.aforo || null
  const minAge = club.min_age || club.edad_minima || club.age_min || null
  const hasCoords = !!club.latitude && !!club.longitude

  const trackClick = (eventType: string) => track(eventType, { itemType: "club", itemId: club.id, itemName: club.name })

  useEffect(() => {
    setOpenNow(clubOpenNow(club.hours, club.open_days))
    setNow(Date.now())
    const id = setInterval(() => {
      setOpenNow(clubOpenNow(club.hours, club.open_days))
      setNow(Date.now())
    }, 60000)
    return () => clearInterval(id)
  }, [club.hours, club.open_days])

  useEffect(() => {
    trackClick("page_view")

    // Parecidos: mismo barrio y mismo estilo, con buena nota (antes, 3 al azar de la tabla).
    const loadRelated = async () => {
      const fields = "id, name, slug, image, neighborhood, music, rating, google_rating"
      let { data, error } = await supabase.from("clubs").select(fields).eq("hidden", false).neq("id", club.id)
      if (error) ({ data } = await supabase.from("clubs").select("*").eq("hidden", false).neq("id", club.id))
      if (!data) return
      const myMusic = String(club.music || "").toLowerCase().split(/[,/]/).map((m: string) => m.trim()).filter(Boolean)
      const score = (r: any) => {
        const rating = Number(r.google_rating || r.rating || 0)
        let points = rating >= 4 ? rating : rating >= 3.5 ? rating / 2 : 0
        if (club.neighborhood && r.neighborhood === club.neighborhood) points += 3
        const theirMusic = String(r.music || "").toLowerCase()
        if (myMusic.some((m: string) => theirMusic.includes(m))) points += 2
        if (r.image) points += 1
        return points
      }
      const best = [...data].sort((a, b) => score(b) - score(a)).slice(0, 6)
      setRelated(best.sort(() => Math.random() - 0.5).slice(0, 3))
    }

    // Notas de check-in de las últimas 6 h: lo único realmente "en directo" de la ficha.
    const loadLiveNotes = async () => {
      const { data } = await supabase
        .from("club_live_notes")
        .select("note, note_created_at")
        .eq("club_id", club.id)
        .order("note_created_at", { ascending: false })
        .limit(5)
      if (data) {
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
        setLiveNotes(data.filter((n) => n.note_created_at && new Date(n.note_created_at).getTime() > sixHoursAgo))
      }
    }

    supabase.rpc("club_live_checkins", { p_club_id: club.id }).then(({ data }) => {
      if (typeof data === "number") setLiveCheckins(data)
    })
    loadRelated()
    loadLiveNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.id])

  const shareClub = async () => {
    trackClick("share_click")
    const url = window.location.href
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title: club.name, text: t("clubPage.shareText").replace("{name}", club.name), url })
      } catch {
        /* el usuario canceló */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      toast(t("clubPage.linkCopied"))
    }
  }

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${club.latitude},${club.longitude}`
    : club.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${club.address} ${club.name}`)}`
    : null

  // ---- Estado de esta noche: solo datos reales ----
  const liveStatusAgeMs = club.live_status_updated_at ? Date.now() - new Date(club.live_status_updated_at).getTime() : Infinity
  const LIVE_LABELS: Record<string, string> = {
    tranquilo: t("clubPage.vibeQuiet"),
    animado: t("clubPage.vibeBusy"),
    lleno: t("clubPage.vibeFull"),
  }
  const isLiveStatus = !!(club.live_status && LIVE_LABELS[club.live_status] && liveStatusAgeMs < LIVE_STATUS_MAX_AGE_MS)
  const fromCheckins = !isLiveStatus && liveCheckins >= CHECKINS_MIN_FOR_LIVE
  const vibe = isLiveStatus
    ? LIVE_LABELS[club.live_status]
    : fromCheckins
    ? liveCheckins >= CHECKINS_FOR_FULL
      ? LIVE_LABELS.lleno
      : LIVE_LABELS.animado
    : null
  const liveDetail = isLiveStatus
    ? t("clubPage.liveFromVenue").replace("{min}", String(Math.max(1, Math.round(liveStatusAgeMs / 60000))))
    : fromCheckins
    ? t("clubPage.liveFromCheckins").replace("{n}", String(liveCheckins))
    : null

  // ---- Próxima noche del club ----
  const nextEvent =
    now && clubEvents?.length
      ? [...clubEvents]
          .filter((ev) => {
            const d = ev?.date || ev?.event_date
            return d && new Date(d).getTime() + 12 * 3600 * 1000 > now
          })
          .sort((a, b) => new Date(a.date || a.event_date).getTime() - new Date(b.date || b.event_date).getTime())[0]
      : null
  const nextEventDate = nextEvent
    ? cap(new Date(`${String(nextEvent.date || nextEvent.event_date).slice(0, 10)}T12:00:00`).toLocaleDateString(toDateLocale(locale), { weekday: "long", day: "numeric", month: "long" }))
    : null

  const hasNights = clubEvents && clubEvents.length > 0
  const hasSessions = clubSessions && clubSessions.length > 0

  const features = [
    { key: "terrace", label: t("clubPage.fTerrace"), icon: "leaf", active: !!club.terrace },
    { key: "vip", label: t("clubPage.fVip"), icon: "sofa", active: !!club.vip_tables },
    { key: "smoking", label: t("clubPage.fSmoking"), icon: "cigarette", active: !!club.smoking_area },
    { key: "booking", label: t("clubPage.fBooking"), icon: "clipboard", active: !!club.table_booking },
    { key: "lgtbi", label: t("clubPage.fLgtbi"), icon: "pride", active: !!club.lgtbi_friendly },
    { key: "dresscode", label: `${t("clubPage.fDresscode")}: ${club.dresscode}`, icon: "shirt", active: !!club.dresscode },
    { key: "capacity", label: t("clubPage.fCapacity").replace("{n}", String(capacity)), icon: "users", active: !!capacity },
  ].filter((f) => f.active)

  // Antes esta lista repetía, como pregunta/respuesta, exactamente los mismos datos que ya se ven
  // arriba en "Datos prácticos" (precio, horario, edad, aforo) y en las características (dress
  // code, reserva de mesas, VIP, fumadores, futbolín): un "FAQ" que no añadía nada, solo
  // reformulaba lo que el usuario ya había leído dos secciones antes. Lo único que de verdad no
  // está en ningún otro sitio de la ficha es la promo del día y las condiciones de entrada
  // gratuita, así que son las únicas que quedan aquí.
  const faqs = [
    club.discount_info && { q: t("clubPage.faqPromoQ"), a: club.discount_info },
    club.free_entry_info && { q: t("clubPage.faqFreeQ"), a: club.free_entry_info },
  ].filter(Boolean) as { q: string; a: string }[]

  const quickFacts = [
    club.music && { key: "music", field: "music", icon: "music", label: t("club.music"), value: club.music },
    club.price && { key: "price", field: "price", icon: "ticket", label: t("club.price"), value: club.price },
    club.hours && { key: "hours", field: "hours", icon: "clock", label: t("club.hours"), value: club.hours },
    minAge && { key: "age", field: "min_age", icon: "id", label: t("clubPage.minAge"), value: String(minAge) },
  ].filter(Boolean) as { key: string; field: string | null; icon: string; label: string; value: string }[]

  const galleryImages: string[] = (
    Array.isArray(club.gallery) ? club.gallery : Array.isArray(club.images) ? club.images : [club.image_2, club.image_3, club.image_4]
  ).filter((src: unknown): src is string => typeof src === "string" && src.length > 0)
  const allImages = [club.image, ...galleryImages].filter(Boolean) as string[]

  const tabs: { key: Tab; label: string }[] = [
    { key: "about", label: t("clubPage.tabAbout") },
    ...(hasSessions ? [{ key: "sessions" as Tab, label: t("clubPage.tabSessions") }] : []),
    ...(hasNights ? [{ key: "nights" as Tab, label: t("clubPage.tabNights") }] : []),
    { key: "location", label: t("clubPage.tabLocation") },
  ]

  const goToTab = (tab: Tab) => {
    setActiveTab(tab)
    document.getElementById("club-content")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const secondaryBtn =
    "flex items-center justify-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-ink transition hover:bg-white/10"
  // Botón cuadrado solo con icono. Antes se hacía con secondaryBtn + "px-0", pero el px-5 de
  // secondaryBtn ganaba y el icono se quedaba en 2 px de ancho: en el móvil se veía un punto.
  const iconBtn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl border border-white/15 bg-white/5 text-ink transition hover:bg-white/10"
  const primaryBtn =
    "flex items-center justify-center gap-2 rounded-ctl bg-brand px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-strong"

  return (
    <main className="relative min-h-screen bg-night pb-40 text-ink lg:pb-16">
      {/* PORTADA */}
      <section className="relative">
        <div className="relative h-[46vh] max-h-[560px] min-h-[320px] w-full overflow-hidden">
          <Image
            src={club.image || FALLBACK_CLUB_IMAGE}
            alt={club.name}
            fill
            priority
            sizes="100vw"
            unoptimized={!club.image}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-transparent" />
          <InlineEditImage table="clubs" id={club.id} field="image" bucket="club-images" label="Cambiar foto principal" />
        </div>

        <div className="relative -mt-28 px-4 sm:-mt-36 sm:px-6">
          <div className="mx-auto max-w-6xl">
            {(club.trending || club.sold_out || club.verified) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {club.verified && (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-ink">
                    <Icon name="check" className="h-3.5 w-3.5 text-brand-soft" /> {t("clubPage.verified")}
                  </span>
                )}
                {club.trending && (
                  <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-xs font-semibold text-ink">
                    <Icon name="flame" className="h-3.5 w-3.5 text-warn" /> {t("club.trending")}
                  </span>
                )}
                {club.sold_out && (
                  <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/15 px-3 py-1.5 text-xs font-semibold text-red-200">
                    <Icon name="ban" className="h-3.5 w-3.5" /> {t("club.sold_out")}
                  </span>
                )}
              </div>
            )}

            <p className="text-sm font-semibold text-brand-soft empty:hidden">
              <InlineEditText table="clubs" id={club.id} field="music" value={club.music} emptyLabel="añadir estilo musical" />
            </p>
            <h1 className="font-display mt-1 break-words text-[2.4rem] leading-[1.02] text-ink sm:text-6xl md:text-7xl">
              <InlineEditText table="clubs" id={club.id} field="name" value={club.name} />
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Icon name="map" className="h-4 w-4 text-muted" />
                {club.neighborhood ? (
                  <Link href={`/barrio/${createSlug(club.neighborhood)}`} className="underline decoration-white/25 underline-offset-4 transition hover:text-ink hover:decoration-white">
                    {club.neighborhood}
                  </Link>
                ) : (
                  "Barcelona"
                )}
              </span>
              {displayRating && (
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Stars rating={displayRating} />
                  <span className="font-semibold text-ink">{Number(displayRating).toFixed(1)}</span>
                  {reviewCount ? <span className="text-zinc-400">({reviewCount.toLocaleString("es-ES")})</span> : null}
                </span>
              )}
              {openNow !== null && (
                <span className={`flex items-center gap-1.5 font-semibold ${openNow ? "text-open" : "text-zinc-400"}`}>
                  <span className={`h-2 w-2 rounded-full ${openNow ? "live-dot bg-open" : "bg-off"}`} />
                  {openNow ? t("clubPage.openNow") : t("clubPage.closedNow")}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {ticketUrl ? (
                <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={primaryBtn}>
                  <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
                </a>
              ) : directionsUrl ? (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={primaryBtn}>
                  <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
                </a>
              ) : null}
              {ticketUrl && directionsUrl && (
                <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={secondaryBtn}>
                  <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("website_click")} className={secondaryBtn}>
                  <Icon name="globe" className="h-4 w-4" /> {t("clubPage.website")}
                </a>
              )}
              <button onClick={shareClub} className={`${iconBtn} h-auto min-h-[50px] w-[52px]`} aria-label={t("clubPage.share")}>
                <Icon name="share" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* DATOS PRÁCTICOS */}
      {quickFacts.length > 0 && (
        <section className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-white/10 bg-white/10 sm:grid-cols-4">
            {quickFacts.map((f) => (
              <div key={f.key} className="flex items-start gap-3 bg-surface p-4">
                <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                <div className="min-w-0">
                  <dt className="text-xs text-zinc-400">{f.label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold leading-snug text-ink">
                    {f.field ? (
                      <>
                        {f.key === "age" && "+"}
                        <InlineEditText table="clubs" id={club.id} field={f.field} value={f.value} />
                      </>
                    ) : (
                      f.value
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ESTA NOCHE: solo con datos reales (el local o check-ins de las últimas 3 h) */}
      {(vibe || liveNotes.length > 0) && (
        <section className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <div className="rounded-card border border-open/25 bg-open/[0.06] p-5 sm:p-6">
            {vibe && (
              <p className="flex flex-wrap items-center gap-2 text-sm">
                <span className="live-dot h-2 w-2 rounded-full bg-open" />
                <span className="font-semibold text-ink">{vibe}</span>
                {liveDetail && <span className="text-zinc-300">· {liveDetail}</span>}
              </p>
            )}
            {liveNotes.length > 0 && (
              <div className={`grid gap-3 sm:grid-cols-2 ${vibe ? "mt-4" : ""}`}>
                {liveNotes.map((n, i) => {
                  const mins = Math.max(0, Math.round((Date.now() - new Date(n.note_created_at).getTime()) / 60000))
                  const ago = mins < 1 ? t("clubPage.justNow") : mins < 60 ? t("clubPage.minAgo").replace("{n}", String(mins)) : t("clubPage.hoursAgo").replace("{n}", String(Math.round(mins / 60)))
                  return (
                    <blockquote key={i} className="rounded-ctl border border-white/10 bg-night/40 p-4">
                      <p className="text-sm leading-relaxed text-ink">“{n.note}”</p>
                      <footer className="mt-2 text-xs text-zinc-400">
                        {t("clubPage.noteFromDoor")} · {ago}
                      </footer>
                    </blockquote>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PRÓXIMA NOCHE */}
      {nextEvent && (
        <section className="mx-auto mt-6 max-w-6xl px-4 sm:px-6">
          <button
            onClick={() => goToTab("nights")}
            className="flex w-full items-center justify-between gap-4 rounded-card border border-white/10 bg-surface p-5 text-left transition hover:border-white/20"
          >
            <span className="min-w-0">
              <span className="block text-xs text-zinc-400">{t("clubPage.nextNight")}</span>
              <span className="mt-1 block truncate text-base font-semibold text-ink">{nextEvent.name || nextEvent.title || club.name}</span>
              {nextEventDate && <span className="mt-0.5 block text-sm text-zinc-300">{nextEventDate}</span>}
            </span>
            <Icon name="arrow" className="h-5 w-5 shrink-0 text-muted" />
          </button>
        </section>
      )}

      <section id="club-content" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* COLUMNA PRINCIPAL — en móvil va primero; las acciones (guardar, asistiré, check-in)
              quedan debajo, en una fila compacta, para no cortar la información */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {(club.description || isAdmin) && (
              <Panel>
                <PanelTitle>{t("clubPage.about").replace("{name}", club.name)}</PanelTitle>
                <p className="text-base leading-relaxed text-zinc-200">
                  <InlineEditText table="clubs" id={club.id} field="description" value={club.description} multiline emptyLabel="añadir descripción" />
                </p>
              </Panel>
            )}

            <div role="tablist" className="scrollbar-none sticky top-[72px] z-20 sm:top-20 -mx-4 flex gap-2 overflow-x-auto bg-night/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                    activeTab === tab.key ? "bg-ink text-night" : "border border-white/10 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "about" && (
              <div className="space-y-6">
                {features.length > 0 && (
                  <Panel>
                    <PanelTitle>{t("clubPage.features")}</PanelTitle>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {features.map((f) => (
                        <li key={f.key} className="flex items-center gap-3 rounded-ctl border border-white/10 px-4 py-3">
                          <Icon name={f.icon} className="h-4 w-4 shrink-0 text-brand-soft" />
                          <span className="text-sm font-semibold text-ink">{f.label}</span>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}

                <Panel>
                  <PanelTitle>{t("clubPage.getThereBack")}</PanelTitle>
                  <ClubTransport club={club} />
                </Panel>

                {faqs.length > 0 && (
                  <Panel>
                    <PanelTitle>{t("clubPage.faq")}</PanelTitle>
                    <div className="divide-y divide-white/10">
                      {faqs.map((f, i) => (
                        <div key={i} className="py-3.5">
                          <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            aria-expanded={openFaq === i}
                            className="flex w-full items-center justify-between gap-4 text-left"
                          >
                            <span className="text-sm font-semibold text-ink">{f.q}</span>
                            <span className={`shrink-0 text-xl text-zinc-400 transition-transform ${openFaq === i ? "rotate-45" : ""}`}>+</span>
                          </button>
                          <p hidden={openFaq !== i} className="mt-2 text-sm leading-relaxed text-zinc-300">
                            {f.a}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                {hasCoords && (
                  <Panel>
                    <NearbyEssentials latitude={Number(club.latitude)} longitude={Number(club.longitude)} />
                  </Panel>
                )}
              </div>
            )}

            {activeTab === "sessions" && hasSessions && (
              <div className="space-y-4">
                {clubSessions.map((session: any) => (
                  <Panel key={session.id}>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-ctl">
                        {session.image ? (
                          <Image src={session.image} alt={session.name} fill sizes="96px" className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center border border-white/10 bg-white/5">
                            <Icon name="calendar" className="h-8 w-8 text-muted" />
                          </div>
                        )}
                        <InlineEditImage table="club_sessions" id={session.id} field="image" bucket="club-images" label="Cambiar" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {session.day_of_week && (
                          <span className="inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-soft">{session.day_of_week}</span>
                        )}
                        <h3 className="mt-2 text-lg font-semibold text-ink">{session.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-300">
                          {session.music && <span className="rounded-full border border-white/10 px-3 py-1">{session.music}</span>}
                          {session.price && <span className="rounded-full border border-white/10 px-3 py-1">{session.price}</span>}
                          {session.dresscode && (
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              {t("clubPage.fDresscode")}: {session.dresscode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Panel>
                ))}
              </div>
            )}

            {activeTab === "nights" && hasNights && (
              <Panel>
                <ClubNightsCalendar clubEvents={clubEvents} clubName={club.name} />
              </Panel>
            )}

            {activeTab === "location" && (
              <Panel>
                <PanelTitle>{t("club.location")}</PanelTitle>
                {hasCoords && (
                  <div className="overflow-hidden rounded-ctl">
                    <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                  </div>
                )}
                {club.address && <p className="mt-4 text-sm text-zinc-300">{club.address}</p>}
                {directionsUrl ? (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick("directions_click")}
                    className={`${primaryBtn} mt-4 w-full`}
                  >
                    <Icon name="map" className="h-4 w-4" /> {t("clubPage.openRoute")}
                  </a>
                ) : (
                  <p className="text-sm text-zinc-400">{t("clubPage.noLocation")}</p>
                )}
              </Panel>
            )}
          </div>

          {/* ACCIONES */}
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-white/10 bg-surface p-4">
              {ticketUrl && (
                <a
                  href={ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("tickets_click")}
                  className={`${primaryBtn} mb-3 hidden w-full lg:flex`}
                >
                  <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
                </a>
              )}
              <div className="grid grid-cols-3 gap-2">
                <FavoriteButton itemType="club" itemId={club.id} variant="tile" />
                <AttendanceButton itemType="club" itemId={club.id} title={club.name} variant="tile" />
                <CheckInButton clubId={club.id} latitude={club.latitude} longitude={club.longitude} variant="tile" />
              </div>
              <NearbyVenuesSheet
                compact
                excludeClubId={club.id}
                venueType="club"
                venueId={club.id}
                name={club.name}
                latitude={club.latitude}
                longitude={club.longitude}
              />
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick("instagram_click")}
                  className={`${secondaryBtn} mt-3 w-full`}
                >
                  <Icon name="instagram" className="h-4 w-4" /> Instagram
                </a>
              )}
              <a
                href={"/contact?type=report_issue&subject=" + encodeURIComponent("Reporte: " + club.name)}
                className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 transition hover:text-ink"
              >
                <Icon name="flag" className="h-3.5 w-3.5" /> {t("clubPage.report")}
              </a>
            </div>

            {hasCoords && (
              <button
                onClick={() => goToTab("location")}
                className="group hidden w-full overflow-hidden rounded-card border border-white/10 bg-surface text-left lg:block"
              >
                <div className="pointer-events-none h-40">
                  <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                </div>
                <span className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-ink">
                  {t("clubPage.mapAndTransport")} <Icon name="arrow" className="h-4 w-4 text-muted" />
                </span>
              </button>
            )}
          </aside>
        </div>
      </section>

      <div className="mt-16">
        <ClubGallery
          images={allImages}
          name={club.name}
          edit={{ table: "clubs", id: club.id, bucket: "club-photos", gallery: Array.isArray(club.gallery) ? club.gallery : [] }}
        />
        <ClubReviews clubId={club.id} rating={displayRating} count={reviewCount} />
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <h2 className="mb-5 text-lg font-semibold text-ink">{t("clubPage.related")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => {
              const rRating = r.google_rating || r.rating || null
              return (
                <Link
                  key={r.id}
                  href={`/clubs/${r.slug || createSlug(r.name)}`}
                  className="group overflow-hidden rounded-card border border-white/10 bg-surface transition hover:border-white/25"
                >
                  <div className="relative h-40">
                    <Image src={r.image || FALLBACK_CLUB_IMAGE} alt={r.name} fill sizes="(max-width: 640px) 100vw, 33vw" unoptimized={!r.image} className="object-cover" />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-ink">{r.name}</p>
                      <p className="truncate text-xs text-zinc-400">{r.neighborhood || "Barcelona"}</p>
                    </div>
                    {rRating && (
                      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-ink">
                        <Icon name="star" className="h-3.5 w-3.5 text-warn" /> {Number(rRating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* BARRA FIJA EN MÓVIL — pegada abajo; la barra de navegación flotante pasa por encima un
          momento al tocar y se esconde sola */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {ticketUrl ? (
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} flex-1 py-3`}>
              <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.tickets")}
            </a>
          ) : directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} flex-1 py-3`}>
              <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
            </a>
          ) : null}
          {ticketUrl && directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={iconBtn} aria-label={t("clubPage.directions")}>
              <Icon name="map" className="h-5 w-5" />
            </a>
          )}
          <FavoriteButton itemType="club" itemId={club.id} variant="icon" />
          <button onClick={shareClub} className={iconBtn} aria-label={t("clubPage.share")}>
            <Icon name="share" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </main>
  )
}
