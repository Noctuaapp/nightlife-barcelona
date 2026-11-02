"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/fetchAll"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { toast } from "../../../components/ui/Toast"
import CoordsField from "../../../components/admin/CoordsField"
import { coordsPayload, coordToInput, googleMapsUrl, parseCoords } from "../../../lib/coords"
import { touchCache, essentialPaths } from "../../../lib/touchCache"
import { ESSENTIAL_CATEGORIES, categoryInfo, essentialSlugLabelEs } from "../../../lib/essentialCategories"
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
}
const SUBCATEGORY_LABEL: Record<string, string> = {
  ATM: "Banco",
  Food: "Tipo de comida",
  Nitbus: "Línea(s) de bus",
  Metro: "Línea(s) de metro",
}
const SUBCATEGORY_PLACEHOLDER: Record<string, string> = {
  ATM: "CaixaBank",
  Food: "Pizza",
  Nitbus: "N6 o N6, N9",
  Metro: "L3",
}

type StatusKey = "all" | "visible" | "hidden" | "nophoto" | "nocoords" | "nohours" | "osm" | "google"
const STATUS_TESTS: Record<StatusKey, (e: Essential) => boolean> = {
  all: () => true,
  visible: (e) => !e.hidden,
  hidden: (e) => !!e.hidden,
  nophoto: (e) => !e.image,
  nocoords: (e) => e.latitude == null || e.longitude == null,
  nohours: (e) => !(e.open_hours || "").trim(),
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
  osm: "Importados de OpenStreetMap",
  google: "Importados de Google",
}
const STATUS_ORDER: StatusKey[] = ["all", "visible", "hidden", "nophoto", "nocoords", "nohours", "osm", "google"]

type SortKey = "category" | "recent" | "name"

// Sin tildes ni mayúsculas: «farmacia» encuentra «Farmàcia».
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition placeholder:text-zinc-400"
const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1.5"
const selectClass = "rounded-2xl border border-white/10 bg-surface px-4 py-4 text-sm font-semibold text-white outline-none transition focus:border-purple-500/50"

export default function AdminEssentialsPage() {
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
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
  }, [search, category, status, sort])

  // ---------- Datos derivados (búsqueda, filtros y contadores) ----------
  const rows = useMemo(
    () =>
      essentials.map((e) => ({
        e,
        hay: fold([e.name, e.category, categorySingular(e.category), categoryPlural(e.category), e.subcategory, e.address, e.neighborhood, e.description, e.open_hours].filter(Boolean).join(" ")),
      })),
    [essentials]
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
      total: essentials.length,
      visible: essentials.filter(STATUS_TESTS.visible).length,
      hidden: essentials.filter(STATUS_TESTS.hidden).length,
      nophoto: essentials.filter(STATUS_TESTS.nophoto).length,
    }),
    [essentials]
  )

  const extraCategories = useMemo(() => [...new Set(essentials.map((e) => e.category).filter((c) => c && !categories.includes(c)))].sort(), [essentials])

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
  const formToPayload = (f: EssentialForm) => ({
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
  })

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
    setEditingId(item.id)
    setEditEssential({
      name: item.name || "", category: item.category || "", subcategory: item.subcategory || "", address: item.address || "",
      neighborhood: item.neighborhood || "", description: item.description || "",
      image: item.image || "", open_hours: item.open_hours || "", maps_link: item.maps_link || "",
      latitude: coordToInput(item.latitude), longitude: coordToInput(item.longitude),
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
    startEditing(found)
    setFocusId(found.id)
    scrollToItem(found.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essentials])

  const saveEditing = async (id: number) => {
    if (!editEssential.name.trim() || !editEssential.category) {
      toast("Pon al menos el nombre y la categoría", 4000)
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from("essentials").update(formToPayload(editEssential)).eq("id", id).select().single()
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

  // ---------- Publicar / ocultar en bloque ----------
  // Antes «Mostrar todos» / «Ocultar todos» actuaban sobre TODA la tabla aunque se estuviera mirando
  // una sola categoría. Ahora actúan solo sobre lo que sale con el filtro y la búsqueda actuales
  // (los que ya están como se pide no se tocan), siempre con confirmación.
  const scopeText = () => {
    const parts: string[] = []
    if (category !== "all") parts.push(categoryPlural(category))
    if (status !== "all") parts.push(STATUS_LABEL[status].toLowerCase())
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
  const focus = focusId != null ? essentials.find((e) => e.id === focusId) : undefined
  const rest = filtered.filter((e) => e.id !== focus?.id)
  const shown = [...(focus ? [focus] : []), ...rest.slice(0, limit)]
  const remaining = Math.max(0, rest.length - limit)

  // Función (no componente): definida como componente dentro de la página se volvía a montar en
  // cada tecla y el campo perdía el foco al escribir.
  const renderForm = (data: EssentialForm, setData: (d: EssentialForm) => void, setImage: (url: string) => void) => {
    const knownCategory = categories.includes(data.category)
    const showSub = !!SUBCATEGORY_LABEL[data.category] || !!data.subcategory
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre *</label>
          <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Farmacia Central" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Categoría *</label>
          <select value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })} style={{ colorScheme: "dark" }} className={`${inputClass} bg-surface`}>
            <option value="">Elige una categoría</option>
            {!knownCategory && data.category && <option value={data.category}>{data.category}</option>}
            {categories.map((c) => <option key={c} value={c}>{categorySingular(c)}</option>)}
          </select>
        </div>
        {showSub && (
          <div>
            <label className={labelClass}>{SUBCATEGORY_LABEL[data.category] || "Subcategoría"}</label>
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
          </div>
        )}
        <div>
          <label className={labelClass}>Barrio o municipio</label>
          <input value={data.neighborhood} onChange={(e) => setData({ ...data, neighborhood: e.target.value })} placeholder="Gràcia, Badalona…" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Dirección</label>
          <input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder="Carrer de Còrsega, 327" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Horario</label>
          <input value={data.open_hours} onChange={(e) => setData({ ...data, open_hours: e.target.value })} placeholder="Open 24 hours" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Enlace de Google Maps</label>
          <input
            value={data.maps_link}
            onChange={(e) => {
              // Si el enlace de Google Maps lleva coordenadas y aún no hay, se rellenan solas.
              const p = parseCoords(e.target.value)
              const fill = p && !data.latitude && !data.longitude ? { latitude: String(p.lat), longitude: String(p.lng) } : {}
              setData({ ...data, maps_link: e.target.value, ...fill })
            }}
            placeholder="https://www.google.com/maps/…"
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Descripción</label>
          <textarea value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} rows={3} placeholder="Opcional" className={`${inputClass} resize-y`} />
        </div>
        <div className="md:col-span-2">
          <CoordsField
            latitude={data.latitude}
            longitude={data.longitude}
            address={data.address}
            onChange={(latitude, longitude) => setData({ ...data, latitude, longitude })}
            inputClassName={inputClass}
            labelClassName={labelClass}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Foto</label>
          <div className="flex flex-wrap items-center gap-4">
            {data.image ? (
              <img src={data.image} alt="Vista previa" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-center text-[11px] font-semibold leading-tight text-zinc-400">Sin<br />foto</div>
            )}
            <label className={`cursor-pointer rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300 hover:text-black ${uploading ? "pointer-events-none opacity-50" : ""}`}>
              {uploading ? "Subiendo…" : data.image ? "📷 Cambiar foto" : "📷 Subir foto"}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => void uploadFormImage(e, setImage)} />
            </label>
            {data.image && (
              <button type="button" onClick={() => setImage("")} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:bg-white/10">
                Quitar foto
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderItem = (item: Essential) => {
    const Icon = categoryInfo(item.category).icon
    const hasCoords = item.latitude != null && item.longitude != null
    const mapsHref = /^https?:\/\//i.test((item.maps_link || "").trim())
      ? (item.maps_link || "").trim()
      : hasCoords
      ? googleMapsUrl({ lat: Number(item.latitude), lng: Number(item.longitude) })
      : null
    const editing = editingId === item.id
    return (
      <div
        key={item.id}
        id={`essential-${item.id}`}
        className={`rounded-card border p-5 transition ${item.hidden ? "border-white/5 bg-white/[0.01] opacity-50" : "border-white/10 bg-white/[0.03]"} ${editing ? "!border-purple-500/40 !bg-purple-500/[0.04] !opacity-100" : ""}`}
      >
        {editing ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black">Editando: {item.name}</h3>
              <span className="text-xs text-zinc-500">ficha n.º {item.id}</span>
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-zinc-300 transition hover:bg-white hover:text-black">
                  Ver en Google Maps ↗
                </a>
              )}
            </div>
            {renderForm(editEssential, setEditEssential, (url) => setEditEssential((prev) => ({ ...prev, image: url })))}
            <div className="mt-5 flex gap-3">
              <button onClick={() => saveEditing(item.id)} disabled={saving || uploading} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              <button onClick={cancelEditing} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {item.image ? (
                <img src={item.image} alt={item.name} className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 text-zinc-500">
                  <Icon size={20} aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black text-white">{item.name}</h3>
                  <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-bold text-teal-300">{categorySingular(item.category)}</span>
                  {item.subcategory && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-bold text-zinc-300">{item.subcategory}</span>}
                  {item.hidden && <span className="rounded-full border border-zinc-500/30 bg-zinc-500/20 px-2 py-0.5 text-xs font-bold text-zinc-400">Oculto</span>}
                  {item.import_source === "osm" && <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-300">OpenStreetMap</span>}
                  {item.import_source === "google" && <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-300">Google</span>}
                  {!item.image && <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-300">Sin foto</span>}
                  {!hasCoords && <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-300">Sin ubicación</span>}
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {[item.neighborhood, item.address].filter(Boolean).join(" · ") || "Sin dirección"}
                  {item.open_hours ? ` · 🕒 ${item.open_hours}` : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => startEditing(item)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white hover:text-black">
                ✏️ Editar
              </button>
              <label className={`cursor-pointer rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-300 hover:text-black ${photoBusyId !== null ? "pointer-events-none opacity-50" : ""}`}>
                {photoBusyId === item.id ? "Subiendo…" : item.image ? "📷 Cambiar foto" : "📷 Subir foto"}
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
              <button onClick={() => toggleHidden(item)} className={`rounded-full px-4 py-2 text-xs font-bold transition ${!item.hidden ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                👁️ {item.hidden ? "Oculto" : "Visible"}
              </button>
              {mapsHref && (
                <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
                  🗺️ Mapa ↗
                </a>
              )}
              <button onClick={() => deleteEssential(item)} className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white">
                🗑️ Borrar
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const statCards: { label: string; value: number; color: string; apply: () => void }[] = [
    { label: "Total", value: totals.total, color: "text-white", apply: () => setStatus("all") },
    { label: "Publicados", value: totals.visible, color: "text-emerald-400", apply: () => setStatus("visible") },
    { label: "Ocultos", value: totals.hidden, color: "text-zinc-300", apply: () => setStatus("hidden") },
    { label: "Sin foto", value: totals.nophoto, color: "text-amber-300", apply: () => setStatus("nophoto") },
  ]

  return (
    <AdminShell title="Esenciales" subtitle="Farmacias, cajeros, comida, transporte, metro y demás servicios para la noche.">
      <>
        {/* Resumen (cada tarjeta filtra la lista) */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {statCards.map((s) => (
            <button key={s.label} onClick={s.apply} className="rounded-card border border-white/10 bg-white/[0.03] p-5 text-center transition hover:bg-white/[0.06]">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs text-zinc-400">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Alta plegable */}
        <div className="mb-6">
          <button
            onClick={() => { setShowAddForm((v) => !v); cancelEditing() }}
            className={`w-full rounded-2xl px-6 py-4 text-sm font-black transition md:w-auto ${showAddForm ? "bg-white text-black" : "bg-purple-500 text-white hover:bg-purple-400"}`}
          >
            {showAddForm ? "✕ Cerrar formulario" : "+ Añadir esencial"}
          </button>
          {showAddForm && (
            <div className="mt-4 rounded-card border border-purple-500/30 bg-purple-500/[0.04] p-6">
              <h3 className="mb-4 text-lg font-black">Nuevo esencial</h3>
              {renderForm(newEssential, setNewEssential, (url) => setNewEssential((prev) => ({ ...prev, image: url })))}
              <div className="mt-5 flex gap-3">
                <button onClick={addEssential} disabled={saving || uploading} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar esencial"}
                </button>
                <button onClick={() => { setShowAddForm(false); setNewEssential(emptyForm) }} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
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
            placeholder="Buscar nombre, dirección, barrio…"
            aria-label="Buscar esenciales"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 outline-none transition focus:border-purple-500/50"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría" style={{ colorScheme: "dark" }} className={`${selectClass} lg:w-60`}>
            <option value="all">Todas las categorías ({[...catCounts.values()].reduce((a, b) => a + b, 0)})</option>
            {categories.map((c) => <option key={c} value={c}>{categoryPlural(c)} ({catCounts.get(c) || 0})</option>)}
            {extraCategories.map((c) => <option key={c} value={c}>{c} ({catCounts.get(c) || 0})</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusKey)} aria-label="Filtrar por estado" style={{ colorScheme: "dark" }} className={`${selectClass} lg:w-64`}>
            {STATUS_ORDER.filter((k) => ((k !== "osm" && k !== "google") ? true : (statusCounts[k] > 0 || status === k))).map((k) => (
              <option key={k} value={k}>{STATUS_LABEL[k]} ({statusCounts[k]})</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar" style={{ colorScheme: "dark" }} className={`${selectClass} lg:w-48`}>
            <option value="category">Por categoría</option>
            <option value="name">Por nombre (A-Z)</option>
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
            {filtered.length} de {essentials.length} esenciales
          </p>
        </div>

        {/* Lista */}
        {loading ? (
          <p className="py-20 text-center text-sm text-zinc-400">Cargando esenciales…</p>
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
                <p className="text-sm text-zinc-400">No hay esenciales con este filtro.</p>
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
