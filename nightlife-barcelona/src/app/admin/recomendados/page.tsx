"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"
import { touchCache } from "../../../lib/touchCache"
import { nightDate, weekRange, type PickPeriod } from "../../../lib/picks"
import { toast } from "../../../components/ui/Toast"
import { selectAllPages } from "../../../lib/fetchAll"
import { useAdminCity } from "../../../components/admin/AdminCity"
import { rowsOfCity } from "../../../lib/adminCity"

// Top 3 de Noctua (25/10/2026): "un top 3 de clubs recomendados por Noctua, por noche o semana,
// que solo aparezca cuando pongamos alguno". Lo que se guarda aquí sale en la portada mientras
// dure esa noche o esa semana; si no hay nada puesto, la portada no enseña el bloque.

type Place = { city: string | null; latitude: number | null; longitude: number | null }
type ClubOption = { id: number; name: string; neighborhood: string | null } & Place
type Slot = { text: string; note: string }
type Saved = { id: number; rank: number; period: PickPeriod; starts_on: string; ends_on: string; note: string | null; club: ({ name: string } & Place) | null }

const EMPTY_SLOTS: Slot[] = [{ text: "", note: "" }, { text: "", note: "" }, { text: "", note: "" }]

const optionLabel = (c: ClubOption) => (c.neighborhood ? `${c.name} · ${c.neighborhood}` : c.name)
const fmtDay = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })

function rangeFor(period: PickPeriod, date: string): { start: string; end: string } {
  return period === "night" ? { start: date, end: date } : weekRange(date)
}

export default function AdminPicksPage() {
  const [checking, setChecking] = useState(true)
  // Admin por ciudad (15/11/2026): cada ciudad tiene su propio Top 3 (la ciudad de un recomendado es la de su club). Solo se pueden
  // elegir locales de la ciudad que estás viendo, y guardar o quitar un Top 3 no toca el de la otra ciudad.
  const [city] = useAdminCity()
  const [allClubs, setClubs] = useState<ClubOption[]>([])
  const clubs = useMemo(() => rowsOfCity(allClubs, city), [allClubs, city])
  const [period, setPeriod] = useState<PickPeriod>("night")
  const [date, setDate] = useState(nightDate())
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS)
  const [allSaved, setAllSaved] = useState<Saved[]>([])
  // Solo los Top 3 de la ciudad elegida (una fila sin club se queda en Barcelona).
  const saved = useMemo(
    () => allSaved.filter((s) => (s.club ? rowsOfCity([s.club], city).length > 0 : city === "barcelona")),
    [allSaved, city]
  )
  const [saving, setSaving] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)

  const range = rangeFor(period, date)
  const byLabel = useMemo(() => new Map(clubs.map((c) => [optionLabel(c).toLowerCase(), c])), [clubs])
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs])

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (!isAdminEmail(data.session?.user.email)) {
        window.location.href = "/"
        return
      }
      const res = await selectAllPages((from, to) =>
        supabase.from("clubs").select("id, name, neighborhood, city, latitude, longitude").eq("hidden", false).order("name").order("id").range(from, to)
      )
      setClubs((res.data || []) as unknown as ClubOption[])
      setChecking(false)
    }
    init()
  }, [])

  const loadSaved = useCallback(async () => {
    const { data, error } = await supabase
      .from("noctua_picks")
      .select("id, rank, period, starts_on, ends_on, note, club:clubs(name, city, latitude, longitude)")
      .gte("ends_on", nightDate())
      .order("starts_on")
      .order("period")
      .order("rank")
    if (error) {
      setTableMissing(true)
      return
    }
    setAllSaved((data || []) as unknown as Saved[])
  }, [])

  useEffect(() => {
    if (!checking) loadSaved()
  }, [checking, loadSaved])

  // Al cambiar de noche/semana, se rellenan los huecos con lo que ya hubiera guardado para ella.
  useEffect(() => {
    if (checking) return
    const load = async () => {
      const { data } = await supabase
        .from("noctua_picks")
        .select("rank, note, club_id")
        .eq("period", period)
        .eq("starts_on", range.start)
        .order("rank")
      const next = EMPTY_SLOTS.map((s) => ({ ...s }))
      for (const r of (data || []) as { rank: number; note: string | null; club_id: number }[]) {
        const c = byId.get(r.club_id)
        if (c && r.rank >= 1 && r.rank <= 3) next[r.rank - 1] = { text: optionLabel(c), note: r.note || "" }
      }
      setSlots(next)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, period, range.start, byId])

  const setSlot = (i: number, patch: Partial<Slot>) => setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const save = async () => {
    const rows: { club_id: number; rank: number; note: string | null }[] = []
    for (let i = 0; i < 3; i++) {
      const text = slots[i].text.trim()
      if (!text) continue
      const club = byLabel.get(text.toLowerCase()) || clubs.find((c) => c.name.toLowerCase() === text.toLowerCase())
      if (!club) {
        toast(`No encuentro el club del puesto ${i + 1}: elige uno de la lista`, 4000)
        return
      }
      rows.push({ club_id: club.id, rank: i + 1, note: slots[i].note.trim() || null })
    }
    setSaving(true)
    // Se borra solo lo que ya había de ESTA ciudad para esa noche o semana (el Top 3 de la otra ciudad se queda como está).
    const { data: existing, error: findErr } = await supabase
      .from("noctua_picks")
      .select("id, club:clubs(city, latitude, longitude)")
      .eq("period", period)
      .eq("starts_on", range.start)
    const oldIds = ((existing || []) as unknown as { id: number; club: Place | null }[])
      .filter((r) => (r.club ? rowsOfCity([r.club], city).length > 0 : city === "barcelona"))
      .map((r) => r.id)
    const { error: delErr } = findErr
      ? { error: findErr }
      : oldIds.length > 0
        ? await supabase.from("noctua_picks").delete().in("id", oldIds)
        : { error: null }
    if (delErr) {
      setSaving(false)
      toast("No se pudo guardar: " + delErr.message, 5000)
      return
    }
    if (rows.length > 0) {
      const { error } = await supabase
        .from("noctua_picks")
        .insert(rows.map((r) => ({ ...r, period, starts_on: range.start, ends_on: range.end })))
      if (error) {
        setSaving(false)
        toast("No se pudo guardar: " + error.message, 5000)
        return
      }
    }
    setSaving(false)
    touchCache(["/"])
    toast(rows.length > 0 ? "Top 3 guardado" : "Top 3 quitado")
    loadSaved()
  }

  const removeGroup = async (g: { period: PickPeriod; starts_on: string; items: Saved[] }) => {
    // Por id: solo los puestos de este Top 3 (los de la otra ciudad, para la misma noche, no se tocan).
    const { error } = await supabase.from("noctua_picks").delete().in("id", g.items.map((i) => i.id))
    if (error) {
      toast("No se pudo borrar: " + error.message, 5000)
      return
    }
    touchCache(["/"])
    if (g.period === period && g.starts_on === range.start) setSlots(EMPTY_SLOTS.map((s) => ({ ...s })))
    loadSaved()
  }

  const groups = useMemo(() => {
    const map = new Map<string, { period: PickPeriod; starts_on: string; ends_on: string; items: Saved[] }>()
    for (const s of saved) {
      const key = `${s.period}|${s.starts_on}`
      if (!map.has(key)) map.set(key, { period: s.period, starts_on: s.starts_on, ends_on: s.ends_on, items: [] })
      map.get(key)!.items.push(s)
    }
    return Array.from(map.values())
  }, [saved])

  const today = nightDate()
  const isLive = (g: { starts_on: string; ends_on: string }) => g.starts_on <= today && g.ends_on >= today

  if (checking) {
    return (
      <AdminShell title="Top 3 de Noctua">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const input = "w-full rounded-xl border border-white/10 bg-night/70 px-3 py-2.5 text-sm text-white outline-none focus:border-brand/60"

  return (
    <AdminShell
      title="Top 3 de Noctua"
      subtitle="Hasta tres clubs recomendados por vosotros para una noche o una semana. Sale en la portada mientras dure; si no ponéis ninguno, no sale nada. Si hay de la noche y de la semana a la vez, gana el de la noche."
    >
      {tableMissing && (
        <p className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          Falta ejecutar supabase/33_top3_recomendados.sql en Supabase.
        </p>
      )}

      <div className="rounded-card border border-white/10 bg-surface p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-xl border border-white/10 p-1">
            {(["night", "week"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${period === p ? "bg-brand/25 text-white ring-1 ring-inset ring-brand/50" : "text-zinc-300 hover:bg-white/5"}`}
              >
                {p === "night" ? "Una noche" : "Una semana"}
              </button>
            ))}
          </div>
          <label className="text-sm text-zinc-400">
            <span className="mb-1 block text-xs">{period === "night" ? "Noche" : "Cualquier día de la semana"}</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={input} />
          </label>
          <p className="pb-2.5 text-sm font-semibold text-purple-200">
            {period === "night" ? `Noche del ${fmtDay(range.start)}` : `Del ${fmtDay(range.start)} al ${fmtDay(range.end)}`}
          </p>
        </div>

        <datalist id="picks-clubs">
          {clubs.map((c) => (
            <option key={c.id} value={optionLabel(c)} />
          ))}
        </datalist>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {slots.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-night/50 p-4">
              <p className="font-display text-3xl leading-none text-white">{i + 1}</p>
              <input
                list="picks-clubs"
                value={s.text}
                onChange={(e) => setSlot(i, { text: e.target.value })}
                placeholder="Escribe y elige un club"
                className={`${input} mt-3`}
              />
              <input
                value={s.note}
                onChange={(e) => setSlot(i, { note: e.target.value })}
                placeholder="Por qué (opcional): «Fiesta de Halloween»"
                maxLength={120}
                className={`${input} mt-2`}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar top 3"}
          </button>
          <p className="text-xs text-zinc-500">Deja un puesto vacío si no quieres ponerlo. Guardar con los tres vacíos lo quita.</p>
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-base font-black">Programados</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-zinc-400">No hay ningún top 3 puesto para hoy ni para más adelante.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <div key={`${g.period}|${g.starts_on}`} className="rounded-card border border-white/10 bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    {g.period === "night" ? `Noche del ${fmtDay(g.starts_on)}` : `Semana del ${fmtDay(g.starts_on)} al ${fmtDay(g.ends_on)}`}
                  </p>
                  {isLive(g) && <p className="mt-0.5 text-xs font-semibold text-open">En la portada ahora</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod(g.period)
                      setDate(g.starts_on)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-white/5"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeGroup(g)}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/10"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <ol className="mt-3 space-y-1 text-sm text-zinc-300">
                {g.items.map((it) => (
                  <li key={it.id}>
                    <span className="font-bold text-white">{it.rank}.</span> {it.club?.name || "Club borrado"}
                    {it.note ? <span className="text-zinc-500"> — {it.note}</span> : null}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
