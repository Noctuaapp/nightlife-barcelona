"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

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

const LIVE_STATUS_OPTIONS = [
  { key: "tranquilo", label: "Tranquilo", emoji: "🟢", color: "bg-emerald-500" },
  { key: "animado", label: "Animado", emoji: "🟡", color: "bg-amber-500" },
  { key: "lleno", label: "Lleno / cola", emoji: "🔴", color: "bg-red-500" },
] as const

function timeAgoEs(iso: string | null | undefined): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.round(ms / 60000))
  if (mins < 1) return "justo ahora"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  return `hace ${hours} h`
}

const VENUE_TYPE_OPTIONS = ["Discoteca", "Pub", "Bar musical"]
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
  rating: form.rating.trim() ? Number(form.rating.trim()) : null,
  people: form.people.trim(),
  dress_code: form.dresscode.trim(),
  terrace: form.terrace,
  smoking_area: form.smoking_area,
  table_booking: form.table_booking,
  lgtbi_friendly: form.lgtbi_friendly,
  // verified y trending no se tocan desde aquí: se reenvía el valor que ya tenía el club, sin
  // exponer ningún control para cambiarlo (ver nota arriba).
  verified: form.verified,
  trending: form.trending,
  vip_tables: form.vip_tables,
  sold_out: form.sold_out,
  hidden: form.hidden,
  venue_type: form.venue_type,
  open_days: form.open_days.length ? form.open_days : null,
  metro_lines: form.metro_lines.trim(),
  night_buses: form.night_buses.trim(),
  has_foosball: form.has_foosball,
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

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        window.location.href = "/login"
        return
      }
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle()

      if (error) {
        setLoadErrorMsg(error.message)
      } else if (!data) {
        setNotLinked(true)
      } else {
        setClub(data as Club)
        setForm(clubToForm(data as Club))
        const { data: eventsData } = await supabase
          .from("club_events")
          .select("*")
          .eq("club_id", data.id)
          .order("date", { ascending: true })
        setEvents(eventsData || [])
      }
      setCheckingAccess(false)
    }
    load()
  }, [])

  const eventFormToPayload = (form: EventFormData, clubId: number, clubName: string) => ({
    club_id: clubId,
    club_name: clubName,
    title: form.title.trim(),
    artist: form.artist.trim(),
    music: form.music.trim(),
    date: form.date || null,
    start_time: form.start_time,
    end_time: form.end_time,
    price: form.price,
    ticket_url: form.ticket_url,
    image: form.image,
    description: form.description,
    age_min: form.age_min || 18,
    sold_out: form.sold_out,
  })

  const uploadEventImage = async (file: File) => {
    setUploadingEventImage(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const { error } = await supabase.storage.from("event-photos").upload(fileName, file)
    setUploadingEventImage(false)
    if (error) { alert("Error al subir la imagen: " + error.message); return null }
    const { data } = supabase.storage.from("event-photos").getPublicUrl(fileName)
    return data.publicUrl
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
    if (!newEventForm.title.trim()) { alert("Escribe un título para la noche"); return }
    setSavingEvent(true)
    const { data, error } = await supabase.from("club_events").insert(eventFormToPayload(newEventForm, club.id, club.name)).select().single()
    setSavingEvent(false)
    if (error) { alert("Error al crear la noche: " + error.message); return }
    if (data) setEvents((prev) => [...prev, data].sort((a, b) => (a.date || "").localeCompare(b.date || "")))
    setNewEventForm(emptyEventForm)
    setShowAddEventForm(false)
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
    if (!editEventForm.title.trim()) { alert("Escribe un título para la noche"); return }
    setSavingEvent(true)
    const { data, error } = await supabase.from("club_events").update(eventFormToPayload(editEventForm, club.id, club.name)).eq("id", id).select().single()
    setSavingEvent(false)
    if (error) { alert("Error al guardar los cambios: " + error.message); return }
    if (data) setEvents((prev) => prev.map((e) => (e.id === id ? data : e)))
    setEditingEventId(null)
  }

  const deleteEvent = async (id: number) => {
    if (!confirm("¿Seguro que quieres borrar esta noche?")) return
    const { error } = await supabase.from("club_events").delete().eq("id", id)
    if (error) { alert("Error al borrar: " + error.message); return }
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  const saveChanges = async () => {
    if (!club || !form) return
    if (!form.name.trim()) {
      alert("El nombre del club es obligatorio")
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from("clubs")
      .update(formToPayload(form))
      .eq("id", club.id)
      .select()
      .maybeSingle()
    setSaving(false)
    if (error) {
      alert("Error al guardar los cambios: " + error.message)
      return
    }
    if (data) {
      setClub(data as Club)
      setForm(clubToForm(data as Club))
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3000)
  }

  // Estado en directo (cola/aforo). Se guarda al instante al tocar un botón — no espera a
  // "Guardar cambios" porque esto es información que caduca en minutos, no una ficha que se
  // revisa una vez. club_id ya identifica el club del dueño, así que no hace falta más que
  // escribir live_status + un timestamp; ClubPageContent decide si está "reciente" (4h) para
  // mostrarlo como en directo o descartarlo.
  const setLiveStatus = async (status: string) => {
    if (!club) return
    setUpdatingStatus(true)
    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from("clubs")
      .update({ live_status: status, live_status_updated_at: nowIso })
      .eq("id", club.id)
      .select()
      .maybeSingle()
    setUpdatingStatus(false)
    if (error) {
      alert("Error al actualizar el estado: " + error.message)
      return
    }
    setClub((data as Club) || { ...club, live_status: status, live_status_updated_at: nowIso })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !form) return
    setUploadingImage(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `club-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from("club-images").upload(fileName, file)
    if (uploadError) {
      alert("Error al subir la imagen: " + uploadError.message)
      setUploadingImage(false)
      e.target.value = ""
      return
    }
    const { data } = supabase.storage.from("club-images").getPublicUrl(fileName)
    setForm({ ...form, image: data.publicUrl })
    setUploadingImage(false)
    e.target.value = ""
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !form) return
    setUploadingGallery(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop()
      const fileName = `owner/manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const { error } = await supabase.storage.from("club-photos").upload(fileName, file)
      if (error) continue
      const { data } = supabase.storage.from("club-photos").getPublicUrl(fileName)
      urls.push(data.publicUrl)
    }
    setUploadingGallery(false)
    if (urls.length > 0) setForm({ ...form, gallery: [...form.gallery, ...urls] })
    e.target.value = ""
  }

  const removeGalleryPhoto = (url: string) => {
    if (!form) return
    setForm({ ...form, gallery: form.gallery.filter((u) => u !== url) })
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5"

  const renderEventForm = (
    eventForm: EventFormData,
    setEventForm: (f: EventFormData) => void,
    handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void
  ) => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className={labelClass}>Título de la noche *</label>
        <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Ej. Techno Fridays" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Artista</label>
        <input value={eventForm.artist} onChange={(e) => setEventForm({ ...eventForm, artist: e.target.value })} placeholder="DJ o artista principal" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Música</label>
        <input value={eventForm.music} onChange={(e) => setEventForm({ ...eventForm, music: e.target.value })} placeholder="Techno, House..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Fecha</label>
        <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Precio</label>
        <input value={eventForm.price} onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })} placeholder="15€" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Hora de inicio</label>
        <input value={eventForm.start_time} onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })} placeholder="23:55" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Hora de fin</label>
        <input value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} placeholder="06:00" className={inputClass} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Enlace de entradas</label>
        <input value={eventForm.ticket_url} onChange={(e) => setEventForm({ ...eventForm, ticket_url: e.target.value })} placeholder="https://..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Edad mínima</label>
        <div className="flex gap-2">
          {ageLevels.map((age) => (
            <button key={age} type="button" onClick={() => setEventForm({ ...eventForm, age_min: age })}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${eventForm.age_min === age ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
              +{age}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-end">
        <button type="button" onClick={() => setEventForm({ ...eventForm, sold_out: !eventForm.sold_out })}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${eventForm.sold_out ? "bg-red-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
          🚫 Sold out
        </button>
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Imagen de la noche</label>
        <input value={eventForm.image} onChange={(e) => setEventForm({ ...eventForm, image: e.target.value })} placeholder="https://... (o sube una abajo)" className={inputClass} />
        <label className={`mt-2 block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingEventImage ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
          {uploadingEventImage ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
          <input type="file" accept="image/*" className="hidden" disabled={uploadingEventImage} onChange={handleImageUpload} />
        </label>
        {eventForm.image && <img src={eventForm.image} alt="Vista previa" className="mt-3 h-32 w-full rounded-xl object-cover" />}
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Descripción</label>
        <textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Descripción de la noche" className={`min-h-[100px] ${inputClass}`} />
      </div>
    </div>
  )

  if (checkingAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Verificando acceso...</p>
      </main>
    )
  }

  if (loadErrorMsg) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
          <p className="text-lg font-black">No se ha podido cargar tu ficha</p>
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
        <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-black px-6 text-center text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-4xl">🏛️</div>
          <h1 className="text-3xl font-black tracking-tight">Aún no tienes un club vinculado</h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            Si eres el responsable de un local en Noctua y quieres gestionar tu propia ficha, cuéntanoslo y te activamos el acceso.
          </p>
          <Link
            href="/contact?type=owner_access&subject=Quiero%20gestionar%20mi%20club%20en%20Noctua"
            className="mt-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-105"
          >
            Contactar con Noctua
          </Link>
          <Link href="/" className="text-sm text-zinc-500 underline transition hover:text-zinc-300">
            Volver a Noctua
          </Link>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 pt-14 text-white">
        <section className="mx-auto max-w-3xl px-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Portal de club</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{club.name}</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400">
            Gestiona la información de tu ficha en Noctua. Los cambios se publican en cuanto los guardas.
          </p>

          {/* Estado en directo: lo único de esta página que se publica al instante, sin botón de
              "Guardar". Es la señal más valiosa que puede dar un local — cómo está la cola AHORA
              mismo — y solo la tiene el propio local, así que la aislamos del resto del formulario. */}
          <div className="mt-8 rounded-[28px] border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-widest text-emerald-300">Estado en directo</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Dile a la gente cómo está la cola ahora mismo. Se muestra en tu ficha durante 4 horas, luego desaparece solo.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {LIVE_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => setLiveStatus(opt.key)}
                  className={`rounded-full px-5 py-3 text-sm font-black transition disabled:opacity-50 ${
                    club.live_status === opt.key
                      ? `${opt.color} text-white`
                      : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
            {club.live_status && club.live_status_updated_at && (
              <p className="mt-3 text-xs text-zinc-500">
                Marcado como <strong className="text-zinc-300">{LIVE_STATUS_OPTIONS.find((o) => o.key === club.live_status)?.label}</strong>
                {" "}· {timeAgoEs(club.live_status_updated_at)}
              </p>
            )}
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del club" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Barrio</label>
              <input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Gràcia, Eixample..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Carrer de Còrsega, 327" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Música</label>
              <input value={form.music} onChange={(e) => setForm({ ...form, music: e.target.value })} placeholder="Techno, Reggaetón..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Precio</label>
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15-20€" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Horario</label>
              <input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="23:55 - 06:00" className={inputClass} />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Imagen principal</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {form.image && (
                  <img src={form.image} alt="Vista previa" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-white/10" />
                )}
                <div className="flex-1 space-y-2">
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... (o sube una desde tu ordenador)" className={inputClass} />
                  <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingImage ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
                    {uploadingImage ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Galería ({form.gallery.length} foto{form.gallery.length === 1 ? "" : "s"})
                {form.gallery.length > 0 && <span className="ml-2 normal-case font-normal text-zinc-600">— quita las que no encajen con la ✕</span>}
              </label>
              <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingGallery ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
                {uploadingGallery ? "Subiendo..." : "📁 Añadir fotos a la galería"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingGallery} onChange={handleGalleryUpload} />
              </label>
              {form.gallery.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {form.gallery.map((url) => (
                    <div key={url} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryPhoto(url)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Rating</label>
              <input value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="4.5" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Aforo / gente</label>
              <input value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} placeholder="Ej. 500 personas" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dress code</label>
              <input value={form.dresscode} onChange={(e) => setForm({ ...form, dresscode: e.target.value })} placeholder="Elegante, casual..." className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tipo de local</label>
              <select value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} className={inputClass}>
                {VENUE_TYPE_OPTIONS.map((v) => (
                  <option key={v} value={v} className="bg-black text-white">{v}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Días que abre (vacío = sin dato)</label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const active = form.open_days.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          open_days: active ? form.open_days.filter((d) => d !== day) : [...form.open_days, day],
                        })
                      }
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${active ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className={labelClass}>Líneas de metro cercanas (separadas por comas)</label>
              <input value={form.metro_lines} onChange={(e) => setForm({ ...form, metro_lines: e.target.value })} placeholder="L1, L4" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Buses nocturnos cercanos (separados por comas)</label>
              <input value={form.night_buses} onChange={(e) => setForm({ ...form, night_buses: e.target.value })} placeholder="N0, N6" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Descuento o promo de hoy (vacío = ninguno)</label>
              <input value={form.discount_info} onChange={(e) => setForm({ ...form, discount_info: e.target.value })} placeholder="2x1 en copas hasta las 02:00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Entrada gratis — condiciones (vacío = ninguna)</label>
              <input value={form.free_entry_info} onChange={(e) => setForm({ ...form, free_entry_info: e.target.value })} placeholder="Gratis para chicas hasta las 00:30" className={inputClass} />
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
              {[
                { key: "terrace" as const, label: "🌿 Terraza" },
                { key: "smoking_area" as const, label: "🚬 Zona fumadores" },
                { key: "table_booking" as const, label: "🍾 Reserva de mesas" },
                { key: "vip_tables" as const, label: "🛋️ Mesa VIP" },
                { key: "has_foosball" as const, label: "🎱 Futbolín/Billar" },
                { key: "lgtbi_friendly" as const, label: "🏳️‍🌈 LGTBI+" },
                { key: "sold_out" as const, label: "🚫 Sold out (hoy)" },
                { key: "hidden" as const, label: "👁️ Ocultar mi ficha" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setForm({ ...form, [opt.key]: !form[opt.key] })}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${form[opt.key] ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="rounded-full bg-purple-500 px-8 py-4 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {savedFlash && <p className="text-sm font-bold text-emerald-400">✓ Cambios guardados</p>}
          </div>

          {/* Noches del club */}
          <div className="mt-16 border-t border-white/10 pt-10">
            <h2 className="text-2xl font-black tracking-tight">Noches de {club.name}</h2>
            <p className="mt-2 text-sm text-zinc-400">Crea y edita las noches de tu club. Se publican en cuanto las guardas.</p>

            <div className="mt-6">
              <button
                onClick={() => { setShowAddEventForm((v) => !v); setEditingEventId(null) }}
                className={`w-full rounded-2xl px-6 py-4 text-sm font-black transition md:w-auto ${showAddEventForm ? "bg-white text-black" : "bg-purple-500 text-white hover:bg-purple-400"}`}
              >
                {showAddEventForm ? "✕ Cerrar formulario" : "+ Nueva noche"}
              </button>
              {showAddEventForm && (
                <div className="mt-4 rounded-[24px] border border-purple-500/30 bg-purple-500/[0.04] p-6">
                  <h3 className="mb-4 text-lg font-black">Nueva noche</h3>
                  {renderEventForm(newEventForm, setNewEventForm, handleNewEventImageUpload)}
                  <div className="mt-5 flex gap-3">
                    <button onClick={addEvent} disabled={savingEvent} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                      {savingEvent ? "Guardando..." : "Crear noche"}
                    </button>
                    <button onClick={() => { setShowAddEventForm(false); setNewEventForm(emptyEventForm) }} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {events.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-500">Todavía no tienes ninguna noche creada.</p>
            ) : (
              <div className="mt-8 grid gap-6">
                {events.map((event) => (
                  <div key={event.id} className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
                    {editingEventId === event.id ? (
                      <div>
                        <h3 className="mb-4 text-lg font-black">Editando: {event.title}</h3>
                        {renderEventForm(editEventForm, setEditEventForm, handleEditEventImageUpload)}
                        <div className="mt-5 flex gap-3">
                          <button onClick={() => saveEditEvent(event.id)} disabled={savingEvent} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                            {savingEvent ? "Guardando..." : "Guardar cambios"}
                          </button>
                          <button onClick={cancelEditEvent} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          {event.image && <img src={event.image} alt={event.title} className="mb-4 h-40 w-full rounded-2xl object-cover lg:w-80" />}
                          <h3 className="text-2xl font-black">{event.title}</h3>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">📅 {event.date || "TBA"}</span>
                            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">🕒 {event.start_time || "TBA"}</span>
                            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">🎟 {event.price || "TBA"}</span>
                            {event.sold_out && <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs text-red-300">🚫 Sold out</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button onClick={() => startEditEvent(event)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">
                            ✏️ Editar
                          </button>
                          <button onClick={() => deleteEvent(event.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500 hover:text-white">
                            🗑️ Borrar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
