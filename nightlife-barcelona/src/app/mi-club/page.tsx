"use client"

import { useState, useEffect, useMemo, type ChangeEvent, type ReactNode } from "react"
import Link from "next/link"

import { Upload, X, Pencil, Trash2, Check, ExternalLink, Copy, BadgeCheck, TrendingUp, Lock, Files } from "lucide-react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import OwnerStats from "../../components/owner/OwnerStats"
import OwnerInbox from "../../components/owner/OwnerInbox"
import OwnerNotices from "../../components/owner/OwnerNotices"
import { EXTRA_FEATURES, CLOSED_FIELD, extrasFromRow } from "../../lib/extraFeatures"
import { useLanguage } from "../../context/LanguageContext"
import { toast } from "../../components/ui/Toast"
import { createSlug } from "../../lib/slug"
import { madridToday } from "../../lib/madridDay"
import { addDays } from "../../lib/scheduleNotices"
import { touchCache, clubPaths, clubEventPaths } from "../../lib/touchCache"

// Portal para que un club verificado edite su propia ficha sin pasar por Jordi. Un club queda
// "vinculado" cuando su fila en `clubs` tiene `owner_user_id` = el id de un usuario de Supabase
// Auth (Jordi lo vincula a mano desde Admin › Usuarios). Reutiliza los mismos campos que /admin,
// con las excepciones que decide solo Noctua (la base de datos las protege aunque alguien las
// mandara a mano, supabase/35 y 37): verificado, tendencia, valoración, destacado, ocultar o
// publicar, enlace de la ficha y el punto exacto del mapa.
//
// Rediseño del 30/10/2026: antes era un formulario largo sin secciones. Ahora:
//   - Menú de secciones pegado arriba (Resumen · Ficha · Fotos · Etiquetas · Noches · Mensajes).
//   - Resumen: estado de la ficha, "tu ficha está al X%" con lo que falta, estado en directo y
//     estadísticas.
//   - Ficha en tarjetas (datos básicos, descripción y redes, cómo llegar, ofertas) — ahora también
//     se pueden editar aquí la descripción, Instagram, TikTok y la web, que antes solo se tocaban
//     sobre la ficha pública.
//   - Etiquetas agrupadas igual que en el admin.
//   - Barra de guardado que avisa de los cambios sin guardar (y de si se intenta salir sin guardar).
//   - "Lo gestiona Noctua" + buzón de mensajes con Noctua (supabase/59).
type Club = {
  id: number
  name: string
  neighborhood: string
  address?: string
  music: string
  price?: string
  hours?: string
  image?: string
  rating?: number
  people?: string
  dresscode?: string
  terrace?: boolean
  smoking_area?: boolean
  table_booking?: boolean
  hidden: boolean
  trending: boolean
  sold_out: boolean
  lgtbi_friendly: boolean
  verified?: boolean
  vip_tables?: boolean
  venue_type?: string
  open_days?: string[] | null
  metro_lines?: string
  night_buses?: string
  has_foosball?: boolean
  discount_info?: string
  free_entry_info?: string
  gallery?: string[] | null
  manual_photos?: boolean | null
  owner_user_id?: string | null
  live_status?: string | null
  live_status_updated_at?: string | null
  slug?: string | null
  description?: string | null
  instagram?: string | null
  tiktok?: string | null
  website?: string | null
  // Avisos de cierre / horarios especiales (supabase/60). Se guardan al instante desde su editor.
  schedule_notices?: unknown
}

// Estados en directo: la etiqueta sale de clubPage.vibeQuiet/vibeBusy/vibeFull (las mismas que ve
// el público en la ficha).
const LIVE_STATUS_OPTIONS = [
  { key: "tranquilo", label: "clubPage.vibeQuiet", dot: "bg-open" },
  { key: "animado", label: "clubPage.vibeBusy", dot: "bg-warn" },
  { key: "lleno", label: "clubPage.vibeFull", dot: "bg-red-400" },
] as const

// Valores guardados en la base de datos (no se traducen); las etiquetas sí.
const VENUE_TYPE_OPTIONS = [
  { value: "Discoteca", key: "planPage.venueClub" },
  { value: "Pub", key: "planPage.venuePub" },
  { value: "Bar musical", key: "planPage.venueMusicBar" },
  { value: "Coctelería", key: "planPage.venueCocktail" },
  { value: "Karaoke", key: "planPage.venueKaraoke" },
  { value: "Bar de billar", key: "planPage.venuePool" },
]
const DAY_OPTIONS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

// Secciones del menú de arriba (id del bloque de la página + clave del texto).
const SECTIONS = [
  { id: "resumen", label: "ownerPortal.navSummary" },
  { id: "avisos", label: "ownerPortal.navNotices" },
  { id: "ficha", label: "ownerPortal.navListing" },
  { id: "fotos", label: "ownerPortal.navPhotos" },
  { id: "etiquetas", label: "ownerPortal.navTags" },
  { id: "noches", label: "ownerPortal.navNights" },
  { id: "mensajes", label: "ownerPortal.navMessages" },
] as const

type ClubFormData = {
  name: string
  neighborhood: string
  address: string
  music: string
  price: string
  hours: string
  image: string
  rating: string
  people: string
  dresscode: string
  terrace: boolean
  smoking_area: boolean
  table_booking: boolean
  lgtbi_friendly: boolean
  verified: boolean
  vip_tables: boolean
  trending: boolean
  sold_out: boolean
  hidden: boolean
  venue_type: string
  open_days: string[]
  metro_lines: string
  night_buses: string
  has_foosball: boolean
  // Máquina de tabaco, dardos, karaoke... (lib/extraFeatures.ts)
  extras: Record<string, boolean>
  discount_info: string
  free_entry_info: string
  gallery: string[]
  description: string
  instagram: string
  tiktok: string
  website: string
}

const clubToForm = (club: Club): ClubFormData => ({
  name: club.name || "",
  neighborhood: club.neighborhood || "",
  address: club.address || "",
  music: club.music || "",
  price: club.price || "",
  hours: club.hours || "",
  image: club.image || "",
  rating: club.rating != null ? String(club.rating) : "",
  people: club.people || "",
  dresscode: club.dresscode || "",
  terrace: !!club.terrace,
  smoking_area: !!club.smoking_area,
  table_booking: !!club.table_booking,
  lgtbi_friendly: !!club.lgtbi_friendly,
  verified: !!club.verified,
  vip_tables: !!club.vip_tables,
  trending: !!club.trending,
  sold_out: !!club.sold_out,
  hidden: !!club.hidden,
  venue_type: club.venue_type || "Discoteca",
  open_days: club.open_days || [],
  metro_lines: club.metro_lines || "",
  night_buses: club.night_buses || "",
  has_foosball: !!club.has_foosball,
  extras: extrasFromRow(club as unknown as Record<string, unknown>),
  discount_info: club.discount_info || "",
  free_entry_info: club.free_entry_info || "",
  gallery: Array.isArray(club.gallery) ? club.gallery : [],
  description: club.description || "",
  instagram: club.instagram || "",
  tiktok: club.tiktok || "",
  website: club.website || "",
})

const formToPayload = (form: ClubFormData, row: Club) => ({
  name: form.name.trim(),
  neighborhood: form.neighborhood.trim(),
  address: form.address.trim(),
  music: form.music.trim(),
  price: form.price.trim(),
  hours: form.hours.trim(),
  image: form.image.trim(),
  people: form.people.trim(),
  dress_code: form.dresscode.trim(),
  terrace: form.terrace,
  smoking_area: form.smoking_area,
  table_booking: form.table_booking,
  lgtbi_friendly: form.lgtbi_friendly,
  // verified, trending y rating no se envían: los decide Noctua (y la base de datos los protege
  // con un trigger aunque alguien los mandara a mano).
  vip_tables: form.vip_tables,
  sold_out: form.sold_out,
  hidden: form.hidden,
  venue_type: form.venue_type,
  open_days: form.open_days.length ? form.open_days : null,
  metro_lines: form.metro_lines.trim(),
  night_buses: form.night_buses.trim(),
  has_foosball: form.has_foosball,
  ...form.extras,
  discount_info: form.discount_info.trim(),
  free_entry_info: form.free_entry_info.trim(),
  gallery: form.gallery.length > 0 ? form.gallery : null,
  manual_photos: form.gallery.length > 0,
  // Descripción y redes: solo si esas columnas existen en la fila (igual que las etiquetas
  // nuevas), para que un guardado nunca falle por una columna que falte.
  ...("description" in row ? { description: form.description.trim() || null } : {}),
  ...("instagram" in row ? { instagram: form.instagram.trim() || null } : {}),
  ...("tiktok" in row ? { tiktok: form.tiktok.trim() || null } : {}),
  ...("website" in row ? { website: form.website.trim() || null } : {}),
})

// Noches del club. No llevan su propio owner_user_id: pertenecen automáticamente al dueño del
// club (club_id = el club vinculado a esta cuenta), así que basta con poder editar/crear/borrar
// club_events cuyo club_id sea el de tu club — sin tener que marcar noche por noche a mano.
type ClubEvent = {
  id: number
  club_id: number | null
  club_name: string | null
  title: string
  artist: string | null
  music: string | null
  date: string | null
  start_time: string | null
  end_time: string | null
  price: string | null
  ticket_url: string | null
  image: string | null
  description: string | null
  featured: boolean | null
  sold_out: boolean | null
  age_min: number | null
}

const ageLevels = [18, 21, 25]

const emptyEventForm = {
  title: "", artist: "", music: "", date: "", start_time: "", end_time: "",
  price: "", ticket_url: "", image: "", description: "", age_min: 18, sold_out: false,
}
type EventFormData = typeof emptyEventForm

const eventToForm = (e: ClubEvent): EventFormData => ({
  title: e.title || "",
  artist: e.artist || "",
  music: e.music || "",
  date: e.date || "",
  start_time: e.start_time || "",
  end_time: e.end_time || "",
  price: e.price || "",
  ticket_url: e.ticket_url || "",
  image: e.image || "",
  description: e.description || "",
  age_min: e.age_min || 18,
  sold_out: !!e.sold_out,
})

// Estilos compartidos de los campos.
const inputClass = "w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand"
const labelClass = "mb-1.5 block text-sm font-semibold text-zinc-300"
const toggle = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"}`
const uploadBox = (busy: boolean) =>
  `flex cursor-pointer items-center justify-center gap-2 rounded-ctl border border-dashed px-4 py-3 text-sm font-semibold transition ${busy ? "border-white/10 text-zinc-500" : "border-white/20 text-zinc-300 hover:border-brand hover:text-ink"}`
const primaryBtn = "rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
const ghostBtn = "rounded-ctl border border-white/15 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"

// Tarjeta de sección con título y una línea de explicación.
function Card({ id, title, desc, children }: { id?: string; title: string; desc?: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-36 rounded-card border border-white/10 bg-surface p-5 sm:scroll-mt-40 sm:p-6">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {desc && <p className="mt-1 text-sm text-zinc-400">{desc}</p>}
      <div className="mt-5">{children}</div>
    </div>
  )
}

export default function MiClubPage() {
  const { t, locale } = useLanguage()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [club, setClub] = useState<Club | null>(null)
  const [form, setForm] = useState<ClubFormData | null>(null)
  const [notLinked, setNotLinked] = useState(false)
  const [loadErrorMsg, setLoadErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [inboxUnread, setInboxUnread] = useState(0)
  const [activeSection, setActiveSection] = useState<string>("resumen")

  const [events, setEvents] = useState<ClubEvent[]>([])
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [newEventForm, setNewEventForm] = useState<EventFormData>(emptyEventForm)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editEventForm, setEditEventForm] = useState<EventFormData>(emptyEventForm)
  const [savingEvent, setSavingEvent] = useState(false)
  const [uploadingEventImage, setUploadingEventImage] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  // Noches que se repiten: 1 = solo esta; 2, 4, 8 o 12 = esa noche y las siguientes, una por semana.
  const [repeatWeeks, setRepeatWeeks] = useState(1)

  const fail = (key: string, detail?: string) => toast(`${t(key)}${detail ? `: ${detail}` : ""}`, 5000)

  const timeAgo = (iso: string | null | undefined): string | null => {
    if (!iso) return null
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
    if (mins < 1) return t("time.now")
    if (mins < 60) return t("time.minutes").replace("{n}", String(mins))
    return t("time.hours").replace("{n}", String(Math.round(mins / 60)))
  }

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        window.location.href = "/login?next=/mi-club"
        return
      }
      setUserId(user.id)
      const { data, error } = await supabase.from("clubs").select("*").eq("owner_user_id", user.id).maybeSingle()

      if (error) {
        setLoadErrorMsg(error.message)
      } else if (!data) {
        setNotLinked(true)
      } else {
        setClub(data as Club)
        setForm(clubToForm(data as Club))
        const { data: eventsData } = await supabase.from("club_events").select("*").eq("club_id", data.id).order("date", { ascending: true })
        setEvents(eventsData || [])
      }
      setCheckingAccess(false)
    }
    load()
  }, [])

  // ¿Hay cambios sin guardar? (comparando el formulario con lo último guardado)
  const dirty = useMemo(() => {
    if (!club || !form) return false
    return JSON.stringify(form) !== JSON.stringify(clubToForm(club))
  }, [club, form])

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  // Sección que se está viendo, para resaltarla en el menú de arriba.
  const loadedClub = !!club
  useEffect(() => {
    if (!loadedClub || typeof IntersectionObserver === "undefined") return
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [loadedClub])

  const eventFormToPayload = (f: EventFormData, clubId: number, clubName: string) => ({
    club_id: clubId,
    club_name: clubName,
    title: f.title.trim(),
    artist: f.artist.trim(),
    music: f.music.trim(),
    date: f.date || null,
    start_time: f.start_time,
    end_time: f.end_time,
    price: f.price,
    ticket_url: f.ticket_url,
    image: f.image,
    description: f.description,
    age_min: f.age_min || 18,
    sold_out: f.sold_out,
  })

  const uploadEventImage = async (file: File) => {
    setUploadingEventImage(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `club/${club?.id}/owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const { error } = await supabase.storage.from("event-photos").upload(fileName, file)
      if (error) { fail("ownerPortal.errUpload", error.message); return null }
      const { data } = supabase.storage.from("event-photos").getPublicUrl(fileName)
      return data.publicUrl
    } catch (err) {
      fail("ownerPortal.errUpload", err instanceof Error ? err.message : String(err))
      return null
    } finally {
      setUploadingEventImage(false)
    }
  }

  const handleNewEventImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadEventImage(file)
    if (url) setNewEventForm((prev) => ({ ...prev, image: url }))
    e.target.value = ""
  }

  const handleEditEventImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadEventImage(file)
    if (url) setEditEventForm((prev) => ({ ...prev, image: url }))
    e.target.value = ""
  }

  const addEvent = async () => {
    if (!club) return
    if (!newEventForm.title.trim()) { fail("ownerPortal.errNightTitle"); return }
    const weeks = repeatWeeks > 1 && newEventForm.date ? repeatWeeks : 1
    if (repeatWeeks > 1 && !newEventForm.date) { fail("ownerPortal.errRepeatDate"); return }
    setSavingEvent(true)
    // Una fila por semana (la primera es la fecha elegida). Se guardan todas de una vez: o se crean
    // todas o ninguna.
    const base = eventFormToPayload(newEventForm, club.id, club.name)
    const rows = Array.from({ length: weeks }, (_, i) => (i === 0 ? base : { ...base, date: addDays(newEventForm.date, 7 * i) }))
    const { data, error } = await supabase.from("club_events").insert(rows).select()
    setSavingEvent(false)
    if (error) { fail("ownerPortal.errCreateNight", error.message); return }
    const created = (data || []) as ClubEvent[]
    if (created.length) {
      setEvents((prev) => [...prev, ...created].sort((a, b) => (a.date || "").localeCompare(b.date || "")))
      created.forEach((e) => touchCache(clubEventPaths(e.id)))
    }
    setNewEventForm(emptyEventForm)
    setRepeatWeeks(1)
    setShowAddEventForm(false)
    toast(created.length > 1 ? t("ownerPortal.nightsCreated").replace("{n}", String(created.length)) : t("ownerPortal.nightCreated"))
  }

  const startEditEvent = (event: ClubEvent) => {
    setEditingEventId(event.id)
    setEditEventForm(eventToForm(event))
  }

  const cancelEditEvent = () => {
    setEditingEventId(null)
    setEditEventForm(emptyEventForm)
  }

  // Duplicar una noche (la misma noche de la semana siguiente, otro mes...): abre el formulario de
  // "Nueva noche" con todo copiado menos la fecha.
  const duplicateEvent = (event: ClubEvent) => {
    setNewEventForm({ ...eventToForm(event), date: "" })
    setRepeatWeeks(1)
    setEditingEventId(null)
    setShowAddEventForm(true)
    toast(t("ownerPortal.duplicated"), 4000)
    window.setTimeout(() => document.getElementById("nueva-noche")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80)
  }

  const saveEditEvent = async (id: number) => {
    if (!club) return
    if (!editEventForm.title.trim()) { fail("ownerPortal.errNightTitle"); return }
    setSavingEvent(true)
    const { data, error } = await supabase.from("club_events").update(eventFormToPayload(editEventForm, club.id, club.name)).eq("id", id).select().single()
    setSavingEvent(false)
    if (error) { fail("ownerPortal.errSave", error.message); return }
    if (data) {
      setEvents((prev) => prev.map((e) => (e.id === id ? data : e)))
      touchCache(clubEventPaths(id))
    }
    setEditingEventId(null)
    toast(t("ownerPortal.saved"))
  }

  // Borrar pide una segunda pulsación (antes salía un confirm() del navegador).
  const deleteEvent = async (id: number) => {
    if (pendingDelete !== id) {
      setPendingDelete(id)
      return
    }
    setPendingDelete(null)
    const { error } = await supabase.from("club_events").delete().eq("id", id)
    if (error) { fail("ownerPortal.errDelete", error.message); return }
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const saveChanges = async () => {
    if (!club || !form) return
    if (!form.name.trim()) { fail("ownerPortal.errName"); return }
    setSaving(true)
    const { data, error } = await supabase.from("clubs").update(formToPayload(form, club)).eq("id", club.id).select().maybeSingle()
    setSaving(false)
    if (error) { fail("ownerPortal.errSave", error.message); return }
    if (data) {
      setClub(data as Club)
      setForm(clubToForm(data as Club))
      touchCache(clubPaths((data as { slug?: string | null }).slug || createSlug((data as { name?: string }).name)))
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3000)
  }

  // Estado en directo: se guarda al instante (caduca en horas, no espera a "Guardar cambios").
  const setLiveStatus = async (status: string) => {
    if (!club) return
    setUpdatingStatus(true)
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase.from("clubs").update({ live_status: status, live_status_updated_at: nowIso }).eq("id", club.id).select().maybeSingle()
    setUpdatingStatus(false)
    if (error) { fail("ownerPortal.errStatus", error.message); return }
    // Solo cambia el estado en directo: lo demás de la ficha (incluido lo que se esté editando y
    // aún no se haya guardado) se queda como estaba.
    setClub((prev) => (prev ? { ...prev, live_status: status, live_status_updated_at: (data as Club | null)?.live_status_updated_at ?? nowIso } : prev))
    touchCache(clubPaths(club.slug || createSlug(club.name)))
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !form) return
    const input = e.target
    setUploadingImage(true)
    // Antes, si upload() lanzaba una excepción (red caída, CORS...) en vez de devolver un
    // error normal, no había try/catch que lo recogiera: la función se paraba a medias,
    // uploadingImage se quedaba en true para siempre y el botón quedaba deshabilitado sin
    // ningún aviso — "como si no reaccionase" en todos los intentos siguientes. Ahora cualquier
    // fallo se muestra y el botón siempre se reactiva.
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `club/${club?.id}/club-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("club-images").upload(fileName, file)
      if (uploadError) {
        fail("ownerPortal.errUpload", uploadError.message)
        return
      }
      const { data } = supabase.storage.from("club-images").getPublicUrl(fileName)
      setForm((f) => (f ? { ...f, image: data.publicUrl } : f))
    } catch (err) {
      fail("ownerPortal.errUpload", err instanceof Error ? err.message : String(err))
    } finally {
      setUploadingImage(false)
      input.value = ""
    }
  }

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !form) return
    const input = e.target
    setUploadingGallery(true)
    const urls: string[] = []
    let firstError: string | null = null
    // Antes un fallo aquí se tragaba en silencio (continue, sin aviso) y además una excepción
    // no controlada habría dejado uploadingGallery en true para siempre.
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop()
        const fileName = `club/${club?.id}/manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
        const { error } = await supabase.storage.from("club-photos").upload(fileName, file)
        if (error) {
          if (!firstError) firstError = error.message
          continue
        }
        const { data } = supabase.storage.from("club-photos").getPublicUrl(fileName)
        urls.push(data.publicUrl)
      }
    } catch (err) {
      if (!firstError) firstError = err instanceof Error ? err.message : String(err)
    } finally {
      setUploadingGallery(false)
      if (urls.length > 0) setForm((f) => (f ? { ...f, gallery: [...f.gallery, ...urls] } : f))
      if (firstError) fail("ownerPortal.errUpload", firstError)
      input.value = ""
    }
  }

  const removeGalleryPhoto = (url: string) => {
    setForm((f) => (f ? { ...f, gallery: f.gallery.filter((u) => u !== url) } : f))
  }

  const copyListingLink = async () => {
    if (!club) return
    const url = `https://www.noctuaapp.com/clubs/${club.slug || createSlug(club.name)}`
    try {
      await navigator.clipboard.writeText(url)
      toast(t("ownerPortal.linkCopied"))
    } catch {
      toast(url, 6000)
    }
  }

  const renderEventForm = (eventForm: EventFormData, setEventForm: (f: EventFormData) => void, onImage: (e: ChangeEvent<HTMLInputElement>) => void) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className={labelClass}>{t("ownerPortal.nightTitle")}</label>
        <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder={t("ownerPortal.nightTitlePh")} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("clubEvent.artist")}</label>
        <input value={eventForm.artist} onChange={(e) => setEventForm({ ...eventForm, artist: e.target.value })} placeholder={t("ownerPortal.artistPh")} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("club.music")}</label>
        <input value={eventForm.music} onChange={(e) => setEventForm({ ...eventForm, music: e.target.value })} placeholder="Techno, House…" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("event.date")}</label>
        <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("event.price")}</label>
        <input value={eventForm.price} onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })} placeholder="15 €" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("ownerPortal.startTime")}</label>
        <input value={eventForm.start_time} onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })} placeholder="23:55" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("ownerPortal.endTime")}</label>
        <input value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} placeholder="06:00" className={inputClass} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>{t("ownerPortal.ticketLink")}</label>
        <input value={eventForm.ticket_url} onChange={(e) => setEventForm({ ...eventForm, ticket_url: e.target.value })} placeholder="https://…" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>{t("explorer.ageTitle")}</label>
        <div className="flex gap-2">
          {ageLevels.map((age) => (
            <button key={age} type="button" onClick={() => setEventForm({ ...eventForm, age_min: age })} aria-pressed={eventForm.age_min === age} className={toggle(eventForm.age_min === age)}>
              +{age}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end">
        <button type="button" onClick={() => setEventForm({ ...eventForm, sold_out: !eventForm.sold_out })} aria-pressed={eventForm.sold_out}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${eventForm.sold_out ? "bg-red-500 text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"}`}>
          {t("event.soldOut")}
        </button>
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>{t("ownerPortal.nightImage")}</label>
        <input value={eventForm.image} onChange={(e) => setEventForm({ ...eventForm, image: e.target.value })} placeholder={t("ownerPortal.imageUrlPh")} className={inputClass} />
        <label className={`mt-2 ${uploadBox(uploadingEventImage)}`}>
          <Upload size={16} /> {uploadingEventImage ? t("ownerPortal.uploading") : t("ownerPortal.uploadImage")}
          <input type="file" accept="image/*" className="hidden" disabled={uploadingEventImage} onChange={onImage} />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {eventForm.image && <img src={eventForm.image} alt={t("ownerPortal.preview")} className="mt-3 h-32 w-full rounded-ctl object-cover" />}
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>{t("ownerPortal.description")}</label>
        <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder={t("ownerPortal.nightDescPh")} className={`min-h-[100px] ${inputClass}`} />
      </div>
    </div>
  )

  if (checkingAccess) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen items-center justify-center bg-night text-ink">
          <p className="text-sm text-zinc-400">{t("ownerPortal.checking")}</p>
        </main>
      </>
    )
  }

  if (loadErrorMsg) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-night px-6 text-center text-ink">
          <p className="text-lg font-semibold">{t("ownerPortal.loadError")}</p>
          <p className="max-w-md text-sm text-zinc-400">{loadErrorMsg}</p>
        </main>
        <BottomNav />
      </>
    )
  }

  if (notLinked || !club || !form) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-night px-6 text-center text-ink">
          <h1 className="font-display text-3xl">{t("ownerPortal.notLinkedTitle")}</h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-300">{t("ownerPortal.notLinkedBody")}</p>
          <Link href="/para-locales" className={primaryBtn}>
            {t("ownerPortal.howItWorks")}
          </Link>
          <Link href="/" className="text-sm text-zinc-400 underline underline-offset-4 hover:text-ink">
            {t("notFound.home")}
          </Link>
        </main>
        <BottomNav />
      </>
    )
  }

  const dateLocale = locale === "en" ? "en-GB" : locale === "ca" ? "ca-ES" : "es-ES"
  const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short" }) : t("eventPage.dateTbc")

  const set = <K extends keyof ClubFormData>(key: K, value: ClubFormData[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const listingSlug = club.slug || createSlug(club.name)
  // El editor de avisos solo se ofrece si la columna ya existe (se crea con supabase/60).
  const hasNotices = "schedule_notices" in club

  // Etiquetas agrupadas igual que en el admin. Lo que decide solo Noctua (verificado, tendencia,
  // ocultar...) no está aquí. "Cerrado temporalmente" va aparte, con su aviso.
  type Tag = { key: string; label: string; extra?: boolean }
  const core = (key: keyof ClubFormData, label: string): Tag => ({ key, label })
  const extra = (field: string): Tag => {
    const f = EXTRA_FEATURES.find((x) => x.field === field)
    return { key: field, label: f ? t(f.labelKey) : field, extra: true }
  }
  const tagGroups: { title: string; tags: Tag[] }[] = [
    { title: t("ownerPortal.groupAmbience"), tags: [extra("dance_floor"), extra("live_music"), extra("hot_shows"), core("lgtbi_friendly", "LGTBI+")] },
    { title: t("ownerPortal.groupEntertainment"), tags: [extra("karaoke"), extra("darts"), core("has_foosball", t("explorer.attr_games")), extra("games"), extra("sports_tv")] },
    { title: t("ownerPortal.groupFood"), tags: [extra("cocktails"), extra("food"), extra("shisha")] },
    // Cumpleaños, eventos privados y alquiler del local (supabase/60): sale en la ficha como
    // «Celebraciones» y como filtro en /clubs.
    { title: t("ownerPortal.groupCelebrations"), tags: [extra("birthdays"), extra("private_events"), extra("venue_rental")] },
    {
      title: t("ownerPortal.groupZones"),
      tags: [
        core("terrace", t("ownerPortal.fTerrace")),
        core("smoking_area", t("ownerPortal.fSmoking")),
        extra("cigarette_machine"),
        core("table_booking", t("ownerPortal.fTables")),
        core("vip_tables", t("event.vipTable")),
        extra("cloakroom"),
        extra("wheelchair_accessible"),
      ],
    },
    { title: t("ownerPortal.groupToday"), tags: [core("sold_out", t("ownerPortal.fSoldOutToday"))] },
  ]
  // Si en el futuro se añade otra etiqueta en lib/extraFeatures.ts, sale aquí sin tocar más.
  const placed = new Set(tagGroups.flatMap((g) => g.tags.map((x) => x.key)))
  const unplaced = EXTRA_FEATURES.filter((f) => !placed.has(f.field)).map((f) => extra(f.field))
  if (unplaced.length) tagGroups[4].tags.push(...unplaced)
  // Una etiqueta de servicios solo se muestra si su columna existe en la base de datos (así, si
  // falta ejecutar un SQL, no se ofrece algo que luego fallaría al guardar).
  const visibleGroups = tagGroups
    .map((g) => ({ ...g, tags: g.tags.filter((tag) => !tag.extra || tag.key in form.extras) }))
    .filter((g) => g.tags.length > 0)
  const tagOn = (tag: Tag) => (tag.extra ? !!form.extras[tag.key] : !!form[tag.key as keyof ClubFormData])
  const tagToggle = (tag: Tag) =>
    tag.extra ? set("extras", { ...form.extras, [tag.key]: !form.extras[tag.key] }) : set(tag.key as keyof ClubFormData, !form[tag.key as keyof ClubFormData] as never)

  // Qué le falta a la ficha para estar completa (se recalcula según escribe).
  const today = madridToday()
  const checks: { label: string; ok: boolean; to: string }[] = [
    { label: t("ownerPortal.ckImage"), ok: !!form.image.trim(), to: "fotos" },
    { label: t("ownerPortal.ckDescription"), ok: form.description.trim().length >= 40, to: "descripcion" },
    { label: t("ownerPortal.ckAddress"), ok: !!form.address.trim(), to: "datos" },
    { label: t("ownerPortal.ckHours"), ok: !!form.hours.trim(), to: "datos" },
    { label: t("ownerPortal.ckDays"), ok: form.open_days.length > 0, to: "datos" },
    { label: t("ownerPortal.ckMusic"), ok: !!form.music.trim(), to: "datos" },
    { label: t("ownerPortal.ckPrice"), ok: !!form.price.trim() || !!form.free_entry_info.trim(), to: "datos" },
    { label: t("ownerPortal.ckSocial"), ok: !!(form.instagram.trim() || form.tiktok.trim() || form.website.trim()), to: "descripcion" },
    { label: t("ownerPortal.ckGallery"), ok: form.gallery.length >= 3, to: "fotos" },
    { label: t("ownerPortal.ckNight"), ok: events.some((e) => (e.date || "") >= today), to: "noches" },
  ]
  const missing = checks.filter((c) => !c.ok)
  const pct = Math.round(((checks.length - missing.length) / checks.length) * 100)

  const stateChip = (on: boolean) => (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${on ? "bg-open/15 text-open" : "bg-white/[0.06] text-zinc-400"}`}>
      {on ? t("ownerPortal.stateOn") : t("ownerPortal.stateOff")}
    </span>
  )

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 pt-8 text-ink sm:pt-12">
        <div className="mx-auto max-w-3xl px-4">
          {/* Cabecera */}
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {club.image && <img src={club.image} alt="" className="hidden h-20 w-20 shrink-0 rounded-card border border-white/10 object-cover sm:block" />}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-soft">{t("ownerPortal.kicker")}</p>
              <h1 className="font-display mt-1 break-words text-[2rem] leading-tight sm:text-5xl">{club.name}</h1>
              {(club.verified || club.trending) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {club.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-open/15 px-3 py-1 text-xs font-semibold text-open">
                      <BadgeCheck size={14} aria-hidden="true" /> {t("ownerPortal.statusVerified")}
                    </span>
                  )}
                  {club.trending && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-3 py-1 text-xs font-semibold text-warn">
                      <TrendingUp size={14} aria-hidden="true" /> {t("ownerPortal.statusTrending")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm text-zinc-300">{t("ownerPortal.intro")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/clubs/${listingSlug}`} className={`${ghostBtn} flex items-center gap-2 !py-2.5`}>
              <ExternalLink size={15} aria-hidden="true" /> {t("ownerPortal.viewListing")}
            </Link>
            <button type="button" onClick={copyListingLink} className={`${ghostBtn} flex items-center gap-2 !py-2.5`}>
              <Copy size={15} aria-hidden="true" /> {t("ownerPortal.copyLink")}
            </button>
          </div>

          {/* Menú de secciones */}
          <nav aria-label={t("ownerPortal.navLabel")} className="sticky top-[72px] z-30 -mx-4 mt-6 border-b border-white/10 bg-night/90 px-4 backdrop-blur sm:top-20">
            <ul className="scroll-x-thin flex gap-1 overflow-x-auto py-2">
              {SECTIONS.filter((s) => s.id !== "avisos" || hasNotices).map((s) => (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    aria-current={activeSection === s.id ? "true" : undefined}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                      activeSection === s.id ? "bg-white text-night" : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    {t(s.label)}
                    {s.id === "mensajes" && inboxUnread > 0 && (
                      <span className="min-w-[20px] rounded-full bg-warn px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-night">{inboxUnread}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* RESUMEN */}
          <section id="resumen" className="scroll-mt-36 space-y-4 pt-6 sm:scroll-mt-40">
            {club.hidden && (
              <div className="rounded-card border border-warn/40 bg-warn/[0.08] p-4 text-sm leading-relaxed text-zinc-100" role="status">
                {t("ownerPortal.statusHidden")}
              </div>
            )}

            <div className="rounded-card border border-white/10 bg-surface p-5 sm:p-6">
              {missing.length === 0 ? (
                <p className="flex items-center gap-2 text-base font-semibold text-open">
                  <Check size={18} aria-hidden="true" /> {t("ownerPortal.completenessDone")}
                </p>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-base font-semibold text-ink">{t("ownerPortal.completenessTitle").replace("{pct}", String(pct))}</h2>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-zinc-400">{t("ownerPortal.completenessBody")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missing.map((m) => (
                      <a
                        key={m.label}
                        href={`#${m.to}`}
                        className="rounded-full border border-white/15 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
                      >
                        {m.label}
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-card border border-white/10 bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
                <span className="live-dot h-2 w-2 rounded-full bg-open" /> {t("forVenues.f2Title")}
              </h2>
              <p className="mt-2 text-sm text-zinc-300">{t("forVenues.f2Body")}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {LIVE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => setLiveStatus(opt.key)}
                    aria-pressed={club.live_status === opt.key}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                      club.live_status === opt.key ? "bg-white text-night" : "border border-white/15 text-ink hover:bg-white/5"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${opt.dot}`} /> {t(opt.label)}
                  </button>
                ))}
              </div>
              {club.live_status && club.live_status_updated_at && (
                <p className="mt-3 text-sm text-zinc-400">
                  {t("ownerPortal.markedAs")} <strong className="text-zinc-200">{t(LIVE_STATUS_OPTIONS.find((o) => o.key === club.live_status)?.label || "")}</strong> · {timeAgo(club.live_status_updated_at)}
                </p>
              )}
            </div>

            {/* Estadísticas de su ficha (visitas, clics, de dónde llegan). */}
            <OwnerStats type="club" id={club.id} name={club.name} />
          </section>

          {/* AVISOS: «hoy cerramos», horarios especiales y avisos. Solo si la columna existe (SQL 60). */}
          {hasNotices && (
            <section id="avisos" className="mt-4 scroll-mt-36 sm:scroll-mt-40">
              <Card title={t("ownerPortal.noticesTitle")} desc={t("ownerPortal.noticesDesc")}>
                <OwnerNotices
                  clubId={club.id}
                  initial={club.schedule_notices}
                  onSaved={(list) => {
                    setClub((prev) => (prev ? { ...prev, schedule_notices: list } : prev))
                    touchCache(clubPaths(club.slug || createSlug(club.name)))
                  }}
                />
              </Card>
            </section>
          )}

          {/* FICHA */}
          <section id="ficha" className="mt-10 scroll-mt-36 space-y-4 sm:scroll-mt-40">
            <Card id="datos" title={t("ownerPortal.sectionBasics")} desc={t("ownerPortal.sectionBasicsDesc")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>{t("ownerPortal.name")}</label>
                  <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("planPage.stepVenueType")}</label>
                  <select value={form.venue_type} onChange={(e) => set("venue_type", e.target.value)} style={{ colorScheme: "dark" }} className={inputClass}>
                    {VENUE_TYPE_OPTIONS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {t(v.key)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t("explorer.barrioTitle")}</label>
                  <input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Gràcia, Eixample…" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("ownerPortal.address")}</label>
                  <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Carrer de Còrsega, 327" className={inputClass} />
                  <p className="mt-1 text-xs text-zinc-400">{t("ownerPortal.addressHint")}</p>
                </div>
                <div>
                  <label className={labelClass}>{t("club.music")}</label>
                  <input value={form.music} onChange={(e) => set("music", e.target.value)} placeholder="Techno, Reggaetón…" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("event.price")}</label>
                  <input value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="15–20 €" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("event.schedule")}</label>
                  <input value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="23:55-06:00" className={inputClass} />
                  <p className="mt-1 text-xs text-zinc-400">{t("ownerPortal.hoursHint")}</p>
                </div>
                <div>
                  <label className={labelClass}>{t("ownerPortal.capacity")}</label>
                  <input value={form.people} onChange={(e) => set("people", e.target.value)} placeholder={t("ownerPortal.capacityPh")} className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{t("planPage.dresscode")}</label>
                  <input value={form.dresscode} onChange={(e) => set("dresscode", e.target.value)} placeholder="Casual, Smart casual…" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{t("ownerPortal.openDays")}</label>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((day, i) => {
                      const active = form.open_days.includes(day)
                      // Etiqueta del día en el idioma activo (2024-01-01 fue lunes).
                      const label = new Date(2024, 0, 1 + i).toLocaleDateString(dateLocale, { weekday: "short" }).replace(".", "")
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={active}
                          onClick={() => set("open_days", active ? form.open_days.filter((d) => d !== day) : [...form.open_days, day])}
                          className={`${toggle(active)} capitalize`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card id="descripcion" title={t("ownerPortal.sectionAbout")} desc={t("ownerPortal.sectionAboutDesc")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t("ownerPortal.description")}</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder={t("ownerPortal.descPh")}
                    className={`min-h-[130px] ${inputClass}`}
                  />
                  <p className="mt-1 text-xs text-zinc-400">{t("ownerPortal.descHint")}</p>
                </div>
                <div>
                  <label className={labelClass}>{t("ownerPortal.instagram")}</label>
                  <input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder={t("ownerPortal.socialPh")} autoCapitalize="none" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("ownerPortal.tiktok")}</label>
                  <input value={form.tiktok} onChange={(e) => set("tiktok", e.target.value)} placeholder={t("ownerPortal.socialPh")} autoCapitalize="none" className={inputClass} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{t("ownerPortal.website")}</label>
                  <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder={t("ownerPortal.websitePh")} autoCapitalize="none" inputMode="url" className={inputClass} />
                  <p className="mt-1 text-xs text-zinc-400">{t("ownerPortal.socialHint")}</p>
                </div>
              </div>
            </Card>

            <Card id="llegar" title={t("ownerPortal.sectionGetThere")} desc={t("ownerPortal.sectionGetThereDesc")}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>{t("ownerPortal.metroLines")}</label>
                  <input value={form.metro_lines} onChange={(e) => set("metro_lines", e.target.value)} placeholder="L1, L4" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("ownerPortal.nightBuses")}</label>
                  <input value={form.night_buses} onChange={(e) => set("night_buses", e.target.value)} placeholder="N0, N6" className={inputClass} />
                </div>
              </div>
            </Card>

            <Card id="ofertas" title={t("ownerPortal.sectionOffers")} desc={t("ownerPortal.sectionOffersDesc")}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelClass}>{t("ownerPortal.promo")}</label>
                  <input value={form.discount_info} onChange={(e) => set("discount_info", e.target.value)} placeholder={t("ownerPortal.promoPh")} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("ownerPortal.freeEntry")}</label>
                  <input value={form.free_entry_info} onChange={(e) => set("free_entry_info", e.target.value)} placeholder={t("ownerPortal.freeEntryPh")} className={inputClass} />
                </div>
              </div>
            </Card>
          </section>

          {/* FOTOS */}
          <section id="fotos" className="mt-4 scroll-mt-36 sm:scroll-mt-40">
            <Card title={t("ownerPortal.sectionPhotos")} desc={t("ownerPortal.sectionPhotosDesc")}>
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>{t("ownerPortal.mainImage")}</label>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {form.image && <img src={form.image} alt={t("ownerPortal.preview")} className="h-24 w-24 shrink-0 rounded-ctl border border-white/10 object-cover" />}
                    <div className="flex-1 space-y-2">
                      <input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder={t("ownerPortal.imageUrlPh")} className={inputClass} />
                      <label className={uploadBox(uploadingImage)}>
                        <Upload size={16} /> {uploadingImage ? t("ownerPortal.uploading") : t("ownerPortal.uploadImage")}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    {t("ownerPortal.gallery").replace("{n}", String(form.gallery.length))}
                    {form.gallery.length > 0 && <span className="ml-2 font-normal text-zinc-400">{t("ownerPortal.galleryHint")}</span>}
                  </label>
                  <label className={uploadBox(uploadingGallery)}>
                    <Upload size={16} /> {uploadingGallery ? t("ownerPortal.uploading") : t("ownerPortal.addPhotos")}
                    <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingGallery} onChange={handleGalleryUpload} />
                  </label>
                  {form.gallery.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {form.gallery.map((url) => (
                        <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-ctl border border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeGalleryPhoto(url)}
                            aria-label={t("ownerPortal.removePhoto")}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-night/80 text-white"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </section>

          {/* ETIQUETAS */}
          <section id="etiquetas" className="mt-4 scroll-mt-36 sm:scroll-mt-40">
            <Card title={t("ownerPortal.sectionTags")} desc={t("ownerPortal.sectionTagsDesc")}>
              <div className="space-y-5">
                {visibleGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-sm font-semibold text-zinc-400">{group.title}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <button key={tag.key} type="button" aria-pressed={tagOn(tag)} onClick={() => tagToggle(tag)} className={toggle(tagOn(tag))}>
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {CLOSED_FIELD in form.extras && (
                  <div className="rounded-ctl border border-warn/30 bg-warn/[0.07] p-4">
                    <button
                      type="button"
                      aria-pressed={!!form.extras[CLOSED_FIELD]}
                      onClick={() => set("extras", { ...form.extras, [CLOSED_FIELD]: !form.extras[CLOSED_FIELD] })}
                      className={toggle(!!form.extras[CLOSED_FIELD])}
                    >
                      {t("ownerPortal.tempClosed")}
                    </button>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t("ownerPortal.tempClosedHint")}</p>
                  </div>
                )}
              </div>
            </Card>
          </section>

          {/* Barra de guardado: solo se ve cuando hay algo que guardar (o acaba de guardarse); el
              resto del tiempo ocupa su sitio pero invisible, para que la página no salte. */}
          <div
            className={`sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-white/10 bg-night/95 p-3 backdrop-blur transition-opacity md:bottom-4 ${
              dirty || saving || savedFlash ? "" : "invisible opacity-0"
            }`}
          >
            <button onClick={saveChanges} disabled={saving || !dirty} className={primaryBtn}>
              {saving ? t("profile.saving") : t("ownerPortal.saveChanges")}
            </button>
            {dirty && (
              <button onClick={() => setForm(clubToForm(club))} disabled={saving} className={`${ghostBtn} !px-4`}>
                {t("ownerPortal.discard")}
              </button>
            )}
            <p className="order-first w-full text-sm sm:order-last sm:ml-auto sm:w-auto" aria-live="polite">
              {dirty ? (
                <span className="flex items-center gap-2 font-semibold text-warn">
                  <span className="h-2 w-2 rounded-full bg-warn" aria-hidden="true" /> {t("ownerPortal.unsaved")}
                </span>
              ) : savedFlash ? (
                <span className="flex items-center gap-1.5 font-semibold text-open">
                  <Check size={16} aria-hidden="true" /> {t("ownerPortal.saved")}
                </span>
              ) : (
                <span className="text-zinc-400">{t("ownerPortal.allSaved")}</span>
              )}
            </p>
          </div>

          {/* NOCHES */}
          <section id="noches" className="mt-14 scroll-mt-36 border-t border-white/10 pt-10 sm:scroll-mt-40">
            <h2 className="text-xl font-semibold">{t("ownerPortal.nightsTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-300">{t("ownerPortal.nightsIntro")}</p>

            <div className="mt-6" id="nueva-noche">
              <button onClick={() => { setShowAddEventForm((v) => !v); setEditingEventId(null); if (showAddEventForm) { setNewEventForm(emptyEventForm); setRepeatWeeks(1) } }} className={showAddEventForm ? ghostBtn : primaryBtn}>
                {showAddEventForm ? t("ownerPortal.closeForm") : t("ownerPortal.newNight")}
              </button>
              {showAddEventForm && (
                <div className="mt-4 rounded-card border border-brand/30 bg-brand/5 p-5 sm:p-6">
                  <h3 className="mb-4 text-lg font-semibold">{t("ownerPortal.newNight")}</h3>
                  {renderEventForm(newEventForm, setNewEventForm, handleNewEventImageUpload)}
                  {/* Noches que se repiten cada semana (mismo día de la semana). */}
                  <div className="mt-4 rounded-ctl border border-white/10 bg-night/40 p-4">
                    <label htmlFor="repeat-weeks" className={labelClass}>
                      {t("ownerPortal.repeatLabel")}
                    </label>
                    <select
                      id="repeat-weeks"
                      value={repeatWeeks}
                      onChange={(e) => setRepeatWeeks(Number(e.target.value))}
                      style={{ colorScheme: "dark" }}
                      className={inputClass}
                    >
                      <option value={1}>{t("ownerPortal.repeatNone")}</option>
                      {[2, 4, 8, 12].map((n) => (
                        <option key={n} value={n}>
                          {t("ownerPortal.repeatN").replace("{n}", String(n))}
                        </option>
                      ))}
                    </select>
                    {repeatWeeks > 1 && <p className="mt-2 text-xs leading-relaxed text-zinc-400">{t("ownerPortal.repeatHint").replace("{n}", String(repeatWeeks))}</p>}
                  </div>
                  <div className="mt-5 flex gap-3">
                    <button onClick={addEvent} disabled={savingEvent} className={primaryBtn}>
                      {savingEvent ? t("profile.saving") : repeatWeeks > 1 ? t("ownerPortal.createNights").replace("{n}", String(repeatWeeks)) : t("ownerPortal.createNight")}
                    </button>
                    <button onClick={() => { setShowAddEventForm(false); setNewEventForm(emptyEventForm); setRepeatWeeks(1) }} className={ghostBtn}>
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {events.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-400">{t("ownerPortal.noNights")}</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="rounded-card border border-white/10 bg-surface p-5">
                    {editingEventId === event.id ? (
                      <div>
                        <h3 className="mb-4 text-lg font-semibold">{t("ownerPortal.editing").replace("{name}", event.title)}</h3>
                        {renderEventForm(editEventForm, setEditEventForm, handleEditEventImageUpload)}
                        <div className="mt-5 flex gap-3">
                          <button onClick={() => saveEditEvent(event.id)} disabled={savingEvent} className={primaryBtn}>
                            {savingEvent ? t("profile.saving") : t("ownerPortal.saveChanges")}
                          </button>
                          <button onClick={cancelEditEvent} className={ghostBtn}>
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {event.image && <img src={event.image} alt="" className="h-16 w-16 shrink-0 rounded-ctl object-cover" />}
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold">{event.title}</h3>
                            <p className="mt-0.5 text-sm text-zinc-400">
                              {[fmtDate(event.date), event.start_time, event.price].filter(Boolean).join(" · ")}
                              {event.sold_out && <span className="ml-2 font-semibold text-red-300">{t("event.soldOut")}</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/club-event/${event.id}`} className={ghostBtn}>
                            {t("ownerPortal.view")}
                          </Link>
                          <button onClick={() => startEditEvent(event)} className={`${ghostBtn} flex items-center gap-1.5`}>
                            <Pencil size={14} /> {t("ownerPortal.edit")}
                          </button>
                          <button onClick={() => duplicateEvent(event)} className={`${ghostBtn} flex items-center gap-1.5`}>
                            <Files size={14} /> {t("ownerPortal.duplicate")}
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className={`flex items-center gap-1.5 rounded-ctl px-5 py-3 text-sm font-semibold transition ${pendingDelete === event.id ? "bg-red-500 text-white" : "border border-red-500/30 text-red-300 hover:bg-red-500/10"}`}
                          >
                            <Trash2 size={14} /> {pendingDelete === event.id ? t("ownerPortal.confirmDelete") : t("profilePage.delete")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* MENSAJES */}
          <section id="mensajes" className="mt-14 scroll-mt-36 space-y-4 border-t border-white/10 pt-10 sm:scroll-mt-40">
            <h2 className="text-xl font-semibold">{t("ownerPortal.navMessages")}</h2>

            <div className="rounded-card border border-white/10 bg-surface p-5 sm:p-6">
              <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                <Lock size={16} className="text-brand-soft" aria-hidden="true" /> {t("ownerPortal.noctuaTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{t("ownerPortal.noctuaBody")}</p>
              <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-ctl border border-white/10 px-4 py-2.5">
                  <dt className="text-sm text-zinc-300">{t("ownerPortal.noctuaVerified")}</dt>
                  <dd>{stateChip(!!club.verified)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-ctl border border-white/10 px-4 py-2.5">
                  <dt className="text-sm text-zinc-300">{t("ownerPortal.noctuaTrending")}</dt>
                  <dd>{stateChip(!!club.trending)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-ctl border border-white/10 px-4 py-2.5">
                  <dt className="text-sm text-zinc-300">{t("ownerPortal.noctuaRating")}</dt>
                  <dd className="text-sm font-semibold text-ink">{club.rating ? `★ ${club.rating}` : "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-ctl border border-white/10 px-4 py-2.5">
                  <dt className="shrink-0 text-sm text-zinc-300">{t("ownerPortal.noctuaLink")}</dt>
                  <dd className="min-w-0 truncate text-sm font-semibold text-ink">/clubs/{listingSlug}</dd>
                </div>
              </dl>
            </div>

            {userId && <OwnerInbox userId={userId} topics={[{ type: "club", id: club.id, name: club.name }]} onUnreadChange={setInboxUnread} />}
          </section>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
