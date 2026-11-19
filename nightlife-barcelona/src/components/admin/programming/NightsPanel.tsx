"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import { CalendarDays, ExternalLink, Plus, Trash2, Upload } from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { logError } from "../../../lib/log"
import { madridToday } from "../../../lib/madridDay"
import { toast } from "../../ui/Toast"
import { BTN_DANGER, BTN_GHOST, BTN_GHOST_SM, BTN_PRIMARY, FilterChip, Tag } from "../ui"
import { EditSheet, Field, FieldGrid, FormSection, SearchBox, ShowMore, SplitView, SwitchRow, Thumb } from "../editor"
import type { Club, ClubEvent } from "./types"

// «Con fecha» (club_events): noches concretas de un club (un concierto, una fiesta de aniversario). Las crea el admin aquí o el
// propio club desde /mi-club. Por defecto se ven las próximas; las pasadas se guardan por si hay que revisarlas.

const AGE_LEVELS = [18, 21, 25]
const PAGE_SIZE = 50

const emptyForm = {
  club_id: "",
  club_name: "",
  title: "",
  artist: "",
  music: "",
  date: "",
  start_time: "",
  end_time: "",
  price: "",
  ticket_url: "",
  image: "",
  description: "",
  age_min: 18,
}
type Form = typeof emptyForm
type Period = "upcoming" | "past" | "all"

const day = (d: string | null | undefined) => (d || "").slice(0, 10)
const fmtDate = (iso: string | null | undefined) => {
  const d = day(iso)
  if (!d) return null
  const parsed = new Date(`${d}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
}
const fmtTimes = (e: ClubEvent) => {
  const a = (e.start_time || "").slice(0, 5)
  const b = (e.end_time || "").slice(0, 5)
  if (a && b) return `${a}–${b}`
  return a || b || null
}

export default function NightsPanel({
  clubs,
  nights,
  setNights,
  clubFilter,
  focusId,
  onFocusHandled,
}: {
  clubs: Club[]
  nights: ClubEvent[]
  setNights: Dispatch<SetStateAction<ClubEvent[]>>
  clubFilter: string
  /** Noche que se abre al llegar desde el botón «Editar» de una ficha pública (?edit=ID). */
  focusId: number | null
  onFocusHandled: () => void
}) {
  const [form, setForm] = useState<Form>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<Period>("upcoming")
  const [limit, setLimit] = useState(PAGE_SIZE)

  const today = madridToday()
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  const openNew = () => {
    const club = clubs.find((c) => String(c.id) === clubFilter)
    setAdding(true)
    setEditingId(null)
    setForm({ ...emptyForm, club_id: clubFilter, club_name: club?.name || "" })
  }
  const openEdit = (n: ClubEvent) => {
    setAdding(false)
    setEditingId(n.id)
    setForm({
      club_id: n.club_id ? String(n.club_id) : "",
      club_name: n.club_name || "",
      title: n.title || "",
      artist: n.artist || "",
      music: n.music || "",
      date: n.date || "",
      start_time: n.start_time || "",
      end_time: n.end_time || "",
      price: n.price || "",
      ticket_url: n.ticket_url || "",
      image: n.image || "",
      description: n.description || "",
      age_min: n.age_min || 18,
    })
  }
  const closeSheet = () => {
    setAdding(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  // Llegando desde «Editar» en una ficha pública: se abre esa noche (y, si es pasada, se enseñan las pasadas) y se avisa a la
  // pantalla para que no la vuelva a abrir.
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (scrollTimer.current) clearInterval(scrollTimer.current) }, [])
  useEffect(() => {
    if (focusId == null) return
    const found = nights.find((n) => n.id === focusId)
    if (!found) return
    onFocusHandled()
    if (day(found.date) && day(found.date) < today) setPeriod("past")
    openEdit(found)
    let tries = 0
    if (scrollTimer.current) clearInterval(scrollTimer.current)
    scrollTimer.current = setInterval(() => {
      tries++
      const el = document.getElementById(`clubevent-${found.id}`)
      if (el) {
        if (scrollTimer.current) clearInterval(scrollTimer.current)
        el.scrollIntoView({ block: "center", behavior: "smooth" })
      } else if (tries > 40 && scrollTimer.current) {
        clearInterval(scrollTimer.current)
      }
    }, 150)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, nights])

  const onClubChange = (clubId: string) => {
    const club = clubs.find((c) => c.id === Number(clubId))
    set({ club_id: clubId, club_name: club?.name || "" })
  }

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const filePath = `club-events/${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from("event-images").upload(filePath, file)
    setUploading(false)
    if (error) {
      logError("UPLOAD ERROR:", error)
      toast("Error al subir la imagen: " + error.message)
      return null
    }
    return supabase.storage.from("event-images").getPublicUrl(filePath).data.publicUrl
  }
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = ""
    if (!file) return
    const url = await uploadImage(file)
    if (url) set({ image: url })
  }

  const payload = (f: Form) => ({
    club_id: Number(f.club_id),
    club_name: f.club_name,
    title: f.title.trim(),
    artist: f.artist,
    music: f.music,
    date: f.date || null,
    start_time: f.start_time,
    end_time: f.end_time,
    price: f.price,
    ticket_url: f.ticket_url,
    image: f.image,
    description: f.description,
    age_min: f.age_min || 18,
  })

  const save = async () => {
    if (!form.club_id || !form.title.trim()) {
      toast("Elige un club y ponle un título a la noche")
      return
    }
    setSaving(true)
    if (adding) {
      const { data, error } = await supabase.from("club_events").insert({ ...payload(form), featured: false, sold_out: false }).select().single()
      setSaving(false)
      if (error) {
        logError("ADD CLUB EVENT ERROR:", error)
        toast("Error al añadir la noche: " + error.message)
        return
      }
      if (data) setNights((prev) => [data, ...prev])
      toast("Noche añadida")
    } else if (editingId !== null) {
      const { data, error } = await supabase.from("club_events").update(payload(form)).eq("id", editingId).select().single()
      setSaving(false)
      if (error) {
        logError("EDIT CLUB EVENT ERROR:", error)
        toast("Error al guardar los cambios: " + error.message)
        return
      }
      if (data) setNights((prev) => prev.map((n) => (n.id === editingId ? data : n)))
      toast("Cambios guardados")
    }
    closeSheet()
  }

  // Destacada y agotada se aplican al momento (como en Eventos), sin esperar a «Guardar cambios».
  const setFlag = async (n: ClubEvent, key: "featured" | "sold_out", value: boolean) => {
    const { error } = await supabase.from("club_events").update({ [key]: value }).eq("id", n.id)
    if (error) {
      toast("No se ha podido cambiar: " + error.message)
      return
    }
    setNights((prev) => prev.map((x) => (x.id === n.id ? { ...x, [key]: value } : x)))
  }

  const remove = async (id: number) => {
    if (!window.confirm("¿Eliminar esta noche? No se puede deshacer.")) return
    const { error } = await supabase.from("club_events").delete().eq("id", id)
    if (error) {
      toast("No se ha podido eliminar: " + error.message)
      return
    }
    setNights((prev) => prev.filter((n) => n.id !== id))
    if (editingId === id) closeSheet()
  }

  // Lista: club (filtro común) + búsqueda → cuántas hay en cada periodo → periodo elegido, próximas de más cercana a más lejana
  // y pasadas de más reciente a más antigua.
  const q = search.trim().toLowerCase()
  const base = useMemo(
    () =>
      nights
        .filter((n) => !clubFilter || String(n.club_id) === clubFilter)
        .filter((n) => !q || [n.title, n.artist, n.music, n.club_name, n.date].filter(Boolean).join(" ").toLowerCase().includes(q)),
    [nights, clubFilter, q]
  )
  const isPast = (n: ClubEvent) => !!day(n.date) && day(n.date) < today
  const counts = useMemo(() => {
    let past = 0
    for (const n of base) if (!!day(n.date) && day(n.date) < today) past++
    return { upcoming: base.length - past, past, all: base.length }
  }, [base, today])
  const filtered = useMemo(() => {
    const rows = base.filter((n) => (period === "all" ? true : period === "past" ? isPast(n) : !isPast(n)))
    return rows.sort((a, b) => {
      const pa = isPast(a)
      const pb = isPast(b)
      if (pa !== pb) return pa ? 1 : -1
      const da = day(a.date)
      const db = day(b.date)
      if (!da || !db) return da ? -1 : db ? 1 : a.id - b.id
      return pa ? db.localeCompare(da) : da.localeCompare(db)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, period, today])
  const shown = filtered.slice(0, limit)
  useEffect(() => setLimit(PAGE_SIZE), [period, q, clubFilter])

  const sheetOpen = adding || editingId !== null
  const current = editingId !== null ? nights.find((n) => n.id === editingId) || null : null

  const sheet = sheetOpen ? (
    <EditSheet
      title={adding ? "Nueva noche de club" : `Editando: ${form.title || current?.title || ""}`}
      subtitle={adding ? "Una noche concreta, con fecha" : [fmtDate(current?.date), current?.club_name].filter(Boolean).join(" · ")}
      onClose={closeSheet}
      links={
        !adding && current ? (
          <a href={`/club-event/${current.id}`} target="_blank" rel="noopener noreferrer" className={BTN_GHOST_SM}>
            <ExternalLink size={14} aria-hidden="true" /> <span className="hidden sm:inline">Ver en la web</span><span className="sr-only sm:hidden">Ver en la web</span>
          </a>
        ) : null
      }
      footer={
        adding ? (
          <>
            <button type="button" onClick={closeSheet} className={BTN_GHOST}>Cancelar</button>
            <button type="button" onClick={save} disabled={saving || uploading} aria-busy={saving} className={`${BTN_PRIMARY} ml-auto`}>
              {saving ? "Guardando…" : "Añadir noche"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => editingId !== null && void remove(editingId)} className={BTN_DANGER}>
              <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Eliminar</span><span className="sr-only sm:hidden">Eliminar noche</span>
            </button>
            <button type="button" onClick={closeSheet} className={`${BTN_GHOST} ml-auto`}>Cancelar</button>
            <button type="button" onClick={save} disabled={saving || uploading} aria-busy={saving} className={BTN_PRIMARY}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        )
      }
    >
      <div className="space-y-7">
        <FormSection title="Qué noche es">
          <FieldGrid>
            <Field label="Club *">
              <select value={form.club_id} onChange={(e) => onClubChange(e.target.value)} className="ui-input">
                <option value="">Selecciona un club</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Título *">
              <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="Noche de aniversario…" className="ui-input" />
            </Field>
            <Field label="Artista o DJ">
              <input value={form.artist} onChange={(e) => set({ artist: e.target.value })} placeholder="Quién pincha" className="ui-input" />
            </Field>
            <Field label="Música">
              <input value={form.music} onChange={(e) => set({ music: e.target.value })} placeholder="Techno, reggaetón…" className="ui-input" />
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Cuándo">
          <FieldGrid>
            <Field label="Fecha">
              <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} className="ui-input" />
            </Field>
            <span className="hidden md:block" aria-hidden="true" />
            <Field label="Empieza">
              <input value={form.start_time} onChange={(e) => set({ start_time: e.target.value })} placeholder="23:00" className="ui-input" />
            </Field>
            <Field label="Termina">
              <input value={form.end_time} onChange={(e) => set({ end_time: e.target.value })} placeholder="06:00" className="ui-input" />
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Entrada">
          <FieldGrid>
            <Field label="Precio">
              <input value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="15€, gratis…" className="ui-input" />
            </Field>
            <Field label="Edad mínima" group>
              <div className="flex gap-2">
                {AGE_LEVELS.map((age) => (
                  <FilterChip key={age} active={form.age_min === age} onClick={() => set({ age_min: age })}>+{age}</FilterChip>
                ))}
              </div>
            </Field>
            <Field wide label="Enlace de entradas">
              <input value={form.ticket_url} onChange={(e) => set({ ticket_url: e.target.value })} placeholder="https://…" className="ui-input" />
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection title="Descripción e imagen">
          <div className="space-y-5">
            <Field label="Descripción">
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4} placeholder="Qué se puede esperar de la noche" className="ui-input min-h-[110px]" />
            </Field>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {form.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image} alt="Vista previa" className="h-28 w-28 shrink-0 rounded-2xl border border-white/15 object-cover" />
              ) : (
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-2xl border border-dashed border-white/25 text-xs text-zinc-400">Sin imagen</div>
              )}
              <div className="min-w-0 flex-1 space-y-3">
                <input value={form.image} onChange={(e) => set({ image: e.target.value })} placeholder="https://… (o sube una desde tu equipo)" aria-label="Enlace de la imagen" className="ui-input" />
                <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-bold transition ${uploading ? "border-white/15 text-zinc-400" : "border-white/30 bg-white/[0.04] text-zinc-100 hover:border-brand-soft hover:bg-brand/10"}`}>
                  <Upload size={16} aria-hidden="true" />
                  {uploading ? "Subiendo…" : "Subir imagen desde tu equipo"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload} />
                </label>
              </div>
            </div>
          </div>
        </FormSection>

        {current && (
          <FormSection title="Estado" hint="Se aplica al momento, sin pulsar Guardar.">
            <div className="grid gap-2.5">
              <SwitchRow tone="amber" checked={!!current.featured} onChange={(v) => void setFlag(current, "featured", v)} title="Destacada" hint="Lleva la etiqueta 🔥 de destacada." />
              <SwitchRow tone="red" checked={!!current.sold_out} onChange={(v) => void setFlag(current, "sold_out", v)} title="Agotada" hint="Marca la noche como agotada." />
            </div>
          </FormSection>
        )}
      </div>
    </EditSheet>
  ) : null

  const list = (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar noches…" label="Buscar noches por título, artista, música, club o fecha" className="min-w-0 flex-1" />
        <button type="button" onClick={openNew} className={`${BTN_PRIMARY} shrink-0`}>
          <Plus size={17} aria-hidden="true" /> Añadir noche
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip active={period === "upcoming"} onClick={() => setPeriod("upcoming")} count={counts.upcoming}>Próximas</FilterChip>
        <FilterChip active={period === "past"} onClick={() => setPeriod("past")} count={counts.past}>Pasadas</FilterChip>
        <FilterChip active={period === "all"} onClick={() => setPeriod("all")} count={counts.all}>Todas</FilterChip>
      </div>

      {filtered.length === 0 ? (
        <div className="ui-card px-6 py-14 text-center">
          <p className="text-sm font-bold text-white">{nights.length === 0 ? "Todavía no hay noches con fecha" : "No hay noches con este filtro"}</p>
          <p className="mt-1 text-xs text-zinc-300/80">Una noche con fecha es algo concreto: un concierto, una fiesta de aniversario, un invitado especial.</p>
          {(q || clubFilter || period !== "all") && nights.length > 0 && (
            <button type="button" onClick={() => { setSearch(""); setPeriod("all") }} className={`${BTN_GHOST_SM} mt-4`}>Ver todas</button>
          )}
        </div>
      ) : (
        <>
          <ul className="grid gap-2.5">
            {shown.map((n) => {
              const on = editingId === n.id
              const past = isPast(n)
              const when = [fmtDate(n.date) || "Sin fecha", fmtTimes(n)].filter(Boolean).join(" · ")
              return (
                <li key={n.id} id={`clubevent-${n.id}`}>
                  <div className={`ui-item ${on ? "ui-item-on" : ""} ${past && !on ? "ui-item-dim" : ""}`}>
                    <button type="button" onClick={() => openEdit(n)} aria-label={`Editar ${n.title}`} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <Thumb src={n.image} name={n.title} fallback={<CalendarDays size={20} aria-hidden="true" />} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold text-white">{n.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-300/80">{when}</span>
                        {(n.club_name || n.artist) && (
                          <span className="block truncate text-xs text-zinc-400">{[n.club_name, n.artist].filter(Boolean).join(" · ")}</span>
                        )}
                        <span className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                          {n.featured && <Tag tone="amber">Destacada</Tag>}
                          {n.sold_out && <Tag tone="red">Agotada</Tag>}
                          {past && <Tag>Pasada</Tag>}
                          {!n.date && <Tag tone="amber">Sin fecha</Tag>}
                          {!n.image && <Tag tone="amber">Sin foto</Tag>}
                          {n.age_min && n.age_min !== 18 ? <Tag tone="violet">+{n.age_min}</Tag> : null}
                        </span>
                      </span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <ShowMore shown={shown.length} total={filtered.length} step={PAGE_SIZE} onMore={() => setLimit((l) => l + PAGE_SIZE)} />
        </>
      )}
    </div>
  )

  return <SplitView list={list} sheet={sheet} />
}
