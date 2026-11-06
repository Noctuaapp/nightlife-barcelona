"use client"

import { useEffect, useState } from "react"
import { BarChart3, ChevronDown } from "lucide-react"
import { Panel, SectionTitle, Tag } from "./ui"
import OwnerStats from "../owner/OwnerStats"
import { supabase } from "../../lib/supabase"
import { toast } from "../ui/Toast"

// Admin › Usuarios › "Estadísticas para dueños" (25/10/2026). Estrategia: las estadísticas se dan
// cuando a Noctua le conviene (buenos números, plan de pago), no automáticamente — si no, un local
// con pocas visitas las usa para regatear. Aquí ves todas las fichas con dueño vinculado, puedes
// mirar sus números (tú los ves completos, también la comparación y los avisos) y decidir a cuál
// se las enseñas en su "Mi club" / "Mis festivales". Ver supabase/37.

type Row = { kind: "club" | "event"; id: number; name: string; enabled: boolean }

export default function OwnerStatsAccess() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [missing, setMissing] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  // Plegado por defecto (06/11/2026): la lista tiene una fila por club y festival con dueño y empujaba la lista de usuarios fuera de la pantalla.
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [c, e] = await Promise.all([
        supabase.from("clubs").select("id, name, owner_stats_enabled").not("owner_user_id", "is", null).order("name"),
        supabase.from("events").select("id, title, owner_stats_enabled").not("owner_user_id", "is", null).order("title"),
      ])
      if (c.error || e.error) {
        setMissing(true)
        setRows([])
        return
      }
      setRows([
        ...((c.data || []) as { id: number; name: string; owner_stats_enabled: boolean }[]).map((r) => ({ kind: "club" as const, id: r.id, name: r.name, enabled: !!r.owner_stats_enabled })),
        ...((e.data || []) as { id: number; title: string; owner_stats_enabled: boolean }[]).map((r) => ({ kind: "event" as const, id: r.id, name: r.title, enabled: !!r.owner_stats_enabled })),
      ])
    }
    load()
  }, [])

  const toggle = async (r: Row) => {
    const key = `${r.kind}-${r.id}`
    setSaving(key)
    const { error } = await supabase.from(r.kind === "club" ? "clubs" : "events").update({ owner_stats_enabled: !r.enabled }).eq("id", r.id)
    setSaving(null)
    if (error) {
      toast("No se pudo cambiar: " + error.message, 5000)
      return
    }
    setRows((prev) => (prev || []).map((x) => (x.kind === r.kind && x.id === r.id ? { ...x, enabled: !r.enabled } : x)))
    toast(!r.enabled ? `${r.name}: el dueño ya ve sus estadísticas` : `${r.name}: estadísticas ocultas para el dueño`)
  }

  if (!rows) return null

  const activeCount = rows.filter((r) => r.enabled).length

  return (
    <Panel accent="cyan" glow={false} pad="p-5" className="mb-8">
      <SectionTitle
        icon={BarChart3}
        accent="cyan"
        right={
          rows.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center gap-1.5 rounded-ctl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-white/[0.1]"
            >
              {expanded ? "Ocultar lista" : "Ver lista"}
              <ChevronDown size={14} aria-hidden="true" className={`transition ${expanded ? "rotate-180" : ""}`} />
            </button>
          )
        }
      >
        Estadísticas para dueños
      </SectionTitle>
      <p className="mt-2 text-sm text-zinc-400">
        Apagadas por defecto. Mira los números de cada ficha y enciéndelas solo cuando te convenga (buenos datos o plan de pago). El dueño
        nunca ve la comparación con el periodo anterior ni los avisos de «no me dejan entrar».
      </p>
      {rows.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Tag>{rows.length} con dueño vinculado</Tag>
          <Tag tone={activeCount > 0 ? "green" : "neutral"}>{activeCount} con estadísticas activadas</Tag>
        </div>
      )}
      {missing ? (
        <p className="mt-3 text-sm text-warn">Falta ejecutar supabase/37_estadisticas_duenos_bajo_control.sql en Supabase.</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Todavía no hay ningún club ni festival vinculado a un dueño.</p>
      ) : (
        expanded && (
          <ul className="mt-4 divide-y divide-white/[0.06]">
            {rows.map((r) => {
              const key = `${r.kind}-${r.id}`
              return (
                <li key={key} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        {r.kind === "club" ? "Club" : "Festival / evento"} · {r.enabled ? "el dueño ve sus estadísticas" : "el dueño no ve nada"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setOpen(open === key ? null : key)}
                        className="rounded-ctl border border-white/10 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:bg-white/5"
                      >
                        {open === key ? "Ocultar números" : "Ver números"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(r)}
                        disabled={saving === key}
                        aria-pressed={r.enabled}
                        className={`rounded-ctl px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          r.enabled ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30" : "bg-white text-night hover:bg-zinc-200"
                        }`}
                      >
                        {r.enabled ? "Activadas · apagar" : "Activar para el dueño"}
                      </button>
                    </div>
                  </div>
                  {open === key && (
                    <div className="mt-3">
                      <OwnerStats type={r.kind} id={r.id} name={r.name} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )
      )}
    </Panel>
  )
}
