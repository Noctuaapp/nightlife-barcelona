"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"

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
}

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
  terrace: false,
  smoking_area: false,
  table_booking: false,
  lgtbi_friendly: false,
  verified: false,
  vip_tables: false,
  trending: false,
  sold_out: false,
  hidden: false,
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
})

const adminLinks = [
  { href: "/admin", label: "Clubs" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/club-events", label: "Club nights" },
  { href: "/admin/essentials", label: "Essentials" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/analytics", label: "Analytics" },
]

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
      if (data.session?.user.email !== "info@noctuaapp.com") {
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
  }

  const deleteClub = async (id: number) => {
    if (!confirm("¿Seguro que quieres eliminar este club?")) return
    await supabase.from("clubs").delete().eq("id", id)
    setClubs((prev) => prev.filter((c) => c.id !== id))
  }

  const showAll = async () => {
    await supabase.from("clubs").update({ hidden: false }).neq("id", 0)
    setClubs((prev) => prev.map((c) => ({ ...c, hidden: false })))
  }

  const hideAll = async () => {
    await supabase.from("clubs").update({ hidden: true }).neq("id", 0)
    setClubs((prev) => prev.map((c) => ({ ...c, hidden: true })))
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
    terrace: form.terrace,
    smoking_area: form.smoking_area,
    table_booking: form.table_booking,
    lgtbi_friendly: form.lgtbi_friendly,
    verified: form.verified,
    vip_tables: form.vip_tables,
    trending: form.trending,
    sold_out: form.sold_out,
    hidden: form.hidden,
  })

  const addClub = async () => {
    if (!newClub.name.trim()) {
      alert("El nombre del club es obligatorio")
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from("clubs").insert([formToPayload(newClub)]).select()
    setSaving(false)
    if (error) {
      alert("Error al añadir el club: " + error.message)
      return
    }
    if (data && data[0]) {
      setClubs((prev) => [...prev, data[0] as Club].sort((a, b) => a.name.localeCompare(b.name)))
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

  const startEdit = (club: Club) => {
    setEditingId(club.id)
    setEditForm(clubToForm(club))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const saveEdit = async (id: number) => {
    if (!editForm.name.trim()) {
      alert("El nombre del club es obligatorio")
      return
    }
    setSaving(true)
    const { data, error } = await supabase.from("clubs").update(formToPayload(editForm)).eq("id", id).select()
    setSaving(false)
    if (error) {
      alert("Error al guardar los cambios: " + error.message)
      return
    }
    if (data && data[0]) {
      setClubs((prev) => prev.map((c) => c.id === id ? (data[0] as Club) : c))
    }
    setEditingId(null)
  }

  const filteredClubs = clubs.filter((club) => {
    const matchesSearch = !search.trim() ||
      club.name?.toLowerCase().includes(search.toLowerCase()) ||
      club.neighborhood?.toLowerCase().includes(search.toLowerCase()) ||
      club.music?.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === "all" ||
      (filter === "visible" && !club.hidden) ||
      (filter === "hidden" && club.hidden) ||
      (filter === "verified" && club.verified) ||
      (filter === "vip" && club.vip_tables) ||
      (filter === "trending" && club.trending)

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
      <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Verificando acceso...</p>
    </main>
  )

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5"

  const renderClubForm = (form: ClubFormData, setForm: (f: ClubFormData) => void) => (
    <div className="grid gap-4 md:grid-cols-2">
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
        <label className={labelClass}>Imagen</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {form.image && (
            <img src={form.image} alt="Vista previa" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-white/10" />
          )}
          <div className="flex-1 space-y-2">
            <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... (o sube una desde tu ordenador)" className={inputClass} />
            <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingImage ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
              {uploadingImage ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={(e) => handleImageUpload(e, form, setForm)} />
            </label>
          </div>
        </div>
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
      <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
        {[
          { key: "terrace" as const, label: "🌿 Terraza" },
          { key: "smoking_area" as const, label: "🚬 Zona fumadores" },
          { key: "table_booking" as const, label: "🍾 Reserva de mesas" },
          { key: "vip_tables" as const, label: "🛋️ Mesa VIP" },
          { key: "lgtbi_friendly" as const, label: "🏳️‍🌈 LGTBI+" },
          { key: "verified" as const, label: "✓ Verified" },
          { key: "trending" as const, label: "🔥 Trending" },
          { key: "sold_out" as const, label: "🚫 Sold out" },
          { key: "hidden" as const, label: "👁️ Oculto" },
        ].map((opt) => (
          <button key={opt.key} type="button" onClick={() => setForm({ ...form, [opt.key]: !form[opt.key] })}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${form[opt.key] ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black pb-40 text-white">
      <section className="px-4 pt-10">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Noctua Admin</p>
              <h1 className="mt-2 text-5xl font-black tracking-tight">Clubs</h1>
            </div>
            <a href="/" className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-bold text-white hover:bg-white hover:text-black transition">← Web</a>
          </div>

          {/* Nav */}
          <div className="flex flex-wrap gap-2 mb-8">
            {adminLinks.map((link) => (
              <a key={link.href} href={link.href} className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${link.href === "/admin" ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white hover:text-black"}`}>{link.label}</a>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8 md:grid-cols-4">
            {[
              { label: "Total clubs", value: stats.total, color: "text-white" },
              { label: "Visibles", value: stats.visible, color: "text-emerald-400" },
              { label: "Verificados", value: stats.verified, color: "text-purple-400" },
              { label: "Trending", value: stats.trending, color: "text-orange-400" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-5 text-center">
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">{stat.label}</p>
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
              <div className="mt-4 rounded-[24px] border border-purple-500/30 bg-purple-500/[0.04] p-6">
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
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "Todos" },
                { value: "visible", label: "Visibles" },
                { value: "hidden", label: "Ocultos" },
                { value: "verified", label: "Verificados" },
                { value: "vip", label: "Mesa VIP" },
                { value: "trending", label: "Trending" },
              ].map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${filter === f.value ? "bg-white text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex gap-3 mb-6">
            <button onClick={showAll} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-white transition">✓ Mostrar todos</button>
            <button onClick={hideAll} className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500 hover:text-white transition">✕ Ocultar todos</button>
            <p className="ml-auto text-xs text-zinc-500 self-center">{filteredClubs.length} clubs</p>
          </div>

          {/* Clubs list */}
          {loading ? (
            <p className="text-zinc-500 text-sm text-center py-20">Cargando clubs...</p>
          ) : (
            <div className="grid gap-4">
              {filteredClubs.map((club) => (
                <div key={club.id}
                  className={`rounded-[24px] border p-5 transition ${club.hidden ? "border-white/5 bg-white/[0.01] opacity-50" : "border-white/10 bg-white/[0.03]"} ${editingId === club.id ? "!border-purple-500/40 !bg-purple-500/[0.04] !opacity-100" : ""}`}>

                  {editingId === club.id ? (
                    <div>
                      <h3 className="mb-4 text-lg font-black">Editando: {club.name}</h3>
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
                            {club.vip_tables && <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-300">🛋️ Mesa VIP</span>}
                            {club.hidden && <span className="rounded-full bg-zinc-500/20 border border-zinc-500/30 px-2 py-0.5 text-xs font-bold text-zinc-400">Oculto</span>}
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
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
                        <button onClick={() => toggleField(club, "hidden")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${!club.hidden ? "bg-emerald-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          👁️ {club.hidden ? "Oculto" : "Visible"}
                        </button>
                        <button onClick={() => toggleField(club, "lgtbi_friendly")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.lgtbi_friendly ? "bg-pink-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          🏳️‍🌈 LGTBI+
                        </button>
                        <button onClick={() => toggleField(club, "vip_tables")}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition ${club.vip_tables ? "bg-amber-400 text-black" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
                          🛋️ Mesa VIP
                        </button>
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
                <p className="text-zinc-500 text-sm text-center py-20">No se encontraron clubs.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}