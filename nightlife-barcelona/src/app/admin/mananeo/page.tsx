"use client"

import { useCallback, useEffect, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"
import { toast } from "../../../components/ui/Toast"
import { MANANEO_HIDDEN } from "../../../lib/featureFlags"
import { mananeoHoursState, type MananeoPlace } from "../../../lib/mananeo"

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
  const [places, setPlaces] = useState<MananeoPlace[]>([])
  const [form, setForm] = useState<Form>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

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

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))

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
    setForm(EMPTY)
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
    if (form.id === p.id) setForm(EMPTY)
    load()
  }

  if (checking) {
    return (
      <AdminShell title="Mañaneo">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const input = "w-full rounded-xl border border-white/10 bg-night/70 px-3 py-2.5 text-sm text-white outline-none focus:border-brand/60"
  const label = "block text-xs font-semibold text-zinc-400"
  const visibleCount = places.filter((p) => !p.hidden).length

  return (
    <AdminShell
      title="Mañaneo"
      subtitle="Sitios de afterhour para seguir cuando sale el sol. Salen en un apartado dentro de Eventos. Los sitios nuevos nacen ocultos."
    >
      {tableMissing && (
        <p className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          Falta ejecutar supabase/80_mananeo.sql en Supabase.
        </p>
      )}

      <p className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
        {MANANEO_HIDDEN ? (
          <>
            <span className="font-semibold text-white">Apartado cerrado para los visitantes.</span> Solo lo ves tú, al final de Eventos. Para
            abrirlo, pon <code className="rounded bg-night/70 px-1.5 py-0.5 text-xs">MANANEO_HIDDEN = false</code> en
            <code className="ml-1 rounded bg-night/70 px-1.5 py-0.5 text-xs">src/lib/featureFlags.ts</code> y deja visibles los sitios que quieras.
          </>
        ) : (
          <>
            <span className="font-semibold text-white">Apartado abierto.</span> Los visitantes ven los {visibleCount} sitios que no están ocultos.
          </>
        )}
      </p>

      <div className="rounded-card border border-white/10 bg-surface p-5">
        <h2 className="text-base font-black">{form.id ? "Editar sitio" : "Añadir sitio"}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className={label}>
            Nombre *
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} className={`${input} mt-1`} placeholder="Nombre del sitio" maxLength={120} />
          </label>
          <label className={label}>
            Barrio
            <input value={form.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} className={`${input} mt-1`} placeholder="Poble Sec" maxLength={80} />
          </label>
          <label className={label}>
            Dirección
            <input value={form.address} onChange={(e) => set({ address: e.target.value })} className={`${input} mt-1`} placeholder="Carrer de ..., 12" maxLength={200} />
          </label>
          <label className={label}>
            Coordenadas (pégalas desde Google Maps)
            <input value={form.coords} onChange={(e) => set({ coords: e.target.value })} className={`${input} mt-1`} placeholder="41.3851, 2.1734" inputMode="text" />
          </label>
          <label className={label}>
            Horario
            <input value={form.hours} onChange={(e) => set({ hours: e.target.value })} className={`${input} mt-1`} placeholder="06:00-14:00  ·  S/D 06:00-14:00" maxLength={120} />
            <span className="mt-1 block text-[11px] text-zinc-500">
              Varias franjas separadas por coma. Días: L M X J V S D (S/D = sábado y domingo). Con este formato dice si está abierto ahora.
            </span>
          </label>
          <label className={label}>
            Música
            <input value={form.music} onChange={(e) => set({ music: e.target.value })} className={`${input} mt-1`} placeholder="Techno, house…" maxLength={80} />
          </label>
          <label className={label}>
            Precio / entrada
            <input value={form.price} onChange={(e) => set({ price: e.target.value })} className={`${input} mt-1`} placeholder="Gratis, 10 €…" maxLength={60} />
          </label>
          <label className={label}>
            Foto (enlace)
            <input value={form.image} onChange={(e) => set({ image: e.target.value })} className={`${input} mt-1`} placeholder="https://…" inputMode="url" />
          </label>
          <label className={label}>
            Instagram
            <input value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} className={`${input} mt-1`} placeholder="@usuario" maxLength={120} />
          </label>
          <label className={label}>
            Web
            <input value={form.website} onChange={(e) => set({ website: e.target.value })} className={`${input} mt-1`} placeholder="https://…" inputMode="url" />
          </label>
          <label className={`${label} md:col-span-2`}>
            Descripción
            <textarea
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={3}
              maxLength={500}
              className={`${input} mt-1 resize-y`}
              placeholder="Qué es, a qué hora se pone bien, qué esperar…"
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={form.hidden} onChange={(e) => set({ hidden: e.target.checked })} />
          Oculto (no se enseña a los visitantes aunque el apartado esté abierto)
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || tableMissing}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Guardando…" : form.id ? "Guardar cambios" : "Añadir sitio"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(EMPTY)} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-zinc-200 hover:bg-white/5">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-base font-black">Sitios ({places.length})</h2>
      {places.length === 0 ? (
        <p className="text-sm text-zinc-400">Todavía no hay ninguno. Añade el primero arriba.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {places.map((p) => {
            const st = mananeoHoursState(p.hours)
            return (
              <div key={p.id} className="rounded-card border border-white/10 bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{p.name}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-400">{[p.neighborhood, p.hours, p.music].filter(Boolean).join(" · ") || "Sin datos todavía"}</p>
                    <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      <span className={`rounded-full px-2 py-0.5 ${p.hidden ? "bg-white/10 text-zinc-300" : "bg-open/15 text-open"}`}>
                        {p.hidden ? "Oculto" : "Visible"}
                      </span>
                      {p.hours && !st && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-warn">Horario sin formato válido</span>}
                      {(p.latitude === null || p.longitude === null) && <span className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-300">Sin coordenadas</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setForm(toForm(p))
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-white/5"
                    >
                      Editar
                    </button>
                    <button type="button" onClick={() => toggleHidden(p)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-white/5">
                      {p.hidden ? "Mostrar" : "Ocultar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AdminShell>
  )
}
