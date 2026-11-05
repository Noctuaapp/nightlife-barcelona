"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "../ui/SafeImage" // <Image> que nunca deja una foto rota
import HeroImage from "../ui/HeroImage"
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
import ClubReviews, { googleMapsReviewsUrl } from "./club/ClubReviews"
import VenueReviews from "./club/VenueReviews"
import JoinNoctuaCard from "./JoinNoctuaCard"
import WelcomeChallenge from "./WelcomeChallenge"
import NextStepsRow from "./NextStepsRow"
import ClubTile from "./ClubTile"
import { ClubsNudgeRow } from "./ClubsNudge"
import SocialLinks, { socialUrl } from "./club/SocialLinks"
import ClubFeatures, { activeFeatureCount } from "./club/ClubFeatures"
import Stars from "./club/Stars"
import Icon from "../ui/Icon"
import { toast } from "../ui/Toast"
import { supabase } from "../../lib/supabase"
import { InlineEditText, InlineEditImage } from "../admin/InlineEdit"
import { useCanEdit } from "../admin/EditAccess"
import { FALLBACK_IMAGE as FALLBACK_CLUB_IMAGE } from "../../lib/fallbackImage"
import { areaHref } from "../../lib/zonePages"
import { clubOpensOn, madridClock } from "../../lib/clubHours"
import { effectiveOpenNow, isClosedTonight } from "../../lib/scheduleNotices"
import ClubNotices from "./club/ClubNotices"
import { toDateLocale } from "../../lib/dateLocale"
import { clubSummary } from "../../lib/clubSummary"
import { safeUrl } from "../../lib/safeUrl"
import { factCellClass, factsGridClass } from "../../lib/factsGrid"

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

type Tab = "about" | "nights" | "sessions" | "reviews"

const LIVE_STATUS_MAX_AGE_MS = 4 * 60 * 60 * 1000
const CHECKINS_MIN_FOR_LIVE = 3
const CHECKINS_FOR_FULL = 10

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-card border border-white/10 bg-surface p-4 sm:p-7 ${className}`}>{children}</div>
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-semibold text-ink sm:mb-5 sm:text-lg">{children}</h2>
}

export default function ClubPageContent({ club, clubEvents, clubSessions = [], initialRelated }: { club: any; clubEvents: any[]; clubSessions?: any[]; initialRelated?: any[] }) {
  const { t, locale } = useLanguage()
  const isAdmin = useCanEdit() // admin, o el dueño de esta ficha (ver admin/EditAccess)
  const [activeTab, setActiveTab] = useState<Tab>("about")
  // ?tab=reviews (enlaces de los avisos del admin, "ver opiniones"...) abre directamente esa pestaña.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("tab")
    if (wanted === "reviews") setActiveTab(wanted)
  }, [])
  // Vienen ya del servidor (enlaces en el HTML para Google); si no, se piden aquí como antes.
  const [related, setRelated] = useState<any[]>(() => (initialRelated || []).slice(0, 3))
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [liveCheckins, setLiveCheckins] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  type LiveNote = { id: number; note: string; note_created_at: string; upvotes: number; downvotes: number; myVote: 1 | -1 | 0; reported: boolean }
  const [liveNotes, setLiveNotes] = useState<LiveNote[]>([])
  // Si hay muchas notas se puede ocultar el bloque entero (lo pidió Jordi): se recuerda por club
  // mientras dure la pestaña, no hace falta que sea permanente entre visitas.
  const [notesHidden, setNotesHidden] = useState(false)
  // La hora depende del momento en que se mira: se calcula tras montar para que el HTML del
  // servidor y el del navegador coincidan.
  const [openNow, setOpenNow] = useState<boolean | null>(null)
  const [now, setNow] = useState<number | null>(null)

  // Solo enlaces de venta de entradas. Antes caía a la web oficial y "Comprar entradas" salía en
  // locales que no venden nada.
  const ticketUrl: string | null = safeUrl(club.tickets_url || club.ticket_url || club.entradas_url)
  const website: string | null = socialUrl("website", club.website)
  const instagram: string | null = club.instagram || club.instagram_url || null
  const displayRating: number | null = club.google_rating || club.rating || null
  const reviewCount: number | null = club.google_review_count || club.review_count || club.reviews_count || null
  const capacity = club.capacity || club.aforo || null
  const minAge = club.min_age || club.edad_minima || club.age_min || null
  const hasCoords = !!club.latitude && !!club.longitude

  const trackClick = (eventType: string) => track(eventType, { itemType: "club", itemId: club.id, itemName: club.name })

  // false solo cuando se sabe con certeza que el club no abre esta noche (por open_days o por los
  // días de su horario) — null (sin datos para saberlo) no bloquea nada, igual que en el resto de
  // sitios donde se usa clubOpensOn.
  // «Cerrado temporalmente» (30/10/2026): la ficha sigue visible, pero nunca sale como abierta.
  const tempClosed = club.temporarily_closed === true
  // «Hoy cerramos» (aviso del dueño, supabase/60) también cuenta como que esta noche no abre.
  const opensTonight = !tempClosed && !isClosedTonight(club.schedule_notices) && clubOpensOn(club.hours, club.open_days, madridClock().dow) !== false

  useEffect(() => {
    const calc = () => (tempClosed ? false : effectiveOpenNow(club))
    setOpenNow(calc())
    setNow(Date.now())
    const id = setInterval(() => {
      setOpenNow(calc())
      setNow(Date.now())
    }, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.hours, club.open_days, club.schedule_notices, tempClosed])

  useEffect(() => {
    trackClick("page_view")

    // Parecidos: mismo barrio y mismo estilo, con buena nota (antes, 3 al azar de la tabla).
    const loadRelated = async () => {
      const fields = "id, name, slug, image, neighborhood, music, rating, google_rating, temporarily_closed"
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
      const best = [...data].filter((r: any) => r.temporarily_closed !== true).sort((a, b) => score(b) - score(a)).slice(0, 6)
      setRelated(best.sort(() => Math.random() - 0.5).slice(0, 3))
    }

    // Notas de check-in de las últimas 6 h: lo único realmente "en directo" de la ficha.
    // Se consulta club_checkins directamente (no la vista club_live_notes) porque aquí sí
    // necesitamos el id de cada check-in para poder votar y denunciar su nota.
    const loadLiveNotes = async (uid: string | null) => {
      const { data } = await supabase
        .from("club_checkins")
        .select("id, note, note_created_at")
        .eq("club_id", club.id)
        .not("note", "is", null)
        .order("note_created_at", { ascending: false })
        .limit(8)
      if (!data) return
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000
      const fresh = data.filter((n) => n.note_created_at && new Date(n.note_created_at).getTime() > sixHoursAgo)
      setLiveNotes(fresh.map((n) => ({ ...n, upvotes: 0, downvotes: 0, myVote: 0, reported: false })))

      // Votos y denuncias ya hechas: aparte y en try/catch porque las tablas
      // club_checkin_votes/club_checkin_reports aún no existen (SQL pendiente de ejecutar) — si
      // fallan, las notas se ven igual, solo sin los contadores todavía.
      if (!fresh.length) return
      try {
        const ids = fresh.map((n) => n.id)
        const { data: votes } = await supabase.from("club_checkin_votes").select("checkin_id, user_id, vote").in("checkin_id", ids)
        const { data: myReports } = uid
          ? await supabase.from("club_checkin_reports").select("checkin_id").eq("reporter_id", uid).in("checkin_id", ids)
          : { data: null }
        setLiveNotes((prev) =>
          prev.map((n) => {
            const forNote = (votes || []).filter((v) => v.checkin_id === n.id)
            const mine = uid ? forNote.find((v) => v.user_id === uid) : undefined
            return {
              ...n,
              upvotes: forNote.filter((v) => v.vote === 1).length,
              downvotes: forNote.filter((v) => v.vote === -1).length,
              myVote: mine ? mine.vote : 0,
              reported: !!myReports?.some((r) => r.checkin_id === n.id),
            }
          })
        )
      } catch {}
    }

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      const uid = data.user?.id ?? null
      setUserId(uid)
      return uid
    }

    supabase.rpc("club_live_checkins", { p_club_id: club.id }).then(({ data }) => {
      if (typeof data === "number") setLiveCheckins(data)
    })
    if (!initialRelated) loadRelated()
    loadUser().then(loadLiveNotes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club.id])

  const handleNoteVote = async (noteId: number, vote: 1 | -1) => {
    if (!userId) {
      toast(t("clubPage.loginToVote"))
      return
    }
    const target = liveNotes.find((n) => n.id === noteId)
    if (!target) return
    const newVote = target.myVote === vote ? 0 : vote
    // Optimista: se actualiza ya en pantalla y se intenta guardar después.
    setLiveNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n
        let upvotes = n.upvotes
        let downvotes = n.downvotes
        if (n.myVote === 1) upvotes--
        if (n.myVote === -1) downvotes--
        if (newVote === 1) upvotes++
        if (newVote === -1) downvotes++
        return { ...n, upvotes, downvotes, myVote: newVote }
      })
    )
    try {
      if (newVote === 0) {
        await supabase.from("club_checkin_votes").delete().eq("checkin_id", noteId).eq("user_id", userId)
      } else {
        await supabase.from("club_checkin_votes").upsert({ checkin_id: noteId, user_id: userId, vote: newVote }, { onConflict: "checkin_id,user_id" })
      }
    } catch {
      // Sin la tabla todavía (SQL pendiente) el voto se queda solo en pantalla hasta recargar.
    }
  }

  const handleNoteReport = async (noteId: number) => {
    if (!userId) {
      toast(t("clubPage.loginToVote"))
      return
    }
    if (!window.confirm(t("clubPage.noteReportConfirm"))) return
    setLiveNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, reported: true } : n)))
    try {
      await supabase.from("club_checkin_reports").insert({ checkin_id: noteId, reporter_id: userId })
    } catch {}
    toast(t("clubPage.noteReported"))
  }

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

  // Características: ver club/ClubFeatures (incluye el futbolín/billar, que antes no salía, y los
  // interruptores para editarlas desde aquí si eres admin).
  const featureCount = activeFeatureCount(club, capacity)

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
    minAge && { key: "age", field: "age_min", icon: "id", label: t("clubPage.minAge"), value: String(minAge) },
  ].filter(Boolean) as { key: string; field: string | null; icon: string; label: string; value: string }[]

  const galleryImages: string[] = (
    Array.isArray(club.gallery) ? club.gallery : Array.isArray(club.images) ? club.images : [club.image_2, club.image_3, club.image_4]
  ).filter((src: unknown): src is string => typeof src === "string" && src.length > 0)
  const allImages = [club.image, ...galleryImages].filter(Boolean) as string[]

  const tabs: { key: Tab; label: string }[] = [
    { key: "about", label: t("clubPage.tabAbout") },
    ...(hasSessions ? [{ key: "sessions" as Tab, label: t("clubPage.tabSessions") }] : []),
    ...(hasNights ? [{ key: "nights" as Tab, label: t("clubPage.tabNights") }] : []),
    // Opiniones (25/10/2026): las de Noctua y, debajo, las de Google (antes al final de la página).
    { key: "reviews", label: t("clubPage.tabReviews") },
  ]

  // Qué pestañas abre la gente (26/10/2026): se ve en Admin › Visitas, en el recorrido de cada visita.
  const openTab = (tab: Tab) => {
    setActiveTab(tab)
    if (tab !== activeTab) track("tab_open", { itemType: "club", itemId: club.id, itemName: club.name, meta: { tab } })
  }

  const goToTab = (tab: Tab) => {
    openTab(tab)
    document.getElementById("club-content")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // «Sobre»: en el móvil, 4 líneas y «Leer más» si hay bastante texto; el texto entero sigue en el HTML.
  const summary = clubSummary(club)
  const descText = String(club.description || "").trim()
  const hasSecondary = !!club.description && descText.length < 280
  const canCollapse = !isAdmin && ((club.description ? descText.length : summary.length) > 200 || hasSecondary)

  // Botones de acción (04/11/2026, ver .act en globals.css): una acción principal blanca (Entradas o, si no
  // hay, Cómo llegar) y el resto secundarios con el icono en el color de su función. Antes eran un
  // recuadro oscuro (o violeta) que se camuflaba con la tarjeta.
  const secondaryBtn =
    "act flex items-center justify-center gap-2 rounded-ctl px-5 py-3.5 text-sm font-semibold"
  // Botón cuadrado solo con icono. Antes se hacía con secondaryBtn + "px-0", pero el px-5 de
  // secondaryBtn ganaba y el icono se quedaba en 2 px de ancho: en el móvil se veía un punto.
  const iconBtn =
    "act act-solo flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl"
  const primaryBtn =
    "act act-primary flex items-center justify-center gap-2 rounded-ctl px-6 py-3.5 text-sm font-semibold"
  const ticketsTone = "act-tickets"
  const routeTone = "act-route"

  return (
    <main className="relative min-h-screen bg-night pb-28 text-ink lg:pb-16">
      {/* PORTADA (03/11/2026): más baja, con el nombre, la valoración y si está abierto encima de la foto.
          Antes el título quedaba debajo, en otro bloque, y entre la foto y los datos había 700 px. */}
      <section className="relative">
        <div className={`relative h-[40vh] max-h-[500px] min-h-[280px] w-full overflow-hidden lg:h-[46vh] ${tempClosed ? "[&_img]:opacity-60 [&_img]:grayscale" : ""}`}>
          <HeroImage src={club.image} alt={club.name} fallback={FALLBACK_CLUB_IMAGE} />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night from-[3%] via-night/60 via-45% to-night/10" />
          {/* Cerrado temporalmente (30/10/2026): banda ámbar sobre la foto, a primera vista (no es un popup). */}
          {tempClosed && (
            <div className="absolute inset-x-0 top-0 flex items-center justify-center gap-2 bg-warn px-4 py-2.5 text-center text-sm font-bold text-night" role="status">
              <Icon name="hourglass" className="h-4 w-4 shrink-0" />
              {t("clubPage.tempClosed")}
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 pb-5 sm:pb-7">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              {(club.trending || club.sold_out || club.verified) && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {club.verified && (
                    <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-2.5 py-1 text-[11px] font-semibold text-ink">
                      <Icon name="check" className="h-3 w-3 text-brand-soft" /> {t("clubPage.verified")}
                    </span>
                  )}
                  {club.trending && (
                    <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-night/70 px-2.5 py-1 text-[11px] font-semibold text-ink">
                      <Icon name="flame" className="h-3 w-3 text-warn" /> {t("club.trending")}
                    </span>
                  )}
                  {club.sold_out && (
                    <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 bg-red-400/15 px-2.5 py-1 text-[11px] font-semibold text-red-200">
                      <Icon name="ban" className="h-3 w-3" /> {t("club.sold_out")}
                    </span>
                  )}
                </div>
              )}

              <p className="text-[13px] font-semibold text-brand-soft empty:hidden sm:text-sm">
                <InlineEditText table="clubs" id={club.id} field="music" value={club.music} emptyLabel="añadir estilo musical" />
              </p>
              <h1 className="font-display mt-0.5 break-words text-[2rem] leading-[1.04] text-ink [text-shadow:0_2px_24px_rgba(0,0,0,0.55)] sm:text-5xl lg:text-6xl">
                <InlineEditText table="clubs" id={club.id} field="name" value={club.name} />
              </h1>

              <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] sm:text-sm">
                <span className="flex items-center gap-1.5 text-zinc-200">
                  <Icon name="map" className="h-4 w-4 text-zinc-400" />
                  {club.neighborhood ? (
                    <Link href={areaHref(club.neighborhood)} className="underline decoration-white/25 underline-offset-4 transition hover:text-ink hover:decoration-white">
                      {club.neighborhood}
                    </Link>
                  ) : (
                    "Barcelona"
                  )}
                </span>
                {displayRating && (
                  <button type="button" onClick={() => goToTab("reviews")} className="flex items-center gap-1.5 text-zinc-200 hover:underline">
                    <Stars rating={displayRating} />
                    <span className="font-semibold text-ink">{Number(displayRating).toFixed(1)}</span>
                    {reviewCount ? <span className="text-zinc-400">({reviewCount.toLocaleString("es-ES")})</span> : null}
                  </button>
                )}
                {tempClosed ? null : openNow !== null && (
                  <span className={`flex items-center gap-1.5 font-semibold ${openNow ? "text-open" : "text-zinc-300"}`}>
                    <span className={`h-2 w-2 rounded-full ${openNow ? "live-dot bg-open" : "bg-off"}`} />
                    {openNow ? t("clubPage.openNow") : t("clubPage.closedNow")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <InlineEditImage table="clubs" id={club.id} field="image" bucket="club-images" label="Cambiar foto" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {tempClosed && (
          <div className="mt-4 flex max-w-2xl items-start gap-3 rounded-card border border-warn/50 bg-warn/[0.14] px-4 py-3" role="note">
            <Icon name="hourglass" className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <div>
              <p className="text-base font-bold text-warn">{t("clubPage.tempClosed")}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-100">{t("clubPage.tempClosedNote")}</p>
            </div>
          </div>
        )}
        {/* Avisos del dueño: «hoy cerramos», horario especial, próximos cierres (supabase/60). */}
        {!tempClosed && <ClubNotices notices={club.schedule_notices} />}
      </div>

      {/* DATOS PRÁCTICOS */}
      {quickFacts.length > 0 && (
        <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
          <dl className={factsGridClass(quickFacts.length)}>
            {quickFacts.map((f, i) => (
              <div key={f.key} className={`flex items-start gap-2.5 bg-surface p-3 sm:gap-3 sm:p-4 ${factCellClass(i, quickFacts.length)}`}>
                <Icon name={f.icon} className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-zinc-400 sm:text-xs">{f.label}</dt>
                  <dd className="mt-0.5 break-words text-[13px] font-semibold leading-snug text-ink sm:text-sm">
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

      {/* ESTA NOCHE (solo con datos reales: el local o check-ins de las últimas horas) y PRÓXIMA NOCHE */}
      {(vibe || liveNotes.length > 0 || nextEvent) && (
        <section className="mx-auto mt-3 max-w-6xl space-y-3 px-4 sm:px-6">
          {(vibe || liveNotes.length > 0) && (
            <div className="rounded-card border border-open/25 bg-open/[0.06] p-4 sm:p-5">
              {vibe && (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="live-dot h-2 w-2 rounded-full bg-open" />
                  <span className="font-semibold text-ink">{vibe}</span>
                  {liveDetail && <span className="text-zinc-300">· {liveDetail}</span>}
                </p>
              )}
              {liveNotes.length > 0 && !notesHidden && (
                <div className={vibe ? "mt-3" : ""}>
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => setNotesHidden(true)}
                      aria-label={t("clubPage.notesHide")}
                      className="-m-1.5 rounded-full p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-ink"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                  <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${liveNotes.length > 4 ? "max-h-[420px] overflow-y-auto pr-1" : ""}`}>
                    {liveNotes.map((n) => {
                      const mins = Math.max(0, Math.round((Date.now() - new Date(n.note_created_at).getTime()) / 60000))
                      const ago = mins < 1 ? t("clubPage.justNow") : mins < 60 ? t("clubPage.minAgo").replace("{n}", String(mins)) : t("clubPage.hoursAgo").replace("{n}", String(Math.round(mins / 60)))
                      return (
                        <blockquote key={n.id} className="rounded-ctl border border-white/10 bg-night/40 p-4">
                          <p className="text-sm leading-relaxed text-ink">“{n.note}”</p>
                          <footer className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-zinc-400">
                              {t("clubPage.noteFromDoor")} · {ago}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleNoteVote(n.id, 1)}
                                aria-label={t("clubPage.noteUpvote")}
                                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                                  n.myVote === 1 ? "border-open/50 bg-open/15 text-open" : "border-white/10 text-zinc-400 hover:text-ink"
                                }`}
                              >
                                <Icon name="thumbsUp" className="h-3.5 w-3.5" />
                                {n.upvotes > 0 && n.upvotes}
                              </button>
                              <button
                                onClick={() => handleNoteVote(n.id, -1)}
                                aria-label={t("clubPage.noteDownvote")}
                                className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                                  n.myVote === -1 ? "border-red-500/50 bg-red-500/15 text-red-400" : "border-white/10 text-zinc-400 hover:text-ink"
                                }`}
                              >
                                <Icon name="thumbsDown" className="h-3.5 w-3.5" />
                                {n.downvotes > 0 && n.downvotes}
                              </button>
                              {n.reported ? (
                                <span className="text-[11px] text-zinc-500">{t("clubPage.noteReportedShort")}</span>
                              ) : (
                                <button
                                  onClick={() => handleNoteReport(n.id)}
                                  aria-label={t("clubPage.noteReport")}
                                  className="rounded-full border border-white/10 p-1.5 text-zinc-500 transition hover:border-red-500/40 hover:text-red-400"
                                >
                                  <Icon name="flag" className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </span>
                          </footer>
                        </blockquote>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {nextEvent && (
            <button
              onClick={() => goToTab("nights")}
              className="flex w-full items-center justify-between gap-4 rounded-card border border-white/10 bg-surface p-3.5 text-left transition hover:border-white/20 sm:p-4"
            >
              <span className="min-w-0">
                <span className="block text-[11px] text-zinc-400 sm:text-xs">{t("clubPage.nextNight")}</span>
                <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">{nextEvent.name || nextEvent.title || club.name}</span>
                {nextEventDate && <span className="block text-[13px] text-zinc-300">{nextEventDate}</span>}
              </span>
              <Icon name="arrow" className="h-5 w-5 shrink-0 text-muted" />
            </button>
          )}
        </section>
      )}

      <section id="club-content" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-4 sm:px-6 lg:pt-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
          {/* ACCIONES — en el móvil «contents» las reparte en la misma rejilla que el contenido: guardar,
              asistiré y check-in van justo bajo los datos (antes, al final de la página) y el resto
              (¿no te dejan entrar?, redes, avisar de un error) después del contenido. En escritorio
              forman la columna fija de la derecha. Los botones se montan una sola vez. */}
          <div className="contents lg:col-start-3 lg:row-start-1 lg:block lg:space-y-4 lg:self-start lg:sticky lg:top-24">
            <div className="order-1 rounded-card border border-white/10 bg-surface p-3 sm:p-4">
              {(ticketUrl || directionsUrl) && (
                <div className="mb-3 hidden space-y-2 lg:block">
                  {ticketUrl ? (
                    <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} ${ticketsTone} w-full`}>
                      <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.ticketsAdvance")}
                    </a>
                  ) : (
                    <a href={directionsUrl!} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} ${routeTone} w-full`}>
                      <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
                    </a>
                  )}
                  <div className={`grid gap-2 ${ticketUrl && directionsUrl ? "grid-cols-2" : "grid-cols-1"}`}>
                    {ticketUrl && directionsUrl && (
                      <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${secondaryBtn} ${routeTone} !px-3 !py-3`}>
                        <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
                      </a>
                    )}
                    <button type="button" onClick={shareClub} className={`${secondaryBtn} act-share !px-3 !py-3`}>
                      <Icon name="share" className="h-4 w-4" /> {t("clubPage.share")}
                    </button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                <FavoriteButton itemType="club" itemId={club.id} variant="tile" />
                <AttendanceButton itemType="club" itemId={club.id} title={club.name} variant="tile" disabled={!opensTonight} />
                <CheckInButton clubId={club.id} latitude={club.latitude} longitude={club.longitude} variant="tile" />
              </div>
            </div>

            <div className="order-3 rounded-card border border-white/10 bg-surface p-4">
              <NearbyVenuesSheet
                compact
                excludeClubId={club.id}
                venueType="club"
                venueId={club.id}
                name={club.name}
                latitude={club.latitude}
                longitude={club.longitude}
              />
              <SocialLinks
                table="clubs"
                id={club.id}
                instagram={instagram}
                tiktok={club.tiktok}
                website={club.website}
                showWebsite
                onClick={(k) => trackClick(k)}
                className="mt-4"
              />
              <a
                href={"/contact?type=report_issue&subject=" + encodeURIComponent("Reporte: " + club.name)}
                className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-zinc-400 transition hover:text-ink"
              >
                <Icon name="flag" className="h-3.5 w-3.5" /> {t("clubPage.report")}
              </a>
            </div>

            {hasCoords && (
              <a
                href={directionsUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick("directions_click")}
                className="group hidden w-full overflow-hidden rounded-card border border-white/10 bg-surface text-left lg:block"
              >
                <div className="pointer-events-none h-40">
                  <ClubMap latitude={club.latitude} longitude={club.longitude} name={club.name} />
                </div>
                <span className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-ink">
                  {t("clubPage.mapAndTransport")} <Icon name="arrow" className="h-4 w-4 text-muted" />
                </span>
              </a>
            )}
          </div>

          {/* COLUMNA PRINCIPAL */}
          <div className="order-2 flex min-w-0 flex-col gap-4 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:gap-6">
            {/* FOTOS: tira de miniaturas (ver ClubGallery «dense»). Sin fotos extra no se pinta nada. */}
            <div className="-mx-4 sm:-mx-6 [&>section]:mt-0">
              <ClubGallery
                compact
                dense
                images={allImages}
                name={club.name}
                edit={{ table: "clubs", id: club.id, bucket: "club-photos", gallery: Array.isArray(club.gallery) ? club.gallery : [] }}
              />
            </div>

            {/* REGISTRO: solo lo ve quien no tiene sesión (ver JoinNoctuaCard). En su mismo hueco, quien
                acaba de crear la cuenta ve el primer reto (ver WelcomeChallenge). */}
            <div className="-mx-4 sm:-mx-6 [&>section]:mt-0 empty:hidden">
              <JoinNoctuaCard kind="club" itemId={club.id} name={club.name} />
              <WelcomeChallenge />
            </div>

            {/* Sin descripción escrita: un resumen con los datos reales del local (ver lib/clubSummary),
                para que la ficha tenga texto propio en el HTML que lee Google. Está en español,
                el idioma del sitio para Google; el admin sigue viendo el campo para escribir una.
                En el móvil se enseñan unas líneas y «Leer más» (el texto entero sigue en el HTML). */}
            <Panel>
              <PanelTitle>{t("clubPage.about").replace("{name}", club.name)}</PanelTitle>
              <p className={`text-[15px] leading-relaxed text-zinc-200 sm:text-base ${canCollapse && !aboutOpen ? "line-clamp-4 lg:line-clamp-none" : ""}`}>
                {club.description || isAdmin ? (
                  <InlineEditText table="clubs" id={club.id} field="description" value={club.description} multiline emptyLabel="añadir descripción" />
                ) : (
                  summary
                )}
              </p>
              {!club.description && isAdmin && (
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">Sin descripción, el público ve: {summary}</p>
              )}
              {/* Descripción de una sola frase (29/10/2026): Google la veía igual que la meta descripción y
                  la ficha quedaba con muy poco texto propio. Se completa con los datos reales del local
                  (horario, precio, edad, cómo llegar). Una descripción larga ya se basta sola. */}
              {hasSecondary && (
                <p className={`mt-3 text-sm leading-relaxed text-zinc-400 ${canCollapse && !aboutOpen ? "hidden lg:block" : ""}`}>{summary}</p>
              )}
              {canCollapse && (
                <button
                  type="button"
                  onClick={() => setAboutOpen((v) => !v)}
                  aria-expanded={aboutOpen}
                  className="mt-2 text-sm font-semibold text-brand-soft hover:underline lg:hidden"
                >
                  {aboutOpen ? t("clubPage.readLess") : t("clubPage.readMore")}
                </button>
              )}
            </Panel>

            <div role="tablist" className="scrollbar-none sticky top-[72px] z-20 sm:top-20 -mx-4 flex gap-2 overflow-x-auto bg-night/95 px-4 py-2.5 backdrop-blur sm:mx-0 sm:px-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => openTab(tab.key)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition sm:px-5 sm:py-2.5 sm:text-sm ${
                    activeTab === tab.key ? "bg-ink text-night" : "border border-transparent bg-[#23202d] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:bg-[#2c2937]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "about" && (
              <div className="flex flex-col gap-4 lg:gap-6">
                {/* «Antes de ir» (club/ClubInsider) ya no sale en la ficha (03/11/2026: «lo quitamos»). El
                    componente, las columnas de supabase/52 y lib/clubInsider.ts siguen en el proyecto por si
                    se recupera: basta con volver a poner <ClubInsider club={club} /> aquí. */}
                {(featureCount > 0 || isAdmin) && (
                  <Panel>
                    <PanelTitle>{t("clubPage.features")}</PanelTitle>
                    <ClubFeatures club={club} capacity={capacity} isAdmin={isAdmin} />
                  </Panel>
                )}

                {/* Normas swinger: solo si el club está marcado como tal Y tiene texto puesto desde
                    /admin (campo swinger_rules). Si está marcado pero sin normas escritas, no se
                    enseña ningún bloque vacío. */}
                {!!club.swinger_friendly && !!club.swinger_rules && (
                  <Panel className="border-brand/30 bg-brand/[0.05]">
                    <div className="flex items-center gap-3">
                      <Icon name="shield" className="h-5 w-5 shrink-0 text-brand-soft" />
                      <PanelTitle>{t("clubPage.swingerRulesTitle")}</PanelTitle>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">{club.swinger_rules}</p>
                  </Panel>
                )}

                <Panel>
                  <PanelTitle>{t("clubPage.getThereBack")}</PanelTitle>
                  <ClubTransport club={club} />
                </Panel>

                {hasCoords && (
                  <Panel>
                    <NearbyEssentials latitude={Number(club.latitude)} longitude={Number(club.longitude)} />
                  </Panel>
                )}

                {faqs.length > 0 && (
                  <Panel>
                    <PanelTitle>{t("clubPage.faq")}</PanelTitle>
                    <div className="divide-y divide-white/10">
                      {faqs.map((f, i) => (
                        <div key={i} className="py-3">
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
                        <InlineEditImage table="club_sessions" id={session.id} field="image" bucket="club-images" label="Cambiar" variant="thumb" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {(session.day_of_week || isAdmin) && (
                          <span className="inline-block rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand-soft">
                            <InlineEditText table="club_sessions" id={session.id} field="day_of_week" value={session.day_of_week} placeholder="Viernes" emptyLabel="día" />
                          </span>
                        )}
                        <h3 className="mt-2 text-lg font-semibold text-ink">
                          <InlineEditText table="club_sessions" id={session.id} field="name" value={session.name} />
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-300">
                          {(session.music || isAdmin) && (
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              <InlineEditText table="club_sessions" id={session.id} field="music" value={session.music} emptyLabel="música" />
                            </span>
                          )}
                          {(session.price || isAdmin) && (
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              <InlineEditText table="club_sessions" id={session.id} field="price" value={session.price} emptyLabel="precio" />
                            </span>
                          )}
                          {(session.dresscode || isAdmin) && (
                            <span className="rounded-full border border-white/10 px-3 py-1">
                              {t("clubPage.fDresscode")}: <InlineEditText table="club_sessions" id={session.id} field="dresscode" value={session.dresscode} emptyLabel="vestimenta" />
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

            {activeTab === "reviews" && (
              <Panel className="space-y-10">
                <VenueReviews venueType="club" venueId={club.id} isOwner={!!userId && club.owner_user_id === userId} />
                <div className="border-t border-white/10 pt-8">
                  <ClubReviews
                    clubId={club.id}
                    rating={displayRating}
                    count={reviewCount}
                    embedded
                    mapsUrl={googleMapsReviewsUrl(club.name, club.address, club.google_place_id)}
                  />
                </div>
              </Panel>
            )}
          </div>
        </div>
      </section>

      {/* SIGUE EXPLORANDO (03/11/2026): lo que pasa después de leer la ficha. Locales parecidos con la
          misma tarjeta que el listado, lo que hay cerca, más del barrio y del estilo, y los accesos al
          mapa y a los esenciales. Cada toque se anota (related_click, nearby_click, next_click). */}
      {related.length > 0 && (
        <section className="mx-auto mt-10 max-w-6xl px-4 sm:px-6" aria-label={t("clubPage.related")}>
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold text-ink sm:text-lg">{t("clubPage.related")}</h2>
            <Link
              href="/clubs"
              onClick={() => track("related_click", { itemType: "club", itemId: club.id, itemName: club.name, meta: { to: "all" } })}
              className="shrink-0 text-xs font-semibold text-brand-soft hover:underline"
            >
              {t("home.seeAll")}
            </Link>
          </div>
          <ul className="scrollbar-none -mx-4 flex scroll-pl-4 snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0">
            {related.map((r) => (
              <li
                key={r.id}
                className="w-[44vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none"
                onClickCapture={() => track("related_click", { itemType: "club", itemId: club.id, itemName: club.name, meta: { to: r.name } })}
              >
                <ClubTile
                  name={r.name}
                  slug={r.slug}
                  music={r.music}
                  area={r.neighborhood}
                  image={r.image}
                  rating={r.google_rating || r.rating || null}
                  temporarilyClosed={r.temporarily_closed === true}
                />
              </li>
            ))}
            <li className="w-[44vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <Link
                href="/clubs"
                onClick={() => track("related_click", { itemType: "club", itemId: club.id, itemName: club.name, meta: { to: "all" } })}
                className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-card border border-white/10 bg-surface p-4 text-center transition hover:border-white/25 md:aspect-square"
              >
                {/* 05/11/2026: la flecha va solo en el círculo (antes el texto traía otra «→» y salían dos) y sin tinte morado. */}
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0a0910]">
                  <Icon name="arrow" className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold leading-snug text-ink">{t("clubs.explore")}</span>
              </Link>
            </li>
          </ul>
        </section>
      )}

      <NextStepsRow kind="club" itemId={club.id} name={club.name} neighborhood={club.neighborhood} music={club.music} />

      <ClubsNudgeRow source="club_page" kinds={["map", "essentials"]} className="mt-6 max-w-6xl px-4 sm:px-6" />

      {/* BARRA FIJA EN MÓVIL — pegada abajo; la barra de navegación flotante pasa por encima un
          momento al tocar y se esconde sola */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {ticketUrl ? (
            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("tickets_click")} className={`${primaryBtn} ${ticketsTone} flex-1 whitespace-nowrap !px-3 py-3`}>
              <Icon name="ticket" className="h-4 w-4" /> {t("clubPage.ticketsAdvance")}
            </a>
          ) : directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackClick("directions_click")} className={`${primaryBtn} ${routeTone} flex-1 py-3`}>
              <Icon name="map" className="h-4 w-4" /> {t("clubPage.directions")}
            </a>
          ) : null}
          {ticketUrl && directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className={`${iconBtn} ${routeTone}`} aria-label={t("clubPage.directions")}>
              <Icon name="map" className="h-5 w-5" />
            </a>
          )}
          <FavoriteButton itemType="club" itemId={club.id} variant="icon" />
          <button onClick={shareClub} className={`${iconBtn} act-share`} aria-label={t("clubPage.share")}>
            <Icon name="share" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </main>
  )
}
