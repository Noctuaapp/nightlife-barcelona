"use client"

import { useEffect, useState, type ChangeEvent } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"

type Club = {
  id: number
  name: string
}

type ClubSession = {
  id: number
  club_id: number
  club_name?: string
  day_of_week: string | null
  name: string
  music: string | null
  price: string | null
  dresscode: string | null
  image: string | null
  sort_order: number | null
}

const DAY_OPTIONS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

const emptyForm = {
  club_id: "",
  day_of_week: "Viernes",
  name: "",
  music: "",
  price: "",
  dresscode: "",
  image: "",
  sort_order: "0",
}

export default function AdminClubSessionsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [sessions, setSessions] = useState<ClubSession[]>([])
  const [newSession, setNewSession] = useState(emptyForm)
  const [editSession, setEditSession] = useState(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [filterClub, setFilterClub] = useState("")

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.email !== "info@noctuaapp.com") {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    fetchClubs()
    fetchSessions()
  }, [])

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name")
    if (data) setClubs(data)
  }

  const fetchSessions = async () => {
    const { data } = await supabase.from("club_sessions").select("*").order("sort_order", { ascending: true })
    if (data) setSessions(data)
  }

  const clubName = (id: number | string) => clubs.find((c) => c.id === Number(id))?.name || ""

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const { error } = await supabase.storage.from("club-images").upload(fileName, file)
    setUploading(false)
    if (error) { alert("Error al subir la imagen: " + error.message); return null }
    const { data } = supabase.storage.from("club-images").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleImageUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    form: typeof emptyForm,
    setForm: (f: typeof emptyForm) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file)
    if (url) setForm({ ...form, image: url })
    e.target.value = ""
  }

  const formToPayload = (form: typeof emptyForm) => ({
    club_id: Number(form.club_id),
    day_of_week: form.day_of_week,
    name: form.name.trim(),
    music: form.music.trim(),
    price: form.price.trim(),
    dresscode: form.dresscode.trim(),
    image: form.image.trim(),
    sort_order: Number(form.sort_order) || 0,
  })

  const addSession = async () => {
    if (!newSession.club_id || !newSession.name.trim()) {
      alert("Elige un club y ponle un nombre a la sesión")
      return
    }
    const { data, error } = await supabase.from("club_sessions").insert(formToPayload(newSession)).select().single()
    if (error) { alert("Error al añadir la sesión: " + error.message); return }
    if (data) setSessions((prev) => [...prev, data])
    setNewSession(emptyForm)
  }

  const startEdit = (session: ClubSession) => {
    setEditingId(session.id)
    setEditSession({
      club_id: String(session.club_id),
      day_of_week: session.day_of_week || "Viernes",
      name: session.name || "",
      music: session.music || "",
      price: session.price || "",
      dresscode: session.dresscode || "",
      image: session.image || "",
      sort_order: String(session.sort_order ?? 0),
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditSession(emptyForm) }

  const saveEdit = async (id: number) => {
    if (!editSession.club_id || !editSession.name.trim()) {
      alert("Elige un club y ponle un nombre a la sesión")
      return
    }
    const { data, error } = await supabase.from("club_sessions").update(formToPayload(editSession)).eq("id", id).select().single()
    if (error) { alert("Error al guardar los cambios: " + error.message); return }
    if (data) setSessions((prev) => prev.map((s) => (s.id === id ? data : s)))
    cancelEdit()
  }

  const deleteSession = async (id: number) => {
    if (!confirm("¿Eliminar esta sesión?")) return
    const { error } = await supabase.from("club_sessions").delete().eq("id", id)
    if (error) return
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const visibleSessions = filterClub ? sessions.filter((s) => String(s.club_id) === filterClub) : sessions

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Verificando acceso...</p>
      </main>
    )
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5"

  const renderForm = (form: typeof emptyForm, setForm: (f: typeof emptyForm) => void) => (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className={labelClass}>Club *</label>
        <select value={form.club_id} onChange={(e) => setForm({ ...form, club_id: e.target.value })} className={inputClass}>
          <option value="" className="bg-black">Selecciona un club</option>
          {clubs.map((c) => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Día de la semana</label>
        <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className={inputClass}>
          {DAY_OPTIONS.map((d) => <option key={d} value={d} className="bg-black">{d}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Nombre de la sesión *</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Techno Night, Reggaeton Session..." className={inputClass} />
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
        <label className={labelClass}>Dress code</label>
        <input value={form.dresscode} onChange={(e) => setForm({ ...form, dresscode: e.target.value })} placeholder="Elegante, casual..." className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Orden (menor = primero)</label>
        <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={inputClass} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>Imagen</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {form.image && <img src={form.image} alt="Vista previa" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-white/10" />}
          <div className="flex-1 space-y-2">
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... (o sube una desde tu ordenador)" className={inputClass} />
            <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploading ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
              {uploading ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => handleImageUpload(e, form, setForm)} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <AdminShell title="Sesiones" subtitle="Noches temáticas semanales de cada club (ej. viernes techno, sábado reggaetón).">
      <>
        <section className="mx-auto max-w-7xl">
          <div className="rounded-[24px] border border-purple-500/30 bg-purple-500/[0.04] p-6">
            <h3 className="mb-4 text-lg font-black">Nueva sesión</h3>
            {renderForm(newSession, setNewSession)}
            <button onClick={addSession} disabled={uploading} className="mt-5 rounded-full bg-purple-500 px-6 py-3 text-sm font-black text-white hover:bg-purple-400 transition disabled:opacity-50">
              {uploading ? "Guardando..." : "Añadir sesión"}
            </button>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-7xl">
          <select value={filterClub} onChange={(e) => setFilterClub(e.target.value)} className={`${inputClass} max-w-xs`}>
            <option value="" className="bg-black">Todos los clubs</option>
            {clubs.map((c) => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
          </select>
        </section>

        <section className="mx-auto mt-6 max-w-7xl">
          <div className="grid gap-4">
            {visibleSessions.length === 0 && (
              <p className="py-12 text-center text-sm text-zinc-500">No hay sesiones {filterClub ? "para este club" : "todavía"}.</p>
            )}
            {visibleSessions.map((session) => (
              <div key={session.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6">
                {editingId === session.id ? (
                  <div>
                    {renderForm(editSession, setEditSession)}
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => saveEdit(session.id)} disabled={uploading} className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-black text-black disabled:opacity-50">Guardar cambios</button>
                      <button onClick={cancelEdit} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                      {session.image ? (
                        <img src={session.image} alt={session.name} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-500/20 text-2xl">🗓️</div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-wide text-zinc-500">{clubName(session.club_id)} · {session.day_of_week}</p>
                        <h3 className="text-xl font-black text-white">{session.name}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {session.music && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">🎧 {session.music}</span>}
                          {session.price && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">🎟 {session.price}</span>}
                          {session.dresscode && <span className="rounded-full bg-white/10 px-3 py-1 text-xs">👔 {session.dresscode}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => startEdit(session)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold hover:bg-white hover:text-black transition">✏️ Editar</button>
                      <button onClick={() => deleteSession(session.id)} className="rounded-full border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </>
    </AdminShell>
  )
}
