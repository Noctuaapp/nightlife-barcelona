"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import Link from "next/link"
import { CalendarClock, CalendarDays, EyeOff, Flame, type LucideIcon } from "lucide-react"

import AdminShell from "../../../components/admin/AdminShell"
import { StatTile } from "../../../components/admin/ui"

import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/fetchAll"
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

const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-brand/60 transition placeholder:text-zinc-400"
const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1.5"
const selectClass = "rounded-2xl border border-white/10 bg-surface px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-brand/60"

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([])
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
    const data = await fetchAllPages((from, to) => supabase.from("events").select("*").order("date", { ascending: true }).order("id").range(from, to))
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
    if (autoEditDone.current || events.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get("edit")
    autoEditDone.current = true
    if (!wanted) return
    const ev = events.find((e) => String(e.id) === wanted)
    if (!ev) return
    startEditing(ev)
    setFocusId(ev.id)
    scrollToItem(ev.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events])

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
    return parts.length ? parts.join(" · ") : "toda la web"
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
  const focus = focusId != null ? events.find((e) => e.id === focusId) : undefined
  const rest = filtered.filter((e) => e.id !== focus?.id)
  const shown = [...(focus ? [focus] : []), ...rest.slice(0, limit)]
  const remaining = Math.max(0, rest.length - limit)

  // Función (no componente): definida como componente dentro de la página se volvía a montar en
  // cada tecla y el campo perdía el foco al escribir.
  const renderForm = (draft: EventDraft, setDraft: Dispatch<SetStateAction<EventDraft>>) => {
    const set = patcher(setDraft)
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>Título *</label>
          <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Nombre del evento o festival" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sala o recinto</label>
          <input value={draft.club_name} onChange={(e) => set({ club_name: e.target.value })} placeholder="Razzmatazz" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Dirección</label>
          <input value={draft.address} onChange={(e) => set({ address: e.target.value })} placeholder="Carrer dels Almogàvers, 122" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Artistas</label>
          <input value={draft.artist} onChange={(e) => set({ artist: e.target.value })} placeholder="Artista 1, Artista 2" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Música</label>
          <input value={draft.music} onChange={(e) => set({ music: e.target.value })} placeholder="Techno, House…" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fecha de inicio</label>
          <input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fecha de fin (opcional)</label>
          <input type="date" value={draft.date_end} onChange={(e) => set({ date_end: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Hora de inicio</label>
          <input type="time" value={draft.start_time} onChange={(e) => set({ start_time: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Hora de fin</label>
          <input type="time" value={draft.end_time} onChange={(e) => set({ end_time: e.target.value })} style={{ colorScheme: "dark" }} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Precio</label>
          <input value={draft.price} onChange={(e) => set({ price: e.target.value })} placeholder="15€ o Gratis" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Enlace de entradas</label>
          <input value={draft.ticket_url} onChange={(e) => set({ ticket_url: e.target.value })} placeholder="https://…" className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Tarifas adicionales (opcional)</label>
          <input
            value={draft.priceTiersRaw}
            onChange={(e) => set({ priceTiersRaw: e.target.value })}
            placeholder="VIP:40€; Día suelto:10€; Pack 3 días:25€"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-500">Formato «Etiqueta:precio», separadas por punto y coma.</p>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={5} className={`${inputClass} resize-y`} />
        </div>
        <div className="md:col-span-2">
          <CoordsField
            latitude={draft.latitude}
            longitude={draft.longitude}
            address={draft.address}
            onChange={(latitude, longitude) => set({ latitude, longitude })}
            inputClassName={inputClass}
            labelClassName={labelClass}
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>Foto de portada</label>
          <div className="flex flex-wrap items-center gap-4">
            {draft.image ? (
              <img src={draft.image} alt="Vista previa" className="h-24 w-40 rounded-xl object-cover" />
            ) : (
              <div className="flex h-24 w-40 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-xs font-semibold text-zinc-400">Sin foto</div>
            )}
            <label className={`cursor-pointer rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300 hover:text-black ${uploading ? "pointer-events-none opacity-50" : ""}`}>
              {uploading ? "Subiendo…" : draft.image ? "📷 Cambiar foto" : "📷 Subir foto"}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void uploadCover(e, setDraft)} />
            </label>
            {draft.image && (
              <button type="button" onClick={() => set({ image: "" })} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10">
                Quitar foto
              </button>
            )}
          </div>
          <input value={draft.image} onChange={(e) => set({ image: e.target.value })} placeholder="…o pega aquí la URL de una imagen" aria-label="URL de la imagen" className={`${inputClass} mt-3`} />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass}>
            Galería manual ({draft.gallery.length} foto{draft.gallery.length === 1 ? "" : "s"})
          </label>
          <label className="block cursor-pointer rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-5 py-4 text-center text-sm font-bold text-zinc-400 transition hover:border-purple-500/50 hover:text-white">
            {uploading ? "Subiendo…" : "📁 Subir una o varias fotos"}
            <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => void uploadGallery(e, setDraft)} className="hidden" />
          </label>
          {draft.gallery.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {draft.gallery.map((url) => (
                <div key={url} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Quitar foto de la galería"
                    onClick={() => setDraft((prev) => ({ ...prev, gallery: prev.gallery.filter((u) => u !== url) }))}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderItem = (event: Event) => {
    const editing = editingId === event.id
    const past = periodTest("past", event, today)
    const hasCoords = event.latitude != null && event.longitude != null
    const noPhoto = STATUS_TESTS.nophoto(event)
    const href = `/event/${event.slug || createSlug(event.title)}`
    const start = fmtDate(event.date)
    const end = event.date_end && day(event.date_end) !== day(event.date) ? fmtDate(event.date_end) : null
    const times = fmtTimes(event)
    const details = [
      start ? `📅 ${start}${end ? ` → ${end}` : ""}` : "📅 Sin fecha",
      times ? `🕒 ${times}` : null,
      event.club_name ? `📍 ${event.club_name}` : null,
      event.artist ? `🎧 ${event.artist}` : null,
      event.music ? `🎶 ${event.music}` : null,
      event.price ? `🎟 ${event.price}` : null,
    ].filter(Boolean)

    return (
      <div
        key={event.id}
        id={`event-${event.id}`}
        className={`rounded-card border p-5 transition ${event.hidden ? "border-white/5 bg-white/[0.01] opacity-50" : "border-white/10 bg-surface"} ${editing ? "!border-purple-500/40 !bg-purple-500/[0.04] !opacity-100" : ""}`}
      >
        {editing ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">Editando: {event.title}</h3>
              <span className="text-xs text-zinc-500">ficha n.º {event.id}</span>
              <Link href={href} target="_blank" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300 transition hover:bg-white hover:text-black">
                Ver ficha ↗
              </Link>
            </div>
            {renderForm(editDraft, setEditDraft)}
            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={() => saveEditing(event.id)} disabled={saving || uploading} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              <button onClick={cancelEditing} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Cancelar
              </button>
              <Link href={href} target="_blank" className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Ir al evento ↗
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              {event.image ? (
                <img src={event.image} alt={event.title} className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-zinc-500">
                  <CalendarDays size={22} aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-white">{event.title}</h3>
                  {event.featured && <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-xs font-bold text-emerald-300">🔥 Destacado</span>}
                  {event.sold_out && <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-300">🚫 Agotado</span>}
                  {event.vip_tables && <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">🛋️ Mesa VIP</span>}
                  {isAnnual(event) ? (
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-xs font-bold text-cyan-300">🔁 Anual</span>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-400">1️⃣ Único</span>
                  )}
                  {event.hidden && <span className="rounded-full border border-zinc-500/30 bg-zinc-500/20 px-2 py-0.5 text-xs font-bold text-zinc-400">Oculto</span>}
                  {past && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-400">Pasado</span>}
                  {noPhoto && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-300">Sin foto</span>}
                  {!hasCoords && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-300">Sin ubicación</span>}
                  {event.manual_photos && <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-xs font-bold text-purple-300">✋ Fotos manuales</span>}
                  {event.google_rating ? (
                    <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300">⭐ {event.google_rating} ({event.google_review_count || 0})</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">{details.join(" · ")}</p>
                {event.description && <p className="mt-1 line-clamp-2 max-w-2xl text-xs text-zinc-500">{event.description}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => startEditing(event)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white hover:text-black">
                ✏️ Editar
              </button>
              <button onClick={() => setFlag(event, "featured", !event.featured)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${event.featured ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                🔥 Destacado
              </button>
              <button onClick={() => setFlag(event, "sold_out", !event.sold_out)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${event.sold_out ? "bg-red-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                🚫 Agotado
              </button>
              <button onClick={() => setFlag(event, "vip_tables", !event.vip_tables)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${event.vip_tables ? "bg-amber-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                🛋️ Mesa VIP
              </button>
              <button onClick={() => setFlag(event, "recurring", !isAnnual(event))} className={`rounded-full px-4 py-2 text-xs font-bold transition ${isAnnual(event) ? "bg-cyan-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                🔁 Anual
              </button>
              <button onClick={() => setFlag(event, "hidden", !event.hidden)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${!event.hidden ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                👁️ {event.hidden ? "Oculto" : "Visible"}
              </button>
              <Link href={href} target="_blank" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
                Ver ficha ↗
              </Link>
              <button onClick={() => deleteEvent(event)} className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white">
                🗑️ Borrar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const statCards: { label: string; value: number; accent: "violet" | "cyan" | "coral" | "pink"; icon: LucideIcon; apply: () => void }[] = [
    { label: "Total", value: totals.total, accent: "violet", icon: CalendarDays, apply: clearFilters },
    { label: "Próximos", value: totals.upcoming, accent: "cyan", icon: CalendarClock, apply: () => { setPeriod("upcoming"); setStatus("all") } },
    { label: "Destacados", value: totals.featured, accent: "coral", icon: Flame, apply: () => { setPeriod("all"); setStatus("featured") } },
    { label: "Ocultos", value: totals.hidden, accent: "pink", icon: EyeOff, apply: () => { setPeriod("all"); setStatus("hidden") } },
  ]

  return (
    <AdminShell title="Eventos y festivales" subtitle="Crea, edita y gestiona los eventos y festivales.">
      <>
        {/* Resumen (cada tarjeta filtra la lista) */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((s) => (
            <StatTile key={s.label} accent={s.accent} icon={s.icon} label={s.label} value={s.value} onClick={s.apply} />
          ))}
        </div>

        {/* Pendientes de revisar: lo que el sistema deja oculto al pasar a la edición del año siguiente */}
        {totals.hiddenUpcoming > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-card border border-amber-400/30 bg-amber-400/[0.06] px-5 py-4">
            <p className="flex-1 text-sm text-amber-100">
              {totals.hiddenUpcoming} {totals.hiddenUpcoming === 1 ? "evento próximo está oculto" : "eventos próximos están ocultos"}. Las ediciones nuevas de los eventos anuales se ocultan solas para que las revises antes de publicarlas.
            </p>
            <button
              onClick={() => { setSearch(""); setPeriod("upcoming"); setStatus("hidden") }}
              className="rounded-full border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300 hover:text-black"
            >
              Revisarlos
            </button>
          </div>
        )}

        {/* Alta plegable */}
        <div className="mb-6">
          <button
            onClick={() => { setShowAddForm((v) => !v); cancelEditing() }}
            className={`w-full rounded-2xl px-6 py-4 text-sm font-black transition md:w-auto ${showAddForm ? "border border-white/15 bg-white/[0.06] text-white hover:bg-white/10" : "bg-purple-500 text-white hover:bg-purple-400"}`}
          >
            {showAddForm ? "✕ Cerrar formulario" : "+ Añadir evento"}
          </button>
          {showAddForm && (
            <div className="mt-4 rounded-card border border-purple-500/30 bg-purple-500/[0.04] p-6">
              <h3 className="mb-4 text-lg font-black">Nuevo evento</h3>
              {renderForm(newDraft, setNewDraft)}
              <div className="mt-5 flex gap-3">
                <button onClick={addEvent} disabled={saving || uploading} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar evento"}
                </button>
                <button onClick={() => { setShowAddForm(false); setNewDraft(emptyDraft) }} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Búsqueda y filtros */}
        <div className="mb-3 flex flex-col gap-3 lg:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar título, sala, artista, fecha…"
            aria-label="Buscar eventos"
            className="flex-1 rounded-card border border-white/10 bg-surface px-5 py-4 outline-none transition focus:border-brand/60"
          />
          <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)} aria-label="Filtrar por fecha" style={{ colorScheme: "dark" }} className={`${selectClass} lg:w-52`}>
            {PERIOD_ORDER.map((k) => (
              <option key={k} value={k}>{PERIOD_LABEL[k]} ({periodCounts[k]})</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusKey)} aria-label="Filtrar por estado" style={{ colorScheme: "dark" }} className={`${selectClass} lg:w-72`}>
            {STATUS_ORDER.map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]} ({statusCounts[k]})</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" style={{ colorScheme: "dark" }} className={`${selectClass} lg:w-52`}>
            <option value="smart">Próximos primero</option>
            <option value="date_asc">Fecha: de antiguo a nuevo</option>
            <option value="date_desc">Fecha: de nuevo a antiguo</option>
            <option value="recent">Últimos añadidos</option>
          </select>
        </div>

        {/* Acciones sobre lo que se ve */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => bulkSetHidden(false)}
            disabled={bulkBusy || filtered.length === 0}
            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500 hover:text-white disabled:opacity-40"
          >
            ✓ Publicar {isFiltered ? `los ${filtered.length} filtrados` : "todos"}
          </button>
          <button
            onClick={() => bulkSetHidden(true)}
            disabled={bulkBusy || filtered.length === 0}
            className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500 hover:text-white disabled:opacity-40"
          >
            ✕ Ocultar {isFiltered ? `los ${filtered.length} filtrados` : "todos"}
          </button>
          {bulkBusy && <span className="text-xs text-zinc-400">Aplicando…</span>}
          {isFiltered && (
            <button onClick={clearFilters} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10">
              Quitar filtros
            </button>
          )}
          <p className="ml-auto self-center text-xs text-zinc-400">
            {filtered.length} de {events.length} eventos
          </p>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="py-20 text-center text-sm text-zinc-400">Cargando eventos…</p>
        ) : (
          <div className="grid gap-4">
            {shown.map(renderItem)}
            {remaining > 0 && (
              <button onClick={() => setLimit((l) => l + PAGE_SIZE)} className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10">
                Ver {Math.min(PAGE_SIZE, remaining)} más (quedan {remaining})
              </button>
            )}
            {shown.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-sm text-zinc-400">No hay eventos con este filtro.</p>
                {isFiltered && (
                  <button onClick={clearFilters} className="mt-4 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-white transition hover:bg-white/10">
                    Quitar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </>
    </AdminShell>
  )
}
