"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { fetchAllPages } from "../../../lib/fetchAll"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { toast } from "../../../components/ui/Toast"
import CoordsField from "../../../components/admin/CoordsField"
import { coordsPayload, coordToInput, parseCoords } from "../../../lib/coords"
import { touchCache, essentialPaths } from "../../../lib/touchCache"
import { ESSENTIAL_CATEGORIES } from "../../../lib/essentialCategories"

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

// Antes esta lista vivía por su cuenta y se había desincronizado de ESSENTIAL_CATEGORIES (le
// faltaban Gas Station y Hospital, y tenía un "Other" que la web pública no reconoce). Ahora sale
// de la misma fuente que usa la página pública, así que no pueden volver a desincronizarse.
const categories = ESSENTIAL_CATEGORIES.map((c) => c.key)

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

export default function AdminEssentialsPage() {
  const [essentials, setEssentials] = useState<Essential[]>([])
  const [newEssential, setNewEssential] = useState(emptyForm)
  const [editEssential, setEditEssential] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [filterCategory, setFilterCategory] = useState("All")

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
    if (data) setEssentials(data)
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `essentials/${fileName}`
    const { error } = await supabase.storage.from("essential-images").upload(filePath, file)
    setUploading(false)
    if (error) { logError("UPLOAD ERROR:", error); return null }
    const { data } = supabase.storage.from("essential-images").getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleNewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setNewEssential((prev) => ({ ...prev, image: publicUrl }))
  }

  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const publicUrl = await uploadImage(file)
    if (publicUrl) setEditEssential((prev) => ({ ...prev, image: publicUrl }))
  }

  const addEssential = async () => {
    if (!newEssential.name || !newEssential.category) return
    const { data, error } = await supabase.from("essentials").insert({
      ...newEssential,
      subcategory: newEssential.subcategory.trim() || null,
      ...coordsPayload(newEssential.latitude, newEssential.longitude),
    }).select().single()
    if (error) { logError("ADD ERROR:", error); toast(`No se ha podido crear: ${error.message}`, 5000); return }
    if (data) {
      setEssentials((prev) => [data, ...prev])
      touchCache(essentialPaths())
    }
    toast("Esencial creado")
    setNewEssential(emptyForm)
  }

  const startEditing = (item: Essential) => {
    setEditingId(item.id)
    setEditEssential({
      name: item.name || "", category: item.category || "", subcategory: item.subcategory || "", address: item.address || "",
      neighborhood: item.neighborhood || "", description: item.description || "",
      image: item.image || "", open_hours: item.open_hours || "", maps_link: item.maps_link || "",
      latitude: coordToInput(item.latitude), longitude: coordToInput(item.longitude),
    })
  }

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
    let tries = 0
    const timer = setInterval(() => {
      tries++
      const el = document.getElementById(`essential-${found.id}`)
      if (el) {
        clearInterval(timer)
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: "smooth" })
      } else if (tries > 40) {
        clearInterval(timer)
      }
    }, 150)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [essentials])

  const cancelEditing = () => { setEditingId(null); setEditEssential(emptyForm) }

  const saveEditing = async (id: number) => {
    if (!editEssential.name) return
    const { data, error } = await supabase.from("essentials").update({
      ...editEssential,
      subcategory: editEssential.subcategory.trim() || null,
      ...coordsPayload(editEssential.latitude, editEssential.longitude),
    }).eq("id", id).select().single()
    if (error) { logError("EDIT ERROR:", error); toast(`No se ha podido guardar: ${error.message}`, 5000); return }
    toast("Cambios guardados")
    if (data) {
      setEssentials((prev) => prev.map((e) => e.id === id ? data : e))
      touchCache(essentialPaths())
    }
    cancelEditing()
  }

  const deleteEssential = async (id: number) => {
    const { error } = await supabase.from("essentials").delete().eq("id", id)
    if (error) return
    setEssentials((prev) => prev.filter((e) => e.id !== id))
  }
  const toggleHidden = async (item: Essential) => {
    const newValue = !(item as any).hidden
    const { error } = await supabase.from("essentials").update({ hidden: newValue }).eq("id", item.id)
    if (error) return
    setEssentials((prev) => prev.map((e) => e.id === item.id ? { ...e, hidden: newValue } : e))
  }
  // Antes "Mostrar todos" / "Ocultar todos" actuaban al instante, sin preguntar: un toque sin
  // querer escondía (o publicaba) todos los esenciales de golpe. Ahora: ocultar todo pide escribir OCULTAR, y
  // mostrar todo avisa de lo que se publicaría sin revisar.
  const confirmHideAll = () =>
    (window.prompt(`Vas a OCULTAR todos los esenciales de la web (${essentials.length}). Nadie podrá verlos hasta que los vuelvas a mostrar.\n\nEscribe OCULTAR para confirmar.`) || "").trim().toUpperCase() === "OCULTAR"
  const confirmShowAll = () =>
    window.confirm(`Vas a PUBLICAR todos los esenciales (${essentials.length}), también los que están ocultos a propósito.\n\n¿Seguro?`)
  const showAll = async () => {
    if (!confirmShowAll()) return
    const { error } = await supabase.from("essentials").update({ hidden: false }).neq("id", 0)
    if (error) return
    setEssentials((prev) => prev.map((e) => ({ ...e, hidden: false })))
  }

  const hideAll = async () => {
    if (!confirmHideAll()) return
    const { error } = await supabase.from("essentials").update({ hidden: true }).neq("id", 0)
    if (error) return
    setEssentials((prev) => prev.map((e) => ({ ...e, hidden: true })))
  }

  const filteredEssentials = essentials.filter((e) =>
    filterCategory === "All" ? true : e.category === filterCategory
  )

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm text-zinc-400">Cargando…</p>
      </main>
    )
  }

  // Función (no componente): definida como componente dentro de la página se volvía a montar en
  // cada tecla y el campo perdía el foco al escribir.
  const renderFormFields = (data: typeof emptyForm, setData: (d: typeof emptyForm) => void) => (
    <div className="grid gap-4 lg:grid-cols-3">
      <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Nombre *" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />

      <select value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none text-white">
        <option value="">Categoría *</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {(data.category === "ATM" || data.category === "Food" || data.category === "Nitbus" || data.category === "Metro") && (
        <input
          value={data.subcategory}
          onChange={(e) => setData({ ...data, subcategory: e.target.value })}
          list="subcategory-hints"
          placeholder={
            data.category === "ATM"
              ? "Banco (p. ej. CaixaBank)"
              : data.category === "Food"
              ? "Tipo de comida (p. ej. Pizza)"
              : data.category === "Nitbus"
              ? "Línea(s), ej. N6 o N6, N9"
              : "Línea de metro (p. ej. L3)"
          }
          className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
        />
      )}
      <datalist id="subcategory-hints">
        {(SUBCATEGORY_HINTS[data.category] || []).map((s) => <option key={s} value={s} />)}
      </datalist>

      <input value={data.neighborhood} onChange={(e) => setData({ ...data, neighborhood: e.target.value })} placeholder="Barrio" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder="Dirección" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input value={data.open_hours} onChange={(e) => setData({ ...data, open_hours: e.target.value })} placeholder="Horario (p. ej. 24h)" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <input
        value={data.maps_link}
        onChange={(e) => {
          // Si el enlace de Google Maps lleva coordenadas y aún no hay, se rellenan solas.
          const p = parseCoords(e.target.value)
          const fill = p && !data.latitude && !data.longitude ? { latitude: String(p.lat), longitude: String(p.lng) } : {}
          setData({ ...data, maps_link: e.target.value, ...fill })
        }}
        placeholder="Enlace de Google Maps"
        className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none"
      />
      <input value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Descripción" className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 outline-none" />
      <div className="lg:col-span-3">
        <CoordsField
          latitude={data.latitude}
          longitude={data.longitude}
          address={data.address}
          onChange={(latitude, longitude) => setData({ ...data, latitude, longitude })}
        />
      </div>
    </div>
  )

  return (
    <AdminShell title="Esenciales" subtitle="Farmacias, cajeros, comida, transporte, metro y demás servicios para la noche.">
      <>
        {/* ADD FORM */}
        <section className="mx-auto max-w-7xl">
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-8">
            <p className="text-sm text-zinc-400 mb-6">Añadir esencial</p>
            {renderFormFields(newEssential, setNewEssential)}
            <div className="mt-4">
              <input type="file" accept="image/*" onChange={handleNewImageUpload} className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none" />
              {newEssential.image && <img src={newEssential.image} alt="Preview" className="mt-4 h-40 w-full rounded-2xl object-cover" />}
            </div>
            <button onClick={addEssential} disabled={uploading} className="mt-4 w-full rounded-2xl bg-white px-8 py-4 font-bold text-black disabled:opacity-50">
              {uploading ? "Uploading..." : "Add essential"}
            </button>
          </div>
        </section>

        {/* FILTER */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {["All", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-full px-5 py-3 text-sm font-medium whitespace-nowrap transition ${
                  filterCategory === cat ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* LIST */}
        <section className="mx-auto mt-6 max-w-7xl px-4">
          <div className="flex gap-3 mb-4">
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">
              👁️ Show all
            </button>
            <button onClick={hideAll} className="rounded-full border border-zinc-500/30 bg-zinc-500/10 px-5 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-600 hover:text-white transition">
              🙈 Hide all
            </button>
          </div>
          <div className="grid gap-6">
            {filteredEssentials.map((item) => (
              <div key={item.id} id={`essential-${item.id}`} className="rounded-card border border-white/10 bg-white/[0.03] p-6">
                {editingId === item.id ? (
                  <div>
                    {renderFormFields(editEssential, setEditEssential)}
                    <div className="mt-4">
                      <input type="file" accept="image/*" onChange={handleEditImageUpload} className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-zinc-300 outline-none" />
                      {editEssential.image && <img src={editEssential.image} alt="Preview" className="mt-4 h-40 w-full rounded-2xl object-cover" />}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button onClick={() => saveEditing(item.id)} className="rounded-2xl bg-emerald-400 px-8 py-4 font-bold text-black">Save</button>
                      <button onClick={cancelEditing} className="rounded-2xl border border-white/10 bg-white/5 px-8 py-4 font-bold">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-5 items-start">
                      {item.image && <img src={item.image} alt={item.name} className="h-20 w-20 rounded-2xl object-cover flex-shrink-0" />}
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">{item.category}</span>
                          {item.subcategory && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">{item.subcategory}</span>}
                          {item.neighborhood && <span className="text-sm text-zinc-400">📍 {item.neighborhood}</span>}
                        </div>
                        <h2 className="mt-2 text-2xl font-black text-white">{item.name}</h2>
                        {item.address && <p className="mt-1 text-sm text-zinc-400">{item.address}</p>}
                        {item.open_hours && <p className="mt-1 text-sm text-zinc-400">🕒 {item.open_hours}</p>}
                        {item.latitude && item.longitude && (
                          <p className="mt-1 text-xs text-zinc-400">{item.latitude}, {item.longitude}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => startEditing(item)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white hover:text-black transition">
                        ✏️ Edit
                      </button>
                      <button onClick={() => toggleHidden(item)} className={`rounded-full px-5 py-3 text-sm font-bold transition ${(item as any).hidden ? "bg-zinc-600 text-white" : "border border-white/10 bg-white/5 text-white"}`}>
                        {(item as any).hidden ? "👁️ Hidden" : "👁️ Visible"}
                      </button>
                      <button onClick={() => deleteEssential(item.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filteredEssentials.length === 0 && (
              <p className="text-center text-zinc-400 py-10">No essentials in this category yet.</p>
            )}
          </div>
        </section>
      </>
    </AdminShell>
  )
}
