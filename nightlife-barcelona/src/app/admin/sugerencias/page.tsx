"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, X } from "lucide-react"
import AdminShell, { invalidateAdminBadges } from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { ADMIN_EMAIL } from "../../../lib/admin"
import { logError } from "../../../lib/log"
import { toast } from "../../../components/ui/Toast"
import { essentialSlugLabelEs } from "../../../lib/essentialCategories"
import { ESSENTIAL_SUGGESTION_XP } from "../../../lib/xp"

// Sugerencias de esenciales (31/10/2026): lo que propone la gente desde Esenciales › «¿Nos faltan
// esenciales?». Lo compruebas en Google Maps y decides: aprobar dando XP, aprobar sin XP o rechazar
// (a la persona le llega una notificación en cualquiera de los tres casos). Aprobar NO crea el
// esencial en el mapa: lo añades tú después en Admin › Esenciales. Datos y XP: supabase/62.

type Row = {
  id: number
  user_id: string
  category: string
  name: string
  street: string
  street_number: string | null
  note: string | null
  status: "pending" | "approved" | "rejected"
  xp_awarded: number
  admin_note: string | null
  created_at: string
  reviewed_at: string | null
}

const CATEGORY_ES: Record<string, string> = {
  Pharmacy: essentialSlugLabelEs("pharmacy"),
  ATM: essentialSlugLabelEs("atm"),
  Food: essentialSlugLabelEs("food"),
  Supermarket: essentialSlugLabelEs("supermarket"),
  Hospital: essentialSlugLabelEs("hospital"),
  "Gas Station": essentialSlugLabelEs("gas-station"),
  Other: "Otro",
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const address = (r: Row) => `${r.street}${r.street_number ? ` ${r.street_number}` : ""}`
const mapsUrl = (r: Row) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${address(r)} Barcelona`)}`

export default function AdminSugerenciasPage() {
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [people, setPeople] = useState<Record<string, { email: string | null; username: string | null }>>({})
  const [tab, setTab] = useState<"pending" | "done">("pending")
  const [busy, setBusy] = useState<number | null>(null)
  const [notes, setNotes] = useState<Record<number, string>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || data.session?.user.email !== ADMIN_EMAIL) {
        window.location.href = "/login"
        return
      }
      setCheckingAdmin(false)
    })
  }, [])

  const load = useCallback(async () => {
    const [res, users] = await Promise.all([
      supabase.from("essential_suggestions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.rpc("admin_list_users"),
    ])
    if (res.error) {
      logError("SUGERENCIAS LOAD:", res.error)
      setFailed(true)
      setLoaded(true)
      return
    }
    setFailed(false)
    const ppl: Record<string, { email: string | null; username: string | null }> = {}
    for (const u of (users.data || []) as { id: string; email: string | null; username: string | null }[]) ppl[u.id] = { email: u.email, username: u.username }
    setPeople(ppl)
    setRows((res.data || []) as Row[])
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!checkingAdmin) load()
  }, [checkingAdmin, load])

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows])
  const done = useMemo(() => rows.filter((r) => r.status !== "pending"), [rows])
  const shown = tab === "pending" ? pending : done

  const review = async (r: Row, decision: "approve" | "reject", award: boolean) => {
    if (busy) return
    setBusy(r.id)
    const { data, error } = await supabase.rpc("admin_review_essential_suggestion", {
      p_id: r.id,
      p_decision: decision,
      p_award_xp: award,
      p_note: notes[r.id] || null,
    })
    setBusy(null)
    if (error) {
      logError("SUGERENCIA REVIEW:", error)
      toast(error.message.includes("ya_revisada") ? "Esa sugerencia ya estaba revisada" : "No se pudo guardar. ¿Has ejecutado el SQL 62?")
      load()
      return
    }
    const xp = Number((data as { xp?: number } | null)?.xp || 0)
    toast(decision === "reject" ? "Rechazada" : award ? (xp > 0 ? `Aprobada · ${xp} XP dados` : "Aprobada, pero no se pudo dar el XP") : "Aprobada")
    invalidateAdminBadges()
    load()
  }

  const copy = async (r: Row) => {
    const text = `${r.name}\n${CATEGORY_ES[r.category] || r.category}\n${address(r)}, Barcelona`
    try {
      await navigator.clipboard.writeText(text)
      toast("Datos copiados")
    } catch {
      toast("No se pudo copiar")
    }
  }

  if (checkingAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night text-ink">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </main>
    )
  }

  const who = (id: string) => {
    const p = people[id]
    return p ? p.username || p.email || id.slice(0, 8) : id.slice(0, 8)
  }

  return (
    <AdminShell
      title="Sugerencias de esenciales"
      subtitle="Lo que propone la gente desde Esenciales. Compruébalo en Google Maps y decide. Aprobar no lo añade al mapa: hazlo después en Esenciales."
    >
      {!loaded ? (
        <p className="text-sm text-zinc-400">Cargando…</p>
      ) : failed ? (
        <div className="rounded-card border border-warn/40 bg-warn/[0.08] p-5 text-sm text-zinc-200">
          No se han podido cargar. Si todavía no has ejecutado el SQL 62 en Supabase, hazlo y recarga esta página.
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Estado" className="mb-5 flex gap-2">
            {([
              ["pending", `Pendientes (${pending.length})`],
              ["done", `Revisadas (${done.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-brand text-white" : "border border-white/15 text-zinc-200 hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">{tab === "pending" ? "No hay sugerencias pendientes." : "Todavía no has revisado ninguna."}</p>
          ) : (
            <ul className="grid gap-4">
              {shown.map((r) => (
                <li key={r.id} className="rounded-card border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-brand-soft">{CATEGORY_ES[r.category] || r.category}</p>
                      <h3 className="mt-0.5 break-words text-lg font-bold text-white">{r.name}</h3>
                      <p className="mt-0.5 break-words text-sm text-zinc-300">{address(r)}</p>
                    </div>
                    <p className="text-xs text-zinc-400">{stamp(r.created_at)}</p>
                  </div>
                  {r.note && <p className="mt-3 rounded-ctl bg-white/5 p-3 text-sm leading-relaxed text-zinc-200">{r.note}</p>}
                  <p className="mt-3 text-xs text-zinc-400">
                    De{" "}
                    <Link href="/admin/users" className="font-semibold text-zinc-200 underline underline-offset-2">
                      {who(r.user_id)}
                    </Link>
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={mapsUrl(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-zinc-100 transition hover:bg-white/10"
                    >
                      <ExternalLink size={13} aria-hidden="true" /> Buscar en Google Maps
                    </a>
                    <button
                      onClick={() => copy(r)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-zinc-100 transition hover:bg-white/10"
                    >
                      <Copy size={13} aria-hidden="true" /> Copiar datos
                    </button>
                  </div>

                  {r.status === "pending" ? (
                    <div className="mt-4 border-t border-white/10 pt-4">
                      <label htmlFor={`note-${r.id}`} className="mb-1.5 block text-xs font-semibold text-zinc-400">
                        Nota interna (opcional)
                      </label>
                      <input
                        id={`note-${r.id}`}
                        value={notes[r.id] || ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                        maxLength={200}
                        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500/50"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          disabled={busy === r.id}
                          onClick={() => review(r, "approve", true)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2.5 text-xs font-bold text-black transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                          <Check size={14} aria-hidden="true" /> Aprobar y dar {ESSENTIAL_SUGGESTION_XP} XP
                        </button>
                        <button
                          disabled={busy === r.id}
                          onClick={() => review(r, "approve", false)}
                          className="rounded-full border border-emerald-500/40 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-60"
                        >
                          Aprobar sin XP
                        </button>
                        <button
                          disabled={busy === r.id}
                          onClick={() => review(r, "reject", false)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
                        >
                          <X size={14} aria-hidden="true" /> Rechazar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-white/10 pt-4 text-xs text-zinc-300">
                      <span className={`font-bold ${r.status === "approved" ? "text-emerald-300" : "text-red-300"}`}>{r.status === "approved" ? "Aprobada" : "Rechazada"}</span>
                      {r.reviewed_at && ` · ${stamp(r.reviewed_at)}`}
                      {r.xp_awarded > 0 && ` · ${r.xp_awarded} XP dados`}
                      {r.admin_note && ` · ${r.admin_note}`}
                      {r.status === "approved" && (
                        <>
                          {" · "}
                          <Link href="/admin/essentials" className="font-semibold text-brand-soft underline underline-offset-2">
                            Añadirlo en Esenciales
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  )
}
