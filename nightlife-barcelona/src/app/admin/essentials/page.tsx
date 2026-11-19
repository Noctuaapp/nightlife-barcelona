"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { Camera, ExternalLink, Eye, EyeOff, ImageOff, Layers, Plus, ShieldCheck, Store, Trash2, Upload, type LucideIcon } from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { BTN_DANGER, BTN_GHOST, BTN_GHOST_SM, BTN_PRIMARY, BTN_PRIMARY_SM, FilterChip, StatTile, Tag } from "../../../components/admin/ui"
import { EditSheet, Field, FieldGrid, FormSection, SearchBox, SheetTabs, ShowMore, SplitView, SwitchRow, Thumb } from "../../../components/admin/editor"
import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/fetchAll"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { toast } from "../../../components/ui/Toast"
import CoordsField from "../../../components/admin/CoordsField"
import { coordsPayload, coordToInput, googleMapsUrl, parseCoords } from "../../../lib/coords"
import { touchCache, essentialPaths } from "../../../lib/touchCache"
import { ESSENTIAL_CATEGORIES, categoryInfo, essentialSlugLabelEs } from "../../../lib/essentialCategories"
import { isVerificationCurrent } from "../../../lib/availability"
import { CITIES, cityOfClub } from "../../../lib/cities"
import { useAdminCity } from "../../../components/admin/AdminCity"
import { prepareImageForUpload, uploadFileName } from "../../../lib/compressImage"

// Rediseño (2/11/2026): esta pantalla era la más pobre del admin. Con miles de esenciales (las
// paradas de Nitbus y lo importado de OpenStreetMap) solo tenía filtro por categoría, el
// formulario de alta siempre abierto ocupando media pantalla, botones en inglés, "Mostrar todos" /
// "Ocultar todos" sobre TODA la tabla y borrar sin preguntar. Ahora, como la de clubs:
//   - buscador (nombre, dirección, barrio, categoría, número de ficha) que ignora tildes,
//   - filtros por categoría y por estado, cada uno con cuántos hay (y que se cruzan entre sí),
//   - alta plegable, edición con todos los campos rotulados, insignias de estado,
//   - "Publicar / Ocultar" solo sobre lo que se está viendo, y confirmación al borrar,
//   - la lista se pinta de 40 en 40 (con 3.000 fichas pintarlas todas hacía lenta la página).

type Essential = {
  id: number
  name: string
  category: string
  subcategory: string | null
  address: string | null
  neighborhood: string | null
  description: string | null
  image: string | null
  open_hours: string | null
  maps_link: string | null
  latitude: number | null
  longitude: number | null
  hidden: boolean | null
  import_source?: string | null
  // SQL 82 (5/11/2026). Opcionales: si la migración aún no se ha ejecutado, la fila no trae estos campos.
  phone?: string | null
  website?: string | null
  is_24h?: boolean | null
  source?: string | null
  source_url?: string | null
  verification_status?: string | null
  last_verified_at?: string | null
}

const emptyForm = {
  name: "",
  category: "",
  subcategory: "",
  address: "",
  neighborhood: "",
  description: "",
  image: "",
  open_hours: "",
  maps_link: "",
  latitude: "",
  longitude: "",
  phone: "",
  website: "",
  is_24h: false,
}
type EssentialForm = typeof emptyForm

const PAGE_SIZE = 40

// Misma fuente que la web pública (antes esta lista vivía por su cuenta y se desincronizó).
const categories = ESSENTIAL_CATEGORIES.map((c) => c.key)

const CATEGORY_SINGULAR_ES: Record<string, string> = {
  Pharmacy: "Farmacia",
  ATM: "Cajero",
  Food: "Comida",
  Supermarket: "Supermercado",
  Metro: "Metro",
  Nitbus: "Nitbus",
  Hospital: "Hospital",
  "Gas Station": "Gasolinera",
  Parking: "Parking",
  Hotel: "Hotel",
  Casino: "Casino",
  Taxi: "Parada de taxi",
  Veterinary: "Veterinario",
  Toilets: "Aseo público",
  Vending: "Máquina expendedora",
  Bicing: "Estación de Bicing",
  BiciMAD: "Estación de BiciMAD",
  Luggage: "Consigna",
  Police: "Comisaría",
  Tobacco: "Estanco",
  LostFound: "Objetos perdidos",
}
const categorySingular = (key: string) => CATEGORY_SINGULAR_ES[key] || key
const categoryPlural = (key: string) => {
  const known = ESSENTIAL_CATEGORIES.find((c) => c.key === key)
  return known ? essentialSlugLabelEs(known.slug) : key
}

// Sugerencias rápidas de subcategoría según la categoría elegida — campo libre, así que esto
// es solo una ayuda para escribir rápido desde el móvil, no una lista cerrada.
const SUBCATEGORY_HINTS: Record<string, string[]> = {
  ATM: ["CaixaBank", "Santander", "BBVA", "Banco Sabadell", "ING", "Bankinter", "Unicaja", "Abanca"],
  Food: ["Pizza", "Kebab", "Hamburguesas", "Bocadillos", "Döner", "Asiática", "Churrería", "24h"],
  // Código de línea Nitbus (N0-N28): con esto la ficha pública ya sabe mostrar el recorrido real
  // de la línea (ver src/lib/nightBuses.ts) en vez de solo el nombre de la parada.
  Nitbus: ["N0", "N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "N11", "N12", "N13", "N14", "N15", "N16", "N17", "N18", "N19", "N20", "N23", "N24", "N28"],
  // Línea(s) de metro/FGC que paran aquí (p. ej. "L3" o "L3, L5" si es un intercambiador).
  Metro: ["L1", "L2", "L3", "L4", "L5", "L9N", "L9S", "L10N", "L10S", "L11", "L6", "L7", "L8", "L12"],
  Vending: ["Bebidas", "Comida y snacks", "Café", "Higiene", "Tecnología"],
  Police: ["Guardia Urbana", "Mossos d'Esquadra", "Policía Nacional", "Guardia Civil"],
}
const SUBCATEGORY_LABEL: Record<string, string> = {
  ATM: "Banco",
  Food: "Tipo de comida",
  Nitbus: "Línea(s) de bus",
  Metro: "Línea(s) de metro",
  Vending: "Qué vende",
  Police: "Cuerpo",
}
const SUBCATEGORY_PLACEHOLDER: Record<string, string> = {
  ATM: "CaixaBank",
  Food: "Pizza",
  Nitbus: "N6 o N6, N9",
  Metro: "L3",
  Vending: "Bebidas",
  Police: "Guardia Urbana",
}

type StatusKey = "all" | "visible" | "hidden" | "nophoto" | "nocoords" | "nohours" | "nophone" | "unverified" | "verified" | "osm" | "google"
const STATUS_TESTS: Record<StatusKey, (e: Essential) => boolean> = {
  all: () => true,
  visible: (e) => !e.hidden,
  hidden: (e) => !!e.hidden,
  nophoto: (e) => !e.image,
  nocoords: (e) => e.latitude == null || e.longitude == null,
  nohours: (e) => !(e.open_hours || "").trim(),
  nophone: (e) => !(e.phone || "").trim(),
  // «Verificado» solo si la verificación sigue vigente (cada categoría tiene su plazo, ver essentialCategories.ts).
  verified: (e) => isVerificationCurrent(e),
  unverified: (e) => !isVerificationCurrent(e),
  osm: (e) => e.import_source === "osm",
  google: (e) => e.import_source === "google",
}
const STATUS_LABEL: Record<StatusKey, string> = {
  all: "Todos",
  visible: "Publicados",
  hidden: "Ocultos (sin publicar)",
  nophoto: "Sin foto",
  nocoords: "Sin ubicación en el mapa",
  nohours: "Sin horario",
  nophone: "Sin teléfono",
  unverified: "Sin verificar o caducado",
  verified: "Verificados",
  osm: "Importados de OpenStreetMap",
  google: "Importados de Google",
}
const STATUS_ORDER: StatusKey[] = ["all", "visible", "hidden", "nophoto", "nocoords", "nohours", "nophone", "unverified", "verified", "osm", "google"]

type SortKey = "category" | "recent" | "name"

// Sin tildes ni mayúsculas: «farmacia» encuentra «Farmàcia».
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

// Campos y chips: el estilo está en globals.css («ui-input», «ui-chip»), igual en todo el admin.
const inputClass = "ui-input"

// Pestañas de la ficha (19/11/2026). «Estado» solo existe al editar: ahí están los interruptores y la verificación, que se guardan al momento.
type SheetTab = "datos" | "horario" | "foto" | "estado"

// Estados que salen como botones con su cuenta; el resto van en el desplegable «Otro estado…».
const QUICK_STATUS: { key: StatusKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "visible", label: "Publicados" },
  { key: "hidden", label: "Ocultos" },
  { key: "nophoto", label: "Sin foto" },
  { key: "nocoords", label: "Sin ubicación" },
  { key: "nohours", label: "Sin horario" },
  { key: "unverified", label: "Sin verificar" },
]

export default function AdminEssentialsPage() {
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  // Ciudad (14/11/2026): Barcelona y Madrid comparten tabla; la ciudad de cada esencial sale de sus coordenadas. Desde el 15/11/2026 la
  // ciudad es la del selector del menú del admin (antes había un filtro propio aquí): los contadores, la lista y «Publicar / Ocultar los
  // filtrados» solo cuentan los esenciales de esa ciudad.
  const [city, setCity] = useAdminCity()
  const cityName = CITIES[city].name
  const [status, setStatus] = useState<StatusKey>("all")
  const [sort, setSort] = useState<SortKey>("category")
  const [limit, setLimit] = useState(PAGE_SIZE)
  // Ficha que se enseña siempre arriba, aunque los filtros la dejarían fuera: la que se acaba de
  // crear o la que se abre desde el botón «Editar» de la web (?edit=ID).
  const [focusId, setFocusId] = useState<number | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newEssential, setNewEssential] = useState<EssentialForm>(emptyForm)
  const [editEssential, setEditEssential] = useState<EssentialForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoBusyId, setPhotoBusyId] = useState<number | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [sheetTab, setSheetTab] = useState<SheetTab>("datos")
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error || data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  useEffect(() => { fetchEssentials() }, [])

  const fetchEssentials = async () => {
    const data = await fetchAllPages((from, to) => supabase.from("essentials").select("*").order("category").order("name").order("id").range(from, to))
    setEssentials((data || []) as Essential[])
    setLoading(false)
  }

  // Al cambiar de búsqueda o de filtro se vuelve a las primeras 40 y se suelta la ficha fijada.
  useEffect(() => {
    setLimit(PAGE_SIZE)
    setFocusId(null)
  }, [search, category, status, sort, city])

  // ---------- Datos derivados (búsqueda, filtros y contadores) ----------
  const scoped = useMemo(() => essentials.filter((e) => cityOfClub(e) === city), [essentials, city])
  const rows = useMemo(
    () =>
      scoped.map((e) => ({
        e,
        hay: fold([e.name, e.category, categorySingular(e.category), categoryPlural(e.category), e.subcategory, e.address, e.neighborhood, e.description, e.open_hours].filter(Boolean).join(" ")),
      })),
    [scoped]
  )

  const { filtered, catCounts, statusCounts } = useMemo(() => {
    const tokens = fold(search).split(/\s+/).filter(Boolean)
    const matchSearch = (r: { e: Essential; hay: string }) =>
      tokens.every((t) => r.hay.includes(t) || String(r.e.id) === t.replace(/^#/, ""))
    const matchCat = (e: Essential) => category === "all" || e.category === category
    const matchStatus = (e: Essential) => STATUS_TESTS[status](e)

    // Cada contador tiene en cuenta los otros dos filtros (no el suyo): al elegir «Parking», los
    // estados dicen cuántos parkings están ocultos, no cuántos esenciales en total.
    const catCounts = new Map<string, number>()
    const statusCounts = Object.fromEntries(STATUS_ORDER.map((k) => [k, 0])) as Record<StatusKey, number>
    let list: Essential[] = []
    for (const r of rows) {
      const okSearch = matchSearch(r)
      if (!okSearch) continue
      const okCat = matchCat(r.e)
      const okStatus = matchStatus(r.e)
      if (okStatus) catCounts.set(r.e.category, (catCounts.get(r.e.category) || 0) + 1)
      if (okCat) for (const k of STATUS_ORDER) if (STATUS_TESTS[k](r.e)) statusCounts[k]++
      if (okCat && okStatus) list.push(r.e)
    }
    if (sort === "recent") list = [...list].sort((a, b) => b.id - a.id)
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"))
    return { filtered: list, catCounts, statusCounts }
  }, [rows, search, category, status, sort])

  const totals = useMemo(
    () => ({
      total: scoped.length,
      visible: scoped.filter(STATUS_TESTS.visible).length,
      hidden: scoped.filter(STATUS_TESTS.hidden).length,
      nophoto: scoped.filter(STATUS_TESTS.nophoto).length,
    }),
    [scoped]
  )

  const extraCategories = useMemo(() => [...new Set(scoped.map((e) => e.category).filter((c) => c && !categories.includes(c)))].sort(), [scoped])

  const isFiltered = !!search.trim() || category !== "all" || status !== "all"
  const clearFilters = () => { setSearch(""); setCategory("all"); setStatus("all") }

  // ---------- Fotos ----------
  // Sube la foto (reducida y enderezada como las de los clubs, lib/compressImage) al bucket
  // essential-images, así que el cron de Google no la pisa (solo sustituye imágenes vacías o de essential-photos).
  const uploadToBucket = async (file: File, prefix: string): Promise<string | null> => {
    const prepared = await prepareImageForUpload(file)
    const filePath = `essentials/${uploadFileName(prefix, prepared.ext)}`
    const { error } = await supabase.storage.from("essential-images").upload(filePath, prepared.blob, { contentType: prepared.contentType })
    if (error) {
      logError("PHOTO UPLOAD ERROR:", error)
      toast(`No se ha podido subir la foto: ${error.message}`, 5000)
      return null
    }
    return supabase.storage.from("essential-images").getPublicUrl(filePath).data.publicUrl
  }

  // Foto del formulario (alta o edición): se sube y se pone en el formulario; se guarda con el resto.
  const uploadFormImage = async (e: ChangeEvent<HTMLInputElement>, apply: (url: string) => void) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = "" // permite volver a elegir la misma foto
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadToBucket(file, "e")
      if (url) apply(url)
    } catch (err) {
      logError("PHOTO ERROR:", err)
      toast("No se ha podido subir la foto", 5000)
    } finally {
      setUploading(false)
    }
  }

  // Cambiar la foto de un esencial sin abrir el formulario de edición: se sube y se guarda en la ficha al momento.
  const changePhoto = async (item: Essential, file: File | undefined) => {
    if (!file) return
    setPhotoBusyId(item.id)
    try {
      const url = await uploadToBucket(file, `e${item.id}`)
      if (!url) return
      const { data, error } = await supabase.from("essentials").update({ image: url }).eq("id", item.id).select().single()
      if (error) { logError("PHOTO SAVE ERROR:", error); toast(`La foto se subió pero no se pudo guardar en la ficha: ${error.message}`, 5000); return }
      if (data) setEssentials((prev) => prev.map((e) => (e.id === item.id ? data : e)))
      touchCache(essentialPaths())
      toast("Foto cambiada")
    } catch (e) {
      logError("PHOTO ERROR:", e)
      toast("No se ha podido cambiar la foto", 5000)
    } finally {
      setPhotoBusyId(null)
    }
  }

  // ---------- Crear, editar, borrar ----------
  // Los campos de la migración 82 (teléfono, web, 24 h) solo se mandan si tienen valor o la ficha ya los
  // traía: así guardar sigue funcionando aunque la migración aún no se haya ejecutado.
  const formToPayload = (f: EssentialForm, original?: Essential) => {
    const known = (k: keyof Essential) => !!original && k in original
    const extra: Record<string, unknown> = {}
    if (f.phone.trim() || known("phone")) extra.phone = f.phone.trim() || null
    if (f.website.trim() || known("website")) extra.website = f.website.trim() || null
    if (f.is_24h || known("is_24h")) extra.is_24h = f.is_24h ? true : null
    return {
      name: f.name.trim(),
      category: f.category,
      subcategory: f.subcategory.trim() || null,
      address: f.address.trim(),
      neighborhood: f.neighborhood.trim(),
      description: f.description.trim(),
      image: f.image.trim(),
      open_hours: f.open_hours.trim(),
      maps_link: f.maps_link.trim(),
      ...coordsPayload(f.latitude, f.longitude),
      ...extra,
    }
  }

  const scrollToItem = (id: number) => {
    let tries = 0
    const timer = window.setInterval(() => {
      tries++
      const el = document.getElementById(`essential-${id}`)
      if (el) {
        window.clearInterval(timer)
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" })
      } else if (tries > 40) {
        window.clearInterval(timer)
      }
    }, 150)
  }

  const addEssential = async () => {
    if (!newEssential.name.trim() || !newEssential.category) {
      toast("Pon al menos el nombre y la categoría", 4000)
      return
    }
    // Si el esencial no va a caer en la ciudad que estás viendo (sus coordenadas mandan; sin ellas, Barcelona), se avisa antes de crearlo:
    // si no, desaparecería de la lista y parecería que no se ha guardado.
    const lands = cityOfClub({
      latitude: newEssential.latitude.trim() ? newEssential.latitude : null,
      longitude: newEssential.longitude.trim() ? newEssential.longitude : null,
    })
    if (lands !== city) {
      const why = newEssential.latitude.trim() && newEssential.longitude.trim() ? "por sus coordenadas" : "porque no tiene coordenadas"
      if (!window.confirm(`Estás en ${cityName}, pero este esencial se verá en ${CITIES[lands].name} ${why}.\n\n¿Crearlo igualmente?`)) return
    }
    setSaving(true)
    const { data, error } = await supabase.from("essentials").insert(formToPayload(newEssential)).select().single()
    setSaving(false)
    if (error) { logError("ADD ERROR:", error); toast(`No se ha podido crear: ${error.message}`, 5000); return }
    if (data) {
      setEssentials((prev) => [data, ...prev])
      touchCache(essentialPaths())
      setFocusId(data.id)
      scrollToItem(data.id)
    }
    toast("Esencial creado")
    setNewEssential(emptyForm)
    setShowAddForm(false)
  }

  const startEditing = (item: Essential) => {
    setShowAddForm(false)
    setSheetTab("datos")
    setEditingId(item.id)
    setEditEssential({
      name: item.name || "", category: item.category || "", subcategory: item.subcategory || "", address: item.address || "",
      neighborhood: item.neighborhood || "", description: item.description || "",
      image: item.image || "", open_hours: item.open_hours || "", maps_link: item.maps_link || "",
      latitude: coordToInput(item.latitude), longitude: coordToInput(item.longitude),
      phone: item.phone || "", website: item.website || "", is_24h: !!item.is_24h,
    })
  }

  const cancelEditing = () => { setEditingId(null); setEditEssential(emptyForm) }

  // Llegando desde el botón "Editar" de la ficha pública (?edit=ID).
  const autoEditDone = useRef(false)
  useEffect(() => {
    if (autoEditDone.current || essentials.length === 0) return
    const wanted = new URLSearchParams(window.location.search).get("edit")
    autoEditDone.current = true
    if (!wanted) return
    const found = essentials.find((x) => String(x.id) === wanted)
    if (!found) return
    // El botón «Editar» de una ficha pública puede ser de la otra ciudad: se cambia a ella para que se vea.
    setCity(cityOfClub(found))
    startEditing(found)
    setFocusId(found.id)
    scrollToItem(found.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essentials])

  // Al cambiar de ciudad se cierra el formulario de alta (el esencial se habría creado para la ciudad equivocada) y la edición abierta
  // si ese esencial no es de la ciudad nueva.
  const prevCity = useRef(city)
  useEffect(() => {
    if (prevCity.current === city) return
    prevCity.current = city
    setShowAddForm(false)
    setNewEssential(emptyForm)
    setEditingId((id) => {
      if (id == null) return id
      const open = essentials.find((x) => x.id === id)
      return open && cityOfClub(open) === city ? id : null
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city])

  const saveEditing = async (id: number) => {
    if (!editEssential.name.trim() || !editEssential.category) {
      toast("Pon al menos el nombre y la categoría", 4000)
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from("essentials").update(formToPayload(editEssential, essentials.find((x) => x.id === id))).eq("id", id).select().single()
    setSaving(false)
    if (error) { logError("EDIT ERROR:", error); toast(`No se ha podido guardar: ${error.message}`, 5000); return }
    toast("Cambios guardados")
    if (data) {
      setEssentials((prev) => prev.map((e) => (e.id === id ? data : e)))
      touchCache(essentialPaths())
    }
    cancelEditing()
  }

  const deleteEssential = async (item: Essential) => {
    if (!window.confirm(`¿Borrar «${item.name}»? No se puede deshacer.`)) return
    const { error } = await supabase.from("essentials").delete().eq("id", item.id)
    if (error) { logError("DELETE ERROR:", error); toast(`No se ha podido borrar: ${error.message}`, 5000); return }
    setEssentials((prev) => prev.filter((e) => e.id !== item.id))
    if (editingId === item.id) cancelEditing()
    touchCache(essentialPaths())
    toast("Esencial borrado")
  }

  const toggleHidden = async (item: Essential) => {
    const newValue = !item.hidden
    const { error } = await supabase.from("essentials").update({ hidden: newValue }).eq("id", item.id)
    if (error) { logError("HIDDEN ERROR:", error); toast(`No se ha podido cambiar: ${error.message}`, 5000); return }
    setEssentials((prev) => prev.map((e) => (e.id === item.id ? { ...e, hidden: newValue } : e)))
    touchCache(essentialPaths())
  }

  // «Verificado hoy»: alguien de Noctua ha comprobado el horario (llamando o con la fuente oficial). Mientras no se
  // hace, Hospital, Veterinario, aseos, máquinas, consignas y comisarías salen como «horario sin confirmar».
  const setVerified = async (item: Essential, verified: boolean) => {
    const patch = verified
      ? { verification_status: "verified", last_verified_at: new Date().toISOString() }
      : { verification_status: "unverified", last_verified_at: null }
    const { data, error } = await supabase.from("essentials").update(patch).eq("id", item.id).select().single()
    if (error) { logError("VERIFY ERROR:", error); toast(`No se ha podido guardar la verificación: ${error.message}`, 5000); return }
    if (data) setEssentials((prev) => prev.map((e) => (e.id === item.id ? data : e)))
    touchCache(essentialPaths())
    toast(verified ? "Marcado como verificado hoy" : "Verificación quitada")
  }

  // ---------- Publicar / ocultar en bloque ----------
  // Antes «Mostrar todos» / «Ocultar todos» actuaban sobre TODA la tabla aunque se estuviera mirando
  // una sola categoría. Ahora actúan solo sobre lo que sale con el filtro y la búsqueda actuales
  // (los que ya están como se pide no se tocan), siempre con confirmación.
  const scopeText = () => {
    const parts: string[] = []
    if (category !== "all") parts.push(categoryPlural(category))
    if (status !== "all") parts.push(STATUS_LABEL[status].toLowerCase())
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
      const msg = `Vas a OCULTAR ${targets.length} esenciales (${scope}). Nadie podrá verlos en la web hasta que los publiques otra vez.`
      if (targets.length >= 10) {
        if ((window.prompt(`${msg}\n\nEscribe OCULTAR para confirmar.`) || "").trim().toUpperCase() !== "OCULTAR") return
      } else if (!window.confirm(`${msg}\n\n¿Seguro?`)) return
    } else if (!window.confirm(`Vas a PUBLICAR ${targets.length} esenciales (${scope}), también los que estén ocultos a propósito o sin revisar, como los importados de OpenStreetMap.\n\n¿Seguro?`)) {
      return
    }
    setBulkBusy(true)
    const done = new Set<number>()
    try {
      const ids = targets.map((e) => e.id)
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100)
        const { error } = await supabase.from("essentials").update({ hidden }).in("id", chunk)
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
      setEssentials((prev) => prev.map((e) => (done.has(e.id) ? { ...e, hidden } : e)))
      touchCache(essentialPaths())
      if (done.size === targets.length) toast(`${done.size} esenciales ${hidden ? "ocultados" : "publicados"}`)
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
  // De 40 en 40; la ficha fijada (recién creada o abierta con ?edit=ID) va siempre arriba.
  const focus = focusId != null ? essentials.find((e) => e.id === focusId) : undefined
  const rest = filtered.filter((e) => e.id !== focus?.id)
  const shownItems = [...(focus ? [focus] : []), ...rest.slice(0, limit)]

  const editingItem = editingId != null ? essentials.find((e) => e.id === editingId) || null : null
  const sheetOpen = showAddForm || editingId != null
  const closeSheet = () => {
    if (showAddForm) {
      setShowAddForm(false)
      setNewEssential(emptyForm)
    } else {
      cancelEditing()
    }
  }
  const openNew = () => {
    cancelEditing()
    setSheetTab("datos")
    setShowAddForm(true)
  }

  const mapsHrefOf = (item: Essential): string | null => {
    const hasCoords = item.latitude != null && item.longitude != null
    return /^https?:\/\//i.test((item.maps_link || "").trim())
      ? (item.maps_link || "").trim()
      : hasCoords
      ? googleMapsUrl({ lat: Number(item.latitude), lng: Number(item.longitude) })
      : null
  }

  // Función (no componente): definida como componente dentro de la página se volvía a montar en
  // cada tecla y el campo perdía el foco al escribir.
  const renderForm = (data: EssentialForm, setData: (d: EssentialForm) => void, setImage: (url: string) => void, isNew: boolean) => {
    const knownCategory = categories.includes(data.category)
    const showSub = !!SUBCATEGORY_LABEL[data.category] || !!data.subcategory
    const tab: SheetTab = isNew && sheetTab === "estado" ? "datos" : sheetTab
    return (
      <div>
        <div className="mb-6">
          <SheetTabs<SheetTab>
            label="Apartados de la ficha"
            value={tab}
            onChange={setSheetTab}
            tabs={[
              { value: "datos", label: "Datos" },
              { value: "horario", label: "Horario y contacto" },
              { value: "foto", label: "Foto" },
              ...(isNew ? [] : [{ value: "estado" as const, label: "Estado" }]),
            ]}
          />
        </div>

        {tab === "datos" && (
          <FieldGrid>
            <Field label="Nombre *">
              <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Farmacia Central" className={inputClass} />
            </Field>
            <Field label="Categoría *">
              <select value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })} className={inputClass}>
                <option value="">Elige una categoría</option>
                {!knownCategory && data.category && <option value={data.category}>{data.category}</option>}
                {categories.map((c) => <option key={c} value={c}>{categorySingular(c)}</option>)}
              </select>
            </Field>
            {showSub && (
              <Field label={SUBCATEGORY_LABEL[data.category] || "Subcategoría"}>
                <input
                  value={data.subcategory}
                  onChange={(e) => setData({ ...data, subcategory: e.target.value })}
                  list="subcategory-hints"
                  placeholder={SUBCATEGORY_PLACEHOLDER[data.category] || ""}
                  className={inputClass}
                />
                <datalist id="subcategory-hints">
                  {(SUBCATEGORY_HINTS[data.category] || []).map((s) => <option key={s} value={s} />)}
                </datalist>
              </Field>
            )}
            <Field label="Barrio o municipio">
              <input value={data.neighborhood} onChange={(e) => setData({ ...data, neighborhood: e.target.value })} placeholder="Gràcia, Badalona…" className={inputClass} />
            </Field>
            <Field label="Dirección">
              <input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder="Carrer de Còrsega, 327" className={inputClass} />
            </Field>
            <div className="md:col-span-2">
              <CoordsField
                latitude={data.latitude}
                longitude={data.longitude}
                address={data.address}
                onChange={(latitude, longitude) => setData({ ...data, latitude, longitude })}
                inputClassName={inputClass}
                labelClassName="ui-label"
              />
            </div>
            <Field wide label="Descripción" hint="Opcional.">
              <textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={4} className={`${inputClass} resize-y`} />
            </Field>
          </FieldGrid>
        )}

        {tab === "horario" && (
          <div className="space-y-7">
            <FormSection title="Cuándo abre">
              <div className="space-y-3">
                <Field label="Horario" hint="Texto como lo da la fuente: «Open 24 hours», «Monday to Sunday 9:00 AM – 3:00 AM»…">
                  <input value={data.open_hours} onChange={(e) => setData({ ...data, open_hours: e.target.value })} placeholder="Open 24 hours" className={inputClass} />
                </Field>
                <SwitchRow checked={data.is_24h} onChange={(v) => setData({ ...data, is_24h: v })} title="Abierto las 24 h" hint="Se usa si el horario está vacío." />
              </div>
            </FormSection>
            <FormSection title="Contacto y enlaces">
              <FieldGrid>
                <Field label="Teléfono">
                  <input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} inputMode="tel" placeholder="933 03 30 33" className={inputClass} />
                </Field>
                <Field label="Web">
                  <input value={data.website} onChange={(e) => setData({ ...data, website: e.target.value })} inputMode="url" placeholder="https://…" className={inputClass} />
                </Field>
                <Field wide label="Enlace de Google Maps" hint="Si lleva coordenadas y todavía no hay, se rellenan solas.">
                  <input
                    value={data.maps_link}
                    onChange={(e) => {
                      const p = parseCoords(e.target.value)
                      const fill = p && !data.latitude && !data.longitude ? { latitude: String(p.lat), longitude: String(p.lng) } : {}
                      setData({ ...data, maps_link: e.target.value, ...fill })
                    }}
                    placeholder="https://www.google.com/maps/…"
                    className={inputClass}
                  />
                </Field>
              </FieldGrid>
            </FormSection>
          </div>
        )}

        {tab === "foto" && (
          <FormSection title="Foto" hint="La que sale en la lista y arriba de la ficha. Si la subes tú, el proceso automático de Google no la cambia.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {data.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.image} alt="Vista previa" className="h-28 w-28 shrink-0 rounded-2xl border border-white/15 object-cover" />
              ) : (
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl border border-dashed border-white/25 text-xs text-zinc-400">Sin foto</div>
              )}
              <div className="min-w-0 flex-1 space-y-3">
                <input value={data.image} onChange={(e) => setImage(e.target.value)} placeholder="https://… (o sube una desde tu equipo)" aria-label="Enlace de la foto" className={inputClass} />
                <div className="flex flex-wrap gap-2">
                  <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition ${uploading ? "border-white/15 text-zinc-400" : "border-white/30 bg-white/[0.04] text-zinc-100 hover:border-brand-soft hover:bg-brand/10"}`}>
                    <Upload size={16} aria-hidden="true" />
                    {uploading ? "Subiendo…" : data.image ? "Cambiar foto" : "Subir foto desde tu equipo"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => void uploadFormImage(e, setImage)} />
                  </label>
                  {data.image && <button type="button" onClick={() => setImage("")} className={BTN_GHOST}>Quitar foto</button>}
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {tab === "estado" && editingItem && renderStatus(editingItem)}
      </div>
    )
  }

  // Pestaña «Estado» de un esencial ya creado: visibilidad y verificación del horario. Se guardan al momento.
  const renderStatus = (item: Essential) => {
    const verifiedNow = isVerificationCurrent(item)
    const verifiedDate = item.last_verified_at ? new Date(item.last_verified_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : ""
    const strict = categoryInfo(item.category).trust === "strict"
    const sourceHref = /^https?:\/\//i.test(item.source_url || "") ? (item.source_url as string) : null
    return (
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-zinc-300/80">Lo de esta pestaña se guarda al momento: no hace falta pulsar «Guardar cambios».</p>
        <SwitchRow
          tone="green"
          checked={!item.hidden}
          onChange={() => void toggleHidden(item)}
          title="Visible en la web"
          hint={item.hidden ? "Ahora está oculto: nadie lo ve en la web ni en el mapa." : "Sale en las listas, en el mapa y en las búsquedas."}
        />
        <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-sm font-bold text-white">Verificación del horario</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-300/80">
            {verifiedNow
              ? `Verificado el ${verifiedDate}.`
              : item.verification_status === "verified"
              ? `La verificación del ${verifiedDate} ha caducado.`
              : strict
              ? "Sin verificar: en esta categoría sale como «horario sin confirmar» hasta que alguien de Noctua lo compruebe (llamando o con la fuente oficial)."
              : "Sin verificar. En esta categoría no es obligatorio."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void setVerified(item, true)} className={BTN_PRIMARY_SM}>
              <ShieldCheck size={14} aria-hidden="true" /> {verifiedNow ? "Verificar otra vez hoy" : "Marcar verificado hoy"}
            </button>
            {item.verification_status === "verified" && (
              <button type="button" onClick={() => void setVerified(item, false)} className={BTN_GHOST_SM}>Quitar verificación</button>
            )}
          </div>
        </div>
        {(item.import_source || sourceHref) && (
          <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
            <p className="text-sm font-bold text-white">Origen</p>
            <p className="mt-1 text-xs text-zinc-300/80">
              {item.import_source === "osm" ? "Importado de OpenStreetMap." : item.import_source === "google" ? "Importado de Google." : "Añadido a mano."}
            </p>
            {sourceHref && (
              <a href={sourceHref} target="_blank" rel="noopener noreferrer" className={`${BTN_GHOST_SM} mt-3`}>
                Ver la fuente <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
        )}
        <p className="text-xs text-zinc-400">Ficha n.º {item.id}</p>
      </div>
    )
  }

  const sheet = sheetOpen ? (
    <EditSheet
      title={showAddForm ? "Nuevo esencial" : `Editando: ${editingItem?.name ?? ""}`}
      subtitle={showAddForm ? `Se creará en ${cityName}` : [editingItem ? categorySingular(editingItem.category) : "", editingItem?.neighborhood].filter(Boolean).join(" · ")}
      onClose={closeSheet}
      links={
        !showAddForm && editingItem && mapsHrefOf(editingItem) ? (
          <a href={mapsHrefOf(editingItem) as string} target="_blank" rel="noopener noreferrer" className={`${BTN_GHOST_SM} hidden sm:inline-flex`}>
            Google Maps <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : null
      }
      footer={
        showAddForm ? (
          <>
            <button type="button" onClick={closeSheet} className={BTN_GHOST}>Cancelar</button>
            <button type="button" onClick={addEssential} disabled={saving || uploading} aria-busy={saving} className={`${BTN_PRIMARY} ml-auto`}>
              {saving ? "Guardando…" : "Guardar esencial"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => editingItem && void deleteEssential(editingItem)} className={BTN_DANGER}>
              <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Borrar</span><span className="sr-only sm:hidden">Borrar esencial</span>
            </button>
            <button type="button" onClick={cancelEditing} className={`${BTN_GHOST} ml-auto`}>Cancelar</button>
            <button type="button" onClick={() => editingItem && saveEditing(editingItem.id)} disabled={saving || uploading} aria-busy={saving} className={BTN_PRIMARY}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        )
      }
    >
      {showAddForm
        ? renderForm(newEssential, setNewEssential, (url) => setNewEssential((prev) => ({ ...prev, image: url })), true)
        : renderForm(editEssential, setEditEssential, (url) => setEditEssential((prev) => ({ ...prev, image: url })), false)}
    </EditSheet>
  ) : null

  const quickStatusKeys = new Set<StatusKey>(QUICK_STATUS.map((q) => q.key))
  // «Importados de OSM / Google» solo salen si hay alguno (o están elegidos).
  const otherStatuses = STATUS_ORDER.filter((k) => !quickStatusKeys.has(k) && ((k !== "osm" && k !== "google") || statusCounts[k] > 0 || status === k))

  const list = (
    <div>
      {/* Buscador y alta */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar esenciales…" label="Buscar esenciales por nombre, dirección o barrio" className="min-w-0 flex-1" />
        <button type="button" onClick={openNew} className={`${BTN_PRIMARY} shrink-0`}>
          <Plus size={17} aria-hidden="true" /> Añadir esencial
        </button>
      </div>

      {/* Categoría y orden */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría" className="ui-input ui-input-flat min-w-0 flex-1">
          <option value="all">Todas las categorías ({[...catCounts.values()].reduce((a, b) => a + b, 0)})</option>
          {categories.map((c) => <option key={c} value={c}>{categoryPlural(c)} ({catCounts.get(c) || 0})</option>)}
          {extraCategories.map((c) => <option key={c} value={c}>{c} ({catCounts.get(c) || 0})</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" className="ui-input ui-input-flat sm:!w-auto">
          <option value="category">Por categoría</option>
          <option value="name">Por nombre (A-Z)</option>
          <option value="recent">Últimos añadidos</option>
        </select>
      </div>

      {/* Estado, con cuántos esenciales hay en cada uno */}
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
          {otherStatuses.map((k) => (
            <option key={k} value={k}>{STATUS_LABEL[k]} ({statusCounts[k]})</option>
          ))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-zinc-300/80">
          <strong className="font-extrabold text-white">{filtered.length}</strong> de {scoped.length} esenciales
          {isFiltered && (
            <button type="button" onClick={clearFilters} className="ml-3 font-bold text-brand-soft underline-offset-2 hover:underline">Quitar filtros</button>
          )}
        </p>
        <button type="button" onClick={() => setBulkOpen((o) => !o)} aria-expanded={bulkOpen} className={BTN_GHOST_SM}>
          <Layers size={14} aria-hidden="true" /> Acciones en bloque
        </button>
      </div>

      {bulkOpen && (
        <div className="ui-card mb-5 p-5">
          <p className="text-sm font-extrabold text-white">Publicar u ocultar lo que estás viendo</p>
          <p className="mt-1 text-xs text-zinc-300/80">
            Solo afecta a los {filtered.length} esenciales de la lista ({scopeText()}). Pide confirmación antes de cambiar nada.
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
        <p className="py-20 text-center text-sm text-zinc-300">Cargando esenciales…</p>
      ) : (
        <>
          <ul className="grid gap-2.5">
            {shownItems.map((item) => {
              const open = editingId === item.id
              const Icon: LucideIcon = categoryInfo(item.category).icon
              const hasCoords = item.latitude != null && item.longitude != null
              const verifiedNow = isVerificationCurrent(item)
              const strict = categoryInfo(item.category).trust === "strict"
              const meta = [item.neighborhood, item.address].filter(Boolean).join(" · ") || "Sin dirección"
              const hours = item.open_hours || (item.is_24h ? "24 h" : "")
              return (
                <li key={item.id} id={`essential-${item.id}`}>
                  <div className={`ui-item ${open ? "ui-item-on" : ""} ${item.hidden && !open ? "ui-item-dim" : ""}`}>
                    <button type="button" onClick={() => startEditing(item)} aria-label={`Editar ${item.name}`} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <Thumb src={item.image} name={item.name} fallback={<Icon size={20} aria-hidden="true" />} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold text-white">{item.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-300/80">
                          {categorySingular(item.category)}
                          {item.subcategory ? ` · ${item.subcategory}` : ""}
                        </span>
                        <span className="block truncate text-xs text-zinc-400">{meta}{hours ? ` · ${hours}` : ""}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                          {verifiedNow ? <Tag tone="green">Verificado</Tag> : item.verification_status === "verified" ? <Tag tone="amber">Verificación caducada</Tag> : strict ? <Tag tone="amber">Sin verificar</Tag> : null}
                          {!item.image && <Tag tone="amber">Sin foto</Tag>}
                          {!hasCoords && <Tag tone="red">Sin ubicación</Tag>}
                          {item.import_source === "osm" && <Tag>OpenStreetMap</Tag>}
                          {item.import_source === "google" && <Tag>Google</Tag>}
                        </span>
                      </span>
                    </button>
                    {/* Foto rápida: sin foto, se sube desde la propia lista y se guarda al momento. */}
                    {!item.image && (
                      <label
                        className={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/15 bg-white/[0.06] text-zinc-200 transition hover:bg-white/15 ${photoBusyId !== null ? "pointer-events-none opacity-50" : ""}`}
                        title="Subir foto"
                      >
                        {photoBusyId === item.id ? <span className="text-[10px] font-bold">…</span> : <Camera size={17} aria-hidden="true" />}
                        <span className="sr-only">Subir foto de {item.name}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={photoBusyId !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = "" // permite volver a elegir la misma foto
                            void changePhoto(item, file)
                          }}
                        />
                      </label>
                    )}
                    {/* Interruptor rápido de visibilidad: lo más usado, sin abrir la ficha. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!item.hidden}
                      aria-label={`${item.name}: ${item.hidden ? "oculto, pulsa para publicarlo" : "publicado, pulsa para ocultarlo"}`}
                      onClick={() => void toggleHidden(item)}
                      className="flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-1"
                    >
                      <span className="ui-switch" data-on={!item.hidden} data-tone="green" aria-hidden="true" />
                      <span className={`text-[11px] font-bold ${item.hidden ? "text-zinc-400" : "text-open"}`}>{item.hidden ? "Oculto" : "Visible"}</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {shownItems.length === 0 && (
            <div className="ui-card px-6 py-14 text-center">
              <p className="text-sm font-bold text-white">No hay esenciales con este filtro</p>
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
    { label: "Total", value: totals.total, accent: "violet", icon: Store, active: status === "all" && category === "all", apply: () => { setStatus("all"); setCategory("all") } },
    { label: "Publicados", value: totals.visible, accent: "cyan", icon: Eye, active: status === "visible", apply: () => setStatus("visible") },
    { label: "Ocultos", value: totals.hidden, accent: "pink", icon: EyeOff, active: status === "hidden", apply: () => setStatus("hidden") },
    { label: "Sin foto", value: totals.nophoto, accent: "coral", icon: ImageOff, active: status === "nophoto", apply: () => setStatus("nophoto") },
  ]

  return (
    <AdminShell title="Esenciales" subtitle="Farmacias, cajeros, comida, transporte, taxi, aseos, máquinas, consignas y demás servicios para la noche.">
      <>
        {/* Cifras: pulsa una para filtrar la lista */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((st) => (
            <StatTile key={st.label} accent={st.accent} icon={st.icon} label={st.label} value={st.value} active={st.active && !search.trim()} onClick={st.apply} />
          ))}
        </div>
        <SplitView list={list} sheet={sheet} />
      </>
    </AdminShell>
  )
}
