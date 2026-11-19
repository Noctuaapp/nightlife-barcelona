"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Eye, EyeOff, MapPinOff, Plus, Sunrise, Trash2, ClockAlert, type LucideIcon } from "lucide-react"
import AdminShell from "../../../components/admin/AdminShell"
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, FilterChip, StatTile, Tag } from "../../../components/admin/ui"
import { EditSheet, Field, FieldGrid, FormSection, SearchBox, SheetTabs, SplitView, SwitchRow, Thumb } from "../../../components/admin/editor"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"
import { toast } from "../../../components/ui/Toast"
import { MANANEO_HIDDEN } from "../../../lib/featureFlags"
import { mananeoHoursState, type MananeoPlace } from "../../../lib/mananeo"
import { useAdminCity } from "../../../components/admin/AdminCity"
import { rowsOfCity } from "../../../lib/adminCity"
import { CITIES, cityOfClub } from "../../../lib/cities"

// Mañaneo / resaca (05/11/2026): aquí se añaden y editan los sitios de afterhour que luego salen en el
// apartado «Mañaneo» de Eventos. Todo nace OCULTO (hidden = true); con MANANEO_HIDDEN en true (lib/featureFlags.ts)
// el apartado solo lo ve el admin aunque haya sitios visibles. Tabla: supabase/80_mananeo.sql.

type Form = {
  id: number | null
  name: string
  neighborhood: string
  address: string
  coords: string // «41.3851, 2.1734» (se pega tal cual desde Google Maps)
  hours: string
  music: string
  price: string
  description: string
  image: string
  instagram: string
  website: string
  hidden: boolean
}

type SheetTab = "datos" | "horario" | "estado"
type FilterKey = "all" | "visible" | "hidden" | "nocoords" | "badhours"

const EMPTY: Form = {
  id: null, name: "", neighborhood: "", address: "", coords: "", hours: "", music: "", price: "",
  description: "", image: "", instagram: "", website: "", hidden: true,
}

const toForm = (p: MananeoPlace): Form => ({
  id: p.id,
  name: p.name || "",
  neighborhood: p.neighborhood || "",
  address: p.address || "",
  coords: p.latitude !== null && p.longitude !== null ? `${p.latitude}, ${p.longitude}` : "",
  hours: p.hours || "",
  music: p.music || "",
  price: p.price || "",
  description: p.description || "",
  image: p.image || "",
  instagram: p.instagram || "",
  website: p.website || "",
  hidden: !!p.hidden,
})

// «41.3851, 2.1734» → [41.3851, 2.1734]; vacío → [null, null]; ilegible → null (se avisa al guardar).
function parseCoords(raw: string): [number | null, number | null] | null {
  const v = raw.trim()
  if (!v) return [null, null]
  const m = v.match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return [lat, lng]
}

export default function AdminMananeoPage() {
  const [checking, setChecking] = useState(true)
  // Admin por ciudad (15/11/2026): solo se ven los sitios de la ciudad elegida en el menú. La tabla no tiene ciudad: la ciudad de un
  // sitio sale de sus coordenadas (sin coordenadas, Barcelona).
  const [city] = useAdminCity()
  const cityName = CITIES[city].name
  const [allPlaces, setPlaces] = useState<MananeoPlace[]>([])
  const places = useMemo(() => rowsOfCity(allPlaces, city), [allPlaces, city])
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  // Ficha abierta: «adding» = sitio nuevo; con form.id, uno existente. Se empieza siempre por «Datos».
  const [adding, setAdding] = useState(false)
  const [sheetTab, setSheetTab] = useState<SheetTab>("datos")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterKey>("all")

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("mananeo_places").select("*").order("created_at", { ascending: false })
    if (error) {
      setTableMissing(true)
      return
    }
    setTableMissing(false)
    setPlaces((data || []) as MananeoPlace[])
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!isAdminEmail(data.session?.user.email)) {
        window.location.href = "/"
        return
      }
      await load()
      setChecking(false)
    }
    init()
  }, [load])

  // Al cambiar de ciudad se limpia el formulario (lo que se estaba escribiendo o editando era de la otra ciudad).
  const prevCity = useRef(city)
  useEffect(() => {
    if (prevCity.current === city) return
    prevCity.current = city
    setForm(EMPTY)
    setAdding(false)
  }, [city])

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

  const closeSheet = () => {
    setForm(EMPTY)
    setAdding(false)
  }
  const openNew = () => {
    setForm(EMPTY)
    setSheetTab("datos")
    setAdding(true)
  }
  const openEdit = (p: MananeoPlace) => {
    setForm(toForm(p))
    setSheetTab("datos")
    setAdding(false)
  }

  const save = async () => {
    const name = form.name.trim()
    if (!name) {
      toast("Pon un nombre", 3000)
      return
    }
    const coords = parseCoords(form.coords)
    if (!coords) {
      toast("Las coordenadas se pegan así: 41.3851, 2.1734", 4000)
      return
    }
    // Si el sitio no va a caer en la ciudad que estás viendo, se avisa antes de guardar: si no, desaparecería de la lista.
    const lands = cityOfClub({ latitude: coords[0], longitude: coords[1] })
    if (lands !== city) {
      const why = coords[0] === null ? "porque no tiene coordenadas" : "por sus coordenadas"
      if (!window.confirm(`Estás en ${cityName}, pero este sitio se verá en ${CITIES[lands].name} ${why}.\n\n¿Guardarlo igualmente?`)) return
    }
    const clean = (s: string) => s.trim() || null
    const row = {
      name,
      neighborhood: clean(form.neighborhood),
      address: clean(form.address),
      latitude: coords[0],
      longitude: coords[1],
      hours: clean(form.hours),
      music: clean(form.music),
      price: clean(form.price),
      description: clean(form.description),
      image: clean(form.image),
      instagram: clean(form.instagram),
      website: clean(form.website),
      hidden: form.hidden,
    }
    setSaving(true)
    const { error } = form.id
      ? await supabase.from("mananeo_places").update(row).eq("id", form.id)
      : await supabase.from("mananeo_places").insert(row)
    setSaving(false)
    if (error) {
      toast("No se pudo guardar: " + error.message, 5000)
      return
    }
    toast(form.id ? "Sitio guardado" : "Sitio añadido")
    closeSheet()
    load()
  }

  const toggleHidden = async (p: MananeoPlace) => {
    const { error } = await supabase.from("mananeo_places").update({ hidden: !p.hidden }).eq("id", p.id)
    if (error) {
      toast("No se pudo cambiar: " + error.message, 5000)
      return
    }
    load()
  }

  const remove = async (p: MananeoPlace) => {
    if (!window.confirm(`¿Borrar «${p.name}» del Mañaneo? No se puede deshacer.`)) return
    const { error } = await supabase.from("mananeo_places").delete().eq("id", p.id)
    if (error) {
      toast("No se pudo borrar: " + error.message, 5000)
      return
    }
    if (form.id === p.id) closeSheet()
    load()
  }

  if (checking) {
    return (
      <AdminShell title="Mañaneo">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const sheetOpen = adding || form.id !== null
  const visibleCount = places.filter((p) => !p.hidden).length
  const hiddenCount = places.length - visibleCount
  const noCoords = (p: MananeoPlace) => p.latitude === null || p.longitude === null
  const badHours = (p: MananeoPlace) => !!p.hours && !mananeoHoursState(p.hours)
  const filterTests: Record<FilterKey, (p: MananeoPlace) => boolean> = {
    all: () => true,
    visible: (p) => !p.hidden,
    hidden: (p) => !!p.hidden,
    nocoords: noCoords,
    badhours: badHours,
  }
  const q = search.trim().toLowerCase()
  const shownPlaces = places.filter((p) => filterTests[filter](p) && (!q || [p.name, p.neighborhood, p.address, p.music].filter(Boolean).join(" ").toLowerCase().includes(q)))
  const editingPlace = form.id !== null ? allPlaces.find((p) => p.id === form.id) || null : null

  const renderForm = () => (
    <div>
      <div className="mb-6">
        <SheetTabs<SheetTab>
          label="Apartados de la ficha"
          value={sheetTab}
          onChange={setSheetTab}
          tabs={[
            { value: "datos", label: "Datos" },
            { value: "horario", label: "Horario y enlaces" },
            { value: "estado", label: "Estado" },
          ]}
        />
      </div>

      {sheetTab === "datos" && (
        <FieldGrid>
          <Field wide label="Nombre *">
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} className="ui-input" placeholder="Nombre del sitio" maxLength={120} />
          </Field>
          <Field label="Barrio">
            <input value={form.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} className="ui-input" placeholder="Poble Sec" maxLength={80} />
          </Field>
          <Field label="Dirección">
            <input value={form.address} onChange={(e) => set({ address: e.target.value })} className="ui-input" placeholder="Carrer de ..., 12" maxLength={200} />
          </Field>
          <Field wide label="Coordenadas" hint="Pégalas tal cual desde Google Maps: 41.3851, 2.1734. Sin ellas el sitio no sale en el mapa.">
            <input value={form.coords} onChange={(e) => set({ coords: e.target.value })} className="ui-input" placeholder="41.3851, 2.1734" inputMode="text" />
          </Field>
          <Field label="Música">
            <input value={form.music} onChange={(e) => set({ music: e.target.value })} className="ui-input" placeholder="Techno, house…" maxLength={80} />
          </Field>
          <Field label="Precio / entrada">
            <input value={form.price} onChange={(e) => set({ price: e.target.value })} className="ui-input" placeholder="Gratis, 10 €…" maxLength={60} />
          </Field>
          <Field wide label="Descripción">
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={5}
              maxLength={500}
              className="ui-input resize-y"
              placeholder="Qué es, a qué hora se pone bien, qué esperar…"
            />
          </Field>
        </FieldGrid>
      )}

      {sheetTab === "horario" && (
        <div className="space-y-7">
          <FormSection title="Horario" hint="Con este formato la web dice si está abierto ahora.">
            <Field label="Horario" hint="Varias franjas separadas por coma. Días: L M X J V S D (S/D = sábado y domingo). Ejemplos: 06:00-14:00 · S/D 06:00-14:00.">
              <input value={form.hours} onChange={(e) => set({ hours: e.target.value })} className="ui-input" placeholder="06:00-14:00  ·  S/D 06:00-14:00" maxLength={120} />
            </Field>
            {form.hours.trim() && !mananeoHoursState(form.hours) && (
              <p className="mt-3 rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-xs text-warn">Este horario no tiene un formato válido: se enseña como texto, pero no dirá si está abierto ahora.</p>
            )}
          </FormSection>
          <FormSection title="Foto y enlaces">
            <FieldGrid>
              <Field wide label="Foto (enlace)">
                <div className="flex items-center gap-3">
                  {form.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.image} alt="Vista previa" className="h-14 w-14 shrink-0 rounded-xl border border-white/15 object-cover" />
                  ) : null}
                  <input value={form.image} onChange={(e) => set({ image: e.target.value })} className="ui-input" placeholder="https://…" inputMode="url" />
                </div>
              </Field>
              <Field label="Instagram">
                <input value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} className="ui-input" placeholder="@usuario" maxLength={120} />
              </Field>
              <Field label="Web">
                <input value={form.website} onChange={(e) => set({ website: e.target.value })} className="ui-input" placeholder="https://…" inputMode="url" />
              </Field>
            </FieldGrid>
          </FormSection>
        </div>
      )}

      {sheetTab === "estado" && (
        <div className="space-y-3">
          <SwitchRow
            tone="green"
            checked={!form.hidden}
            onChange={(v) => set({ hidden: !v })}
            title="Visible para los visitantes"
            hint={
              form.hidden
                ? "Ahora está oculto: los visitantes no lo ven aunque el apartado esté abierto."
                : MANANEO_HIDDEN
                ? "Se verá cuando abras el apartado Mañaneo (ahora solo lo ves tú)."
                : "Sale en el apartado Mañaneo de Eventos."
            }
          />
          <p className="pt-1 text-xs text-zinc-400">Se guarda con el botón «{form.id ? "Guardar cambios" : "Añadir sitio"}». Los sitios nuevos nacen ocultos.</p>
        </div>
      )}
    </div>
  )

  const sheet = sheetOpen ? (
    <EditSheet
      title={form.id ? `Editando: ${form.name || editingPlace?.name || ""}` : "Nuevo sitio de Mañaneo"}
      subtitle={form.id ? [form.neighborhood, form.hours].filter(Boolean).join(" · ") : `Se creará en ${cityName}`}
      onClose={closeSheet}
      footer={
        form.id ? (
          <>
            <button type="button" onClick={() => editingPlace && void remove(editingPlace)} className={BTN_DANGER}>
              <Trash2 size={15} aria-hidden="true" /> <span className="hidden sm:inline">Borrar</span><span className="sr-only sm:hidden">Borrar sitio</span>
            </button>
            <button type="button" onClick={closeSheet} className={`${BTN_GHOST} ml-auto`}>Cancelar</button>
            <button type="button" onClick={save} disabled={saving || tableMissing} aria-busy={saving} className={BTN_PRIMARY}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={closeSheet} className={BTN_GHOST}>Cancelar</button>
            <button type="button" onClick={save} disabled={saving || tableMissing} aria-busy={saving} className={`${BTN_PRIMARY} ml-auto`}>
              {saving ? "Guardando…" : "Añadir sitio"}
            </button>
          </>
        )
      }
    >
      {renderForm()}
    </EditSheet>
  ) : null

  const chips: { key: FilterKey; label: string; n: number }[] = [
    { key: "all", label: "Todos", n: places.length },
    { key: "visible", label: "Visibles", n: visibleCount },
    { key: "hidden", label: "Ocultos", n: hiddenCount },
    { key: "nocoords", label: "Sin coordenadas", n: places.filter(noCoords).length },
    { key: "badhours", label: "Horario sin formato", n: places.filter(badHours).length },
  ]

  const list = (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchBox value={search} onChange={setSearch} placeholder="Buscar sitios…" label="Buscar sitios de Mañaneo por nombre, barrio o música" className="min-w-0 flex-1" />
        <button type="button" onClick={openNew} className={`${BTN_PRIMARY} shrink-0`}>
          <Plus size={17} aria-hidden="true" /> Añadir sitio
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <FilterChip key={c.key} active={filter === c.key} onClick={() => setFilter(c.key)} count={c.n}>
            {c.label}
          </FilterChip>
        ))}
      </div>

      {places.length === 0 ? (
        <div className="ui-card px-6 py-14 text-center">
          <p className="text-sm font-bold text-white">Todavía no hay sitios en {cityName}</p>
          <p className="mt-1 text-xs text-zinc-300/80">Añade el primero con el botón de arriba.</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-2.5">
            {shownPlaces.map((p) => {
              const open = form.id === p.id
              const st = mananeoHoursState(p.hours)
              return (
                <li key={p.id}>
                  <div className={`ui-item ${open ? "ui-item-on" : ""} ${p.hidden && !open ? "ui-item-dim" : ""}`}>
                    <button type="button" onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <Thumb src={p.image} name={p.name} fallback={<Sunrise size={20} aria-hidden="true" />} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-extrabold text-white">{p.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-300/80">{[p.neighborhood, p.hours, p.music].filter(Boolean).join(" · ") || "Sin datos todavía"}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                          {p.hours && !st && <Tag tone="amber">Horario sin formato</Tag>}
                          {noCoords(p) && <Tag tone="red">Sin coordenadas</Tag>}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!p.hidden}
                      aria-label={`${p.name}: ${p.hidden ? "oculto, pulsa para mostrarlo" : "visible, pulsa para ocultarlo"}`}
                      onClick={() => void toggleHidden(p)}
                      className="flex shrink-0 flex-col items-center gap-1.5 rounded-lg px-1.5 py-1"
                    >
                      <span className="ui-switch" data-on={!p.hidden} data-tone="green" aria-hidden="true" />
                      <span className={`text-[11px] font-bold ${p.hidden ? "text-zinc-400" : "text-open"}`}>{p.hidden ? "Oculto" : "Visible"}</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          {shownPlaces.length === 0 && (
            <div className="ui-card px-6 py-14 text-center">
              <p className="text-sm font-bold text-white">No hay sitios con este filtro</p>
              <button type="button" onClick={() => { setSearch(""); setFilter("all") }} className="ui-btn ui-btn-sm ui-btn-secondary mt-4">Quitar búsqueda y filtro</button>
            </div>
          )}
        </>
      )}
    </div>
  )

  const statCards: { label: string; value: number; accent: "violet" | "cyan" | "coral" | "pink"; icon: LucideIcon; key: FilterKey }[] = [
    { label: "Total", value: places.length, accent: "violet", icon: Sunrise, key: "all" },
    { label: "Visibles", value: visibleCount, accent: "cyan", icon: Eye, key: "visible" },
    { label: "Ocultos", value: hiddenCount, accent: "pink", icon: EyeOff, key: "hidden" },
    { label: "Sin coordenadas", value: places.filter(noCoords).length, accent: "coral", icon: MapPinOff, key: "nocoords" },
  ]

  return (
    <AdminShell
      title="Mañaneo"
      subtitle="Sitios de afterhour para seguir cuando sale el sol. Salen en un apartado dentro de Eventos. Los sitios nuevos nacen ocultos."
    >
      <>
        {tableMissing && (
          <p className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
            Falta ejecutar supabase/80_mananeo.sql en Supabase.
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {statCards.map((st) => (
            <StatTile key={st.label} accent={st.accent} icon={st.icon} label={st.label} value={st.value} active={filter === st.key && !q} onClick={() => setFilter(st.key)} />
          ))}
        </div>

        <div className="ui-card mb-6 flex items-start gap-3 px-5 py-4 text-sm text-zinc-200">
          <ClockAlert size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-brand-soft" />
          <p className="min-w-0 flex-1">
            {MANANEO_HIDDEN ? (
              <>
                <span className="font-extrabold text-white">Apartado cerrado para los visitantes.</span> Solo lo ves tú, al final de Eventos. Para abrirlo, pon{" "}
                <code className="rounded bg-night/70 px-1.5 py-0.5 text-xs">MANANEO_HIDDEN = false</code> en{" "}
                <code className="rounded bg-night/70 px-1.5 py-0.5 text-xs">src/lib/featureFlags.ts</code> y deja visibles los sitios que quieras.
              </>
            ) : (
              <>
                <span className="font-extrabold text-white">Apartado abierto.</span> Los visitantes ven los {visibleCount} sitios que no están ocultos.
              </>
            )}
          </p>
        </div>

        <SplitView list={list} sheet={sheet} />
      </>
    </AdminShell>
  )
}
