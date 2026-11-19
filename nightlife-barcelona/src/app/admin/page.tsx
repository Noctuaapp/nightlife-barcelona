"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import { EXTRA_FEATURES, CLOSED_FIELD, extrasFromRow } from "../../lib/extraFeatures"
import AdminShell from "../../components/admin/AdminShell"
import { BTN_DANGER, BTN_GHOST, BTN_GHOST_SM, BTN_PRIMARY, FilterChip, Segmented, StatTile, Tag } from "../../components/admin/ui"
import { EditSheet, Field, FieldGrid, FormSection, SearchBox, SheetTabs, ShowMore, SplitView, SwitchRow, Thumb } from "../../components/admin/editor"
import { BadgeCheck, ExternalLink, Eye, EyeOff, Flame, Layers, Plus, Trash2, Upload, Wine, X } from "lucide-react"
import { ADMIN_EMAIL } from "../../lib/admin"
import { toast } from "../../components/ui/Toast"
import CoordsField from "../../components/admin/CoordsField"
import { coordsPayload, coordToInput } from "../../lib/coords"
import { touchCache, clubPaths } from "../../lib/touchCache"
import { createSlug } from "../../lib/slug"
import { DRESS_CODES } from "../../lib/dressCode"
import ClubHoursEditor from "../../components/admin/ClubHoursEditor"
import { useAdminCity } from "../../components/admin/AdminCity"
import { rowsOfCity, cityNameForNewRow } from "../../lib/adminCity"
import { selectAllPages } from "../../lib/fetchAll"
import { CITIES, cityOfClub } from "../../lib/cities"

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
  dress_code?: string | null
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
  city?: string | null
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
  // La columna real es dress_code (antes se leía "dresscode", que no existe, y al guardar se borraba la vestimenta).
  dresscode: club.dress_code || club.dresscode || "",
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

// Supabase devuelve como mucho 1.000 filas por consulta y, con Madrid, entre las dos ciudades se pasa de ahí: se pide página a página
// (ordenado por nombre y por id, para que las páginas no se pisen ni se repitan).
async function fetchAllClubs(): Promise<Club[] | null> {
  const res = await selectAllPages<Club>((from, to) => supabase.from("clubs").select("*").order("name").order("id").range(from, to))
  return res.data
}

export default function AdminPage() {
  // Admin por ciudad (15/11/2026): `allClubs` es todo lo que hay en la base y `clubs` solo los de la ciudad elegida arriba en el
  // menú. Todo lo de esta pantalla (lista, contadores, «Mostrar/Ocultar todos», etiquetas en bloque) trabaja con `clubs`.
  const [city, setCity] = useAdminCity()
  const [allClubs, setClubs] = useState<Club[]>([])
  const clubs = useMemo(() => rowsOfCity(allClubs, city), [allClubs, city])
  const cityName = CITIES[city].name
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  // Etiqueta en bloque (05/11/2026): poner o quitar UNA etiqueta a muchos clubs de golpe.
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkTag, setBulkTag] = useState("")
  const [bulkValue, setBulkValue] = useState(true)
  const [bulkScope, setBulkScope] = useState<"list" | "all">("list")
  const [bulkBusy, setBulkBusy] = useState(false)
  const [lastBulk, setLastBulk] = useState<{ key: string; label: string; ids: number[]; value: boolean } | null>(null)

  // Se pintan 50 clubs y un botón «Mostrar más»; la pestaña abierta de la ficha de edición.
  const [shown, setShown] = useState(50)
  const [sheetTab, setSheetTab] = useState<"datos" | "fotos" | "horario" | "etiquetas" | "estado">("datos")
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
      const data = await fetchAllClubs()
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

  const deleteClub = async (id: number): Promise<boolean> => {
    if (!confirm("¿Seguro que quieres eliminar este club?")) return false
    // El slug hace falta para avisar a Next qué ficha pública invalidar — una vez borrado el club
    // ya no se puede volver a pedir, así que se guarda antes de borrar.
    const gone = clubs.find((c) => c.id === id)
    const slug = gone?.slug || (gone ? createSlug(gone.name) : null)
    const { error } = await supabase.from("clubs").delete().eq("id", id)
    if (error) {
      toast("Error al eliminar: " + error.message)
      return false
    }
    setClubs((prev) => prev.filter((c) => c.id !== id))
    // Antes esto faltaba aquí (sí estaba al crear/editar un club): sin avisar a Next, el listado
    // público de /clubs seguía sirviendo la versión en caché con el club todavía dentro hasta que
    // caducaba por su cuenta (hasta 1 hora) — exactamente el "lo borro y me vuelve a aparecer".
    touchCache(clubPaths(slug))
    return true
  }

  // Antes "Mostrar todos" / "Ocultar todos" actuaban al instante, sin preguntar: un toque sin
  // querer escondía (o publicaba) todos los clubs de golpe. Ahora: ocultar todo pide escribir OCULTAR, y
  // mostrar todo avisa de lo que se publicaría sin revisar.
  const confirmHideAll = () =>
    (window.prompt(`Vas a OCULTAR todos los clubs de ${cityName} (${clubs.length}). Nadie podrá verlos hasta que los vuelvas a mostrar.\n\nEscribe OCULTAR para confirmar.`) || "").trim().toUpperCase() === "OCULTAR"
  const confirmShowAll = () =>
    window.confirm(`Vas a PUBLICAR todos los clubs de ${cityName} (${clubs.length}), también los que están ocultos a propósito. Por ejemplo, los locales importados de OpenStreetMap que entran ocultos para revisarlos antes.\n\n¿Seguro?`)
  const showAll = async () => {
    if (!confirmShowAll()) return
    await setHiddenForCity(false)
  }

  const hideAll = async () => {
    if (!confirmHideAll()) return
    await setHiddenForCity(true)
  }

  // Solo toca los clubs de la ciudad elegida (antes tocaba todos los de la base, y con Madrid dentro eso afectaría a las dos ciudades).
  const setHiddenForCity = async (hidden: boolean) => {
    const ids = clubs.map((c) => c.id)
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("clubs").update({ hidden }).in("id", ids.slice(i, i + 200))
      if (error) {
        toast("No se pudo cambiar: " + error.message, 6000)
        const fresh = await fetchAllClubs()
        if (fresh) setClubs(fresh)
        return
      }
    }
    const idSet = new Set(ids)
    setClubs((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, hidden } : c)))
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
    const { data, error } = await supabase.from("clubs").insert([{ ...formToPayload(newClub), ...cityNameForNewRow(city) }]).select()
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
    if (autoEditDone.current || allClubs.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get("edit")
    if (!wanted) { autoEditDone.current = true; return }
    // Se busca entre todos los clubs: el botón «Editar» de una ficha pública puede ser de la otra ciudad, y entonces se cambia a ella.
    const club = allClubs.find((c) => String(c.id) === wanted)
    autoEditDone.current = true
    if (!club) return
    setCity(cityOfClub(club))
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
  }, [allClubs])

  // Al cambiar de ciudad se cierra el formulario de «Añadir» (el club nuevo se habría creado en la ciudad equivocada), se limpia el
  // filtro y se cierra la edición abierta si ese club no es de la ciudad nueva.
  useEffect(() => { setShown(50) }, [search, filter, city])

  const prevCity = useRef(city)
  useEffect(() => {
    if (prevCity.current === city) return
    prevCity.current = city
    setShowAddForm(false)
    setNewClub(emptyForm)
    setFilter("all")
    setEditingId((id) => {
      if (id == null) return id
      const open = allClubs.find((c) => c.id === id)
      return open && cityOfClub(open) === city ? id : null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

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

  // Etiquetas que se pueden poner o quitar en bloque: las de ambiente, entretenimiento, comida, celebraciones
  // y zonas (columnas sí/no de public.clubs). El estado de la ficha (verificado, trending, oculto, cerrado
  // temporalmente...) no entra: para ocultar o mostrar hay sus botones, y lo demás se decide club a club.
  const bulkGroups = TAG_GROUPS.filter((g) => g.title !== "Estado de la ficha")
    .map((g) => ({ ...g, tags: g.tags.filter((t) => !t.closed && (!t.extra || clubs.some((c) => t.key in (c as unknown as Record<string, unknown>)))) }))
    .filter((g) => g.tags.length > 0)
  const bulkTagRef = bulkGroups.flatMap((g) => g.tags).find((t) => t.key === bulkTag) || null
  const bulkTargets = (bulkScope === "all" ? clubs : filteredClubs).filter(
    (c) => !!(c as unknown as Record<string, unknown>)[bulkTag] !== bulkValue
  )
  const bulkScopeCount = bulkScope === "all" ? clubs.length : filteredClubs.length

  const applyBulkTag = async () => {
    if (!bulkTagRef || bulkTargets.length === 0) return
    const n = bulkTargets.length
    const verb = bulkValue ? "PONER" : "QUITAR"
    if (!window.confirm(`Vas a ${verb} la etiqueta «${bulkTagRef.label}» ${bulkValue ? "a" : "de"} ${n} club${n === 1 ? "" : "s"}.\n\nPodrás deshacerlo justo después con el botón «Deshacer». ¿Seguro?`)) return
    setBulkBusy(true)
    const ids = bulkTargets.map((c) => c.id)
    let failed: string | null = null
    for (let i = 0; i < ids.length && !failed; i += 200) {
      const { error } = await supabase.from("clubs").update({ [bulkTag]: bulkValue }).in("id", ids.slice(i, i + 200))
      if (error) failed = error.message
    }
    setBulkBusy(false)
    if (failed) {
      toast("No se pudo aplicar: " + failed, 6000)
      // Lo que sí llegó a cambiar se ve al recargar; se refresca la lista para no enseñar datos falsos.
      const data = await fetchAllClubs()
      if (data) setClubs(data)
      return
    }
    const idSet = new Set(ids)
    setClubs((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, [bulkTag]: bulkValue } : c)))
    setLastBulk({ key: bulkTag, label: bulkTagRef.label, ids, value: bulkValue })
    touchCache(clubPaths())
    toast(`${bulkValue ? "Etiqueta puesta" : "Etiqueta quitada"} en ${n} club${n === 1 ? "" : "s"}`)
  }

  const undoBulkTag = async () => {
    if (!lastBulk) return
    setBulkBusy(true)
    let failed: string | null = null
    for (let i = 0; i < lastBulk.ids.length && !failed; i += 200) {
      const { error } = await supabase.from("clubs").update({ [lastBulk.key]: !lastBulk.value }).in("id", lastBulk.ids.slice(i, i + 200))
      if (error) failed = error.message
    }
    setBulkBusy(false)
    if (failed) {
      toast("No se pudo deshacer: " + failed, 6000)
      return
    }
    const idSet = new Set(lastBulk.ids)
    setClubs((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, [lastBulk.key]: !lastBulk.value } : c)))
    touchCache(clubPaths())
    toast("Deshecho")
    setLastBulk(null)
  }

  if (checkingAdmin) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-sm text-zinc-400">Verificando acceso...</p>
    </main>
  )

  // Campos y chips: el estilo está en globals.css («ui-input», «ui-chip»), igual en todo el admin.
  const inputClass = "ui-input"

  type SheetTab = "datos" | "fotos" | "horario" | "etiquetas" | "estado"

  const renderClubForm = (form: ClubFormData, setForm: (f: ClubFormData) => void) => {
    const set = <K extends keyof ClubFormData>(key: K, value: ClubFormData[K]) => setForm({ ...form, [key]: value })
    const hasColumn = (key: string) => key in form.extras || clubs.some((c) => key in (c as unknown as Record<string, unknown>))
    const closedTag = TAG_GROUPS.flatMap((g) => g.tags).find((t) => t.closed)
    const showClosed = !!closedTag && hasColumn(closedTag.key)
    return (
      <div>
        <div className="mb-6">
          <SheetTabs<SheetTab>
            label="Apartados de la ficha"
            value={sheetTab}
            onChange={setSheetTab}
            tabs={[
              { value: "datos", label: "Datos" },
              { value: "fotos", label: `Fotos${form.gallery.length ? ` (${form.gallery.length + (form.image ? 1 : 0)})` : ""}` },
              { value: "horario", label: "Horario" },
              { value: "etiquetas", label: "Etiquetas" },
              { value: "estado", label: "Estado" },
            ]}
          />
        </div>

        {sheetTab === "datos" && (
          <FieldGrid>
            <Field label="Nombre *">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre del club" className={inputClass} />
            </Field>
            <Field label="Tipo de local">
              <select value={form.venue_type} onChange={(e) => set("venue_type", e.target.value)} className={inputClass}>
                {VENUE_TYPE_OPTIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Barrio">
              <input value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Gràcia, Eixample..." className={inputClass} />
            </Field>
            <Field label="Dirección">
              <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Carrer de Còrsega, 327" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <CoordsField
                latitude={form.latitude}
                longitude={form.longitude}
                address={form.address}
                inputClassName={inputClass}
                onChange={(latitude, longitude) => setForm({ ...form, latitude, longitude })}
              />
            </div>
            <Field label="Música">
              <input value={form.music} onChange={(e) => set("music", e.target.value)} placeholder="Techno, Reggaetón..." className={inputClass} />
            </Field>
            <Field label="Precio">
              <input value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="15-20€" className={inputClass} />
            </Field>
            <Field label="Valoración (rating)">
              <input value={form.rating} onChange={(e) => set("rating", e.target.value)} placeholder="4.5" inputMode="decimal" className={inputClass} />
            </Field>
            <Field label="Aforo / gente">
              <input value={form.people} onChange={(e) => set("people", e.target.value)} placeholder="Ej. 500 personas" className={inputClass} />
            </Field>
            <Field label="Público (edad del ambiente)">
              <select value={form.audience} onChange={(e) => set("audience", e.target.value)} className={inputClass}>
                <option value="">Mixto / sin especificar</option>
                <option value="joven">Joven (18-25)</option>
                <option value="+30">+30</option>
                <option value="+40">+40</option>
              </select>
            </Field>
            <Field label="Dress code">
              <select value={form.dresscode} onChange={(e) => set("dresscode", e.target.value)} className={inputClass}>
                <option value="">Sin especificar</option>
                {DRESS_CODES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                {/* Un valor antiguo fuera de la lista se conserva hasta que se cambie, para no borrarlo sin querer. */}
                {form.dresscode && !(DRESS_CODES as readonly string[]).includes(form.dresscode) && <option value={form.dresscode}>{form.dresscode}</option>}
              </select>
            </Field>
            <Field wide label="Descripción" hint="Cómo es el local, el ambiente, qué lo hace especial. Sin límite de palabras.">
              <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Cuenta cómo es el local, el ambiente, qué lo hace especial..." rows={6} className={inputClass} />
            </Field>
          </FieldGrid>
        )}

        {sheetTab === "fotos" && (
          <div className="space-y-7">
            <FormSection title="Foto principal" hint="La que sale en la lista y arriba de la ficha.">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Vista previa" className="h-28 w-28 shrink-0 rounded-2xl border border-white/15 object-cover" />
                ) : (
                  <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl border border-dashed border-white/25 text-xs text-zinc-400">Sin foto</div>
                )}
                <div className="min-w-0 flex-1 space-y-3">
                  <input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://... (o sube una desde tu equipo)" aria-label="Enlace de la foto principal" className={inputClass} />
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition ${uploadingImage ? "border-white/15 text-zinc-400" : "border-white/30 bg-white/[0.04] text-zinc-100 hover:border-brand-soft hover:bg-brand/10"}`}>
                    <Upload size={16} aria-hidden="true" />
                    {uploadingImage ? "Subiendo..." : "Subir foto desde tu equipo"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(e) => handleImageUpload(e, form, setForm)} />
                  </label>
                </div>
              </div>
            </FormSection>
            <FormSection title={`Galería (${form.gallery.length} foto${form.gallery.length === 1 ? "" : "s"})`} hint="Las fotos de debajo de la principal. Quita las que no encajen con la ✕. Si dejas fotos aquí, Google ya no toca la galería de este club.">
              <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition ${uploadingGallery ? "border-white/15 text-zinc-400" : "border-white/30 bg-white/[0.04] text-zinc-100 hover:border-brand-soft hover:bg-brand/10"}`}>
                <Upload size={16} aria-hidden="true" />
                {uploadingGallery ? "Subiendo..." : "Añadir fotos a la galería"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingGallery} onChange={(e) => handleGalleryUpload(e, form, setForm)} />
              </label>
              {form.gallery.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {form.gallery.map((url) => (
                    <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-white/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        onClick={() => removeGalleryPhoto(url, form, setForm)}
                        aria-label="Quitar foto"
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

        {sheetTab === "horario" && (
          <div className="space-y-7">
            <FormSection title="Horario por días" hint="Marca cada día que abre y pon su hora de inicio y de fin; el horario se compone solo. Si cierra de madrugada, el fin cuenta al día siguiente. Sin días = sin dato, y no se filtra en «Planifica tu noche».">
              <ClubHoursEditor
                hours={form.hours}
                openDays={form.open_days}
                onChange={(next) => setForm({ ...form, ...next })}
                dayLabel={(i) => DAY_OPTIONS[i]}
                chipClass={() => "ui-chip"}
                inputClass={inputClass}
                labels={{
                  start: "hora de inicio",
                  end: "hora de fin",
                  missing: "Falta la hora de inicio o de fin (sin las dos, este día no entra en el horario)",
                  sameForAll: "Mismo horario para todos los días marcados",
                  early: "Empieza pasada la medianoche: cuenta como la noche de este día",
                  legacy: "Horario anterior (no se puede separar por días):",
                  preview: "Se guardará como:",
                  nights: "Lo que has marcado (por noches):",
                  previewNote: "Las horas de madrugada se guardan con el día del calendario: la noche del jueves a las 00:30 ya es viernes. Es correcto: al volver a abrir el formulario salen otra vez tus noches.",
                }}
              />
            </FormSection>
            <FormSection title="Cómo llegar y promos">
              <FieldGrid>
                <Field label="Líneas de metro cercanas" hint="Separadas por comas.">
                  <input value={form.metro_lines} onChange={(e) => set("metro_lines", e.target.value)} placeholder="L1, L4" className={inputClass} />
                </Field>
                <Field label="Buses nocturnos cercanos" hint="Separados por comas.">
                  <input value={form.night_buses} onChange={(e) => set("night_buses", e.target.value)} placeholder="N0, N6" className={inputClass} />
                </Field>
                <Field label="Descuento o promo de hoy" hint="Vacío = ninguno.">
                  <input value={form.discount_info} onChange={(e) => set("discount_info", e.target.value)} placeholder="2x1 en copas hasta las 02:00" className={inputClass} />
                </Field>
                <Field label="Entrada gratis: condiciones" hint="Vacío = ninguna.">
                  <input value={form.free_entry_info} onChange={(e) => set("free_entry_info", e.target.value)} placeholder="Gratis para chicas hasta las 00:30" className={inputClass} />
                </Field>
              </FieldGrid>
            </FormSection>
          </div>
        )}

        {sheetTab === "etiquetas" && (
          <div className="space-y-6">
            <p className="text-xs leading-relaxed text-zinc-300/80">Toca para poner o quitar. Las encendidas salen en la ficha y en los filtros de la web.</p>
            {TAG_GROUPS.filter((g) => g.title !== "Estado de la ficha").map((group) => {
              // Las etiquetas de servicios solo salen si su columna ya existe (SQL 56 para «Cerrado temporalmente», SQL 60 para
              // cumpleaños / eventos privados / alquiler). El formulario de club nuevo parte con los extras vacíos, así que también
              // se mira si alguna ficha ya cargada tiene esa columna.
              const tags = group.tags.filter((t) => !t.extra || hasColumn(t.key))
              if (!tags.length) return null
              return (
                <div key={group.title}>
                  <p className="mb-2.5 text-[13px] font-extrabold text-white">{group.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => {
                      const on = t.extra ? !!form.extras[t.key] : !!(form as unknown as Record<string, unknown>)[t.key]
                      const toggle = () => (t.extra ? setForm({ ...form, extras: { ...form.extras, [t.key]: !on } }) : setForm({ ...form, [t.key]: !on }))
                      return (
                        <FilterChip key={t.key} active={on} onClick={toggle}>
                          <span aria-hidden="true">{t.emoji}</span> {t.label}
                        </FilterChip>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {form.swinger_friendly && (
              <Field label="Normas del club swinger" hint="Vacío = no se enseña nada en la ficha.">
                <textarea
                  value={form.swinger_rules}
                  onChange={(e) => set("swinger_rules", e.target.value)}
                  placeholder="Solo parejas y mujeres solas. Código de vestimenta obligatorio tras las 00:00. Prohibido fotografiar o grabar."
                  rows={4}
                  className={inputClass}
                />
              </Field>
            )}
          </div>
        )}

        {sheetTab === "estado" && (
          <div className="space-y-3">
            <SwitchRow tone="green" checked={!form.hidden} onChange={(v) => set("hidden", !v)} title="Visible en la web" hint={form.hidden ? "Ahora está oculto: nadie lo ve en la web ni en el mapa." : "Sale en la lista, en el mapa y en las búsquedas."} />
            <SwitchRow checked={form.verified} onChange={(v) => set("verified", v)} title="Verificado por Noctua" hint="Lleva la insignia «N Verified» en la ficha." />
            <SwitchRow tone="amber" checked={form.trending} onChange={(v) => set("trending", v)} title="Trending" hint="Lleva la etiqueta 🔥 de tendencia." />
            <SwitchRow tone="red" checked={form.sold_out} onChange={(v) => set("sold_out", v)} title="Agotado (sold out)" hint="Marca el local como agotado." />
            {showClosed && closedTag && (
              <SwitchRow
                tone="amber"
                checked={!!form.extras[closedTag.key]}
                onChange={(v) => setForm({ ...form, extras: { ...form.extras, [closedTag.key]: v } })}
                title="Cerrado temporalmente"
                hint="Sigue en la web con su etiqueta, pero nunca sale como «abierto ahora» y no se recomienda en la portada, «Sorpréndeme», el plan ni «cerca de aquí»."
              />
            )}
          </div>
        )}
      </div>
    )
  }

  const sheetOpen = showAddForm || editingId != null
  const editingClub = editingId != null ? clubs.find((c) => c.id === editingId) || allClubs.find((c) => c.id === editingId) || null : null
  const closeSheet = () => {
    if (showAddForm) {
      setShowAddForm(false)
      setNewClub(emptyForm)
    } else {
      cancelEdit()
    }
  }
  const openNew = () => {
    setEditingId(null)
    setSheetTab("datos")
    setShowAddForm(true)
  }
  const openEdit = (club: Club) => {
    setShowAddForm(false)
    setSheetTab("datos")
    startEdit(club)
  }

  // Atajos de filtro con su cuenta. «Cualquier etiqueta» (desplegable) es para el resto.
  const quickFilters: { key: string; label: string; n: number }[] = [
    { key: "all", label: "Todos", n: clubs.length },
    { key: "visible", label: "Visibles", n: stats.visible },
    { key: "tag:hidden", label: "Ocultos", n: clubs.length - stats.visible },
    { key: "tag:verified", label: "Verificados", n: stats.verified },
    { key: "tag:trending", label: "Trending", n: stats.trending },
  ]
  const quickKeys = new Set(quickFilters.map((q) => q.key))

  // Se pintan de 50 en 50 (cientos de filas a la vez hacían lenta la pantalla); el club abierto siempre entra.
  const openIdx = editingId != null ? filteredClubs.findIndex((c) => c.id === editingId) : -1
  const shownClubs = filteredClubs.slice(0, Math.max(shown, openIdx + 1))

  const sheet = sheetOpen ? (
    <EditSheet
      title={showAddForm ? "Nuevo club" : `Editando: ${editingClub?.name ?? ""}`}
      subtitle={showAddForm ? `Se creará en ${cityName}` : [editingClub?.neighborhood, editingClub?.venue_type].filter(Boolean).join(" · ")}
      onClose={closeSheet}
      links={
        !showAddForm && editingClub ? (
          <Link href={`/clubs/${editingClub.slug || createSlug(editingClub.name)}`} target="_blank" className={`${BTN_GHOST_SM} hidden sm:inline-flex`}>
            Ver ficha <ExternalLink size={13} aria-hidden="true" />
          </Link>
        ) : null
      }
      footer={
        showAddForm ? (
          <>
            <button type="button" onClick={closeSheet} className={BTN_GHOST}>Cancelar</button>
            <button type="button" onClick={addClub} disabled={saving} aria-busy={saving} className={`${BTN_PRIMARY} ml-auto`}>
              {saving ? "Guardando..." : "Guardar club"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={async () => {
                if (editingClub && (await deleteClub(editingClub.id))) cancelEdit()
              }}
              className={BTN_DANGER}
            >
              <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Borrar</span><span className="sr-only sm:hidden">Borrar club</span>
            </button>
            <button type="button" onClick={cancelEdit} className={`${BTN_GHOST} ml-auto`}>Cancelar</button>
            <button type="button" onClick={() => editingClub && saveEdit(editingClub.id)} disabled={saving} aria-busy={saving} className={BTN_PRIMARY}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        )
      }
    >
      {showAddForm ? renderClubForm(newClub, setNewClub) : renderClubForm(editForm, setEditForm)}
    </EditSheet>
  ) : null

  const list = (
    <div>
      {/* Buscador y alta */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar clubs…" label="Buscar clubs por nombre, barrio o música" className="min-w-0 flex-1" />
        <button type="button" onClick={openNew} className={`${BTN_PRIMARY} shrink-0`}>
          <Plus size={17} aria-hidden="true" /> Añadir club
        </button>
      </div>

      {/* Filtros rápidos, con cuántos clubs hay en cada uno */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {quickFilters.map((q) => (
          <FilterChip key={q.key} active={filter === q.key} onClick={() => setFilter(q.key)} count={q.n}>
            {q.label}
          </FilterChip>
        ))}
        <select
          value={quickKeys.has(filter) ? "" : filter}
          onChange={(e) => setFilter(e.target.value || "all")}
          aria-label="Filtrar por otra etiqueta"
          className="ui-input ui-input-flat !min-h-[36px] !w-auto !rounded-full !py-1.5 !pl-3.5 !text-[13px] font-semibold"
        >
          <option value="">Otra etiqueta…</option>
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

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[13px] text-zinc-300/80">
          <strong className="font-extrabold text-white">{filteredClubs.length}</strong> {filteredClubs.length === 1 ? "club" : "clubs"}
        </p>
        <button type="button" onClick={() => setBulkOpen((o) => !o)} aria-expanded={bulkOpen} className={BTN_GHOST_SM}>
          <Layers size={14} aria-hidden="true" /> Acciones en bloque
        </button>
      </div>

      {bulkOpen && (
        <div className="ui-card mb-5 space-y-5 p-5">
          <div>
            <p className="text-sm font-extrabold text-white">Mostrar u ocultar todos los clubs de {cityName}</p>
            <p className="mt-1 text-xs text-zinc-300/80">Pide confirmación antes de cambiar nada.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={showAll} className={BTN_GHOST_SM}><Eye size={14} aria-hidden="true" /> Mostrar todos</button>
              <button type="button" onClick={hideAll} className={BTN_DANGER + " ui-btn-sm"}><EyeOff size={14} aria-hidden="true" /> Ocultar todos</button>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5">
            <p className="text-sm font-extrabold text-white">Poner o quitar una etiqueta a muchos clubs de golpe</p>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              <select value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} aria-label="Etiqueta" className="ui-input md:!w-64">
                <option value="">Elige la etiqueta…</option>
                {bulkGroups.map((g) => (
                  <optgroup key={g.title} label={g.title}>
                    {g.tags.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.emoji} {t.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <Segmented
                label="Poner o quitar"
                value={bulkValue ? "put" : "remove"}
                onChange={(v) => setBulkValue(v === "put")}
                options={[{ value: "put", label: "Poner" }, { value: "remove", label: "Quitar" }]}
              />
              <Segmented
                label="A qué clubs"
                value={bulkScope}
                onChange={setBulkScope}
                options={[{ value: "list", label: `La lista actual (${filteredClubs.length})` }, { value: "all", label: `Todos (${clubs.length})` }]}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={applyBulkTag} disabled={!bulkTagRef || bulkTargets.length === 0 || bulkBusy} aria-busy={bulkBusy} className={BTN_PRIMARY}>
                {bulkBusy ? "Aplicando…" : bulkTagRef ? `${bulkValue ? "Poner" : "Quitar"} a ${bulkTargets.length} club${bulkTargets.length === 1 ? "" : "s"}` : "Elige una etiqueta"}
              </button>
              {bulkTagRef && (
                <p className="text-xs text-zinc-300/80">
                  {bulkScopeCount - bulkTargets.length} de {bulkScopeCount} {bulkValue ? "ya la tienen" : "ya no la tienen"}; cambian {bulkTargets.length}.
                </p>
              )}
              {lastBulk && (
                <button type="button" onClick={undoBulkTag} disabled={bulkBusy} className={`${BTN_GHOST} ml-auto`}>
                  Deshacer: {lastBulk.value ? "puesta" : "quitada"} «{lastBulk.label}» en {lastBulk.ids.length}
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              «La lista actual» respeta la búsqueda y el filtro de arriba. La web pública y el mapa se refrescan al momento; las fichas de cada club pueden tardar hasta 6 horas en reflejarlo (o se actualizan al guardarlas).
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-sm text-zinc-300">Cargando clubs...</p>
      ) : (
        <>
          <ul className="grid gap-2.5">
            {shownClubs.map((club) => {
              const open = editingId === club.id
              return (
                <li key={club.id} id={`club-${club.id}`}>
                  <div className={`ui-item ${open ? "ui-item-on" : ""} ${club.hidden && !open ? "ui-item-dim" : ""}`}>
                    <button type="button" onClick={() => openEdit(club)} aria-label={`Editar ${club.name}`} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <Thumb src={club.image} name={club.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold text-white">{club.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-300/80">
                          {[club.neighborhood, club.music].filter(Boolean).join(" · ") || "Sin datos"}
                          {club.rating ? ` · ★ ${club.rating}` : ""}
                        </span>
                        {(club.verified || club.trending || club.sold_out || club.temporarily_closed) && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {club.verified && <Tag tone="violet">Verificado</Tag>}
                            {club.trending && <Tag tone="amber">Trending</Tag>}
                            {club.sold_out && <Tag tone="red">Agotado</Tag>}
                            {club.temporarily_closed && <Tag tone="amber">Cerrado temp.</Tag>}
                          </span>
                        )}
                      </span>
                    </button>
                    {/* Interruptor rápido de visibilidad: lo más usado, sin abrir la ficha. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!club.hidden}
                      aria-label={`${club.name}: ${club.hidden ? "oculto, pulsa para mostrarlo" : "visible, pulsa para ocultarlo"}`}
                      onClick={() => toggleField(club, "hidden")}
                      className="flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-1"
                    >
                      <span className="ui-switch" data-on={!club.hidden} data-tone="green" aria-hidden="true" />
                      <span className={`text-[11px] font-bold ${club.hidden ? "text-zinc-400" : "text-open"}`}>{club.hidden ? "Oculto" : "Visible"}</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {filteredClubs.length === 0 && (
            <div className="ui-card px-6 py-14 text-center">
              <p className="text-sm font-bold text-white">No se encontraron clubs</p>
              <p className="mt-1 text-xs text-zinc-300/80">Prueba con otra búsqueda o quita el filtro.</p>
              {(search || filter !== "all") && (
                <button type="button" onClick={() => { setSearch(""); setFilter("all") }} className={`${BTN_GHOST_SM} mt-4`}>Quitar búsqueda y filtro</button>
              )}
            </div>
          )}
          <ShowMore shown={shownClubs.length} total={filteredClubs.length} onMore={() => setShown((n) => n + 50)} />
        </>
      )}
    </div>
  )

  return (
    <AdminShell title="Clubs" subtitle="Gestiona las discotecas, pubs y bares musicales de Noctua.">
      <>
        {/* Cifras: pulsa una para filtrar la lista */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile accent="violet" icon={Wine} label="Total clubs" value={stats.total} active={filter === "all"} onClick={() => setFilter("all")} />
          <StatTile accent="cyan" icon={Eye} label="Visibles" value={stats.visible} active={filter === "visible"} onClick={() => setFilter("visible")} />
          <StatTile accent="pink" icon={BadgeCheck} label="Verificados" value={stats.verified} active={filter === "tag:verified"} onClick={() => setFilter("tag:verified")} />
          <StatTile accent="coral" icon={Flame} label="Trending" value={stats.trending} active={filter === "tag:trending"} onClick={() => setFilter("tag:trending")} />
        </div>
        <SplitView list={list} sheet={sheet} />
      </>
    </AdminShell>
  )
}
