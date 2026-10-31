"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Lightbulb,
  Bell, MessageSquare, Flag, UserPlus, Ban, Star, AlertTriangle, PencilLine, CheckCheck, MessageSquareQuote, Mail, Inbox, Reply, type LucideIcon,
} from "lucide-react"
import AdminShell, { invalidateAdminBadges } from "../../../components/admin/AdminShell"
import { supabase } from "../../../lib/supabase"
import { isAdminEmail } from "../../../lib/admin"

// Avisos del admin (25/10/2026): la bandeja donde llega, en el momento, todo lo que merece tu
// atención — mensajes de Contáctanos, notas denunciadas, usuarios nuevos, "no me dejan entrar"
// (con alerta si un local acumula varios), opiniones de la web y ediciones de dueños.
// Los crean disparadores en la base de datos: supabase/38_avisos_admin.sql. Los urgentes te llegan
// además por email al momento, y el resto en un resumen cada mañana (supabase/46 + lib/adminEmail.ts).

type Notice = {
  id: number
  kind: string
  important: boolean
  title: string
  body: string | null
  link: string | null
  created_at: string
  read_at: string | null
}

const KINDS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  alert: { label: "Alertas", icon: AlertTriangle, tone: "text-warn" },
  message: { label: "Mensajes", icon: MessageSquare, tone: "text-sky-300" },
  report: { label: "Denuncias", icon: Flag, tone: "text-red-300" },
  entry_denial: { label: "No dejan entrar", icon: Ban, tone: "text-orange-300" },
  review: { label: "Opiniones de locales", icon: MessageSquareQuote, tone: "text-amber-300" },
  review_reply: { label: "Respuestas de dueños", icon: Reply, tone: "text-teal-200" },
  feedback: { label: "Opiniones de la web", icon: Star, tone: "text-amber-200" },
  signup: { label: "Usuarios nuevos", icon: UserPlus, tone: "text-emerald-300" },
  owner_change: { label: "Cambios de dueños", icon: PencilLine, tone: "text-violet-300" },
  owner_message: { label: "Mensajes de dueños", icon: Inbox, tone: "text-teal-300" },
  essential_suggestion: { label: "Sugerencias de esenciales", icon: Lightbulb, tone: "text-lime-300" },
}

function when(iso: string) {
  const min = (Date.now() - new Date(iso).getTime()) / 60000
  if (min < 1) return "ahora"
  if (min < 60) return `hace ${Math.round(min)} min`
  if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" })
}

function dayLabel(iso: string) {
  const d = new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
  if (d === today) return "Hoy"
  if (d === yesterday) return "Ayer"
  return new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" })
}

export default function AdminNoticesPage() {
  const [checking, setChecking] = useState(true)
  const [rows, setRows] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [kind, setKind] = useState("all")
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [testState, setTestState] = useState<"idle" | "sending" | "ok">("idle")

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
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300)
      .then(({ data, error }) => {
        if (error) setMissing(true)
        setRows((data || []) as Notice[])
        setLoading(false)
      })
  }, [checking])

  const unread = rows.filter((r) => !r.read_at)
  const filtered = useMemo(
    () => rows.filter((r) => (kind === "all" || r.kind === kind) && (!onlyUnread || !r.read_at)),
    [rows, kind, onlyUnread]
  )
  const importantUnread = unread.filter((r) => r.important)

  const markRead = async (ids: number[]) => {
    if (ids.length === 0) return
    const now = new Date().toISOString()
    setRows((prev) => prev.map((r) => (ids.includes(r.id) && !r.read_at ? { ...r, read_at: now } : r)))
    await supabase.from("admin_notifications").update({ read_at: now }).in("id", ids)
    invalidateAdminBadges()
  }

  // Prueba de los emails (supabase/46 + Resend): manda un aviso de ejemplo a tu correo.
  const sendTestEmail = async () => {
    setTestState("sending")
    const { data } = await supabase.auth.getSession()
    try {
      const res = await fetch("/api/admin/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
        body: JSON.stringify({ test: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setTestState("ok")
      else {
        setTestState("idle")
        window.alert("No se ha podido enviar: " + (json.error || res.status))
      }
    } catch {
      setTestState("idle")
      window.alert("No se ha podido enviar el email de prueba.")
    }
  }

  if (checking) {
    return (
      <AdminShell title="Avisos">
        <p className="text-sm text-zinc-400">Comprobando acceso…</p>
      </AdminShell>
    )
  }

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:bg-white/5"}`

  // Agrupados por día.
  const groups: { day: string; items: Notice[] }[] = []
  for (const r of filtered) {
    const day = dayLabel(r.created_at)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.items.push(r)
    else groups.push({ day, items: [r] })
  }

  return (
    <AdminShell
      title="Avisos"
      subtitle="Lo que ha pasado en Noctua y merece tu atención, en el momento en que pasa."
      actions={
        <>
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testState === "sending"}
            className="flex items-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-ink transition hover:bg-white/10 disabled:opacity-50"
          >
            <Mail size={16} aria-hidden="true" />
            {testState === "sending" ? "Enviando…" : testState === "ok" ? "Enviado: mira tu correo" : "Enviar email de prueba"}
          </button>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={() => markRead(unread.map((r) => r.id))}
              className="flex items-center gap-2 rounded-ctl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-ink transition hover:bg-white/10"
            >
              <CheckCheck size={16} aria-hidden="true" /> Marcar todo como leído
            </button>
          )}
        </>
      }
    >
      {missing && (
        <div className="mb-6 rounded-2xl border border-warn/40 bg-warn/10 p-5 text-sm text-warn">
          Falta ejecutar supabase/38_avisos_admin.sql en Supabase para que empiecen a llegar avisos.
        </div>
      )}

      {importantUnread.length > 0 && (
        <div className="mb-6 rounded-2xl border border-warn/40 bg-warn/[0.08] p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-warn">
            <AlertTriangle size={16} aria-hidden="true" />
            {importantUnread.length === 1 ? "1 aviso importante sin leer" : `${importantUnread.length} avisos importantes sin leer`}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-200">
            {importantUnread.slice(0, 5).map((r) => (
              <li key={r.id}>· {r.title}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" className={chip(kind === "all")} onClick={() => setKind("all")}>
          Todos{unread.length > 0 && ` · ${unread.length} sin leer`}
        </button>
        {Object.entries(KINDS)
          .filter(([k]) => rows.some((r) => r.kind === k))
          .map(([k, v]) => {
            const n = unread.filter((r) => r.kind === k).length
            return (
              <button key={k} type="button" className={chip(kind === k)} onClick={() => setKind(k)}>
                {v.label}
                {n > 0 && ` · ${n}`}
              </button>
            )
          })}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-300">
          <input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} className="accent-[#8b5cf6]" />
          Solo sin leer
        </label>
      </div>

      {loading ? (
        <div className="h-60 animate-pulse rounded-2xl bg-white/[0.03]" />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <Bell size={28} className="mx-auto text-zinc-500" aria-hidden="true" />
          <p className="mt-3 font-semibold text-ink">{onlyUnread ? "Lo tienes todo al día" : "Todavía no hay avisos"}</p>
          <p className="mt-1 text-sm text-zinc-400">Aquí llegarán los mensajes, denuncias, registros y alertas en cuanto pasen.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="mb-2 text-xs font-semibold capitalize text-zinc-500">{g.day}</h2>
              <ul className="overflow-hidden rounded-2xl border border-white/10 divide-y divide-white/[0.06]">
                {g.items.map((r) => {
                  const k = KINDS[r.kind] || { label: r.kind, icon: Bell, tone: "text-zinc-300" }
                  const Icon = k.icon
                  const unreadRow = !r.read_at
                  return (
                    <li key={r.id} className={`flex gap-3 px-4 py-3.5 ${unreadRow ? "bg-white/[0.04]" : "bg-transparent"}`}>
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ${k.tone}`}>
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${unreadRow ? "font-bold text-ink" : "font-semibold text-zinc-300"}`}>
                          {r.important && <span className="mr-1.5 rounded bg-warn px-1.5 py-0.5 text-[10px] font-black text-night">Importante</span>}
                          {r.title}
                        </p>
                        {r.body && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-400">{r.body}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <span className="text-zinc-500">{when(r.created_at)}</span>
                          {r.link && (
                            <Link href={r.link} onClick={() => markRead([r.id])} className="font-semibold text-brand-soft hover:underline">
                              Ver y gestionar
                            </Link>
                          )}
                          {unreadRow && (
                            <button type="button" onClick={() => markRead([r.id])} className="font-semibold text-zinc-400 hover:text-ink">
                              Marcar como leído
                            </button>
                          )}
                        </div>
                      </div>
                      {unreadRow && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </AdminShell>
  )
}
