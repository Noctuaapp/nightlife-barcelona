"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AdminShell from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL, isAdminEmail } from "../../../lib/admin"
import { createSlug } from "../../../lib/slug"

// Registro de cambios (25/10/2026): quién cambió qué ficha, cuándo y de qué valor a cuál. Ahora
// que los dueños editan su propia ficha, es la forma de controlar lo que pasa en la web (y de
// recuperar un texto o una foto si alguien la estropea). Datos: supabase/34_registro_cambios_y_estado.sql.

type Entry = {
  id: number
  at: string
  table_name: string
  row_id: string | null
  row_name: string | null
  action: "crear" | "cambiar" | "borrar"
  user_id: string | null
  user_email: string | null
  changes: Record<string, unknown> | null
}

const TABLES: Record<string, string> = {
  clubs: "Club",
  events: "Evento",
  club_events: "Noche de club",
  club_sessions: "Sesión semanal",
  event_sessions: "Día de festival",
  essentials: "Esencial",
  tickets: "Entrada",
  noctua_picks: "Top 3",
}

const FIELDS: Record<string, string> = {
  name: "Nombre", title: "Título", description: "Descripción", music: "Música", price: "Precio", hours: "Horario",
  image: "Foto de portada", gallery: "Galería", address: "Dirección", neighborhood: "Barrio", city: "Ciudad",
  latitude: "Latitud", longitude: "Longitud", hidden: "Oculto", verified: "Verificado", trending: "Tendencia",
  owner_user_id: "Dueño", venue_type: "Tipo de local", open_days: "Días de apertura", night_buses: "Líneas Nitbus",
  metro_lines: "Metro", dresscode: "Vestimenta", dress_code: "Vestimenta", age_min: "Edad mínima", date: "Fecha",
  start_time: "Hora de inicio", end_time: "Hora de fin", ticket_url: "Enlace de entradas", tickets_url: "Enlace de entradas",
  website: "Web", instagram: "Instagram", terrace: "Terraza", smoking_area: "Zona de fumadores", vip_tables: "Mesas VIP",
  table_booking: "Reserva de mesa", has_foosball: "Billar / futbolín", lgtbi_friendly: "LGTBI+", swinger_friendly: "Swinger",
  sold_out: "Agotado", discount_info: "Descuento", free_entry_info: "Entrada gratis", live_status: "Estado en directo",
  cigarette_machine: "Máquina de tabaco", darts: "Dardos", karaoke: "Karaoke", live_music: "Música en directo",
  dance_floor: "Pista de baile", cloakroom: "Guardarropa", food: "Comida", shisha: "Shisha",
  wheelchair_accessible: "Accesible", sports_tv: "Partidos en TV", hot_shows: "Ambiente hot", tiktok: "TikTok", subcategory: "Subcategoría / líneas", category: "Categoría", day_of_week: "Día",
  rank: "Puesto", note: "Nota", artist: "Artista", featured: "Destacado", price_tiers: "Tarifas", duplicate_of: "Repetido de",
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

function show(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vacío"
  if (v === true) return "sí"
  if (v === false) return "no"
  if (Array.isArray(v)) return v.length === 0 ? "vacío" : `${v.length} elemento${v.length === 1 ? "" : "s"}`
  if (typeof v === "object") return JSON.stringify(v).slice(0, 80)
  const s = String(v)
  if (/^https?:\/\//.test(s)) return "enlace / foto"
  return s.length > 90 ? s.slice(0, 90) + "…" : s
}

function publicHref(e: Entry): string | null {
  if (!e.row_id || e.action === "borrar") return null
  if (e.table_name === "clubs" && e.row_name) return `/clubs/${createSlug(e.row_name)}`
  if (e.table_name === "events" && e.row_name) return `/event/${createSlug(e.row_name)}`
  if (e.table_name === "club_events") return `/club-event/${e.row_id}`
  return null
}

export default function AdminChangesPage() {
  const [checking, setChecking] = useState(true)
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [table, setTable] = useState("all")
  const [who, setWho] = useState<"all" | "admin" | "owners">("all")
  const [q, setQ] = useState("")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!isAdminEmail(data.session?.user.email)) {
        window.location.href = "/"
        return
      }
      setChecking(false)
    })
  }, [])

  useEffect(() => {
    if (checking) return
    supabase
      .from("admin_audit_log")
      .select("*")
      .order("at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (error) setMissing(true)
        setRows((data || []) as Entry[])
        setLoading(false)
      })
  }, [checking])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (table === "all" || r.table_name === table) &&
        (who === "all" || (who === "admin" ? r.user_email === ADMIN_EMAIL : r.user_email !== ADMIN_EMAIL)) &&
        (!needle || (r.row_name || "").toLowerCase().includes(needle) || (r.user_email || "").toLowerCase().includes(needle))
    )
  }, [rows, table, who, q])

  const ownerChanges7d = rows.filter((r) => r.user_email !== ADMIN_EMAIL && Date.now() - new Date(r.at).getTime() < 7 * 86400000).length

  if (checking) {
    return (
      <AdminShell title="Registro de cambios">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`

  return (
    <AdminShell
      title="Registro de cambios"
      subtitle="Quién ha creado, cambiado o borrado cada ficha, cuándo y qué tenía antes. Solo cambios hechos por personas (tú, dueños y organizadores); las tareas automáticas de Google no salen aquí."
    >
      {missing && (
        <p className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm text-warn">
          Falta ejecutar supabase/34_registro_cambios_y_estado.sql en Supabase. El registro empieza a guardarse desde ese momento.
        </p>
      )}

      {ownerChanges7d > 0 && (
        <p className="mb-5 rounded-xl border border-purple-400/30 bg-purple-500/10 p-4 text-sm text-purple-100">
          Dueños y organizadores han hecho <b>{ownerChanges7d}</b> cambio{ownerChanges7d === 1 ? "" : "s"} en los últimos 7 días.
        </p>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button className={chip(who === "all")} onClick={() => setWho("all")}>Todos</button>
        <button className={chip(who === "admin")} onClick={() => setWho("admin")}>Solo yo</button>
        <button className={chip(who === "owners")} onClick={() => setWho("owners")}>Dueños y organizadores</button>
        <select
          value={table}
          onChange={(e) => setTable(e.target.value)}
          className="rounded-full border border-white/10 bg-black/40 px-3.5 py-1.5 text-xs font-bold text-white"
        >
          <option value="all">Todo tipo de ficha</option>
          {Object.entries(TABLES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ficha o persona"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-sm text-white outline-none sm:max-w-xs"
        />
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-zinc-400">
          {rows.length === 0 ? "Todavía no hay cambios registrados." : "Nada con estos filtros."}
        </p>
      ) : (
        <ol className="space-y-3">
          {filtered.map((e) => {
            const href = publicHref(e)
            const isAdmin = e.user_email === ADMIN_EMAIL
            const fields =
              e.action === "cambiar" && e.changes
                ? Object.entries(e.changes as Record<string, { antes: unknown; despues: unknown }>)
                : []
            return (
              <li key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        e.action === "borrar" ? "bg-red-500/15 text-red-300" : e.action === "crear" ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-200"
                      }`}
                    >
                      {e.action === "crear" ? "Creado" : e.action === "borrar" ? "Borrado" : "Cambiado"}
                    </span>
                    <span className="text-zinc-400">{TABLES[e.table_name] || e.table_name}</span>{" "}
                    {href ? (
                      <Link href={href} target="_blank" className="font-bold text-white underline-offset-2 hover:underline">
                        {e.row_name || `#${e.row_id}`}
                      </Link>
                    ) : (
                      <b className="text-white">{e.row_name || `#${e.row_id}`}</b>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">{fmt(e.at)}</p>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Por{" "}
                  {isAdmin ? (
                    <span className="font-semibold text-zinc-200">ti (admin)</span>
                  ) : e.user_id ? (
                    <Link href={`/admin/actividad?user=${e.user_id}`} className="font-semibold text-purple-200 underline-offset-2 hover:underline">
                      {e.user_email || "usuario"}
                    </Link>
                  ) : (
                    "desconocido"
                  )}
                </p>
                {fields.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-xs">
                    {fields.map(([k, v]) => (
                      <li key={k} className="flex flex-wrap gap-x-2">
                        <span className="font-semibold text-zinc-300">{FIELDS[k] || k}:</span>
                        <span className="text-zinc-500 line-through decoration-zinc-600">{show(v?.antes)}</span>
                        <span className="text-zinc-500">→</span>
                        <span className="text-zinc-100">{show(v?.despues)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {rows.length >= 500 && <p className="mt-4 text-center text-xs text-zinc-500">Se muestran los 500 cambios más recientes.</p>}
    </AdminShell>
  )
}
