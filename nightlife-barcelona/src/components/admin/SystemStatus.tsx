"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { fetchAllPages } from "../../lib/fetchAll"

// Estado del sistema y copias de seguridad (25/10/2026, en Ajustes y herramientas).
//
// Lo que cualquier web seria vigila sin tener que entrar en Supabase ni en Google Cloud:
//   - Cuánto ocupa la base de datos y las fotos frente al límite del plan gratuito de Supabase
//     (500 MB de base de datos y 1 GB de archivos): si se llena, la web deja de guardar cosas.
//   - Cuántas llamadas de pago a Google se han hecho cada día (tope diario: 20, ver
//     lib/googlePlacesBudget.ts) — para que no vuelva a pasar un gasto inesperado.
//   - Si las tareas automáticas de cada noche se están ejecutando de verdad.
// Datos: admin_system_status() en supabase/34_registro_cambios_y_estado.sql.

type Status = {
  db_mb?: number
  storage?: { bucket: string; files: number; mb: number }[]
  google_calls?: { day: string; calls: number }[]
  last_google_clubs?: string | null
  last_google_events?: string | null
  last_google_essentials?: string | null
  users?: number
  users_7d?: number
  clubs_visible?: number
  clubs_hidden?: number
  clubs_owned?: number
  audit_7d?: number
  analytics_rows?: number
  analytics_oldest?: string | null
}

const DB_LIMIT_MB = 500
const STORAGE_LIMIT_MB = 1024
const GOOGLE_DAILY_LIMIT = 20

const ago = (iso?: string | null) => {
  if (!iso) return null
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 1) return "hace menos de 1 h"
  if (h < 48) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} días`
}

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const tone = pct >= 85 ? "bg-red-400" : pct >= 60 ? "bg-amber-400" : "bg-emerald-400"
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-zinc-200">{label}</span>
        <span className="tabular-nums text-zinc-400">
          {used.toLocaleString("es-ES")} / {limit.toLocaleString("es-ES")} {unit} · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
    </div>
  )
}

const BUCKET_LABELS: Record<string, string> = {
  "club-photos": "Fotos de clubs (Google y galería)",
  "club-images": "Portadas de clubs subidas a mano",
  "event-photos": "Fotos de eventos (Google)",
  "event-images": "Portadas de eventos subidas a mano",
  "essential-photos": "Fotos de esenciales (Google)",
  avatars: "Fotos de perfil",
}

// «Liberar espacio» (26/10/2026): borra las fotos que ya no usa ninguna ficha (copias que dejaban
// las tareas de cada noche al volver a descargar fotos de Google). Primero enseña cuánto se libera.
function StorageCleaner() {
  const [preview, setPreview] = useState<{ count: number; mb: number } | null>(null)
  const [state, setState] = useState<"idle" | "loading" | "cleaning" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")

  const call = async (method: "GET" | "POST") => {
    const { data } = await supabase.auth.getSession()
    const res = await fetch("/api/admin/clean-storage", { method, headers: { Authorization: `Bearer ${data.session?.access_token || ""}` } })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || String(res.status))
    return json
  }

  const check = async () => {
    setState("loading")
    try {
      const j = await call("GET")
      const buckets = (j.buckets || []) as { count: number; mb: number }[]
      setPreview({ count: buckets.reduce((a, b) => a + b.count, 0), mb: Math.round(buckets.reduce((a, b) => a + Number(b.mb), 0)) })
      setState("idle")
    } catch (e) {
      setMsg((e as Error).message.includes("admin_storage_orphans") ? "Falta ejecutar supabase/47_fotos_sin_usar.sql" : (e as Error).message)
      setState("error")
    }
  }

  const clean = async () => {
    setState("cleaning")
    try {
      const j = await call("POST")
      setMsg(`Borradas ${j.deleted} fotos sin usar${j.remaining ? ` (quedan ${j.remaining}: vuelve a pulsar)` : ""}. El total de arriba se actualiza al recargar.`)
      setPreview(null)
      setState("done")
    } catch (e) {
      setMsg((e as Error).message)
      setState("error")
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs">
      {preview ? (
        preview.count === 0 ? (
          <p className="text-emerald-300">No hay fotos sin usar. Todo lo que ocupa espacio se está usando.</p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-zinc-300">
              {preview.count.toLocaleString("es-ES")} fotos sin usar · <b className="text-ink">{preview.mb} MB</b> que se pueden liberar
            </span>
            <button
              type="button"
              onClick={clean}
              disabled={state === "cleaning"}
              className="rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-black disabled:opacity-50"
            >
              {state === "cleaning" ? "Borrando…" : "Liberar espacio"}
            </button>
          </div>
        )
      ) : (
        <button type="button" onClick={check} disabled={state === "loading"} className="font-bold text-zinc-200 underline-offset-4 hover:underline disabled:opacity-50">
          {state === "loading" ? "Buscando fotos sin usar…" : "Buscar fotos sin usar"}
        </button>
      )}
      {msg && <p className={`mt-2 ${state === "error" ? "text-amber-300" : "text-emerald-300"}`}>{msg}</p>}
    </div>
  )
}

export function SystemStatus() {
  const [s, setS] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc("admin_system_status").then(({ data, error }) => {
      if (error) setError(error.message)
      else setS(data as Status)
    })
  }, [])

  if (error) {
    return (
      <div className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 p-5 text-sm text-warn">
        Estado del sistema no disponible: ejecuta supabase/34_registro_cambios_y_estado.sql en Supabase.
      </div>
    )
  }
  if (!s) return <div className="mb-6 h-40 animate-pulse rounded-2xl bg-white/[0.03]" />

  const storageMb = (s.storage || []).reduce((a, b) => a + Number(b.mb || 0), 0)
  const calls = s.google_calls || []
  const today = new Date().toISOString().slice(0, 10)
  const callsToday = calls.find((c) => c.day === today)?.calls || 0
  const maxCalls = Math.max(GOOGLE_DAILY_LIMIT, ...calls.map((c) => c.calls))

  const jobs = [
    { label: "Datos de Google · clubs", at: s.last_google_clubs },
    { label: "Datos de Google · eventos", at: s.last_google_events },
    { label: "Datos de Google · esenciales", at: s.last_google_essentials },
  ]

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-base font-black">Estado del sistema</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <Meter label="Base de datos" used={Number(s.db_mb || 0)} limit={DB_LIMIT_MB} unit="MB" />
          <Meter label="Fotos y archivos" used={Math.round(storageMb)} limit={STORAGE_LIMIT_MB} unit="MB" />
          {(s.storage || []).length > 0 && (
            <ul className="space-y-1 text-xs text-zinc-400">
              {(s.storage || []).slice(0, 6).map((b) => (
                <li key={b.bucket} className="flex justify-between gap-2">
                  <span className="truncate">{BUCKET_LABELS[b.bucket] || b.bucket}</span>
                  <span className="shrink-0 tabular-nums">{Number(b.mb).toLocaleString("es-ES")} MB · {b.files.toLocaleString("es-ES")} fotos</span>
                </li>
              ))}
            </ul>
          )}
          <StorageCleaner />
          <p className="text-xs text-zinc-500">Límites del plan gratuito de Supabase. Por encima del 85 %, toca limpiar o pasar a un plan de pago.</p>
        </div>

        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-zinc-200">Llamadas de pago a Google</span>
            <span className="tabular-nums text-zinc-400">hoy {callsToday} / {GOOGLE_DAILY_LIMIT}</span>
          </div>
          <div className="mt-3 flex h-16 items-end gap-1" aria-label="Llamadas a Google por día, últimos 14 días">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10)
              const n = calls.find((c) => c.day === d)?.calls || 0
              return (
                <div
                  key={d}
                  title={`${d}: ${n}`}
                  className={`flex-1 rounded-t ${n >= GOOGLE_DAILY_LIMIT ? "bg-amber-400" : "bg-purple-400/70"}`}
                  style={{ height: `${Math.max(4, (n / maxCalls) * 100)}%`, opacity: n ? 1 : 0.25 }}
                />
              )
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Últimos 14 días. En amarillo, los días que se llegó al tope.</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-zinc-200">Tareas automáticas (cada noche)</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {jobs.map((j) => {
              const hours = j.at ? (Date.now() - new Date(j.at).getTime()) / 3600000 : Infinity
              const ok = hours < 36
              return (
                <li key={j.label} className="flex items-center justify-between gap-2">
                  <span className="text-zinc-300">{j.label}</span>
                  <span className={`text-xs font-semibold ${ok ? "text-emerald-300" : "text-amber-300"}`}>
                    {j.at ? ago(j.at) : "nunca"}
                    {!ok && " ⚠"}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Si alguna lleva más de un día y medio sin actualizar nada, revisa los Cron Jobs en Vercel.</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-zinc-500">Usuarios</dt>
          <dd className="font-bold tabular-nums">{s.users ?? "—"} <span className="text-xs font-normal text-zinc-500">(+{s.users_7d ?? 0} esta semana)</span></dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Clubs publicados / ocultos</dt>
          <dd className="font-bold tabular-nums">{s.clubs_visible ?? "—"} / {s.clubs_hidden ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Clubs con dueño vinculado</dt>
          <dd className="font-bold tabular-nums">{s.clubs_owned ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Registros de analítica</dt>
          <dd className="font-bold tabular-nums">{(s.analytics_rows ?? 0).toLocaleString("es-ES")}</dd>
        </div>
      </dl>
    </div>
  )
}

// Copias de seguridad en CSV (se abren con Excel / Google Sheets). Supabase gratis no guarda
// copias automáticas que puedas descargar: con esto tienes los datos de la web en tu ordenador.
const EXPORTS: { key: string; label: string; table?: string; users?: boolean }[] = [
  { key: "clubs", label: "Clubs", table: "clubs" },
  { key: "events", label: "Eventos y festivales", table: "events" },
  { key: "club_events", label: "Noches de club", table: "club_events" },
  { key: "essentials", label: "Esenciales", table: "essentials" },
  { key: "users", label: "Usuarios", users: true },
]

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ""
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set }, new Set<string>()))
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return ""
    const s = typeof v === "object" ? JSON.stringify(v) : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n")
}

export function DataExport() {
  const [busy, setBusy] = useState<string | null>(null)

  const download = async (e: (typeof EXPORTS)[number]) => {
    setBusy(e.key)
    try {
      let rows: Record<string, unknown>[] = []
      if (e.users) {
        const { data } = await supabase.rpc("admin_list_users")
        rows = ((data || []) as Record<string, unknown>[]).map((u) => ({
          id: u.id, email: u.email, username: u.username, country: u.country, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
        }))
      } else if (e.table) {
        rows = await fetchAllPages((from, to) => supabase.from(e.table!).select("*").order("id").range(from, to))
      }
      const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `noctua_${e.key}_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-base font-black">Copia de seguridad</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Descarga los datos en CSV (se abren con Excel o Google Sheets). Conviene hacerlo una vez al mes y guardarlo fuera de Supabase.
        El de usuarios lleva emails: guárdalo en un sitio privado.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXPORTS.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => download(e)}
            disabled={busy !== null}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {busy === e.key ? "Preparando…" : `⬇ ${e.label}`}
          </button>
        ))}
      </div>
    </div>
  )
}
