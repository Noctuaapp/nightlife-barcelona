"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import Link from "next/link"

import { Upload, X, Pencil, Trash2, Check } from "lucide-react"
import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"
import OwnerStats from "../../components/owner/OwnerStats"
import { EXTRA_FEATURES, extrasFromRow } from "../../lib/extraFeatures"
import { useLanguage } from "../../context/LanguageContext"
import { toast } from "../../components/ui/Toast"
import { createSlug } from "../../lib/slug"
import { touchCache, clubPaths, clubEventPaths } from "../../lib/touchCache"

// Portal para que un club verificado edite su propia ficha sin pasar por Jordi. Un club queda
// "vinculado" cuando su fila en `clubs` tiene `owner_user_id` = el id de un usuario de Supabase
// Auth (Jordi lo vincula a mano la primera vez, desde el SQL Editor). Reutiliza el mismo
// formulario y los mismos campos que /admin, con dos excepciones deliberadas: el club no puede
// tocar "Verified" (es el sello de confianza que otorga Noctua) ni "Trending" (es una curación
// editorial nuestra) — todo lo demás es igual que en el panel de admin.
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
})

const formToPayload = (form: ClubFormData) => ({
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

export default function MiClubPage() {
  const { t, locale } = useLanguage()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [club, setClub] = useState<Club | null>(null)
  const [form, setForm] = useState<ClubFormData | null>(null)
  const [notLinked, setNotLinked] = useState(false)
  const [loadErrorMsg, setLoadErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  const [events, setEvents] = useState<ClubEvent[]>([])
  const [showAddEventForm, setShowAddEventForm] = useState(false)
  const [newEventForm, setNewEventForm] = useState<EventFormData>(emptyEventForm)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [editEventForm, setEditEventForm] = useState<EventFormData>(emptyEventForm)
  const [savingEvent, setSavingEvent] = useState(false)
  const [uploadingEventImage, setUploadingEventImage] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

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
    setSavingEvent(true)
    const { data, error } = await supabase.from("club_events").insert(eventFormToPayload(newEventForm, club.id, club.name)).select().single()
    setSavingEvent(false)
    if (error) { fail("ownerPortal.errCreateNight", error.message); return }
    if (data) {
      setEvents((prev) => [...prev, data].sort((a, b) => (a.date || "").localeCompare(b.date || "")))
      touchCache(clubEventPaths(data.id))
    }
    setNewEventForm(emptyEventForm)
    setShowAddEventForm(false)
    toast(t("ownerPortal.nightCreated"))
  }

  const startEditEvent = (event: ClubEvent) => {
    setEditingEventId(event.id)
    setEditEventForm(eventToForm(event))
  }

  const cancelEditEvent = () => {
    setEditingEventId(null)
    setEditEventForm(emptyEventForm)
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
    const { data, error } = await supabase.from("clubs").update(formToPayload(form)).eq("id", club.id).select().maybeSingle()
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
    setClub((data as Club) || { ...club, live_status: status, live_status_updated_at: nowIso })
    touchCache(clubPaths((club as unknown as { slug?: string | null }).slug || createSlug((club as unknown as { name?: string }).name)))
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
      setForm({ ...form, image: data.publicUrl })
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
      if (urls.length > 0) setForm({ ...form, gallery: [...form.gallery, ...urls] })
      if (firstError) fail("ownerPortal.errUpload", firstError)
      input.value = ""
    }
  }

  const removeGalleryPhoto = (url: string) => {
    if (!form) return
    setForm({ ...form, gallery: form.gallery.filter((u) => u !== url) })
  }

  const inputClass = "w-full rounded-ctl border border-white/15 bg-night px-4 py-3 text-base text-ink outline-none transition placeholder:text-zinc-500 focus:border-brand"
  const labelClass = "mb-1.5 block text-sm font-semibold text-zinc-300"
  const toggle = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-brand text-white" : "border border-white/10 text-zinc-200 hover:bg-white/5"}`
  const uploadBox = (busy: boolean) =>
    `flex cursor-pointer items-center justify-center gap-2 rounded-ctl border border-dashed px-4 py-3 text-sm font-semibold transition ${busy ? "border-white/10 text-zinc-500" : "border-white/20 text-zinc-300 hover:border-brand hover:text-ink"}`
  const primaryBtn = "rounded-ctl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
  const ghostBtn = "rounded-ctl border border-white/15 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white/5"

  const renderEventForm = (eventForm: EventFormData, setEventForm: (f: EventFormData) => void, onImage: (e: ChangeEvent<HTMLInputElement>) => void) => (
    <div className="grid gap-4 md:grid-cols-2">
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

  const fmtDate = (d: string | null) =>
    d ? new Date(`${d}T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ca" ? "ca-ES" : "es-ES", { weekday: "short", day: "numeric", month: "short" }) : t("eventPage.dateTbc")

  const features: { key: keyof ClubFormData; label: string }[] = [
    { key: "terrace", label: t("ownerPortal.fTerrace") },
    { key: "smoking_area", label: t("ownerPortal.fSmoking") },
    { key: "table_booking", label: t("ownerPortal.fTables") },
    { key: "vip_tables", label: t("event.vipTable") },
    { key: "has_foosball", label: t("explorer.attr_games") },
    { key: "lgtbi_friendly", label: "LGTBI+" },
    { key: "sold_out", label: t("ownerPortal.fSoldOutToday") },
    // "Ocultar ficha" ya no está: ocultar o publicar lo decide solo Noctua (supabase/35).
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-night pb-40 pt-8 text-ink sm:pt-12">
        <section className="mx-auto max-w-3xl px-4">
          <p className="text-sm font-semibold text-brand-soft">{t("ownerPortal.kicker")}</p>
          <h1 className="font-display mt-2 text-[2rem] leading-tight sm:text-5xl">{club.name}</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-300">{t("ownerPortal.intro")}</p>

          <div className="mt-8 rounded-card border border-white/10 bg-surface p-5 sm:p-6">
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
          <div className="mt-6">
            <OwnerStats type="club" id={club.id} name={club.name} />
          </div>

          <h2 className="mt-10 text-lg font-semibold">{t("ownerPortal.listingTitle")}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>{t("ownerPortal.name")}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("explorer.barrioTitle")}</label>
              <input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Gràcia, Eixample…" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("ownerPortal.address")}</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Carrer de Còrsega, 327" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("club.music")}</label>
              <input value={form.music} onChange={(e) => setForm({ ...form, music: e.target.value })} placeholder="Techno, Reggaetón…" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("event.price")}</label>
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15–20 €" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("event.schedule")}</label>
              <input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="23:55-06:00" className={inputClass} />
              <p className="mt-1 text-xs text-zinc-400">{t("ownerPortal.hoursHint")}</p>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>{t("ownerPortal.openDays")}</label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day, i) => {
                  const active = form.open_days.includes(day)
                  // Etiqueta del día en el idioma activo (2024-01-01 fue lunes).
                  const label = new Date(2024, 0, 1 + i).toLocaleDateString(locale === "en" ? "en-GB" : locale === "ca" ? "ca-ES" : "es-ES", { weekday: "short" }).replace(".", "")
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setForm({ ...form, open_days: active ? form.open_days.filter((d) => d !== day) : [...form.open_days, day] })}
                      className={`${toggle(active)} capitalize`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>{t("ownerPortal.mainImage")}</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {form.image && <img src={form.image} alt={t("ownerPortal.preview")} className="h-20 w-20 shrink-0 rounded-ctl border border-white/10 object-cover" />}
                <div className="flex-1 space-y-2">
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder={t("ownerPortal.imageUrlPh")} className={inputClass} />
                  <label className={uploadBox(uploadingImage)}>
                    <Upload size={16} /> {uploadingImage ? t("ownerPortal.uploading") : t("ownerPortal.uploadImage")}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
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

            <div>
              <label className={labelClass}>{t("ownerPortal.capacity")}</label>
              <input value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} placeholder={t("ownerPortal.capacityPh")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("planPage.dresscode")}</label>
              <input value={form.dresscode} onChange={(e) => setForm({ ...form, dresscode: e.target.value })} placeholder="Casual, Smart casual…" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("planPage.stepVenueType")}</label>
              <select value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass}>
                {VENUE_TYPE_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {t(v.key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("ownerPortal.metroLines")}</label>
              <input value={form.metro_lines} onChange={(e) => setForm({ ...form, metro_lines: e.target.value })} placeholder="L1, L4" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("ownerPortal.nightBuses")}</label>
              <input value={form.night_buses} onChange={(e) => setForm({ ...form, night_buses: e.target.value })} placeholder="N0, N6" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t("ownerPortal.promo")}</label>
              <input value={form.discount_info} onChange={(e) => setForm({ ...form, discount_info: e.target.value })} placeholder={t("ownerPortal.promoPh")} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>{t("ownerPortal.freeEntry")}</label>
              <input value={form.free_entry_info} onChange={(e) => setForm({ ...form, free_entry_info: e.target.value })} placeholder={t("ownerPortal.freeEntryPh")} className={inputClass} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>{t("ownerPortal.features")}</label>
              <div className="flex flex-wrap gap-2">
                {features.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={!!form[opt.key]}
                    onClick={() => setForm({ ...form, [opt.key]: !form[opt.key] })}
                    className={toggle(!!form[opt.key])}
                  >
                    {opt.label}
                  </button>
                ))}
                {EXTRA_FEATURES.map((f) => {
                  const on = !!form.extras[f.field]
                  return (
                    <button
                      key={f.field}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setForm({ ...form, extras: { ...form.extras, [f.field]: !on } })}
                      className={toggle(on)}
                    >
                      {t(f.labelKey)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mt-8 flex items-center gap-4 rounded-card border border-white/10 bg-night/95 p-3 backdrop-blur md:bottom-4">
            <button onClick={saveChanges} disabled={saving} className={primaryBtn}>
              {saving ? t("profile.saving") : t("ownerPortal.saveChanges")}
            </button>
            {savedFlash && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-open" aria-live="polite">
                <Check size={16} /> {t("ownerPortal.saved")}
              </p>
            )}
          </div>

          <div className="mt-14 border-t border-white/10 pt-10">
            <h2 className="text-xl font-semibold">{t("ownerPortal.nightsTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-300">{t("ownerPortal.nightsIntro")}</p>

            <div className="mt-6">
              <button onClick={() => { setShowAddEventForm((v) => !v); setEditingEventId(null) }} className={showAddEventForm ? ghostBtn : primaryBtn}>
                {showAddEventForm ? t("ownerPortal.closeForm") : t("ownerPortal.newNight")}
              </button>
              {showAddEventForm && (
                <div className="mt-4 rounded-card border border-brand/30 bg-brand/5 p-5 sm:p-6">
                  <h3 className="mb-4 text-lg font-semibold">{t("ownerPortal.newNight")}</h3>
                  {renderEventForm(newEventForm, setNewEventForm, handleNewEventImageUpload)}
                  <div className="mt-5 flex gap-3">
                    <button onClick={addEvent} disabled={savingEvent} className={primaryBtn}>
                      {savingEvent ? t("profile.saving") : t("ownerPortal.createNight")}
                    </button>
                    <button onClick={() => { setShowAddEventForm(false); setNewEventForm(emptyEventForm) }} className={ghostBtn}>
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
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
