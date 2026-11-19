"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import Link from "next/link"
import { CalendarClock, CalendarDays, ExternalLink, EyeOff, Flame, Layers, Plus, Trash2, Upload, X, type LucideIcon } from "lucide-react"

import AdminShell from "../../../components/admin/AdminShell"
import { BTN_DANGER, BTN_GHOST, BTN_GHOST_SM, BTN_PRIMARY, FilterChip, Segmented, StatTile, Tag } from "../../../components/admin/ui"
import { EditSheet, Field, FieldGrid, FormSection, SearchBox, SheetTabs, ShowMore, SplitView, SwitchRow, Thumb } from "../../../components/admin/editor"

import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/fetchAll"
import { useAdminCity } from "../../../components/admin/AdminCity"
import { cityOfEvent, clubCityIndex, eventsOfCity } from "../../../lib/adminCity"
import { CITIES, type CityKey } from "../../../lib/cities"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { toast } from "../../../components/ui/Toast"
import CoordsField from "../../../components/admin/CoordsField"
import { coordsPayload, coordToInput } from "../../../lib/coords"
import { touchCache, eventPaths } from "../../../lib/touchCache"
import { createSlug } from "../../../lib/slug"
import { prepareImageForUpload, uploadFileName } from "../../../lib/compressImage"

// Rediseño (2/11/2026): esta pantalla solo tenía un buscador de texto sobre título, sala y artista,
// el formulario de alta siempre abierto, la lista ordenada con lo más antiguo arriba (para llegar a
// lo próximo había que bajar por todo lo pasado), botones en inglés, «Mostrar todos» / «Ocultar
// todos» sobre TODA la tabla y borrar sin preguntar. Ahora, como la de clubs:
//   - buscador (título, sala, artistas, música, dirección, fecha, n.º de ficha) que ignora tildes,
//   - filtros por fecha (próximos, pasados, sin fecha) y por estado (ocultos, destacados, anuales,
//     sin foto, sin ubicación...), cada uno con cuántos hay y cruzándose entre sí,
//   - orden por defecto: primero lo próximo (de más cerca a más lejos), luego lo pasado,
//   - alta plegable, edición con todos los campos rotulados y selectores de fecha y hora,
//   - «Publicar / Ocultar» solo sobre lo que se está viendo, y confirmación al borrar.

type Event = {
  id: number
  title: string
  slug?: string | null
  club_name: string | null
  artist: string | null
  music: string | null
  date: string | null
  date_end: string | null
  start_time: string | null
  end_time: string | null
  price: string | null
  ticket_url: string | null
  image: string | null
  description: string | null
  featured: boolean | null
  sold_out: boolean | null
  hidden: boolean | null
  vip_tables: boolean | null
  gallery: string[] | null
  manual_photos: boolean | null
  google_rating: number | null
  google_review_count: number | null
  recurring: boolean | null
  price_tiers: { label: string; price: string }[] | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

// Lo que se escribe en el formulario (alta y edición). Las coordenadas van como texto, igual que
// en CoordsField; la galería y las tarifas se convierten al guardar.
type EventDraft = {
  title: string
  club_name: string
  address: string
  artist: string
  music: string
  date: string
  date_end: string
  start_time: string
  end_time: string
  price: string
  ticket_url: string
  image: string
  description: string
  priceTiersRaw: string
  latitude: string
  longitude: string
  gallery: string[]
}

const emptyDraft: EventDraft = {
  title: "",
  club_name: "",
  address: "",
  artist: "",
  music: "",
  date: "",
  date_end: "",
  start_time: "",
  end_time: "",
  price: "",
  ticket_url: "",
  image: "",
  description: "",
  priceTiersRaw: "",
  latitude: "",
  longitude: "",
  gallery: [],
}

const PAGE_SIZE = 30

// Tarifas adicionales (VIP, día suelto, pack varios días...) además del precio general. Se editan
// como texto plano "Etiqueta:precio" separado por ";" en vez de una fila de inputs por tarifa, para
// no complicar el formulario — se guardan como JSON en price_tiers.
const parsePriceTiers = (raw: string): { label: string; price: string }[] =>
  raw
    .split(";")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [label, ...rest] = chunk.split(":")
      return { label: (label || "").trim(), price: rest.join(":").trim() }
    })
    .filter((t) => t.label && t.price)

const serializePriceTiers = (tiers: { label: string; price: string }[] | null | undefined): string =>
  Array.isArray(tiers) ? tiers.map((t) => `${t.label}:${t.price}`).join("; ") : ""

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Hoy en Barcelona (AAAA-MM-DD), para separar lo próximo de lo pasado.
const todayISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })

const day = (d: string | null | undefined) => (d || "").slice(0, 10)
const lastDay = (e: Event) => day(e.date_end) || day(e.date)
// Si la hora viene como «23:00:00» (columna de tipo hora) se enseña y se guarda como «23:00».
const hhmm = (t: string | null | undefined) => (/^\d{2}:\d{2}:\d{2}$/.test(t || "") ? (t as string).slice(0, 5) : t || "")

const fmtDate = (iso: string | null | undefined) => {
  const d = day(iso)
  if (!d) return null
  const parsed = new Date(`${d}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}
const fmtTimes = (e: Event) => {
  const a = (e.start_time || "").slice(0, 5)
  const b = (e.end_time || "").slice(0, 5)
  if (a && b) return `${a}–${b}`
  return a || b || null
}

// Sin tildes ni mayúsculas.
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

type PeriodKey = "all" | "upcoming" | "past" | "undated"
const PERIOD_LABEL: Record<PeriodKey, string> = {
  all: "Todas las fechas",
  upcoming: "Próximos",
  past: "Pasados",
  undated: "Sin fecha",
}
const PERIOD_ORDER: PeriodKey[] = ["all", "upcoming", "past", "undated"]
const periodTest = (k: PeriodKey, e: Event, today: string): boolean => {
  const end = lastDay(e)
  if (k === "all") return true
  if (k === "undated") return !day(e.date)
  if (!end) return false
  return k === "upcoming" ? end >= today : end < today
}

type StatusKey = "all" | "visible" | "hidden" | "featured" | "soldout" | "vip" | "annual" | "single" | "multiday" | "nophoto" | "nocoords" | "noticket"
const STATUS_LABEL: Record<StatusKey, string> = {
  all: "Todos los estados",
  visible: "Publicados",
  hidden: "Ocultos",
  featured: "🔥 Destacados",
  soldout: "🚫 Agotados",
  vip: "🛋️ Con mesa VIP",
  annual: "🔁 Anuales (festivales, fiestas mayores)",
  single: "1️⃣ Eventos únicos",
  multiday: "Varios días",
  nophoto: "Sin foto",
  nocoords: "Sin ubicación en el mapa",
  noticket: "Sin enlace de entradas",
}
const STATUS_ORDER: StatusKey[] = ["all", "visible", "hidden", "featured", "soldout", "vip", "annual", "single", "multiday", "nophoto", "nocoords", "noticket"]
const STATUS_TESTS: Record<StatusKey, (e: Event) => boolean> = {
  all: () => true,
  visible: (e) => !e.hidden,
  hidden: (e) => !!e.hidden,
  featured: (e) => !!e.featured,
  soldout: (e) => !!e.sold_out,
  vip: (e) => !!e.vip_tables,
  annual: (e) => e.recurring !== false,
  single: (e) => e.recurring === false,
  multiday: (e) => !!day(e.date_end) && day(e.date_end) !== day(e.date),
  nophoto: (e) => !e.image && !(Array.isArray(e.gallery) && e.gallery.length > 0),
  nocoords: (e) => e.latitude == null || e.longitude == null,
  noticket: (e) => !(e.ticket_url || "").trim(),
}

type SortKey = "smart" | "date_asc" | "date_desc" | "recent"

// Campos y chips: el estilo está en globals.css («ui-input», «ui-chip»), igual en todo el admin.
const inputClass = "ui-input"

// Pestañas de la ficha. «Estado» solo existe al editar (los interruptores se guardan al momento y un evento nuevo todavía no existe).
type SheetTab = "datos" | "fechas" | "fotos" | "estado"

// Filtros de estado que salen como botones con su cuenta; el resto van en el desplegable «Otro estado…».
const QUICK_STATUS: { key: StatusKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "visible", label: "Publicados" },
  { key: "hidden", label: "Ocultos" },
  { key: "featured", label: "Destacados" },
  { key: "nophoto", label: "Sin foto" },
  { key: "nocoords", label: "Sin ubicación" },
]

export default function AdminEventsPage() {
  // Admin por ciudad (15/11/2026): `allEvents` es todo lo que hay y `events`, solo lo de la ciudad elegida en el menú. La ciudad de un
  // evento sale de sus coordenadas y, si no las tiene, del local (lib/adminCity.ts). Todo lo demás de la pantalla trabaja con `events`.
  const [city, setCity] = useAdminCity()
  const cityName = CITIES[city].name
  const [allEvents, setEvents] = useState<Event[]>([])
  const [clubCities, setClubCities] = useState<Map<string, CityKey>>(() => new Map())
  const events = useMemo(() => eventsOfCity(allEvents, city, clubCities), [allEvents, city, clubCities])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<PeriodKey>("all")
  const [status, setStatus] = useState<StatusKey>("all")
  const [sort, setSort] = useState<SortKey>("smart")
  const [limit, setLimit] = useState(PAGE_SIZE)
  // Evento que se enseña siempre arriba aunque los filtros lo dejarían fuera: el que se acaba de
  // crear o el que se abre desde el botón «Editar» de la web (?edit=ID).
  const [focusId, setFocusId] = useState<number | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newDraft, setNewDraft] = useState<EventDraft>(emptyDraft)
  const [editDraft, setEditDraft] = useState<EventDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [sheetTab, setSheetTab] = useState<SheetTab>("datos")
  const [bulkOpen, setBulkOpen] = useState(false)

  const today = useMemo(() => todayISO(), [])

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }

      setCheckingAdmin(false)
    }

    checkAdmin()
  }, [])

  const fetchEvents = async () => {
    const [data, clubs] = await Promise.all([
      fetchAllPages((from, to) => supabase.from("events").select("*").order("date", { ascending: true }).order("id").range(from, to)),
      // Nombre, ciudad y coordenadas de los locales: para saber de qué ciudad es un evento que no tiene coordenadas.
      fetchAllPages((from, to) => supabase.from("clubs").select("id, name, city, latitude, longitude").order("id").range(from, to)),
    ])
    setClubCities(clubCityIndex((clubs || []) as { name: string; city: string | null; latitude: number | null; longitude: number | null }[]))
    setEvents((data || []) as Event[])
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Al cambiar de búsqueda, filtro u orden se vuelve a los primeros 30 y se suelta el evento fijado.
  useEffect(() => {
    setLimit(PAGE_SIZE)
    setFocusId(null)
  }, [search, period, status, sort])

  // Al cambiar de ciudad: se cierra el formulario de alta (el evento se habría creado para la ciudad equivocada), se limpian los filtros
  // y se cierra la edición abierta si ese evento no es de la ciudad nueva.
  const prevCity = useRef(city)
  useEffect(() => {
    if (prevCity.current === city) return
    prevCity.current = city
    setShowAddForm(false)
    setNewDraft(emptyDraft)
    setPeriod("all")
    setStatus("all")
    setFocusId(null)
    setEditingId((id) => {
      if (id == null) return id
      const open = allEvents.find((e) => e.id === id)
      return open && cityOfEvent(open, clubCities) === city ? id : null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  // ---------- Datos derivados (búsqueda, filtros, contadores y orden) ----------
  const rows = useMemo(
    () => events.map((e) => ({ e, hay: fold([e.title, e.club_name, e.artist, e.music, e.address, e.date, e.slug].filter(Boolean).join(" ")) })),
    [events]
  )

  const { filtered, periodCounts, statusCounts } = useMemo(() => {
    const tokens = fold(search).split(/\s+/).filter(Boolean)
    const matchSearch = (r: { e: Event; hay: string }) => tokens.every((t) => r.hay.includes(t) || String(r.e.id) === t.replace(/^#/, ""))

    // Cada contador tiene en cuenta el otro filtro y la búsqueda (no el suyo): al elegir «Próximos»,
    // los estados dicen cuántos próximos están ocultos, no cuántos eventos en total.
    const periodCounts = Object.fromEntries(PERIOD_ORDER.map((k) => [k, 0])) as Record<PeriodKey, number>
    const statusCounts = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0])) as Record<StatusKey, number>
    let list: Event[] = []
    for (const r of rows) {
      if (!matchSearch(r)) continue
      const okPeriod = periodTest(period, r.e, today)
      const okStatus = STATUS_TESTS[status](r.e)
      if (okStatus) for (const k of PERIOD_ORDER) if (periodTest(k, r.e, today)) periodCounts[k]++
      if (okPeriod) for (const k of STATUS_ORDER) if (STATUS_TESTS[k](r.e)) statusCounts[k]++
      if (okPeriod && okStatus) list.push(r.e)
    }

    const byDate = (a: Event, b: Event) => day(a.date).localeCompare(day(b.date)) || (a.start_time || "").localeCompare(b.start_time || "") || a.id - b.id
    if (sort === "date_asc") list = [...list].sort(byDate)
    else if (sort === "date_desc") list = [...list].sort((a, b) => byDate(b, a))
    else if (sort === "recent") list = [...list].sort((a, b) => b.id - a.id)
    else {
      // Primero lo próximo (el más cercano arriba), luego lo pasado (el más reciente arriba), al final lo que no tiene fecha.
      const group = (e: Event) => (!day(e.date) ? 2 : lastDay(e) >= today ? 0 : 1)
      list = [...list].sort((a, b) => {
        const ga = group(a)
        const gb = group(b)
        if (ga !== gb) return ga - gb
        return ga === 1 ? byDate(b, a) : byDate(a, b)
      })
    }
    return { filtered: list, periodCounts, statusCounts }
  }, [rows, search, period, status, sort, today])

  const totals = useMemo(
    () => ({
      total: events.length,
      upcoming: events.filter((e) => periodTest("upcoming", e, today)).length,
      featured: events.filter(STATUS_TESTS.featured).length,
      hidden: events.filter(STATUS_TESTS.hidden).length,
      // El sistema oculta las ediciones nuevas de los eventos anuales para que se revisen antes de publicarlas.
      hiddenUpcoming: events.filter((e) => e.hidden && periodTest("upcoming", e, today)).length,
    }),
    [events, today]
  )

  const isFiltered = !!search.trim() || period !== "all" || status !== "all"
  const clearFilters = () => { setSearch(""); setPeriod("all"); setStatus("all") }

  // ---------- Fotos ----------
  // Cambia solo los campos indicados del formulario (alta o edición).
  const patcher = (setDraft: Dispatch<SetStateAction<EventDraft>>) => (patch: Partial<EventDraft>) => setDraft((prev) => ({ ...prev, ...patch }))

  // Portada: se reduce y endereza como las de los clubs (lib/compressImage), se sube al bucket
  // event-images y se pone en el formulario; se guarda con el resto.
  // Si upload() lanza una excepción (red caída, bucket mal configurado...) no puede quedar
  // «uploading» en true para siempre: cualquier fallo se avisa y el estado siempre se libera.
  const uploadCover = async (e: ChangeEvent<HTMLInputElement>, setDraft: Dispatch<SetStateAction<EventDraft>>) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = "" // permite volver a elegir el mismo archivo
    if (!file) return
    setUploading(true)
    try {
      const prepared = await prepareImageForUpload(file)
      const filePath = `events/${uploadFileName("cover", prepared.ext)}`
      const { error } = await supabase.storage.from("event-images").upload(filePath, prepared.blob, { contentType: prepared.contentType })
      if (error) {
        logError("UPLOAD ERROR:", error)
        toast("Error al subir la imagen: " + error.message, 6000)
        return
      }
      const { data } = supabase.storage.from("event-images").getPublicUrl(filePath)
      setDraft((prev) => ({ ...prev, image: data.publicUrl }))
    } catch (err) {
      logError("UPLOAD ERROR:", err)
      toast("Error al subir la imagen: " + (err instanceof Error ? err.message : String(err)), 6000)
    } finally {
      setUploading(false)
    }
  }

  // Galería manual — fotos que subes tú a mano cuando el pipeline de Google no trae las correctas.
  // Usa el bucket «event-photos» (el mismo que usa el pipeline automático de Google), así que estas
  // fotos conviven con las automáticas. manual_photos se marca solo en cuanto hay al menos una.
  const uploadGallery = async (e: ChangeEvent<HTMLInputElement>, setDraft: Dispatch<SetStateAction<EventDraft>>) => {
    const input = e.target
    const files = Array.from(input.files || [])
    input.value = ""
    if (files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    let firstError: string | null = null
    try {
      for (const file of files) {
        try {
          const prepared = await prepareImageForUpload(file)
          const filePath = `admin/${uploadFileName("manual", prepared.ext)}`
          const { error } = await supabase.storage.from("event-photos").upload(filePath, prepared.blob, { contentType: prepared.contentType })
          if (error) {
            logError("GALLERY UPLOAD ERROR:", error)
            if (!firstError) firstError = error.message
            continue
          }
          urls.push(supabase.storage.from("event-photos").getPublicUrl(filePath).data.publicUrl)
        } catch (err) {
          logError("GALLERY UPLOAD ERROR:", err)
          if (!firstError) firstError = err instanceof Error ? err.message : String(err)
        }
      }
    } finally {
      setUploading(false)
    }
    if (urls.length > 0) setDraft((prev) => ({ ...prev, gallery: [...prev.gallery, ...urls] }))
    if (firstError) toast("Error al subir la foto a la galería: " + firstError, 6000)
  }

  // ---------- Crear, editar, borrar ----------
  const validateDraft = (d: EventDraft): string | null => {
    if (!d.title.trim()) return "Pon al menos el título"
    const start = d.date.trim()
    const end = d.date_end.trim()
    if (start && !ISO_DATE.test(start)) return "La fecha de inicio tiene que ser AAAA-MM-DD"
    if (end && !ISO_DATE.test(end)) return "La fecha de fin tiene que ser AAAA-MM-DD"
    if (start && end && end < start) return "La fecha de fin no puede ser anterior a la de inicio"
    return null
  }

  const draftToPayload = (d: EventDraft) => {
    const tiers = parsePriceTiers(d.priceTiersRaw)
    return {
      title: d.title.trim(),
      club_name: d.club_name.trim(),
      address: d.address.trim(),
      artist: d.artist.trim(),
      music: d.music.trim(),
      date: d.date.trim() || null,
      date_end: d.date_end.trim() || null,
      start_time: d.start_time.trim() || null,
      end_time: d.end_time.trim() || null,
      price: d.price.trim(),
      ticket_url: d.ticket_url.trim(),
      image: d.image.trim() || d.gallery[0] || "",
      description: d.description.trim(),
      gallery: d.gallery.length > 0 ? d.gallery : null,
      manual_photos: d.gallery.length > 0,
      price_tiers: tiers.length > 0 ? tiers : null,
      ...coordsPayload(d.latitude, d.longitude),
    }
  }

  const scrollToItem = (id: number) => {
    let tries = 0
    const timer = window.setInterval(() => {
      tries++
      const el = document.getElementById(`event-${id}`)
      if (el) {
        window.clearInterval(timer)
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" })
      } else if (tries > 40) {
        window.clearInterval(timer)
      }
    }, 150)
  }

  const addEvent = async () => {
    const problem = validateDraft(newDraft)
    if (problem) { toast(problem, 4000); return }
    // Si el evento no va a caer en la ciudad que estás viendo (por sus coordenadas o por el local), se avisa antes de crearlo:
    // si no, desaparecería de la lista y parecería que no se ha guardado.
    const lands = cityOfEvent({ club_name: newDraft.club_name, latitude: newDraft.latitude.trim() ? newDraft.latitude : null, longitude: newDraft.longitude.trim() ? newDraft.longitude : null }, clubCities)
    if (lands !== city) {
      const why = newDraft.latitude.trim() && newDraft.longitude.trim()
        ? "por sus coordenadas"
        : lands === "madrid" ? "porque el local es de Madrid" : "porque no tiene coordenadas ni un local de Madrid"
      if (!window.confirm(`Estás en ${cityName}, pero este evento se verá en ${CITIES[lands].name} ${why}.\n\n¿Crearlo igualmente?`)) return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from("events")
      .insert({ ...draftToPayload(newDraft), featured: false, sold_out: false, vip_tables: false })
      .select()
      .single()
    setSaving(false)

    if (error) {
      logError("Add event ERROR:", error)
      toast(`No se ha podido crear: ${error.message}`, 5000)
      return
    }

    if (data) {
      setEvents((prev) => [data, ...prev])
      touchCache(eventPaths(data.slug))
      setFocusId(data.id)
      scrollToItem(data.id)
    }
    toast("Evento creado")
    setNewDraft(emptyDraft)
    setShowAddForm(false)
  }

  const startEditing = (event: Event) => {
    setShowAddForm(false)
    setSheetTab("datos")
    setEditingId(event.id)
    setEditDraft({
      title: event.title || "",
      club_name: event.club_name || "",
      address: event.address || "",
      artist: event.artist || "",
      music: event.music || "",
      date: day(event.date),
      date_end: day(event.date_end),
      start_time: hhmm(event.start_time),
      end_time: hhmm(event.end_time),
      price: event.price || "",
      ticket_url: event.ticket_url || "",
      image: event.image || "",
      description: event.description || "",
      priceTiersRaw: serializePriceTiers(event.price_tiers),
      latitude: coordToInput(event.latitude),
      longitude: coordToInput(event.longitude),
      gallery: Array.isArray(event.gallery) ? event.gallery : [],
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditDraft(emptyDraft)
  }

  // Llegando desde el botón "Editar" de la ficha pública (/admin/events?edit=ID).
  const autoEditDone = useRef(false)
  useEffect(() => {
    if (autoEditDone.current || allEvents.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get("edit")
    autoEditDone.current = true
    if (!wanted) return
    // Entre todos los eventos: el botón «Editar» de una ficha pública puede ser de la otra ciudad, y entonces se cambia a ella.
    const ev = allEvents.find((e) => String(e.id) === wanted)
    if (!ev) return
    setCity(cityOfEvent(ev, clubCities))
    startEditing(ev)
    setFocusId(ev.id)
    scrollToItem(ev.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents])

  const saveEditing = async (id: number) => {
    const problem = validateDraft(editDraft)
    if (problem) { toast(problem, 4000); return }
    setSaving(true)
    const { data, error } = await supabase.from("events").update(draftToPayload(editDraft)).eq("id", id).select().single()
    setSaving(false)

    if (error) {
      logError("EDIT EVENT ERROR:", error)
      toast(`No se ha podido guardar: ${error.message}`, 5000)
      return
    }
    toast("Cambios guardados")

    if (data) {
      setEvents((prev) => prev.map((event) => (event.id === id ? data : event)))
      touchCache(eventPaths(data.slug))
    }

    cancelEditing()
  }

  const deleteEvent = async (event: Event) => {
    if (!window.confirm(`¿Borrar «${event.title}»? No se puede deshacer.`)) return
    const { error } = await supabase.from("events").delete().eq("id", event.id)
    if (error) {
      logError("DELETE EVENT ERROR:", error)
      toast(`No se ha podido borrar: ${error.message}`, 5000)
      return
    }
    setEvents((prev) => prev.filter((e) => e.id !== event.id))
    if (editingId === event.id) cancelEditing()
    touchCache(eventPaths(event.slug))
    toast("Evento borrado")
  }

  // Interruptores de cada evento (destacado, agotado, mesa VIP, anual, visible).
  const setFlag = async (event: Event, field: "featured" | "sold_out" | "vip_tables" | "recurring" | "hidden", value: boolean) => {
    const { error } = await supabase.from("events").update({ [field]: value }).eq("id", event.id)
    if (error) {
      logError("FLAG ERROR:", field, error)
      toast(`No se ha podido cambiar: ${error.message}`, 5000)
      return
    }
    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, [field]: value } : item)))
    touchCache(eventPaths(event.slug))
  }

  // Anual = se repite cada año (fiestas mayores, festivales). Cuando pasa la fecha, el cron le pone
  // automáticamente la fecha del año siguiente y lo oculta para que lo revises. Si lo desmarcas
  // (evento puntual, no se repite), el cron simplemente lo oculta cuando pase y no lo vuelve a tocar.
  const isAnnual = (e: Event) => e.recurring ?? true

  // ---------- Publicar / ocultar en bloque ----------
  // Antes «Mostrar todos» / «Ocultar todos» actuaban sobre TODA la tabla aunque se estuviera mirando
  // un solo mes. Ahora actúan solo sobre lo que sale con los filtros y la búsqueda actuales (los que
  // ya están como se pide no se tocan), siempre con confirmación.
  const scopeText = () => {
    const parts: string[] = []
    if (period !== "all") parts.push(PERIOD_LABEL[period].toLowerCase())
    if (status !== "all") parts.push(STATUS_LABEL[status].replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase())
    if (search.trim()) parts.push(`búsqueda «${search.trim()}»`)
    return parts.length ? parts.join(" · ") : `todos los de ${cityName}`
  }

  const bulkSetHidden = async (hidden: boolean) => {
    const targets = filtered.filter((e) => !!e.hidden !== hidden)
    if (targets.length === 0) {
      toast(hidden ? "Todo lo que ves ya está oculto" : "Todo lo que ves ya está publicado")
      return
    }
    const scope = scopeText()
    if (hidden) {
      const msg = `Vas a OCULTAR ${targets.length} eventos (${scope}). Nadie podrá verlos en la web hasta que los publiques otra vez.`
      if (targets.length >= 10) {
        if ((window.prompt(`${msg}\n\nEscribe OCULTAR para confirmar.`) || "").trim().toUpperCase() !== "OCULTAR") return
      } else if (!window.confirm(`${msg}\n\n¿Seguro?`)) return
    } else {
      const past = targets.filter((e) => periodTest("past", e, today)).length
      const warn = `${past > 0 ? ` Entre ellos hay ${past} que ya pasaron.` : ""} Los que el sistema deja ocultos para que los revises (las ediciones nuevas de eventos anuales) también se publicarían.`
      if (!window.confirm(`Vas a PUBLICAR ${targets.length} eventos (${scope}).${warn}\n\n¿Seguro?`)) return
    }
    setBulkBusy(true)
    const done = new Set<number>()
    try {
      const ids = targets.map((e) => e.id)
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100)
        const { error } = await supabase.from("events").update({ hidden }).in("id", chunk)
        if (error) {
          logError("BULK HIDDEN ERROR:", error)
          toast(`Error tras ${done.size} de ${ids.length}: ${error.message}`, 6000)
          break
        }
        chunk.forEach((id) => done.add(id))
      }
    } finally {
      setBulkBusy(false)
    }
    if (done.size > 0) {
      setEvents((prev) => prev.map((e) => (done.has(e.id) ? { ...e, hidden } : e)))
      touchCache(eventPaths())
      if (done.size === targets.length) toast(`${done.size} eventos ${hidden ? "ocultados" : "publicados"}`)
    }
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Verificando acceso…</p>
      </main>
    )
  }


  // ---------- Lista que se pinta ----------
  // Se pintan de 30 en 30; el evento fijado (recién creado o abierto con ?edit=ID) va siempre arriba.
  const focus = focusId != null ? events.find((e) => e.id === focusId) : undefined
  const rest = filtered.filter((e) => e.id !== focus?.id)
  const shownEvents = [...(focus ? [focus] : []), ...rest.slice(0, limit)]

  const editingEvent = editingId != null ? allEvents.find((e) => e.id === editingId) || null : null
  const sheetOpen = showAddForm || editingId != null
  const closeSheet = () => {
    if (showAddForm) {
      setShowAddForm(false)
      setNewDraft(emptyDraft)
    } else {
      cancelEditing()
    }
  }
  const openNew = () => {
    cancelEditing()
    setSheetTab("datos")
    setShowAddForm(true)
  }

  // Función (no componente): definida como componente dentro de la página se volvía a montar en
  // cada tecla y el campo perdía el foco al escribir.
  const renderForm = (draft: EventDraft, setDraft: Dispatch<SetStateAction<EventDraft>>, isNew: boolean) => {
    const set = patcher(setDraft)
    const tab: SheetTab = isNew && sheetTab === "estado" ? "datos" : sheetTab
    const photoCount = draft.gallery.length + (draft.image ? 1 : 0)
    return (
      <div>
        <div className="mb-6">
          <SheetTabs<SheetTab>
            label="Apartados de la ficha"
            value={tab}
            onChange={setSheetTab}
            tabs={[
              { value: "datos", label: "Datos" },
              { value: "fechas", label: "Fechas y entradas" },
              { value: "fotos", label: `Fotos${photoCount ? ` (${photoCount})` : ""}` },
              ...(isNew ? [] : [{ value: "estado" as const, label: "Estado" }]),
            ]}
          />
        </div>

        {tab === "datos" && (
          <FieldGrid>
            <Field wide label="Título *">
              <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Nombre del evento o festival" className={inputClass} />
            </Field>
            <Field label="Sala o recinto">
              <input value={draft.club_name} onChange={(e) => set({ club_name: e.target.value })} placeholder="Razzmatazz" className={inputClass} />
            </Field>
            <Field label="Dirección">
              <input value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="Carrer dels Almogàvers, 122" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <CoordsField
                latitude={draft.latitude}
                longitude={draft.longitude}
                address={draft.address}
                onChange={(latitude, longitude) => set({ latitude, longitude })}
                inputClassName={inputClass}
                labelClassName="ui-label"
              />
            </div>
            <Field label="Artistas">
              <input value={draft.artist} onChange={(e) => set({ artist: e.target.value })} placeholder="Artista 1, Artista 2" className={inputClass} />
            </Field>
            <Field label="Música">
              <input value={draft.music} onChange={(e) => set({ music: e.target.value })} placeholder="Techno, House…" className={inputClass} />
            </Field>
            <Field wide label="Descripción">
              <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={6} className={`${inputClass} resize-y`} />
            </Field>
          </FieldGrid>
        )}

        {tab === "fechas" && (
          <div className="space-y-7">
            <FormSection title="Cuándo" hint="Si dura varios días, pon también la fecha de fin.">
              <FieldGrid className="!grid-cols-2 !gap-x-3">
                <Field label="Fecha de inicio">
                  <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
                </Field>
                <Field label="Fecha de fin (opcional)">
                  <input type="date" value={draft.date_end} onChange={(e) => set({ date_end: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
                </Field>
                <Field label="Hora de inicio">
                  <input type="time" value={draft.start_time} onChange={(e) => set({ start_time: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
                </Field>
                <Field label="Hora de fin">
                  <input type="time" value={draft.end_time} onChange={(e) => set({ end_time: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
                </Field>
              </FieldGrid>
            </FormSection>
            <FormSection title="Entradas">
              <FieldGrid>
                <Field label="Precio">
                  <input value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="15€ o Gratis" className={inputClass} />
                </Field>
                <Field label="Enlace de entradas">
                  <input value={draft.ticket_url} onChange={(e) => set({ ticket_url: e.target.value })} placeholder="https://…" className={inputClass} />
                </Field>
                <Field wide label="Tarifas adicionales (opcional)" hint="Formato «Etiqueta:precio», separadas por punto y coma.">
                  <input value={draft.priceTiersRaw} onChange={(e) => set({ priceTiersRaw: e.target.value })} placeholder="VIP:40€; Día suelto:10€; Pack 3 días:25€" className={inputClass} />
                </Field>
              </FieldGrid>
            </FormSection>
          </div>
        )}

        {tab === "fotos" && (
          <div className="space-y-7">
            <FormSection title="Foto de portada" hint="La que sale en la lista y arriba de la ficha del evento.">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {draft.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.image} alt="Vista previa" className="h-28 w-40 shrink-0 rounded-2xl border border-white/15 object-cover" />
                ) : (
                  <div className="grid h-28 w-40 shrink-0 place-items-center rounded-2xl border border-dashed border-white/25 text-xs text-zinc-400">Sin foto</div>
                )}
                <div className="min-w-0 flex-1 space-y-3">
                  <input value={draft.image} onChange={(e) => set({ image: e.target.value })} placeholder="https://… (o sube una desde tu equipo)" aria-label="URL de la imagen" className={inputClass} />
                  <div className="flex flex-wrap gap-2">
                    <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition ${uploading ? "border-white/15 text-zinc-400" : "border-white/30 bg-white/[0.04] text-zinc-100 hover:border-brand-soft hover:bg-brand/10"}`}>
                      <Upload size={16} aria-hidden="true" />
                      {uploading ? "Subiendo…" : draft.image ? "Cambiar foto" : "Subir foto desde tu equipo"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => void uploadCover(e, setDraft)} />
                    </label>
                    {draft.image && (
                      <button type="button" onClick={() => set({ image: "" })} className={BTN_GHOST}>Quitar foto</button>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>
            <FormSection title={`Galería (${draft.gallery.length} foto${draft.gallery.length === 1 ? "" : "s"})`} hint="Fotos de debajo de la principal. Si dejas fotos aquí, las automáticas de Google ya no tocan este evento.">
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition ${uploading ? "border-white/15 text-zinc-400" : "border-white/30 bg-white/[0.04] text-zinc-100 hover:border-brand-soft hover:bg-brand/10"}`}>
                <Upload size={16} aria-hidden="true" />
                {uploading ? "Subiendo…" : "Añadir fotos a la galería"}
                <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => void uploadGallery(e, setDraft)} className="hidden" />
              </label>
              {draft.gallery.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {draft.gallery.map((url) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        aria-label="Quitar foto de la galería"
                        onClick={() => setDraft((prev) => ({ ...prev, gallery: prev.gallery.filter((u) => u !== url) }))}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/75 text-white ring-1 ring-white/30 transition hover:bg-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          </div>
        )}

        {tab === "estado" && editingEvent && (
          <div className="space-y-3">
            <p className="mb-1 text-xs leading-relaxed text-zinc-300/80">Estos interruptores se guardan al momento: no hace falta pulsar «Guardar cambios».</p>
            <SwitchRow
              tone="green"
              checked={!editingEvent.hidden}
              onChange={(v) => void setFlag(editingEvent, "hidden", !v)}
              title="Visible en la web"
              hint={editingEvent.hidden ? "Ahora está oculto: nadie lo ve en la web ni en el mapa." : "Sale en la lista de eventos y en las búsquedas."}
            />
            <SwitchRow tone="amber" checked={!!editingEvent.featured} onChange={(v) => void setFlag(editingEvent, "featured", v)} title="Destacado" hint="Lleva la etiqueta 🔥 de destacado." />
            <SwitchRow tone="red" checked={!!editingEvent.sold_out} onChange={(v) => void setFlag(editingEvent, "sold_out", v)} title="Agotado" hint="Marca el evento como agotado." />
            <SwitchRow checked={!!editingEvent.vip_tables} onChange={(v) => void setFlag(editingEvent, "vip_tables", v)} title="Con mesa VIP" hint="Indica que se pueden reservar mesas VIP." />
            <SwitchRow
              checked={isAnnual(editingEvent)}
              onChange={(v) => void setFlag(editingEvent, "recurring", v)}
              title="Se repite cada año"
              hint="Festivales y fiestas mayores: al pasar la fecha, el sistema pone la del año siguiente y lo oculta para que lo revises. Si lo apagas, es un evento único: al pasar solo se oculta."
            />
            <p className="pt-2 text-xs text-zinc-400">Ficha n.º {editingEvent.id}</p>
          </div>
        )}
      </div>
    )
  }

  const sheet = sheetOpen ? (
    <EditSheet
      title={showAddForm ? "Nuevo evento" : `Editando: ${editingEvent?.title ?? ""}`}
      subtitle={showAddForm ? `Se creará en ${cityName}` : [fmtDate(editingEvent?.date), editingEvent?.club_name].filter(Boolean).join(" · ")}
      onClose={closeSheet}
      links={
        !showAddForm && editingEvent ? (
          <Link href={`/event/${editingEvent.slug || createSlug(editingEvent.title)}`} target="_blank" className={`${BTN_GHOST_SM} hidden sm:inline-flex`}>
            Ver ficha <ExternalLink size={13} aria-hidden="true" />
          </Link>
        ) : null
      }
      footer={
        showAddForm ? (
          <>
            <button type="button" onClick={closeSheet} className={BTN_GHOST}>Cancelar</button>
            <button type="button" onClick={addEvent} disabled={saving || uploading} aria-busy={saving} className={`${BTN_PRIMARY} ml-auto`}>
              {saving ? "Guardando…" : "Guardar evento"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => editingEvent && void deleteEvent(editingEvent)} className={BTN_DANGER}>
              <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Borrar</span><span className="sr-only sm:hidden">Borrar evento</span>
            </button>
            <button type="button" onClick={cancelEditing} className={`${BTN_GHOST} ml-auto`}>Cancelar</button>
            <button type="button" onClick={() => editingEvent && saveEditing(editingEvent.id)} disabled={saving || uploading} aria-busy={saving} className={BTN_PRIMARY}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        )
      }
    >
      {showAddForm ? renderForm(newDraft, setNewDraft, true) : renderForm(editDraft, setEditDraft, false)}
    </EditSheet>
  ) : null

  const quickStatusKeys = new Set<StatusKey>(QUICK_STATUS.map((q) => q.key))

  const list = (
    <div>
      {/* Buscador y alta */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar eventos…" label="Buscar eventos por título, sala, artista o fecha" className="min-w-0 flex-1" />
        <button type="button" onClick={openNew} className={`${BTN_PRIMARY} shrink-0`}>
          <Plus size={17} aria-hidden="true" /> Añadir evento
        </button>
      </div>

      {/* Cuándo */}
      <div className="mb-3">
        <Segmented<PeriodKey>
          label="Filtrar por fecha"
          value={period}
          onChange={setPeriod}
          options={PERIOD_ORDER.map((k) => ({ value: k, label: k === "all" ? "Todas" : PERIOD_LABEL[k], count: periodCounts[k] }))}
        />
      </div>

      {/* Estado, con cuántos eventos hay en cada uno */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {QUICK_STATUS.map((q) => (
          <FilterChip key={q.key} active={status === q.key} onClick={() => setStatus(q.key)} count={statusCounts[q.key]}>
            {q.label}
          </FilterChip>
        ))}
        <select
          value={quickStatusKeys.has(status) ? "" : status}
          onChange={(e) => setStatus((e.target.value || "all") as StatusKey)}
          aria-label="Filtrar por otro estado"
          className="ui-input ui-input-flat !min-h-[36px] !w-auto !rounded-full !py-1.5 !pl-3.5 !text-[13px] font-semibold"
        >
          <option value="">Otro estado…</option>
          {STATUS_ORDER.filter((k) => !quickStatusKeys.has(k)).map((k) => (
            <option key={k} value={k}>{STATUS_LABEL[k]} ({statusCounts[k]})</option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-zinc-300/80">
          <strong className="font-extrabold text-white">{filtered.length}</strong> de {events.length} eventos
          {isFiltered && (
            <button type="button" onClick={clearFilters} className="ml-3 font-bold text-brand-soft underline-offset-2 hover:underline">Quitar filtros</button>
          )}
        </p>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" className="ui-input ui-input-flat !min-h-[36px] !w-auto !py-1.5 !pl-3.5 !text-[13px] font-semibold">
            <option value="smart">Próximos primero</option>
            <option value="date_asc">Fecha: antiguo a nuevo</option>
            <option value="date_desc">Fecha: nuevo a antiguo</option>
            <option value="recent">Últimos añadidos</option>
          </select>
          <button type="button" onClick={() => setBulkOpen((o) => !o)} aria-expanded={bulkOpen} className={BTN_GHOST_SM}>
            <Layers size={14} aria-hidden="true" /> En bloque
          </button>
        </div>
      </div>

      {bulkOpen && (
        <div className="ui-card mb-5 p-5">
          <p className="text-sm font-extrabold text-white">Publicar u ocultar lo que estás viendo</p>
          <p className="mt-1 text-xs text-zinc-300/80">
            Solo afecta a los {filtered.length} eventos de la lista ({scopeText()}). Pide confirmación antes de cambiar nada.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => bulkSetHidden(false)} disabled={bulkBusy || filtered.length === 0} className={BTN_GHOST_SM}>
              Publicar {isFiltered ? `los ${filtered.length}` : "todos"}
            </button>
            <button type="button" onClick={() => bulkSetHidden(true)} disabled={bulkBusy || filtered.length === 0} className={`${BTN_DANGER} ui-btn-sm`}>
              Ocultar {isFiltered ? `los ${filtered.length}` : "todos"}
            </button>
            {bulkBusy && <span className="text-xs text-zinc-400">Aplicando…</span>}
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-sm text-zinc-300">Cargando eventos…</p>
      ) : (
        <>
          <ul className="grid gap-2.5">
            {shownEvents.map((event) => {
              const open = editingId === event.id
              const past = periodTest("past", event, today)
              const start = fmtDate(event.date)
              const end = event.date_end && day(event.date_end) !== day(event.date) ? fmtDate(event.date_end) : null
              const times = fmtTimes(event)
              const when = start ? `${start}${end ? ` → ${end}` : ""}${times ? ` · ${times}` : ""}` : "Sin fecha"
              const hasCoords = event.latitude != null && event.longitude != null
              return (
                <li key={event.id} id={`event-${event.id}`}>
                  <div className={`ui-item ${open ? "ui-item-on" : ""} ${event.hidden && !open ? "ui-item-dim" : ""}`}>
                    <button type="button" onClick={() => startEditing(event)} aria-label={`Editar ${event.title}`} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <Thumb src={event.image} name={event.title} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold text-white">{event.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-300/80">{when}</span>
                        {(event.club_name || event.artist) && (
                          <span className="block truncate text-xs text-zinc-400">{[event.club_name, event.artist].filter(Boolean).join(" · ")}</span>
                        )}
                        <span className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                          {event.featured && <Tag tone="amber">Destacado</Tag>}
                          {event.sold_out && <Tag tone="red">Agotado</Tag>}
                          {event.vip_tables && <Tag tone="violet">Mesa VIP</Tag>}
                          {past && <Tag>Pasado</Tag>}
                          {STATUS_TESTS.nophoto(event) && <Tag tone="amber">Sin foto</Tag>}
                          {!hasCoords && <Tag tone="red">Sin ubicación</Tag>}
                        </span>
                      </span>
                    </button>
                    {/* Interruptor rápido de visibilidad: lo más usado, sin abrir la ficha. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!event.hidden}
                      aria-label={`${event.title}: ${event.hidden ? "oculto, pulsa para publicarlo" : "publicado, pulsa para ocultarlo"}`}
                      onClick={() => void setFlag(event, "hidden", !event.hidden)}
                      className="flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-1"
                    >
                      <span className="ui-switch" data-on={!event.hidden} data-tone="green" aria-hidden="true" />
                      <span className={`text-[11px] font-bold ${event.hidden ? "text-zinc-400" : "text-open"}`}>{event.hidden ? "Oculto" : "Visible"}</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {shownEvents.length === 0 && (
            <div className="ui-card px-6 py-14 text-center">
              <p className="text-sm font-bold text-white">No hay eventos con este filtro</p>
              <p className="mt-1 text-xs text-zinc-300/80">Prueba con otra búsqueda o quita los filtros.</p>
              {isFiltered && <button type="button" onClick={clearFilters} className={`${BTN_GHOST_SM} mt-4`}>Quitar búsqueda y filtros</button>}
            </div>
          )}
          <ShowMore shown={Math.min(limit, rest.length) + (focus ? 1 : 0)} total={rest.length + (focus ? 1 : 0)} step={PAGE_SIZE} onMore={() => setLimit((l) => l + PAGE_SIZE)} />
        </>
      )}
    </div>
  )

  const statCards: { label: string; value: number; accent: "violet" | "cyan" | "coral" | "pink"; icon: LucideIcon; active: boolean; apply: () => void }[] = [
    { label: "Total", value: totals.total, accent: "violet", icon: CalendarDays, active: period === "all" && status === "all", apply: clearFilters },
    { label: "Próximos", value: totals.upcoming, accent: "cyan", icon: CalendarClock, active: period === "upcoming" && status === "all", apply: () => { setPeriod("upcoming"); setStatus("all") } },
    { label: "Destacados", value: totals.featured, accent: "coral", icon: Flame, active: period === "all" && status === "featured", apply: () => { setPeriod("all"); setStatus("featured") } },
    { label: "Ocultos", value: totals.hidden, accent: "pink", icon: EyeOff, active: period === "all" && status === "hidden", apply: () => { setPeriod("all"); setStatus("hidden") } },
  ]

  return (
    <AdminShell title="Eventos y festivales" subtitle="Crea, edita y gestiona los eventos y festivales.">
      <>
        {/* Cifras: pulsa una para filtrar la lista */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((st) => (
            <StatTile key={st.label} accent={st.accent} icon={st.icon} label={st.label} value={st.value} active={st.active && !search.trim()} onClick={st.apply} />
          ))}
        </div>

        {/* Pendientes de revisar: lo que el sistema deja oculto al pasar a la edición del año siguiente */}
        {totals.hiddenUpcoming > 0 && (
          <div className="ui-card mb-6 flex flex-wrap items-center gap-3 !border-amber-400/35 !bg-amber-400/[0.07] px-5 py-4">
            <p className="min-w-0 flex-1 text-sm text-amber-100">
              {totals.hiddenUpcoming} {totals.hiddenUpcoming === 1 ? "evento próximo está oculto" : "eventos próximos están ocultos"}. Las ediciones nuevas de los eventos anuales se ocultan solas para que las revises antes de publicarlas.
            </p>
            <button type="button" onClick={() => { setSearch(""); setPeriod("upcoming"); setStatus("hidden") }} className={BTN_GHOST_SM}>
              Revisarlos
            </button>
          </div>
        )}

        <SplitView list={list} sheet={sheet} />
      </>
    </AdminShell>
  )
}
