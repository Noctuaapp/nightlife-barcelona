"use client"

import { useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import { Plus, Trash2, Upload, Repeat } from "lucide-react"
import { supabase } from "../../../lib/supabase"
import { toast } from "../../ui/Toast"
import { BTN_DANGER, BTN_GHOST, BTN_GHOST_SM, BTN_PRIMARY, Tag } from "../ui"
import { EditSheet, Field, FieldGrid, FormSection, SearchBox, SplitView, Thumb } from "../editor"
import { DAY_OPTIONS, type Club, type ClubSession } from "./types"

// «Cada semana» (club_sessions): las noches temáticas que se repiten (viernes techno, sábado reggaetón). Una fila por sesión,
// agrupadas por día de la semana. Se abre la ficha para editarla; Borrar pide confirmación.

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
type Form = typeof emptyForm

export default function SessionsPanel({
  clubs,
  sessions,
  setSessions,
  clubFilter,
}: {
  clubs: Club[]
  sessions: ClubSession[]
  setSessions: Dispatch<SetStateAction<ClubSession[]>>
  clubFilter: string
}) {
  const [form, setForm] = useState<Form>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")

  const clubName = (id: number | string) => clubs.find((c) => c.id === Number(id))?.name || ""
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  const open = (next: { adding: boolean; id: number | null; form: Form }) => {
    setAdding(next.adding)
    setEditingId(next.id)
    setForm(next.form)
  }
  const closeSheet = () => open({ adding: false, id: null, form: emptyForm })
  const openNew = () => open({ adding: true, id: null, form: { ...emptyForm, club_id: clubFilter } })
  const openEdit = (s: ClubSession) =>
    open({
      adding: false,
      id: s.id,
      form: {
        club_id: String(s.club_id),
        day_of_week: s.day_of_week || "Viernes",
        name: s.name || "",
        music: s.music || "",
        price: s.price || "",
        dresscode: s.dresscode || "",
        image: s.image || "",
        sort_order: String(s.sort_order ?? 0),
      },
    })

  const uploadImage = async (file: File) => {
    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
    const { error } = await supabase.storage.from("club-images").upload(fileName, file)
    setUploading(false)
    if (error) {
      toast("Error al subir la imagen: " + error.message)
      return null
    }
    return supabase.storage.from("club-images").getPublicUrl(fileName).data.publicUrl
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
    day_of_week: f.day_of_week,
    name: f.name.trim(),
    music: f.music.trim(),
    price: f.price.trim(),
    dresscode: f.dresscode.trim(),
    image: f.image.trim(),
    sort_order: Number(f.sort_order) || 0,
  })

  const save = async () => {
    if (!form.club_id || !form.name.trim()) {
      toast("Elige un club y ponle un nombre a la sesión")
      return
    }
    setSaving(true)
    if (adding) {
      const { data, error } = await supabase.from("club_sessions").insert(payload(form)).select().single()
      setSaving(false)
      if (error) {
        toast("Error al añadir la sesión: " + error.message)
        return
      }
      if (data) setSessions((prev) => [...prev, data])
      toast("Sesión añadida")
    } else if (editingId !== null) {
      const { data, error } = await supabase.from("club_sessions").update(payload(form)).eq("id", editingId).select().single()
      setSaving(false)
      if (error) {
        toast("Error al guardar los cambios: " + error.message)
        return
      }
      if (data) setSessions((prev) => prev.map((s) => (s.id === editingId ? data : s)))
      toast("Cambios guardados")
    }
    closeSheet()
  }

  const remove = async (id: number) => {
    if (!window.confirm("¿Eliminar esta sesión? No se puede deshacer.")) return
    const { error } = await supabase.from("club_sessions").delete().eq("id", id)
    if (error) {
      toast("No se ha podido eliminar: " + error.message)
      return
    }
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (editingId === id) closeSheet()
  }

  // Lo que se ve: filtro de club (arriba, común a las dos pestañas) + búsqueda, agrupado por día en orden de semana y, dentro de
  // cada día, por el orden que se le dio a cada sesión.
  const q = search.trim().toLowerCase()
  const grouped = useMemo(() => {
    const rows = sessions
      .filter((s) => !clubFilter || String(s.club_id) === clubFilter)
      .filter((s) => !q || [s.name, s.music, s.day_of_week, clubs.find((c) => c.id === s.club_id)?.name].filter(Boolean).join(" ").toLowerCase().includes(q))
    const byDay = new Map<string, ClubSession[]>()
    for (const s of rows) {
      const key = s.day_of_week && DAY_OPTIONS.includes(s.day_of_week) ? s.day_of_week : "Sin día"
      byDay.set(key, [...(byDay.get(key) || []), s])
    }
    return [...DAY_OPTIONS, "Sin día"]
      .filter((d) => byDay.has(d))
      .map((d) => ({ day: d, items: (byDay.get(d) || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id) }))
  }, [sessions, clubFilter, q, clubs])
  const shownCount = grouped.reduce((n, g) => n + g.items.length, 0)

  const sheetOpen = adding || editingId !== null
  const current = editingId !== null ? sessions.find((s) => s.id === editingId) || null : null

  const sheet = sheetOpen ? (
    <EditSheet
      title={adding ? "Nueva sesión semanal" : `Editando: ${form.name || current?.name || ""}`}
      subtitle={adding ? "Se repite cada semana" : [clubName(form.club_id), form.day_of_week].filter(Boolean).join(" · ")}
      onClose={closeSheet}
      footer={
        adding ? (
          <>
            <button type="button" onClick={closeSheet} className={BTN_GHOST}>Cancelar</button>
            <button type="button" onClick={save} disabled={saving || uploading} aria-busy={saving} className={`${BTN_PRIMARY} ml-auto`}>
              {saving ? "Guardando…" : "Añadir sesión"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => editingId !== null && void remove(editingId)} className={BTN_DANGER}>
              <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Eliminar</span><span className="sr-only sm:hidden">Eliminar sesión</span>
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
        <FormSection title="Qué sesión es" hint="Una noche temática que se repite cada semana en el mismo día.">
          <FieldGrid>
            <Field label="Club *">
              <select value={form.club_id} onChange={(e) => set({ club_id: e.target.value })} className="ui-input">
                <option value="">Selecciona un club</option>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Día de la semana">
              <select value={form.day_of_week} onChange={(e) => set({ day_of_week: e.target.value })} className="ui-input">
                {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field wide label="Nombre de la sesión *">
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Techno Night, Reggaeton Session…" className="ui-input" />
            </Field>
            <Field label="Música">
              <input value={form.music} onChange={(e) => set({ music: e.target.value })} placeholder="Techno, Reggaetón…" className="ui-input" />
            </Field>
            <Field label="Orden" hint="Menor = primero, dentro de su día.">
              <input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: e.target.value })} className="ui-input" />
            </Field>
          </FieldGrid>
        </FormSection>
        <FormSection title="Precio y vestimenta">
          <FieldGrid>
            <Field label="Precio">
              <input value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="15-20€" className="ui-input" />
            </Field>
            <Field label="Dress code">
              <input value={form.dresscode} onChange={(e) => set({ dresscode: e.target.value })} placeholder="Elegante, casual…" className="ui-input" />
            </Field>
          </FieldGrid>
        </FormSection>
        <FormSection title="Imagen">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {form.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.image} alt="Vista previa" className="h-24 w-24 shrink-0 rounded-2xl border border-white/15 object-cover" />
            ) : (
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-dashed border-white/25 text-xs text-zinc-400">Sin imagen</div>
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
        </FormSection>
      </div>
    </EditSheet>
  ) : null

  const list = (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar sesiones…" label="Buscar sesiones por nombre, música, día o club" className="min-w-0 flex-1" />
        <button type="button" onClick={openNew} className={`${BTN_PRIMARY} shrink-0`}>
          <Plus size={17} aria-hidden="true" /> Añadir sesión
        </button>
      </div>

      {shownCount === 0 ? (
        <div className="ui-card px-6 py-14 text-center">
          <p className="text-sm font-bold text-white">{clubFilter || q ? "No hay sesiones con este filtro" : "Todavía no hay sesiones semanales"}</p>
          <p className="mt-1 text-xs text-zinc-300/80">Una sesión semanal es una noche temática que se repite, por ejemplo «viernes techno».</p>
          {(clubFilter || q) && (
            <button type="button" onClick={() => setSearch("")} className={`${BTN_GHOST_SM} mt-4`}>Quitar búsqueda</button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h3 className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-white">
                {g.day}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-zinc-300">{g.items.length}</span>
              </h3>
              <ul className="grid gap-2.5">
                {g.items.map((s) => {
                  const on = editingId === s.id
                  return (
                    <li key={s.id}>
                      <div className={`ui-item ${on ? "ui-item-on" : ""}`}>
                        <button type="button" onClick={() => openEdit(s)} aria-label={`Editar ${s.name}`} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                          <Thumb src={s.image} name={s.name} fallback={<Repeat size={20} aria-hidden="true" />} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-extrabold text-white">{s.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-300/80">{clubName(s.club_id) || "Club sin asignar"}</span>
                            <span className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                              {s.music && <Tag tone="violet">{s.music}</Tag>}
                              {s.price && <Tag>{s.price}</Tag>}
                              {s.dresscode && <Tag>{s.dresscode}</Tag>}
                            </span>
                          </span>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )

  return <SplitView list={list} sheet={sheet} />
}
