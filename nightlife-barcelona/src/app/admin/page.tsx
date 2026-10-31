"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { EXTRA_FEATURES, CLOSED_FIELD, extrasFromRow } from "../../lib/extraFeatures"
import AdminShell from "../../components/admin/AdminShell"
import { ADMIN_EMAIL } from "../../lib/admin"
import { toast } from "../../components/ui/Toast"
import CoordsField from "../../components/admin/CoordsField"
import { coordsPayload, coordToInput } from "../../lib/coords"
import { touchCache, clubPaths } from "../../lib/touchCache"
import { createSlug } from "../../lib/slug"

type Club = {
  id: number
  name: string
  slug?: string | null
  neighborhood: string
  address?: string
  music: string
  price?: string
  hours?: string
  image?: string
  rating?: number
  people?: string
  dresscode?: string
  audience?: string | null
  terrace?: boolean
  smoking_area?: boolean
  table_booking?: boolean
  hidden: boolean
  trending: boolean
  sold_out: boolean
  lgtbi_friendly: boolean
  swinger_friendly?: boolean
  swinger_rules?: string | null
  verified?: boolean
  vip_tables?: boolean
  venue_type?: string
  open_days?: string[] | null
  metro_lines?: string
  night_buses?: string
  has_foosball?: boolean
  temporarily_closed?: boolean
  discount_info?: string
  free_entry_info?: string
  gallery?: string[] | null
  manual_photos?: boolean | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
}

// Antes este desplegable no existía en ningún sitio del panel de admin: la página de Clubs se
// quedó con el diseño antiguo (sin AdminShell) mientras el resto de pantallas del admin se
// actualizaron, así que campos como el tipo de local, los días que abre, el metro/bus cercano,
// el futbolín/billar y los descuentos/entrada gratis nunca tuvieron un sitio desde el que
// editarse aunque ya se usaran en la web (ficha de club, filtros de "Planifica tu noche", etc.).
const VENUE_TYPE_OPTIONS = ["Discoteca", "Pub", "Bar musical", "Coctelería", "Karaoke", "Bar de billar"]
const DAY_OPTIONS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

// Etiquetas de un club, agrupadas (30/10/2026). Antes eran dos filas sueltas de botones (11 fijos y
// luego los extras, con «Cerrado temporalmente» aparte) y se veían desordenadas. Ahora el formulario de
// edición y el filtro de la lista usan los mismos grupos. Una etiqueta nueva de EXTRA_FEATURES que no
// esté aquí sale sola en «Zonas y servicios».
type TagRef = {
  key: string // columna de public.clubs
  label: string
  emoji: string
  filterLabel?: string // cómo se llama en el filtro de la lista (por defecto, label)
  extra?: boolean // viaja en form.extras (en vez de en un campo propio del formulario)
  closed?: boolean // «Cerrado temporalmente»: se pinta en ámbar y solo si la columna existe
}
const extraTag = (field: string): TagRef => {
  const f = EXTRA_FEATURES.find((x) => x.field === field)
  return { key: field, label: f?.label ?? field, emoji: f?.emoji ?? "🏷️", extra: true }
}
const TAG_GROUPS_BASE: { title: string; tags: TagRef[] }[] = [
  {
    title: "Estado de la ficha",
    tags: [
      { key: "verified", label: "Verified", emoji: "✓", filterLabel: "Verificados" },
      { key: "trending", label: "Trending", emoji: "🔥", filterLabel: "Trending" },
      { key: "sold_out", label: "Sold out", emoji: "🚫", filterLabel: "Agotados" },
      { key: "hidden", label: "Oculto", emoji: "👁️", filterLabel: "Ocultos" },
      { key: CLOSED_FIELD, label: "Cerrado temporalmente", emoji: "⏸️", filterLabel: "Cerrados temporalmente", extra: true, closed: true },
    ],
  },
  {
    title: "Ambiente",
    tags: [
      extraTag("dance_floor"),
      extraTag("live_music"),
      extraTag("hot_shows"),
      { key: "lgtbi_friendly", label: "LGTBI+", emoji: "🏳️‍🌈" },
      { key: "swinger_friendly", label: "Swinger", emoji: "🔞" },
    ],
  },
  {
    title: "Entretenimiento",
    tags: [
      extraTag("karaoke"),
      extraTag("darts"),
      { key: "has_foosball", label: "Futbolín/Billar", emoji: "🎱" },
      extraTag("games"),
      extraTag("sports_tv"),
    ],
  },
  { title: "Comida y bebida", tags: [extraTag("cocktails"), extraTag("food"), extraTag("shisha")] },
  // Cumpleaños, eventos privados y alquiler del local (supabase/60).
  { title: "Celebraciones", tags: [extraTag("birthdays"), extraTag("private_events"), extraTag("venue_rental")] },
  {
    title: "Zonas y servicios",
    tags: [
      { key: "terrace", label: "Terraza", emoji: "🌿" },
      { key: "smoking_area", label: "Zona fumadores", emoji: "🚬" },
      extraTag("cigarette_machine"),
      { key: "table_booking", label: "Reserva de mesas", emoji: "🍾" },
      { key: "vip_tables", label: "Mesa VIP", emoji: "🛋️" },
      extraTag("cloakroom"),
      extraTag("wheelchair_accessible"),
    ],
  },
]
const TAG_GROUPS: { title: string; tags: TagRef[] }[] = (() => {
  const listed = new Set(TAG_GROUPS_BASE.flatMap((g) => g.tags.map((t) => t.key)))
  const missing = EXTRA_FEATURES.filter((f) => !listed.has(f.field)).map((f) => extraTag(f.field))
  if (!missing.length) return TAG_GROUPS_BASE
  return TAG_GROUPS_BASE.map((g) => (g.title === "Zonas y servicios" ? { ...g, tags: [...g.tags, ...missing] } : g))
})()

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
  audience: string
  terrace: boolean
  smoking_area: boolean
  table_booking: boolean
  lgtbi_friendly: boolean
  swinger_friendly: boolean
  swinger_rules: string
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
  latitude: string
  longitude: string
  description: string
}

// Mismo criterio que el importador de OpenStreetMap y que supabase/28_locales_repetidos.sql.
const NAME_STOP_WORDS = ["bar", "pub", "club", "discoteca", "cafe", "restaurant", "restaurante", "bcn", "barcelona", "the", "el", "la", "los", "las", "de", "del", "i", "y", "and"]
function normalizeVenueName(name: string | null | undefined): string {
  const base = (name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ")
  const words = base.split(/\s+/).filter((w) => w && !NAME_STOP_WORDS.includes(w))
  return (words.length ? words : base.split(/\s+/).filter(Boolean)).join("")
}

const emptyForm: ClubFormData = {
  name: "",
  neighborhood: "",
  address: "",
  music: "",
  price: "",
  hours: "",
  image: "",
  rating: "",
  people: "",
  dresscode: "",
  audience: "",
  terrace: false,
  smoking_area: false,
  table_booking: false,
  lgtbi_friendly: false,
  swinger_friendly: false,
  swinger_rules: "",
  verified: false,
  vip_tables: false,
  trending: false,
  sold_out: false,
  hidden: false,
  venue_type: "Discoteca",
  open_days: [],
  metro_lines: "",
  night_buses: "",
  has_foosball: false,
  extras: {},
  discount_info: "",
  free_entry_info: "",
  gallery: [],
  latitude: "",
  longitude: "",
  description: "",
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
  audience: club.audience || "",
  terrace: !!club.terrace,
  smoking_area: !!club.smoking_area,
  table_booking: !!club.table_booking,
  lgtbi_friendly: !!club.lgtbi_friendly,
  swinger_friendly: !!club.swinger_friendly,
  swinger_rules: club.swinger_rules || "",
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
  latitude: coordToInput(club.latitude),
  longitude: coordToInput(club.longitude),
  description: club.description || "",
})

export default function AdminPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const [showAddForm, setShowAddForm] = useState(false)
  const [newClub, setNewClub] = useState<ClubFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<ClubFormData>(emptyForm)
  const [uploadingImage, setUploadingImage] = useState(false)

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

  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from("clubs").select("*").order("name")
      if (data) setClubs(data)
      setLoading(false)
    }
    fetchClubs()
  }, [])

  const toggleField = async (club: Club, field: keyof Club) => {
    const newValue = !club[field]
    const { error } = await supabase.from("clubs").update({ [field]: newValue }).eq("id", club.id)
    if (error) return
    setClubs((prev) => prev.map((c) => c.id === club.id ? { ...c, [field]: newValue } : c))
    // Mismo motivo que en deleteClub de abajo: si no se avisa a Next, el listado público sigue
    // sirviendo la versión cacheada (p. ej. si esto esconde/muestra el club) hasta que caduque.
    touchCache(clubPaths(club.slug || createSlug(club.name)))
  }

  const deleteClub = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este club?")) return
    // El slug hace falta para avisar a Next qué ficha pública invalidar — una vez borrado el club
    // ya no se puede volver a pedir, así que se guarda antes de borrar.
    const gone = clubs.find((c) => c.id === id)
    const slug = gone?.slug || (gone ? createSlug(gone.name) : null)
    const { error } = await supabase.from("clubs").delete().eq("id", id)
    if (error) {
      toast("Error al eliminar: " + error.message)
      return
    }
    setClubs((prev) => prev.filter((c) => c.id !== id))
    // Antes esto faltaba aquí (sí estaba al crear/editar un club): sin avisar a Next, el listado
    // público de /clubs seguía sirviendo la versión en caché con el club todavía dentro hasta que
    // caducaba por su cuenta (hasta 1 hora) — exactamente el "lo borro y me vuelve a aparecer".
    touchCache(clubPaths(slug))
  }

  // Antes "Mostrar todos" / "Ocultar todos" actuaban al instante, sin preguntar: un toque sin
  // querer escondía (o publicaba) todos los clubs de golpe. Ahora: ocultar todo pide escribir OCULTAR, y
  // mostrar todo avisa de lo que se publicaría sin revisar.
  const confirmHideAll = () =>
    (window.prompt(`Vas a OCULTAR todos los clubs de la web (${clubs.length}). Nadie podrá verlos hasta que los vuelvas a mostrar.\n\nEscribe OCULTAR para confirmar.`) || "").trim().toUpperCase() === "OCULTAR"
  const confirmShowAll = () =>
    window.confirm(`Vas a PUBLICAR todos los clubs (${clubs.length}), también los que están ocultos a propósito. Por ejemplo, los locales importados de OpenStreetMap que entran ocultos para revisarlos antes.\n\n¿Seguro?`)
  const showAll = async () => {
    if (!confirmShowAll()) return
    await supabase.from("clubs").update({ hidden: false }).neq("id", 0)
    setClubs((prev) => prev.map((c) => ({ ...c, hidden: false })))
    touchCache(clubPaths())
  }

  const hideAll = async () => {
    if (!confirmHideAll()) return
    await supabase.from("clubs").update({ hidden: true }).neq("id", 0)
    setClubs((prev) => prev.map((c) => ({ ...c, hidden: true })))
    touchCache(clubPaths())
  }

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
    audience: form.audience || null,
    terrace: form.terrace,
    smoking_area: form.smoking_area,
    table_booking: form.table_booking,
    lgtbi_friendly: form.lgtbi_friendly,
    swinger_friendly: form.swinger_friendly,
    swinger_rules: form.swinger_rules.trim() || null,
    verified: form.verified,
    vip_tables: form.vip_tables,
    trending: form.trending,
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
    description: form.description.trim() || null,
    ...coordsPayload(form.latitude, form.longitude),
    // En cuanto guardas el formulario con alguna foto en la galería (ya sea porque las trajo el
    // pipeline de Google y las has dejado, o porque has quitado/subido alguna a mano), este club
    // queda marcado como "gestionado a mano": el cron de Google ya no le toca la galería ni la
    // portada, así no te vuelve a poner una foto que ya habías quitado por no encajar.
    manual_photos: form.gallery.length > 0,
  })

  const addClub = async () => {
    if (!newClub.name.trim()) {
      toast("El nombre del club es obligatorio")
      return
    }
    // Evita volver a crear locales repetidos: si ya hay uno con el mismo nombre (sin contar
    // tildes, mayúsculas ni palabras como "bar", "club", "BCN"...), avisa antes de guardar.
    const norm = normalizeVenueName(newClub.name)
    const twin = clubs.find((c) => norm && normalizeVenueName(c.name) === norm)
    if (twin && !confirm(`Ya existe "${twin.name}"${twin.hidden ? " (oculto)" : ""}. ¿Seguro que quieres crear otro local con ese nombre?`)) return
    setSaving(true)
    const { data, error } = await supabase.from("clubs").insert([formToPayload(newClub)]).select()
    setSaving(false)
    if (error) {
      toast("Error al añadir el club: " + error.message)
      return
    }
    if (data && data[0]) {
      setClubs((prev) => [...prev, data[0] as Club].sort((a, b) => a.name.localeCompare(b.name)))
      touchCache(clubPaths((data[0] as { slug?: string | null }).slug || createSlug((data[0] as { name?: string }).name)))
    }
    setNewClub(emptyForm)
    setShowAddForm(false)
  }

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    form: ClubFormData,
    setForm: (f: ClubFormData) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const input = e.target
    setUploadingImage(true)
    // Antes, si upload() lanzaba una excepción (red caída, CORS, bucket mal configurado...)
    // en vez de devolver un error normal, no había try/catch que lo recogiera: la función se
    // paraba a medias, uploadingImage se quedaba en true para siempre (el botón de subir
    // quedaba deshabilitado sin aviso, "como si no reaccionase" en todos los intentos
    // siguientes de esa visita) y nunca se veía ningún mensaje. Ahora cualquier fallo, sea el
    // que sea, se muestra y el botón siempre se reactiva.
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `club-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from("club-images").upload(fileName, file)
      if (uploadError) {
        toast("Error al subir la imagen: " + uploadError.message, 6000)
        return
      }
      const { data } = supabase.storage.from("club-images").getPublicUrl(fileName)
      setForm({ ...form, image: data.publicUrl })
    } catch (err) {
      toast("Error al subir la imagen: " + (err instanceof Error ? err.message : String(err)), 6000)
    } finally {
      setUploadingImage(false)
      input.value = ""
    }
  }

  // Galería del club (las fotos que se ven en la ficha, debajo de la principal). Usa el mismo
  // bucket "club-photos" que rellena el cron de Google, así conviven sin problema — la diferencia
  // es que estas se suben con el prefijo "admin/" en vez de "<id-del-club>/...".
  const [uploadingGallery, setUploadingGallery] = useState(false)

  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    form: ClubFormData,
    setForm: (f: ClubFormData) => void
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const input = e.target
    setUploadingGallery(true)
    const urls: string[] = []
    let firstError: string | null = null
    // Igual que en handleImageUpload: una excepción no controlada aquí dejaba el botón
    // deshabilitado para siempre sin ningún aviso. El try/catch asegura que, pase lo que
    // pase, el estado se libera y se ve algún mensaje.
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop()
        const fileName = `admin/manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
        const { error } = await supabase.storage.from("club-photos").upload(fileName, file)
        if (error) {
          // Antes este error se tragaba en silencio (continue) y la foto simplemente no
          // aparecía, como si el botón no reaccionara. Lo mostramos para saber la causa real
          // (típicamente una política de Storage del bucket "club-photos" que no permite subir).
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
      if (firstError) toast("Error al subir la foto a la galería: " + firstError, 6000)
      input.value = ""
    }
  }

  const removeGalleryPhoto = (url: string, form: ClubFormData, setForm: (f: ClubFormData) => void) => {
    setForm({ ...form, gallery: form.gallery.filter((u) => u !== url) })
  }

  const startEdit = (club: Club) => {
    setEditingId(club.id)
    setEditForm(clubToForm(club))
  }

  // Llegando desde el botón "Editar" de la ficha pública (/admin?edit=ID): abre ese club en
  // modo edición y baja hasta él.
  const autoEditDone = useRef(false)
  useEffect(() => {
    if (autoEditDone.current || clubs.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get("edit")
    if (!wanted) { autoEditDone.current = true; return }
    const club = clubs.find((c) => String(c.id) === wanted)
    autoEditDone.current = true
    if (!club) return
    startEdit(club)
    let tries = 0
    const timer = setInterval(() => {
      tries++
      const el = document.getElementById(`club-${club.id}`)
      if (el) {
        clearInterval(timer)
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" })
      } else if (tries > 40) {
        clearInterval(timer)
      }
    }, 150)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs])

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const saveEdit = async (id: number) => {
    if (!editForm.name.trim()) {
      toast("El nombre del club es obligatorio")
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from("clubs").update(formToPayload(editForm)).eq("id", id).select()
    setSaving(false)
    if (error) {
      toast("Error al guardar los cambios: " + error.message)
      return
    }
    if (data && data[0]) {
      setClubs((prev) => prev.map((c) => c.id === id ? (data[0] as Club) : c))
      touchCache(clubPaths((data[0] as { slug?: string | null }).slug || createSlug((data[0] as { name?: string }).name)))
    }
    setEditingId(null)
  }

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = !search.trim() ||
      club.name?.toLowerCase().includes(search.toLowerCase()) ||
      club.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
      club.music?.toLowerCase().includes(search.toLowerCase())

    // filter: "all", "visible" o "tag:<columna>" (ver TAG_GROUPS).
    const matchesFilter =
      filter === "all" ||
      (filter === "visible" && !club.hidden) ||
      (filter.startsWith("tag:") && !!(club as unknown as Record<string, unknown>)[filter.slice(4)])

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: clubs.length,
    visible: clubs.filter(c => !c.hidden).length,
    verified: clubs.filter(c => c.verified).length,
    trending: clubs.filter(c => c.trending).length,
  }

  if (checkingAdmin) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-sm text-zinc-400">Verificando acceso...</p>
    </main>
  )

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition placeholder:text-zinc-400"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1.5"

  const renderClubForm = (form: ClubFormData, setForm: (f: ClubFormData) => void) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="md:col-span-2">
        <CoordsField
          latitude={form.latitude}
          longitude={form.longitude}
          address={form.address}
          inputClassName={inputClass}
          onChange={(latitude, longitude) => setForm({ ...form, latitude, longitude })}
        />
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
        <label className={labelClass}>Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Cuenta cómo es el local, el ambiente, qué lo hace especial... (sin límite de palabras)"
          rows={5}
          className={`${inputClass} resize-y`}
        />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Imagen</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {form.image && (
            <img src={form.image} alt="Vista previa" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-white/10" />
          )}
          <div className="flex-1 space-y-2">
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... (o sube una desde tu ordenador)" className={inputClass} />
            <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingImage ? "border-white/10 text-zinc-400" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
              {uploadingImage ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(e) => handleImageUpload(e, form, setForm)} />
            </label>
          </div>
        </div>
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>
          Galería ({form.gallery.length} foto{form.gallery.length === 1 ? "" : "s"})
          {form.gallery.length > 0 && <span className="ml-2 normal-case font-normal text-zinc-400">— quita las que no encajen con la ✕</span>}
        </label>
        <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingGallery ? "border-white/10 text-zinc-400" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
          {uploadingGallery ? "Subiendo..." : "📁 Añadir fotos a la galería"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingGallery} onChange={(e) => handleGalleryUpload(e, form, setForm)} />
        </label>
        {form.gallery.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {form.gallery.map((url) => (
              <div key={url} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryPhoto(url, form, setForm)}
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
        <label className={labelClass}>Público (edad del ambiente)</label>
        <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={inputClass} style={{ colorScheme: "dark" }}>
          <option value="">Mixto / sin especificar</option>
          <option value="joven">Joven (18-25)</option>
          <option value="+30">+30</option>
          <option value="+40">+40</option>
        </select>
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
        <label className={labelClass}>Días que abre (vacío = sin dato, no se filtra en Planifica tu noche)</label>
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
      <div className="md:col-span-2 space-y-4 rounded-card border border-white/10 bg-white/[0.02] p-4 pt-3">
        <p className={labelClass}>Etiquetas</p>
        {TAG_GROUPS.map((group) => {
          // Las etiquetas de servicios solo salen si su columna ya existe (SQL 56 para «Cerrado
          // temporalmente», SQL 60 para cumpleaños / eventos privados / alquiler).
          // (El formulario de club nuevo parte con los extras vacíos, así que también se mira si
          // alguna ficha ya cargada tiene esa columna.)
          const tags = group.tags.filter((t) => !t.extra || t.key in form.extras || clubs.some((c) => t.key in (c as unknown as Record<string, unknown>)))
          if (!tags.length) return null
          return (
            <div key={group.title}>
              <p className="mb-2 text-xs font-semibold text-zinc-400">{group.title}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const on = t.extra ? !!form.extras[t.key] : !!(form as unknown as Record<string, unknown>)[t.key]
                  const toggle = () =>
                    t.extra
                      ? setForm({ ...form, extras: { ...form.extras, [t.key]: !on } })
                      : setForm({ ...form, [t.key]: !on })
                  return (
                    <button key={t.key} type="button" aria-pressed={on} onClick={toggle}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                        on ? (t.closed ? "bg-amber-400 text-black" : "bg-purple-500 text-white") : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}>
                      {t.emoji} {t.label}
                    </button>
                  )
                })}
              </div>
              {tags.some((t) => t.closed) && (
                <p className="mt-2 text-xs text-zinc-400">Cerrado temporalmente: el local sigue en la web con su etiqueta, pero nunca sale como «abierto ahora» y no se recomienda en la portada, «Sorpréndeme», el plan ni «cerca de aquí».</p>
              )}
            </div>
          )
        })}
      </div>
      {form.swinger_friendly && (
        <div className="md:col-span-2">
          <label className={labelClass}>Normas del club swinger (vacío = no se enseña nada en la ficha)</label>
          <textarea
            value={form.swinger_rules}
            onChange={(e) => setForm({ ...form, swinger_rules: e.target.value })}
            placeholder="Solo parejas y mujeres solas. Código de vestimenta obligatorio tras las 00:00. Prohibido fotografiar o grabar."
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>
      )}
    </div>
  )

  return (
    <AdminShell title="Clubs" subtitle="Gestiona las discotecas, pubs y bares musicales de Noctua.">
      <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
            {[
              { label: "Total clubs", value: stats.total, color: "text-white" },
              { label: "Visibles", value: stats.visible, color: "text-emerald-400" },
              { label: "Verificados", value: stats.verified, color: "text-purple-400" },
              { label: "Trending", value: stats.trending, color: "text-orange-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-card border border-white/10 bg-white/[0.03] p-5 text-center">
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-1 text-xs text-zinc-400">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Add club toggle */}
          <div className="mb-6">
            <button onClick={() => { setShowAddForm((v) => !v); setEditingId(null) }}
              className={`rounded-2xl px-6 py-4 text-sm font-black transition w-full md:w-auto ${showAddForm ? "bg-white text-black" : "bg-purple-500 text-white hover:bg-purple-400"}`}>
              {showAddForm ? "✕ Cerrar formulario" : "+ Añadir club"}
            </button>
            {showAddForm && (
              <div className="mt-4 rounded-card border border-purple-500/30 bg-purple-500/[0.04] p-6">
                <h3 className="mb-4 text-lg font-black">Nuevo club</h3>
                {renderClubForm(newClub, setNewClub)}
                <div className="mt-5 flex gap-3">
                  <button onClick={addClub} disabled={saving}
                    className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white hover:bg-purple-400 transition disabled:opacity-50">
                    {saving ? "Guardando..." : "Guardar club"}
                  </button>
                  <button onClick={() => { setShowAddForm(false); setNewClub(emptyForm) }}
                    className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search + filters */}
          <div className="flex flex-col gap-3 mb-6 md:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar clubs..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 outline-none focus:border-purple-500/50 transition"
            />
            {/* Un solo desplegable con el estado y todas las etiquetas, cada una con cuántos clubs la tienen. */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filtrar clubs"
              style={{ colorScheme: "dark" }}
              className="rounded-2xl border border-white/10 bg-surface px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-purple-500/50 md:w-72"
            >
              <option value="all">Todos ({clubs.length})</option>
              <option value="visible">Visibles ({stats.visible})</option>
              {TAG_GROUPS.map((group) => {
                const tags = group.tags.filter((t) => !t.extra || clubs.some((c) => t.key in (c as unknown as Record<string, unknown>)))
                if (!tags.length) return null
                return (
                  <optgroup key={group.title} label={group.title}>
                    {tags.map((t) => (
                      <option key={t.key} value={`tag:${t.key}`}>
                        {t.emoji} {t.filterLabel || t.label} ({clubs.filter((c) => !!(c as unknown as Record<string, unknown>)[t.key]).length})
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-3 mb-6">
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">✓ Mostrar todos</button>
            <button onClick={hideAll} className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500 hover:text-white transition">✕ Ocultar todos</button>
            <p className="ml-auto text-xs text-zinc-400 self-center">{filteredClubs.length} clubs</p>
          </div>

          {/* Clubs list */}
          {loading ? (
            <p className="text-zinc-400 text-sm text-center py-20">Cargando clubs...</p>
          ) : (
            <div className="grid gap-4">
              {filteredClubs.map((club) => (
                <div key={club.id} id={`club-${club.id}`}
                  className={`rounded-card border p-5 transition ${club.hidden ? "border-white/5 bg-white/[0.01] opacity-50" : "border-white/10 bg-white/[0.03]"} ${editingId === club.id ? "!border-purple-500/40 !bg-purple-500/[0.04] !opacity-100" : ""}`}>

                  {editingId === club.id ? (
                    <div>
                      <div className="mb-4 flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black">Editando: {club.name}</h3>
                        <Link
                          href={`/clubs/${club.slug || createSlug(club.name)}`}
                          target="_blank"
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300 hover:bg-white hover:text-black transition"
                        >
                          Ver ficha ↗
                        </Link>
                      </div>
                      {renderClubForm(editForm, setEditForm)}
                      <div className="mt-5 flex gap-3">
                        <button onClick={() => saveEdit(club.id)} disabled={saving}
                          className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white hover:bg-purple-400 transition disabled:opacity-50">
                          {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button onClick={cancelEdit}
                          className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition">
                          Cancelar
                        </button>
                        <Link
                          href={`/clubs/${club.slug || createSlug(club.name)}`}
                          target="_blank"
                          className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition"
                        >
                          Ir al club ↗
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        {club.image && (
                          <img src={club.image} alt={club.name} className="h-12 w-12 rounded-xl object-cover flex-shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-white">{club.name}</h3>
                            {club.verified && <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs font-bold text-purple-300">N Verified</span>}
                            {club.trending && <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-xs font-bold text-orange-300">🔥 Trending</span>}
                            {club.hidden && <span className="rounded-full bg-zinc-500/20 border border-zinc-500/30 px-2 py-0.5 text-xs font-bold text-zinc-400">Oculto</span>}
                            {club.temporarily_closed && <span className="rounded-full bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 text-xs font-bold text-amber-300">⏸️ Cerrado temporalmente</span>}
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {club.neighborhood} · {club.music} {club.rating ? `· ⭐ ${club.rating}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => startEdit(club)}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white hover:text-black transition">
                          ✏️ Editar
                        </button>
                        <button onClick={() => toggleField(club, "trending")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.trending ? "bg-orange-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          🔥 Trending
                        </button>
                        <button onClick={() => toggleField(club, "sold_out")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.sold_out ? "bg-red-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          🚫 Sold out
                        </button>
                        {"temporarily_closed" in club && (
                          <button onClick={() => toggleField(club, "temporarily_closed")}
                            className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.temporarily_closed ? "bg-amber-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                            ⏸️ Cerrado temp.
                          </button>
                        )}
                        <button onClick={() => toggleField(club, "hidden")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${!club.hidden ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          👁️ {club.hidden ? "Oculto" : "Visible"}
                        </button>
                        {/* Aquí solo van los estados del club (verificado, tendencia, agotado, cerrado,
                            visible). El resto de etiquetas (LGTBI+, mesa VIP, terraza...) se editan
                            dentro de «Editar». */}
                        <button onClick={() => toggleField(club, "verified")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.verified ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          ✓ Verified
                        </button>
                        <button onClick={() => deleteClub(club.id)}
                          className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500 hover:text-white transition">
                          🗑️ Borrar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredClubs.length === 0 && (
                <p className="text-zinc-400 text-sm text-center py-20">No se encontraron clubs.</p>
              )}
            </div>
          )}
      </>
    </AdminShell>
  )
}
