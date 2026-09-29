"use client"

import { useState, useEffect, type ChangeEvent } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

// Portal para que el organizador de un festival gestione sus propios festivales y las sesiones
// de DJ de cada uno, sin pasar por Jordi. Un festival queda "vinculado" cuando su fila en
// `events` tiene `owner_user_id` = el id de un usuario de Supabase Auth (Jordi lo vincula a mano
// desde /admin/users). A diferencia de /mi-club, una persona puede organizar varios festivales,
// así que esto es una lista con "+ Nuevo festival", igual que las noches de club. No se exponen
// "Featured", "Sold out" (curación editorial) ni "VIP tables" — todo lo demás sí.
type Festival = {
  id: number
  title: string
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
  gallery: string[] | null
  manual_photos: boolean | null
  featured: boolean | null
  sold_out: boolean | null
  vip_tables: boolean | null
  hidden: boolean | null
  owner_user_id?: string | null
}

type Session = {
  id: number
  event_id: number
  date: string | null
  title: string | null
  artist: string | null
  stage: string | null
  start_time: string | null
  end_time: string | null
  description: string | null
}

const parsePriceTiers = (raw: string): { label: string; price: string }[] =>
  raw.split(";").map((c) => c.trim()).filter(Boolean).map((chunk) => {
    const [label, ...rest] = chunk.split(":")
    return { label: (label || "").trim(), price: rest.join(":").trim() }
  }).filter((t) => t.label && t.price)

const serializePriceTiers = (tiers: { label: string; price: string }[] | null | undefined): string =>
  Array.isArray(tiers) ? tiers.map((t) => `${t.label}:${t.price}`).join("; ") : ""

const emptyForm = {
  title: "", club_name: "", artist: "", music: "", date: "", date_end: "",
  start_time: "", end_time: "", price: "", ticket_url: "", image: "", description: "",
}
type FormData = typeof emptyForm

const festivalToForm = (f: Festival): FormData => ({
  title: f.title || "",
  club_name: f.club_name || "",
  artist: f.artist || "",
  music: f.music || "",
  date: f.date || "",
  date_end: f.date_end || "",
  start_time: f.start_time || "",
  end_time: f.end_time || "",
  price: f.price || "",
  ticket_url: f.ticket_url || "",
  image: f.image || "",
  description: f.description || "",
})

const emptySession = { date: "", title: "", artist: "", stage: "", start_time: "", end_time: "", description: "" }
type SessionFormData = typeof emptySession

export default function MiFestivalPage() {
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [festivals, setFestivals] = useState<Festival[]>([])
  const [sessions, setSessions] = useState<Record<number, Session[]>>({})
  const [loadErrorMsg, setLoadErrorMsg] = useState("")

  const [showAddForm, setShowAddForm] = useState(false)
  const [newForm, setNewForm] = useState<FormData>(emptyForm)
  const [newGallery, setNewGallery] = useState<string[]>([])
  const [newPriceTiersRaw, setNewPriceTiersRaw] = useState("")

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FormData>(emptyForm)
  const [editGallery, setEditGallery] = useState<string[]>([])
  const [editPriceTiersRaw, setEditPriceTiersRaw] = useState("")

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [expandedLineupId, setExpandedLineupId] = useState<number | null>(null)
  const [newSessionForm, setNewSessionForm] = useState<SessionFormData>(emptySession)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editSessionForm, setEditSessionForm] = useState<SessionFormData>(emptySession)
  const [savingSession, setSavingSession] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) { window.location.href = "/login"; return }
      setUserId(user.id)

      const { data, error } = await supabase.from("events").select("*").eq("owner_user_id", user.id).order("date", { ascending: true })
      if (error) { setLoadErrorMsg(error.message); setCheckingAccess(false); return }
      setFestivals(data || [])

      if (data && data.length > 0) {
        const { data: sessionsData } = await supabase.from("event_sessions").select("*").in("event_id", data.map((f) => f.id)).order("date", { ascending: true })
        const grouped: Record<number, Session[]> = {}
        for (const s of sessionsData || []) {
          if (!grouped[s.event_id]) grouped[s.event_id] = []
          grouped[s.event_id].push(s)
        }
        setSessions(grouped)
      }
      setCheckingAccess(false)
    }
    load()
  }, [])

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const { error } = await supabase.storage.from("event-photos").upload(fileName, file)
    setUploading(false)
    if (error) { alert("Error al subir la imagen: " + error.message); return null }
    const { data } = supabase.storage.from("event-photos").getPublicUrl(fileName)
    return data.publicUrl
  }

  const uploadGalleryFiles = async (files: FileList) => {
    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop()
      const fileName = `owner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const { error } = await supabase.storage.from("event-photos").upload(fileName, file)
      if (error) continue
      const { data } = supabase.storage.from("event-photos").getPublicUrl(fileName)
      urls.push(data.publicUrl)
    }
    setUploading(false)
    return urls
  }

  const handleNewImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setNewForm((prev) => ({ ...prev, image: url }))
    e.target.value = ""
  }
  const handleEditImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setEditForm((prev) => ({ ...prev, image: url }))
    e.target.value = ""
  }
  const handleNewGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const urls = await uploadGalleryFiles(files)
    setNewGallery((prev) => [...prev, ...urls])
    e.target.value = ""
  }
  const handleEditGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const urls = await uploadGalleryFiles(files)
    setEditGallery((prev) => [...prev, ...urls])
    e.target.value = ""
  }

  const addFestival = async () => {
    if (!userId) return
    if (!newForm.title.trim()) { alert("Escribe un título para el festival"); return }
    setSaving(true)
    const { data, error } = await supabase.from("events").insert({
      ...newForm,
      date: newForm.date || null,
      date_end: newForm.date_end || null,
      image: newForm.image || newGallery[0] || "",
      gallery: newGallery.length > 0 ? newGallery : null,
      manual_photos: newGallery.length > 0,
      price_tiers: parsePriceTiers(newPriceTiersRaw).length > 0 ? parsePriceTiers(newPriceTiersRaw) : null,
      owner_user_id: userId,
      featured: false,
      sold_out: false,
      vip_tables: false,
    }).select().single()
    setSaving(false)
    if (error) { alert("Error al crear el festival: " + error.message); return }
    if (data) setFestivals((prev) => [...prev, data].sort((a, b) => (a.date || "").localeCompare(b.date || "")))
    setNewForm(emptyForm); setNewGallery([]); setNewPriceTiersRaw("")
    setShowAddForm(false)
  }

  const startEdit = (f: Festival) => {
    setEditingId(f.id)
    setEditForm(festivalToForm(f))
    setEditGallery(Array.isArray(f.gallery) ? f.gallery : [])
    setEditPriceTiersRaw(serializePriceTiers((f as any).price_tiers))
  }
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm); setEditGallery([]); setEditPriceTiersRaw("") }

  const saveEdit = async (id: number) => {
    if (!editForm.title.trim()) { alert("Escribe un título para el festival"); return }
    setSaving(true)
    const { data, error } = await supabase.from("events").update({
      ...editForm,
      date: editForm.date || null,
      date_end: editForm.date_end || null,
      image: editForm.image || editGallery[0] || "",
      gallery: editGallery.length > 0 ? editGallery : null,
      manual_photos: editGallery.length > 0,
      price_tiers: parsePriceTiers(editPriceTiersRaw).length > 0 ? parsePriceTiers(editPriceTiersRaw) : null,
    }).eq("id", id).select().single()
    setSaving(false)
    if (error) { alert("Error al guardar los cambios: " + error.message); return }
    if (data) setFestivals((prev) => prev.map((f) => (f.id === id ? data : f)))
    cancelEdit()
  }

  const deleteFestival = async (id: number) => {
    if (!confirm("¿Seguro que quieres borrar este festival? También se borrarán sus sesiones.")) return
    await supabase.from("event_sessions").delete().eq("event_id", id)
    const { error } = await supabase.from("events").delete().eq("id", id)
    if (error) { alert("Error al borrar: " + error.message); return }
    setFestivals((prev) => prev.filter((f) => f.id !== id))
  }

  // Sesiones de DJ dentro de un festival. "title" es el nombre de la sesión (lo que se ve más
  // grande en la ficha pública, ej. "Techno Stage — Noche 1"), y "date" agrupa las sesiones por
  // día en el calendario de la ficha pública — ambos son necesarios para que se vea bien ahí.
  const addSession = async (eventId: number) => {
    if (!newSessionForm.title.trim()) { alert("Escribe un título para la sesión"); return }
    if (!newSessionForm.date) { alert("Elige el día de esta sesión"); return }
    setSavingSession(true)
    const { data, error } = await supabase.from("event_sessions").insert({ ...newSessionForm, event_id: eventId }).select().single()
    setSavingSession(false)
    if (error) { alert("Error al añadir la sesión: " + error.message); return }
    if (data) setSessions((prev) => ({ ...prev, [eventId]: [...(prev[eventId] || []), data].sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.start_time || "").localeCompare(b.start_time || "")) }))
    setNewSessionForm(emptySession)
  }

  const startEditSession = (s: Session) => {
    setEditingSessionId(s.id)
    setEditSessionForm({
      date: s.date || "",
      title: s.title || "",
      artist: s.artist || "",
      stage: s.stage || "",
      start_time: s.start_time || "",
      end_time: s.end_time || "",
      description: s.description || "",
    })
  }
  const cancelEditSession = () => { setEditingSessionId(null); setEditSessionForm(emptySession) }

  const saveEditSession = async (eventId: number, id: number) => {
    if (!editSessionForm.title.trim()) { alert("Escribe un título para la sesión"); return }
    if (!editSessionForm.date) { alert("Elige el día de esta sesión"); return }
    setSavingSession(true)
    const { data, error } = await supabase.from("event_sessions").update(editSessionForm).eq("id", id).select().single()
    setSavingSession(false)
    if (error) { alert("Error al guardar la sesión: " + error.message); return }
    if (data) setSessions((prev) => ({ ...prev, [eventId]: (prev[eventId] || []).map((s) => (s.id === id ? data : s)) }))
    cancelEditSession()
  }

  const deleteSession = async (eventId: number, id: number) => {
    if (!confirm("¿Borrar esta sesión?")) return
    const { error } = await supabase.from("event_sessions").delete().eq("id", id)
    if (error) { alert("Error al borrar: " + error.message); return }
    setSessions((prev) => ({ ...prev, [eventId]: (prev[eventId] || []).filter((s) => s.id !== id) }))
  }

  const inputClass = "rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-white outline-none focus:border-purple-500/50 transition"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5"

  const renderForm = (
    form: FormData, setForm: (f: FormData) => void,
    gallery: string[], setGallery: (g: string[]) => void,
    priceTiersRaw: string, setPriceTiersRaw: (v: string) => void,
    handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void,
    handleGalleryUpload: (e: ChangeEvent<HTMLInputElement>) => void
  ) => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className={labelClass}>Título del festival *</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nombre del festival" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Lugar / recinto</label>
        <input value={form.club_name} onChange={(e) => setForm({ ...form, club_name: e.target.value })} placeholder="Recinto Fira de Barcelona..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Cabeza de cartel</label>
        <input value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} placeholder="Artista principal" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Música</label>
        <input value={form.music} onChange={(e) => setForm({ ...form, music: e.target.value })} placeholder="Techno, House..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Fecha de inicio</label>
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Fecha de fin (si dura varios días)</label>
        <input type="date" value={form.date_end} onChange={(e) => setForm({ ...form, date_end: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Hora de inicio</label>
        <input value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} placeholder="12:00" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Hora de fin</label>
        <input value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} placeholder="23:00" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Precio general</label>
        <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="45€" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Enlace de entradas</label>
        <input value={form.ticket_url} onChange={(e) => setForm({ ...form, ticket_url: e.target.value })} placeholder="https://..." className={inputClass} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Tarifas adicionales (opcional) — formato "Etiqueta:precio; Etiqueta:precio"</label>
        <input value={priceTiersRaw} onChange={(e) => setPriceTiersRaw(e.target.value)} placeholder="VIP:90€; Abono 3 días:120€" className={inputClass} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Imagen principal</label>
        <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... (o sube una abajo)" className={inputClass} />
        <label className={`mt-2 block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploading ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
          {uploading ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload} />
        </label>
        {form.image && <img src={form.image} alt="Vista previa" className="mt-3 h-32 w-full rounded-xl object-cover" />}
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Galería ({gallery.length} foto{gallery.length === 1 ? "" : "s"})</label>
        <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploading ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
          {uploading ? "Subiendo..." : "📁 Añadir fotos a la galería"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleGalleryUpload} />
        </label>
        {gallery.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {gallery.map((url) => (
              <div key={url} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setGallery(gallery.filter((u) => u !== url))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Descripción</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción del festival" className={`min-h-[100px] ${inputClass}`} />
      </div>
    </div>
  )

  const renderLineup = (festival: Festival) => {
    const festivalSessions = sessions[festival.id] || []
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
        <h4 className="mb-4 text-sm font-black uppercase tracking-widest text-zinc-400">Line-up / sesiones</h4>

        {festivalSessions.length === 0 && <p className="mb-4 text-sm text-zinc-500">Todavía no has añadido ninguna sesión.</p>}

        <div className="grid gap-2">
          {festivalSessions.map((s) => (
            editingSessionId === s.id ? (
              <div key={s.id} className="grid gap-2 rounded-xl border border-purple-500/30 bg-purple-500/[0.04] p-3 sm:grid-cols-3">
                <input type="date" value={editSessionForm.date} onChange={(e) => setEditSessionForm({ ...editSessionForm, date: e.target.value })} className={inputClass} />
                <input value={editSessionForm.title} onChange={(e) => setEditSessionForm({ ...editSessionForm, title: e.target.value })} placeholder="Título de la sesión" className={inputClass} />
                <input value={editSessionForm.artist} onChange={(e) => setEditSessionForm({ ...editSessionForm, artist: e.target.value })} placeholder="DJ / artista" className={inputClass} />
                <input value={editSessionForm.stage} onChange={(e) => setEditSessionForm({ ...editSessionForm, stage: e.target.value })} placeholder="Escenario (opcional)" className={inputClass} />
                <input value={editSessionForm.start_time} onChange={(e) => setEditSessionForm({ ...editSessionForm, start_time: e.target.value })} placeholder="Hora inicio" className={inputClass} />
                <input value={editSessionForm.end_time} onChange={(e) => setEditSessionForm({ ...editSessionForm, end_time: e.target.value })} placeholder="Hora fin" className={inputClass} />
                <textarea value={editSessionForm.description} onChange={(e) => setEditSessionForm({ ...editSessionForm, description: e.target.value })} placeholder="Descripción (opcional)" className={`sm:col-span-3 ${inputClass}`} />
                <div className="flex gap-2 sm:col-span-3">
                  <button onClick={() => saveEditSession(festival.id, s.id)} disabled={savingSession} className="rounded-full bg-purple-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-purple-400 disabled:opacity-50">Guardar</button>
                  <button onClick={cancelEditSession} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-sm text-white">
                  {s.date && <span className="text-zinc-500">{new Date(s.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · </span>}
                  <span className="font-bold">{s.title}</span>
                  {s.artist && <span className="text-zinc-500"> · 🎧 {s.artist}</span>}
                  {s.stage && <span className="text-zinc-500"> · {s.stage}</span>}
                  {(s.start_time || s.end_time) && <span className="text-zinc-500"> · {s.start_time || "?"}–{s.end_time || "?"}</span>}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => startEditSession(s)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white hover:text-black">✏️</button>
                  <button onClick={() => deleteSession(festival.id, s.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500 hover:text-white">🗑️</button>
                </div>
              </div>
            )
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <input type="date" value={newSessionForm.date} onChange={(e) => setNewSessionForm({ ...newSessionForm, date: e.target.value })} className={inputClass} />
          <input value={newSessionForm.title} onChange={(e) => setNewSessionForm({ ...newSessionForm, title: e.target.value })} placeholder="Título de la sesión" className={inputClass} />
          <input value={newSessionForm.artist} onChange={(e) => setNewSessionForm({ ...newSessionForm, artist: e.target.value })} placeholder="DJ / artista" className={inputClass} />
          <input value={newSessionForm.stage} onChange={(e) => setNewSessionForm({ ...newSessionForm, stage: e.target.value })} placeholder="Escenario (opcional)" className={inputClass} />
          <input value={newSessionForm.start_time} onChange={(e) => setNewSessionForm({ ...newSessionForm, start_time: e.target.value })} placeholder="Hora inicio" className={inputClass} />
          <input value={newSessionForm.end_time} onChange={(e) => setNewSessionForm({ ...newSessionForm, end_time: e.target.value })} placeholder="Hora fin" className={inputClass} />
          <textarea value={newSessionForm.description} onChange={(e) => setNewSessionForm({ ...newSessionForm, description: e.target.value })} placeholder="Descripción (opcional)" className={`sm:col-span-3 ${inputClass}`} />
          <button onClick={() => addSession(festival.id)} disabled={savingSession} className="rounded-full bg-purple-500 px-5 py-3 text-xs font-black text-white transition hover:bg-purple-400 disabled:opacity-50 sm:col-span-3">
            {savingSession ? "Añadiendo..." : "+ Añadir sesión"}
          </button>
        </div>
      </div>
    )
  }

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
          <p className="text-lg font-black">No se han podido cargar tus festivales</p>
          <p className="max-w-md text-sm text-zinc-400">{loadErrorMsg}</p>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 pt-14 text-white">
        <section className="mx-auto max-w-4xl px-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Portal de festivales</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Mis festivales</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400">
            Gestiona tus festivales y su line-up en Noctua. Los cambios se publican en cuanto los guardas.
          </p>

          {festivals.length === 0 && !showAddForm && (
            <div className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.03] p-10 text-center">
              <p className="text-zinc-400">Todavía no tienes ningún festival vinculado a tu cuenta.</p>
              <p className="mt-2 text-sm text-zinc-500">
                Si crees que debería haber alguno, o quieres añadir el primero,{" "}
                <Link href="/contact?type=owner_access&subject=No%20veo%20mi%20festival%20en%20mi-festival" className="text-purple-300 underline">escríbenos</Link>.
              </p>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={() => { setShowAddForm((v) => !v); setEditingId(null) }}
              className={`w-full rounded-2xl px-6 py-4 text-sm font-black transition md:w-auto ${showAddForm ? "bg-white text-black" : "bg-purple-500 text-white hover:bg-purple-400"}`}
            >
              {showAddForm ? "✕ Cerrar formulario" : "+ Nuevo festival"}
            </button>
            {showAddForm && (
              <div className="mt-4 rounded-[24px] border border-purple-500/30 bg-purple-500/[0.04] p-6">
                <h3 className="mb-4 text-lg font-black">Nuevo festival</h3>
                {renderForm(newForm, setNewForm, newGallery, setNewGallery, newPriceTiersRaw, setNewPriceTiersRaw, handleNewImageUpload, handleNewGalleryUpload)}
                <div className="mt-5 flex gap-3">
                  <button onClick={addFestival} disabled={saving} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                    {saving ? "Guardando..." : "Crear festival"}
                  </button>
                  <button onClick={() => { setShowAddForm(false); setNewForm(emptyForm); setNewGallery([]); setNewPriceTiersRaw("") }} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {festivals.length > 0 && (
            <div className="mt-8 grid gap-6">
              {festivals.map((festival) => (
                <div key={festival.id} className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
                  {editingId === festival.id ? (
                    <div>
                      <h3 className="mb-4 text-lg font-black">Editando: {festival.title}</h3>
                      {renderForm(editForm, setEditForm, editGallery, setEditGallery, editPriceTiersRaw, setEditPriceTiersRaw, handleEditImageUpload, handleEditGalleryUpload)}
                      <div className="mt-5 flex gap-3">
                        <button onClick={() => saveEdit(festival.id)} disabled={saving} className="rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50">
                          {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                        <button onClick={cancelEdit} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        {festival.image && <img src={festival.image} alt={festival.title} className="mb-4 h-40 w-full rounded-2xl object-cover lg:w-80" />}
                        <h2 className="text-2xl font-black">{festival.title}</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">📅 {festival.date || "TBA"}</span>
                          <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">🎟 {festival.price || "TBA"}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => startEdit(festival)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white hover:text-black">✏️ Editar</button>
                        <button onClick={() => deleteFestival(festival.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500 hover:text-white">🗑️ Borrar</button>
                      </div>
                    </div>
                  )}
                  {editingId !== festival.id && (
                    <div>
                      <button
                        onClick={() => setExpandedLineupId(expandedLineupId === festival.id ? null : festival.id)}
                        className="mt-4 text-sm font-bold text-purple-300 underline"
                      >
                        {expandedLineupId === festival.id ? "Ocultar line-up" : `🎧 Gestionar line-up (${(sessions[festival.id] || []).length})`}
                      </button>
                      {expandedLineupId === festival.id && renderLineup(festival)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  )
}
