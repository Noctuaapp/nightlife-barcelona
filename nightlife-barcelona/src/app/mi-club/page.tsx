"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

import Header from "../../components/layout/Header"
import BottomNav from "../../components/layout/BottomNav"
import { supabase } from "../../lib/supabase"

// Portal para que un club verificado edite su propia ficha sin pasar por Jordi. Un club queda
// "vinculado" cuando su fila en `clubs` tiene `owner_user_id` = el id de un usuario de Supabase
// Auth (Jordi lo vincula a mano la primera vez, desde el SQL Editor). Reutiliza el mismo
// formulario y los mismos campos que /admin, con dos excepciones deliberadas: el club no puede
// tocar "Verified" (es el sello de confianza que otorga Noctua) ni "Trending" (es una curación
// editorial nuestra) — todo lo demás es igual que en el panel de admin.
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
  venue_type?: string
  open_days?: string[] | null
  metro_lines?: string
  night_buses?: string
  has_foosball?: boolean
  discount_info?: string
  free_entry_info?: string
  gallery?: string[] | null
  manual_photos?: boolean | null
  owner_user_id?: string | null
}

const VENUE_TYPE_OPTIONS = ["Discoteca", "Pub", "Bar musical"]
const DAY_OPTIONS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

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
  venue_type: string
  open_days: string[]
  metro_lines: string
  night_buses: string
  has_foosball: boolean
  discount_info: string
  free_entry_info: string
  gallery: string[]
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
  venue_type: club.venue_type || "Discoteca",
  open_days: club.open_days || [],
  metro_lines: club.metro_lines || "",
  night_buses: club.night_buses || "",
  has_foosball: !!club.has_foosball,
  discount_info: club.discount_info || "",
  free_entry_info: club.free_entry_info || "",
  gallery: Array.isArray(club.gallery) ? club.gallery : [],
})

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
  // verified y trending no se tocan desde aquí: se reenvía el valor que ya tenía el club, sin
  // exponer ningún control para cambiarlo (ver nota arriba).
  verified: form.verified,
  trending: form.trending,
  vip_tables: form.vip_tables,
  sold_out: form.sold_out,
  hidden: form.hidden,
  venue_type: form.venue_type,
  open_days: form.open_days.length ? form.open_days : null,
  metro_lines: form.metro_lines.trim(),
  night_buses: form.night_buses.trim(),
  has_foosball: form.has_foosball,
  discount_info: form.discount_info.trim(),
  free_entry_info: form.free_entry_info.trim(),
  gallery: form.gallery.length > 0 ? form.gallery : null,
  manual_photos: form.gallery.length > 0,
})

export default function MiClubPage() {
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [club, setClub] = useState<Club | null>(null)
  const [form, setForm] = useState<ClubFormData | null>(null)
  const [notLinked, setNotLinked] = useState(false)
  const [loadErrorMsg, setLoadErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        window.location.href = "/login"
        return
      }
      const { data, error } = await supabase
        .from("clubs")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle()

      if (error) {
        setLoadErrorMsg(error.message)
      } else if (!data) {
        setNotLinked(true)
      } else {
        setClub(data as Club)
        setForm(clubToForm(data as Club))
      }
      setCheckingAccess(false)
    }
    load()
  }, [])

  const saveChanges = async () => {
    if (!club || !form) return
    if (!form.name.trim()) {
      alert("El nombre del club es obligatorio")
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from("clubs")
      .update(formToPayload(form))
      .eq("id", club.id)
      .select()
      .maybeSingle()
    setSaving(false)
    if (error) {
      alert("Error al guardar los cambios: " + error.message)
      return
    }
    if (data) {
      setClub(data as Club)
      setForm(clubToForm(data as Club))
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 3000)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !form) return
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

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !form) return
    setUploadingGallery(true)
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop()
      const fileName = `owner/manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
      const { error } = await supabase.storage.from("club-photos").upload(fileName, file)
      if (error) continue
      const { data } = supabase.storage.from("club-photos").getPublicUrl(fileName)
      urls.push(data.publicUrl)
    }
    setUploadingGallery(false)
    if (urls.length > 0) setForm({ ...form, gallery: [...form.gallery, ...urls] })
    e.target.value = ""
  }

  const removeGalleryPhoto = (url: string) => {
    if (!form) return
    setForm({ ...form, gallery: form.gallery.filter((u) => u !== url) })
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50 transition placeholder:text-zinc-600"
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1.5"

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
          <p className="text-lg font-black">No se ha podido cargar tu ficha</p>
          <p className="max-w-md text-sm text-zinc-400">{loadErrorMsg}</p>
        </main>
        <BottomNav />
      </>
    )
  }

  if (notLinked || !club || !form) {
    return (
      <>
        <Header />
        <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-black px-6 text-center text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-4xl">🏛️</div>
          <h1 className="text-3xl font-black tracking-tight">Aún no tienes un club vinculado</h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            Si eres el responsable de un local en Noctua y quieres gestionar tu propia ficha, escríbenos a{" "}
            <a href="mailto:info@noctuaapp.com" className="font-bold text-purple-300 underline">info@noctuaapp.com</a>{" "}
            desde el correo con el que te registraste y te activamos el acceso.
          </p>
          <Link href="/" className="mt-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black transition hover:scale-105">
            Volver a Noctua
          </Link>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-black pb-40 pt-14 text-white">
        <section className="mx-auto max-w-3xl px-4">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Portal de club</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{club.name}</h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-400">
            Gestiona la información de tu ficha en Noctua. Los cambios se publican en cuanto los guardas.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
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
              <label className={labelClass}>Imagen principal</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {form.image && (
                  <img src={form.image} alt="Vista previa" className="h-20 w-20 flex-shrink-0 rounded-xl object-cover border border-white/10" />
                )}
                <div className="flex-1 space-y-2">
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://... (o sube una desde tu ordenador)" className={inputClass} />
                  <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingImage ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
                    {uploadingImage ? "Subiendo..." : "📁 Subir imagen desde tu ordenador"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>
                Galería ({form.gallery.length} foto{form.gallery.length === 1 ? "" : "s"})
                {form.gallery.length > 0 && <span className="ml-2 normal-case font-normal text-zinc-600">— quita las que no encajen con la ✕</span>}
              </label>
              <label className={`block cursor-pointer rounded-xl border border-dashed px-4 py-3 text-center text-xs font-bold transition ${uploadingGallery ? "border-white/10 text-zinc-600" : "border-white/20 bg-white/[0.02] text-zinc-400 hover:border-purple-500/50 hover:text-white"}`}>
                {uploadingGallery ? "Subiendo..." : "📁 Añadir fotos a la galería"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingGallery} onChange={handleGalleryUpload} />
              </label>
              {form.gallery.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {form.gallery.map((url) => (
                    <div key={url} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryPhoto(url)}
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
              <label className={labelClass}>Días que abre (vacío = sin dato)</label>
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

            <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
              {[
                { key: "terrace" as const, label: "🌿 Terraza" },
                { key: "smoking_area" as const, label: "🚬 Zona fumadores" },
                { key: "table_booking" as const, label: "🍾 Reserva de mesas" },
                { key: "vip_tables" as const, label: "🛋️ Mesa VIP" },
                { key: "has_foosball" as const, label: "🎱 Futbolín/Billar" },
                { key: "lgtbi_friendly" as const, label: "🏳️‍🌈 LGTBI+" },
                { key: "sold_out" as const, label: "🚫 Sold out (hoy)" },
                { key: "hidden" as const, label: "👁️ Ocultar mi ficha" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setForm({ ...form, [opt.key]: !form[opt.key] })}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${form[opt.key] ? "bg-purple-500 text-white" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="rounded-full bg-purple-500 px-8 py-4 text-sm font-black text-white transition hover:bg-purple-400 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {savedFlash && <p className="text-sm font-bold text-emerald-400">✓ Cambios guardados</p>}
          </div>
        </section>
      </main>
      <BottomNav />
    </>
  )
}
